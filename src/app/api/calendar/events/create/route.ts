/**
 * POST /api/calendar/events/create - 小目標をカレンダーにイベント作成
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../../../lib/turso/client'
import { createCalendarEvent } from '@/lib/google-calendar'

async function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, start, durationMinutes = 45 } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const startDate = start ? new Date(start) : new Date()
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000)

    const event = await createCalendarEvent(userId, {
      summary: title,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Calendar not connected or failed to create' },
        { status: 400 }
      )
    }

    return NextResponse.json({ event })
  } catch (error) {
    console.error('Failed to create calendar event:', error)
    return NextResponse.json(
      { error: 'Failed to create event', details: String(error) },
      { status: 500 }
    )
  }
}
