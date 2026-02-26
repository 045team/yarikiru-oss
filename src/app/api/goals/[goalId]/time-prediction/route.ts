/**
 * GET /api/goals/[goalId]/time-prediction
 *
 * work_logs の実績データを使って、類似ゴールの平均所要時間を予測して返す。
 * 外部AI APIは使用せず、統計ベースのアルゴリズム。
 *
 * Response:
 *   { predictedMinutes: number, confidence: "low"|"medium"|"high", basedOn: number, fallback: boolean }
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../../../lib/turso/client'
import { decryptFromDb } from '@/lib/e2ee'

async function getDb() {
    return createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
    })
}

/** タイトルから意味のある単語を抽出（助詞・記号を除く） */
function extractKeywords(title: string): string[] {
    return title
        .replace(/[。、！？・「」『』【】（）\[\]]/g, ' ')
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 2)
        .slice(0, 5) // 最大5キーワード
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ goalId: string }> }
) {
    const { userId } = await auth()
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { goalId } = await params

    try {
        const db = await getDb()

        // 対象ゴールのタイトルを取得
        const goalResult = await db.execute({
            sql: `
              SELECT g.title, g.estimated_minutes
              FROM yarikiru_goals g
              JOIN yarikiru_projects p ON g.project_id = p.id
              WHERE g.id = ? AND p.user_id = ?
            `,
            args: [goalId, userId],
        })

        if (goalResult.rows.length === 0) {
            return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
        }

        const goalTitle = await decryptFromDb(String(goalResult.rows[0][0] ?? ''))
        const estimatedMinutes = Number(goalResult.rows[0][1]) || 30

        const keywords = extractKeywords(goalTitle)

        // 完了済み・実績時間ありの全ゴールを取得
        const allCompletedResult = await db.execute({
            sql: `
              SELECT g.id, g.title, g.actual_minutes
              FROM yarikiru_goals g
              JOIN yarikiru_projects p ON g.project_id = p.id
              WHERE p.user_id = ?
                AND g.status = 'done'
                AND g.actual_minutes IS NOT NULL
                AND g.actual_minutes > 0
                AND g.id != ?
              ORDER BY g.completed_at DESC
              LIMIT 100
            `,
            args: [userId, goalId],
        })

        const allCompleted = await Promise.all(allCompletedResult.rows.map(async r => ({
            id: String(r[0]),
            title: await decryptFromDb(String(r[1])),
            actualMinutes: Number(r[2])
        })))

        // 類似ゴールをメモリ上で検索（キーワードが含まれるか）
        let similarGoals: number[] = []

        if (keywords.length > 0) {
            const matched = allCompleted.filter(g =>
                keywords.some(kw => g.title.includes(kw))
            ).slice(0, 10)
            similarGoals = matched.map(g => g.actualMinutes)
        }

        // 類似ゴールがない場合は全ゴール平均にフォールバック
        let fallback = false
        let basedOnGoals = similarGoals

        if (similarGoals.length === 0) {
            fallback = true
            basedOnGoals = allCompleted.slice(0, 20).map(g => g.actualMinutes)
        }

        // データがない場合は予測なし
        if (basedOnGoals.length === 0) {
            return NextResponse.json({
                predictedMinutes: null,
                confidence: null,
                basedOn: 0,
                fallback: true,
            })
        }

        // 平均計算（外れ値除去: 中央値から2SD以上を除く）
        const sorted = [...basedOnGoals].sort((a, b) => a - b)
        const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length
        const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / sorted.length
        const sd = Math.sqrt(variance)
        const filtered = sd > 0 ? sorted.filter((v) => Math.abs(v - mean) <= 2 * sd) : sorted
        const predictedMinutes = Math.round(
            filtered.reduce((s, v) => s + v, 0) / filtered.length
        )

        // 確信度
        const confidence: 'low' | 'medium' | 'high' =
            basedOnGoals.length >= 5
                ? 'high'
                : basedOnGoals.length >= 2
                    ? 'medium'
                    : 'low'

        // 予測値をDBにキャッシュ
        await db.execute({
            sql: `UPDATE yarikiru_goals SET ai_predicted_minutes = ? WHERE id = ?`,
            args: [predictedMinutes, goalId],
        })

        return NextResponse.json({
            predictedMinutes,
            confidence,
            basedOn: basedOnGoals.length,
            fallback,
            estimatedMinutes,
        })
    } catch (error) {
        console.error('Error predicting time:', error)
        return NextResponse.json(
            { error: 'Failed to predict time', details: String(error) },
            { status: 500 }
        )
    }
}
