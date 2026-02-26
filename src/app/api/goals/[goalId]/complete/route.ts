import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../../../lib/turso/client'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { encryptForDb, decryptFromDb } from '@/lib/e2ee'

/**
 * POST /api/goals/[goalId]/complete
 * 中目標を完了にする。学びを記録し、全小目標も完了にする。
 * Body: { learning?: string }
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
    const body = await request.json().catch(() => ({}))
    const { learning } = body as { learning?: string }

    const db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })

    const completedAt = new Date().toISOString()

    const encLearning = learning ? await encryptForDb(learning) : null

    // 所有権の確認と中目標のステータス更新を同時に行う (IDOR対策)
    const updateResult = await db.execute({
      sql: `
        UPDATE yarikiru_goals
        SET status = 'done', completed_at = ?, learning = ?
        WHERE id = ? AND id IN (
          SELECT g.id FROM yarikiru_goals g
          JOIN yarikiru_projects p ON g.project_id = p.id
          WHERE p.user_id = ?
        )
        RETURNING id
      `,
      args: [completedAt, encLearning, goalId, userId],
    })

    if (updateResult.rows.length === 0) {
      return NextResponse.json({ error: 'Goal not found or unauthorized' }, { status: 403 })
    }

    // 全小目標を完了に
    await db.execute({
      sql: `
        UPDATE yarikiru_sub_tasks
        SET is_done = 1, completed_at = ?
        WHERE goal_id = ?
      `,
      args: [completedAt, goalId],
    })

    // アクティブな作業ログがあれば終了する
    await db.execute({
      sql: `
        UPDATE yarikiru_work_logs
        SET ended_at = ?,
            duration_minutes = CAST((julianday(?) - julianday(started_at)) * 24 * 60 AS INTEGER)
        WHERE goal_id = ? AND ended_at IS NULL
      `,
      args: [completedAt, completedAt, goalId],
    })

    // 実績時間を集計して中目標に反映
    const totalResult = await db.execute({
      sql: `SELECT COALESCE(SUM(duration_minutes), 0) FROM yarikiru_work_logs WHERE goal_id = ?`,
      args: [goalId],
    })
    const actualMinutes = Number(totalResult.rows[0]?.[0]) || 0
    if (actualMinutes > 0) {
      await db.execute({
        sql: `UPDATE yarikiru_goals SET actual_minutes = ? WHERE id = ?`,
        args: [actualMinutes, goalId],
      })
    }

    // ゴール情報を取得してパターンとして保存
    const goalResult = await db.execute({
      sql: `SELECT title, project_id FROM yarikiru_goals WHERE id = ?`,
      args: [goalId],
    })

    if (goalResult.rows.length > 0) {
      const goalTitle = await decryptFromDb(String(goalResult.rows[0][0]))
      const projectId = String(goalResult.rows[0][1])

      // プロジェクト内の全ゴールが完了したか確認し、完了なら自動アーカイブ
      const remainingResult = await db.execute({
        sql: `SELECT COUNT(*) FROM yarikiru_goals WHERE project_id = ? AND status != 'done'`,
        args: [projectId],
      })
      const remainingCount = Number(remainingResult.rows[0]?.[0]) ?? 1
      if (remainingCount === 0) {
        await db.execute({
          sql: `UPDATE yarikiru_projects SET status = 'archived', updated_at = datetime('now') WHERE id = ?`,
          args: [projectId],
        })
      }

      // サブタスクを取得
      const subTasksResult = await db.execute({
        sql: `SELECT label FROM yarikiru_sub_tasks WHERE goal_id = ? ORDER BY sort_order`,
        args: [goalId],
      })

      const subTasks = await Promise.all(subTasksResult.rows.map(async row => ({
        label: await decryptFromDb(String(row[0])),
        sort_order: subTasksResult.rows.indexOf(row) + 1
      })))

      // パターンを保存
      const patternsDir = join(process.cwd(), '.yarikiru', 'patterns')
      if (!existsSync(patternsDir)) {
        mkdirSync(patternsDir, { recursive: true })
      }

      const patternId = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
      const category = detectPatternCategory(goalTitle)
      const tags = extractPatternTags(goalTitle)

      const pattern = {
        id: patternId,
        name: goalTitle,
        category,
        description: `自動生成パターン: ${goalTitle}`,
        tags,
        taskTemplate: {
          title: goalTitle,
          estimatedMinutes: subTasks.length * 15,
          priority: 5
        },
        subTasks: subTasks.map(st => ({
          label: st.label,
          estimatedMinutes: 15
        })),
        createdAt: new Date().toISOString(),
        usageCount: 1,
        usedAt: new Date().toISOString(),
        avgActualMinutes: actualMinutes || undefined,
        successRate: actualMinutes > 0 ? 1 : undefined
      }

      const patternPath = join(patternsDir, `${patternId}.json`)
      writeFileSync(patternPath, JSON.stringify(pattern, null, 2), 'utf-8')
    }

    return NextResponse.json({
      success: true,
      goalId,
      learning: learning || null,
      actualMinutes,
    })
  } catch (error) {
    console.error('Error completing goal:', error)
    return NextResponse.json(
      { error: 'Failed to complete goal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Helper functions for patterns
function detectPatternCategory(text: string): string {
  const lower = text.toLowerCase()
  const categoryKeywords: Record<string, string[]> = {
    frontend: ['ui', 'ux', 'component', 'react', 'vue', 'next', 'nuxt', 'svelte', 'frontend', 'フロント', '画面'],
    backend: ['api', 'server', 'backend', 'バックエンド', 'エンドポイント', 'ルート'],
    database: ['db', 'database', 'sql', 'turso', 'prisma', 'orm', 'migration', 'データベース'],
    infra: ['deploy', 'ci', 'cd', 'docker', 'kubernetes', 'aws', 'vercel', 'インフラ'],
    design: ['design', 'デザイン', 'figma', 'sketch'],
    testing: ['test', 'testing', 'jest', 'vitest', 'テスト'],
    docs: ['docs', 'documentation', 'readme', 'ドキュメント', '説明']
  }

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category
      }
    }
  }
  return 'other'
}

function extractPatternTags(text: string): string[] {
  const tags: string[] = []

  const tagMatches = text.match(/【(.+?)】/g)
  if (tagMatches) {
    for (const match of tagMatches) {
      tags.push(match.replace(/【|】/g, ''))
    }
  }

  const techKeywords = ['React', 'Vue', 'Next.js', 'Nuxt', 'TypeScript', 'Turso', 'Prisma', 'Tailwind', 'Vercel', 'AWS', 'Docker', 'Kubernetes']
  for (const keyword of techKeywords) {
    if (text.includes(keyword)) {
      tags.push(keyword)
    }
  }

  return [...new Set(tags)]
}
