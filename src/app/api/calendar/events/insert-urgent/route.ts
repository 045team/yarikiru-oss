import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { insertUrgentEvent } from '@/lib/google-calendar'

/**
 * POST /api/calendar/events/insert-urgent
 * 緊急タスクをカレンダーに挿入し、既存の予定を後ろにずらす
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, start, durationMinutes = 60, description, calendarId } = body

    // バリデーション
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!start) {
      return NextResponse.json({ error: 'Start time is required' }, { status: 400 })
    }

    // 開始時刻が指定されていない場合は現在時刻を使用
    const startTime = start || new Date().toISOString()

    const result = await insertUrgentEvent(userId, {
      summary: title,
      start: startTime,
      durationMinutes,
      description,
      calendarId,
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      urgentEvent: result.urgentEvent,
      shiftedEvents: result.shiftedEvents,
      shiftedCount: result.shiftedEvents.length,
    })
  } catch (error) {
    console.error('Error inserting urgent event:', error)
    return NextResponse.json(
      {
        error: 'Failed to insert urgent event',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
