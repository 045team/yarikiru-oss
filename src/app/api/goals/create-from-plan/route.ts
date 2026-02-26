import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../../lib/turso/client'
import { hasProAccess } from '@/lib/revenuecat-server'
import { encryptForDb } from '@/lib/e2ee'

interface SubTaskTemplate {
  label: string
  estimatedMinutes: number
}

interface ParallelGroup {
  id: string
  name: string
  tasks: SubTaskTemplate[]
  estimatedMinutes: number
  canStartAfter: string[]
}

interface GoalPlan {
  title: string
  projectId: string
  description?: string
  estimatedMinutes: number
  subTasks: SubTaskTemplate[]
  parallelGroups: ParallelGroup[]
}

/**
 * POST /api/goals/create-from-plan
 * 計画からゴールとサブタスクを作成する
 * Body: { title, projectId, description?, estimatedMinutes, subTasks }
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      title,
      projectId,
      description,
      estimatedMinutes,
      subTasks,
      aiPredictedMinutes,
    } = body as {
      title: string
      projectId: string
      description?: string
      estimatedMinutes: number
      subTasks: Array<{ label: string; estimatedMinutes: number }>
      aiPredictedMinutes?: number
    }

    if (!title || !projectId) {
      return NextResponse.json({ error: 'title and projectId are required' }, { status: 400 })
    }

    const db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })

    // Freemium Gate
    const isPro = await hasProAccess(userId)
    if (!isPro) {
      const countResult = await db.execute({
        sql: `SELECT COUNT(g.id) FROM yarikiru_goals g JOIN yarikiru_projects p ON g.project_id = p.id WHERE p.user_id = ? AND g.status != 'archived'`,
        args: [userId]
      })
      const goalCount = Number(countResult.rows[0]?.[0]) || 0
      if (goalCount >= 3) {
        return NextResponse.json({ error: 'Free plan limit reached', needsUpgrade: true }, { status: 403 })
      }
    }

    // プロジェクトの所有権確認
    const projectCheck = await db.execute({
      sql: 'SELECT id FROM yarikiru_projects WHERE id = ? AND user_id = ?',
      args: [projectId, userId],
    })

    if (projectCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // ゴールを作成
    const goalId = `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`

    // 現在の最大 sort_order を取得
    const sortOrderResult = await db.execute({
      sql: 'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM yarikiru_goals WHERE project_id = ?',
      args: [projectId],
    })
    const nextSortOrder = Number(sortOrderResult.rows[0]?.[0]) || 0

    const encTitle = await encryptForDb(title)
    const encDesc = description ? await encryptForDb(description) : null

    await db.execute({
      sql: `
        INSERT INTO yarikiru_goals (
          id, project_id, title, description, estimated_minutes, ai_predicted_minutes,
          sort_order, status, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'todo', 0)
      `,
      args: [
        goalId,
        projectId,
        encTitle,
        encDesc,
        estimatedMinutes,
        aiPredictedMinutes || estimatedMinutes,
        nextSortOrder,
      ],
    })

    // サブタスクを作成
    for (let i = 0; i < subTasks.length; i++) {
      const subTaskId = `s_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`
      const encLabel = await encryptForDb(subTasks[i].label)
      await db.execute({
        sql: `
          INSERT INTO yarikiru_sub_tasks (id, goal_id, label, is_done, sort_order)
          VALUES (?, ?, ?, 0, ?)
        `,
        args: [subTaskId, goalId, encLabel, i + 1],
      })
    }

    // 作成したゴールを返す
    const createdGoal = await db.execute({
      sql: 'SELECT * FROM yarikiru_goals WHERE id = ?',
      args: [goalId],
    })

    return NextResponse.json({
      success: true,
      goal: {
        id: goalId,
        title,
        description: description || null,
        status: 'todo',
        estimatedMinutes,
        aiPredictedMinutes: aiPredictedMinutes || estimatedMinutes,
        subTasks: subTasks.map((st, idx) => ({
          id: `temp_${idx}`,
          label: st.label,
          isDone: false,
        })),
      },
    })
  } catch (error) {
    console.error('Error creating goal from plan:', error)
    return NextResponse.json(
      { error: 'Failed to create goal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
