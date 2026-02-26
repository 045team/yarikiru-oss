/**
 * GET /api/calendar/events - Googleカレンダーから実イベント取得
 * ?timeframe=today|week|month
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../../lib/turso/client'
import { fetchCalendarEvents } from '@/lib/google-calendar'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

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

  const { searchParams } = new URL(request.url)
  const timeframe = (searchParams.get('timeframe') || 'today') as 'today' | 'week' | 'month'

  const db = await getDb()
  const integration = await db.execute({
    sql: `SELECT id FROM calendar_integrations WHERE user_id = ? AND provider = 'google' AND sync_enabled = 1`,
    args: [userId],
  })

  if (integration.rows.length === 0) {
    return NextResponse.json({ events: [], connected: false })
  }

  const now = new Date()
  let timeMin: Date
  let timeMax: Date

  if (timeframe === 'today') {
    timeMin = startOfDay(now)
    timeMax = endOfDay(now)
  } else if (timeframe === 'week') {
    timeMin = startOfWeek(now, { weekStartsOn: 1 })
    timeMax = endOfWeek(now, { weekStartsOn: 1 })
  } else {
    timeMin = startOfMonth(now)
    timeMax = endOfMonth(now)
  }

  try {
    const events = await fetchCalendarEvents(userId, {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
    })

    const blocks = events.map((e, i) => {
      const start = new Date(e.start)
      const isAllDay = e.isAllDay
      const timeLabel = isAllDay
        ? '終日'
        : format(start, 'HH:mm')
      return {
        id: e.id,
        time: timeLabel,
        title: e.summary,
        type: 'focus' as const,
        isCurrent: i === 0 && !isAllDay,
        start: e.start,
        end: e.end,
        isAllDay,
      }
    })

    return NextResponse.json({ events: blocks, connected: true })
  } catch (error) {
    console.error('Failed to fetch calendar events:', error)
    return NextResponse.json(
      { events: [], connected: true, error: 'Failed to fetch' },
      { status: 500 }
    )
  }
}
