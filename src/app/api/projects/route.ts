import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../lib/turso/client'
import { predictTimeByCategory, formatHistoricalGoals } from '@/lib/ai/predict-time'
import { encryptForDb, decryptFromDb } from '@/lib/e2ee'

async function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })
}

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')

    const db = await getDb()

    // ステータスフィルタリングの構築
    let whereClause = 'user_id = ? AND (status IS NULL OR status != \'archived\')'
    const args: any[] = [userId]

    if (statusFilter === 'completed') {
      whereClause = 'user_id = ? AND status = \'completed\''
    } else if (statusFilter === 'archived') {
      whereClause = 'user_id = ? AND status = \'archived\''
    } else if (statusFilter === 'active') {
      whereClause = 'user_id = ? AND status = \'active\''
    }

    const projectsResult = await db.execute({
      sql: `
        SELECT id, title, description, status, created_at, system_state_md
        FROM yarikiru_projects
        WHERE ${whereClause}
        ORDER BY created_at DESC
      `,
      args,
    })

    const projects: Array<{
      id: string
      title: string
      description: string | null
      status: string
      createdAt: string
      systemStateMd: string | null
      goals: Array<{
        id: string
        title: string
        description: string | null
        status: string
        time: number
        actualMinutes: number | null
        learning: string | null
        priority: number
        subTasks: Array<{ id: string; label: string; isDone: boolean }>
      }>
      progress: { total: number; done: number; percentage: number }
    }> = []

    for (const row of projectsResult.rows) {
      const projectId = row[0] as string
      const goalsResult = await db.execute({
        sql: `
          SELECT id, title, description, status, estimated_minutes, actual_minutes, learning, priority, ai_predicted_minutes
          FROM yarikiru_goals
          WHERE project_id = ?
          ORDER BY CASE WHEN status = 'done' THEN 1 ELSE 0 END ASC, priority DESC, sort_order ASC, created_at ASC
        `,
        args: [projectId],
      })

      let totalGoals = goalsResult.rows.length
      let doneGoals = 0

      const goals = await Promise.all(
        goalsResult.rows.map(async (gRow) => {
          const goalId = gRow[0] as string
          const subResult = await db.execute({
            sql: `
              SELECT id, label, is_done
              FROM yarikiru_sub_tasks
              WHERE goal_id = ?
              ORDER BY sort_order ASC, created_at ASC
            `,
            args: [goalId],
          })
          const subTasks = await Promise.all(subResult.rows.map(async (s) => ({
            id: String(s[0] ?? ''),
            label: await decryptFromDb(String(s[1] ?? '')),
            isDone: (s[2] as number) === 1,
          })))
          const status = String(gRow[3] ?? 'todo')
          if (status === 'done') doneGoals++

          return {
            id: String(goalId),
            title: await decryptFromDb(String(gRow[1] ?? '')),
            description: gRow[2] ? await decryptFromDb(String(gRow[2])) : null,
            status: String(gRow[3] ?? 'todo'),
            time: Number(gRow[4]) || 30,
            actualMinutes: gRow[5] ? Number(gRow[5]) : null,
            learning: gRow[6] ? await decryptFromDb(String(gRow[6])) : null,
            priority: Number(gRow[7]) || 0,
            aiPredictedMinutes: gRow[8] ? Number(gRow[8]) : null,
            subTasks,
          }
        })
      )

      // 自動完了判定: 全ゴールが完了済みの場合、ステータスを completed に更新
      let projectStatus = String(row[3] ?? 'active')
      if (totalGoals > 0 && doneGoals === totalGoals && projectStatus === 'active') {
        await db.execute({
          sql: `UPDATE yarikiru_projects SET status = 'completed', updated_at = datetime('now') WHERE id = ?`,
          args: [projectId],
        })
        projectStatus = 'completed'
      }

      projects.push({
        id: projectId,
        title: await decryptFromDb(row[1] as string),
        description: row[2] ? await decryptFromDb(String(row[2])) : null,
        status: projectStatus,
        createdAt: row[4] as string,
        systemStateMd: row[5] ? await decryptFromDb(String(row[5])) : null,
        goals,
        progress: {
          total: totalGoals,
          done: doneGoals,
          percentage: totalGoals > 0 ? Math.round((doneGoals / totalGoals) * 100) : 0,
        },
      })
    }

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects', details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, description } = body
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const db = await getDb()
    const projectId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

    const projectTitle = title.trim()
    const encryptedProjectTitle = await encryptForDb(projectTitle)
    const encryptedDescription = description ? await encryptForDb(description) : null

    await db.execute({
      sql: `
        INSERT INTO yarikiru_projects (id, user_id, title, description, status)
        VALUES (?, ?, ?, ?, 'active')
      `,
      args: [projectId, userId, encryptedProjectTitle, encryptedDescription],
    })

    // AI時間予測を取得（プロジェクトタイトルから）
    let aiPredictedMinutes: number | null = null
    try {
      // 過去の完了済みゴールデータを取得
      const historicalGoalsResult = await db.execute({
        sql: `
          SELECT id, title, actual_minutes, estimated_minutes, completed_at
          FROM yarikiru_goals g
          JOIN yarikiru_projects p ON g.project_id = p.id
          WHERE p.user_id = ?
            AND g.status = 'done'
            AND g.actual_minutes IS NOT NULL
            AND g.actual_minutes > 0
          ORDER BY g.completed_at DESC
          LIMIT 100
        `,
        args: [userId],
      })

      const historicalGoals = formatHistoricalGoals(
        historicalGoalsResult.rows.map(row => ({
          id: String(row[0]),
          title: String(row[1]),
          actual_minutes: Number(row[2]),
          estimated_minutes: row[3] ? Number(row[3]) : null,
          completed_at: String(row[4]),
        }))
      )

      const prediction = predictTimeByCategory(projectTitle, historicalGoals, {
        useMedian: false,
        includeUncategorized: true,
      })

      if (prediction.predictedMinutes !== null) {
        aiPredictedMinutes = prediction.predictedMinutes
      }
    } catch (error) {
      console.error('Error predicting time for new project:', error)
      // 予測エラーは無視して続行
    }

    // デフォルト中目標を1つ作成（AI分解は別エンドポイントで）
    const goalId = `g_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

    // AI予測がある場合はそれを優先、なければデフォルト30分
    const estimatedMinutes = aiPredictedMinutes ?? 30

    const encryptedGoalTitle = await encryptForDb('スコープの極小化と要件定義の完了')

    await db.execute({
      sql: `
        INSERT INTO yarikiru_goals (id, project_id, title, estimated_minutes, ai_predicted_minutes, sort_order, status, priority)
        VALUES (?, ?, ?, ?, ?, 0, 'todo', 0)
      `,
      args: [goalId, projectId, encryptedGoalTitle, estimatedMinutes, aiPredictedMinutes],
    })

    const subTaskIds = [
      `s_${Date.now()}_1_${Math.random().toString(36).slice(2, 7)}`,
      `s_${Date.now()}_2_${Math.random().toString(36).slice(2, 7)}`,
    ]
    const encryptedLabel1 = await encryptForDb('コア機能1つの選定')
    const encryptedLabel2 = await encryptForDb('捨てる機能のリストアップ')

    await db.execute({
      sql: `
        INSERT INTO yarikiru_sub_tasks (id, goal_id, label, is_done, sort_order)
        VALUES (?, ?, ?, 0, 0), (?, ?, ?, 0, 1)
      `,
      args: [
        subTaskIds[0],
        goalId,
        encryptedLabel1,
        subTaskIds[1],
        goalId,
        encryptedLabel2,
      ],
    })

    return NextResponse.json({
      project: {
        id: projectId,
        title: projectTitle,
        description: description || null,
        status: 'active',
        goals: [
          {
            id: goalId,
            title: 'スコープの極小化と要件定義の完了',
            status: 'todo',
            time: estimatedMinutes,
            aiPredictedMinutes,
            actualMinutes: null,
            learning: null,
            priority: 0,
            subTasks: [
              { id: subTaskIds[0], label: 'コア機能1つの選定', isDone: false },
              { id: subTaskIds[1], label: '捨てる機能のリストアップ', isDone: false },
            ],
          },
        ],
        progress: { total: 2, done: 0, percentage: 0 },
      },
    })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project', details: String(error) },
      { status: 500 }
    )
  }
}
