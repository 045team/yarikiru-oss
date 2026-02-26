/**
 * POST /api/calendar/events/schedule-tasks
 * YARIKIRU カレンダー実装の未完了タスクを明日のGoogleカレンダーに登録
 */
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../../../lib/turso/client'
import { createCalendarEvent } from '@/lib/google-calendar'
import { addDays, addMinutes, setHours, setMinutes } from 'date-fns'
import { decryptFromDb } from '@/lib/e2ee'

async function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })
}

export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = await getDb()

    const projectResult = await db.execute({
      sql: `
        SELECT g.id
        FROM yarikiru_projects p
        JOIN yarikiru_goals g ON g.project_id = p.id
        WHERE p.user_id = ? AND p.title LIKE '%YARIKIRU%' AND g.title = 'カレンダーの実装'
      `,
      args: [userId],
    })

    if (projectResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'YARIKIRU カレンダーの実装 goal not found' },
        { status: 404 }
      )
    }

    const goalId = projectResult.rows[0][0] as string
    const subResult = await db.execute({
      sql: `
        SELECT id, label
        FROM yarikiru_sub_tasks
        WHERE goal_id = ? AND is_done = 0
        ORDER BY sort_order ASC
      `,
      args: [goalId],
    })

    const tasks = await Promise.all(subResult.rows.map(async (r) => ({
      id: r[0],
      label: await decryptFromDb(r[1] as string)
    })))

    if (tasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No remaining tasks to schedule',
        scheduled: 0,
      })
    }

    const tomorrow = addDays(new Date(), 1)
    const DURATION_MINUTES = 45
    const events: Array<{ title: string; start: string; end: string }> = []

    const firstStart = setMinutes(setHours(tomorrow, 9), 0)
    for (let i = 0; i < tasks.length; i++) {
      const start = addMinutes(firstStart, i * DURATION_MINUTES)
      const end = new Date(start.getTime() + DURATION_MINUTES * 60 * 1000)
      events.push({
        title: tasks[i].label,
        start: start.toISOString(),
        end: end.toISOString(),
      })
    }

    let created = 0
    for (const ev of events) {
      const event = await createCalendarEvent(userId, {
        summary: ev.title,
        start: ev.start,
        end: ev.end,
      })
      if (event) created++
    }

    return NextResponse.json({
      success: true,
      message: `${created}件を明日のカレンダーに追加しました`,
      scheduled: created,
      tasks: events.map((e) => e.title),
    })
  } catch (error) {
    console.error('Failed to schedule tasks:', error)
    return NextResponse.json(
      { error: 'Failed to schedule', details: String(error) },
      { status: 500 }
    )
  }
}
