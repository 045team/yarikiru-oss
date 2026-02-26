import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../../../lib/turso/client'

/**
 * POST /api/goals/[goalId]/undo
 * 完了状態の中目標を「進行中（in_progress）」に戻す。
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ goalId: string }> }
) {
    const { userId } = await auth()

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { goalId } = await params

    try {
        const db = createClient({
            url: process.env.TURSO_DATABASE_URL!,
            authToken: process.env.TURSO_AUTH_TOKEN!,
        })

        // 所有権の確認とステータス更新を同時に行う (IDOR対策)
        const updateResult = await db.execute({
            sql: `
        UPDATE yarikiru_goals
        SET status = 'in_progress', completed_at = NULL, learning = NULL
        WHERE id = ? AND id IN (
          SELECT g.id FROM yarikiru_goals g
          JOIN yarikiru_projects p ON g.project_id = p.id
          WHERE p.user_id = ?
        )
        RETURNING id
      `,
            args: [goalId, userId],
        })

        if (updateResult.rows.length === 0) {
            return NextResponse.json({ error: 'Goal not found or unauthorized' }, { status: 403 })
        }

        // ※ 小目標（sub_tasks）のステータスはそのまま保持する（完了したものまで未完了に戻さない）
        // もし小目標もすべて未完了に戻したい場合はここに UPDATE yarikiru_sub_tasks を追加する

        return NextResponse.json({
            success: true,
            goalId,
        })
    } catch (error) {
        console.error('Error undoing goal:', error)
        return NextResponse.json(
            { error: 'Failed to undo goal', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
