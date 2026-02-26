import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../../../lib/turso/client'
import { completeSubTaskEvent } from '@/lib/google-calendar'

/**
 * PATCH /api/sub-tasks/[id]/complete-reschedule
 * サブタスクを完了し、カレンダー予定を完了マークして以降の予定を前にずらす
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { isDone = true, completedAt = new Date().toISOString() } = body

    const db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })

    // サブタスクの情報を取得
    const taskResult = await db.execute({
      sql: `
        SELECT gt.id, gt.title, gt.goal_id, gt.calendar_event_id, g.user_id
        FROM generated_tasks gt
        JOIN goals g ON gt.goal_id = g.id
        WHERE gt.id = ? AND g.user_id = ?
      `,
      args: [id, userId],
    })

    if (taskResult.rows.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const row = taskResult.rows[0]
    const task = {
      id: String(row[0]),
      title: String(row[1]),
      goal_id: String(row[2]),
      calendar_event_id: row[3] ? String(row[3]) : null,
      user_id: String(row[4]),
    }

    // サブタスクを完了状態に更新
    await db.execute({
      sql: `
        UPDATE generated_tasks
        SET is_completed = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [isDone ? 1 : 0, id],
    })

    // カレンダーイベントがあれば完了マークして再スケジュール
    let calendarResult = null
    if (isDone && task.calendar_event_id) {
      calendarResult = await completeSubTaskEvent(userId, {
        eventId: task.calendar_event_id,
        completedAt,
      })
    }

    return NextResponse.json({
      success: true,
      taskId: id,
      isDone,
      calendarResult,
    })
  } catch (error) {
    console.error('Error completing sub-task with reschedule:', error)
    return NextResponse.json(
      {
        error: 'Failed to complete sub-task',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
