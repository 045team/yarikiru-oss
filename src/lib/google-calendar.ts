/**
 * Google Calendar API クライアント
 * トークンリフレッシュ・イベント取得・作成・更新・削除
 */
import { google } from 'googleapis'
import { getTursoClient as createClient } from './turso/client'

export interface CalendarEvent {
  id: string
  summary: string
  start: string
  end: string
  isAllDay?: boolean
  description?: string
}

export interface RescheduleResult {
  success: boolean
  updatedEvents: Array<{ id: string; newStart: string; newEnd: string }>
  error?: string
}

async function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })
}

async function refreshAccessToken(
  integration: { refresh_token: string | null }
): Promise<string | null> {
  if (!integration.refresh_token) return null

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integration.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null
  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

/**
 * ユーザーの有効な access_token を取得（必要ならリフレッシュ）
 */
export async function getCalendarClient(userId: string) {
  const db = await getDb()
  const result = await db.execute({
    sql: `
      SELECT access_token, refresh_token
      FROM calendar_integrations
      WHERE user_id = ? AND provider = 'google' AND sync_enabled = 1
    `,
    args: [userId],
  })

  if (result.rows.length === 0) return null

  let accessToken = result.rows[0][0] as string
  const refreshToken = result.rows[0][1] as string | null

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  return calendar
}

/**
 * イベント取得（トークン切れ時はリフレッシュして再試行）
 */
export async function fetchCalendarEvents(
  userId: string,
  opts: {
    timeMin: string
    timeMax: string
    calendarId?: string
  }
): Promise<CalendarEvent[]> {
  const db = await getDb()
  const integrationResult = await db.execute({
    sql: `SELECT access_token, refresh_token FROM calendar_integrations WHERE user_id = ? AND provider = 'google' AND sync_enabled = 1`,
    args: [userId],
  })

  if (integrationResult.rows.length === 0) return []

  let accessToken = integrationResult.rows[0][0] as string
  const refreshToken = integrationResult.rows[0][1] as string | null
  const calendarId = opts.calendarId || 'primary'

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  async function doFetch() {
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const res = await calendar.events.list({
      calendarId,
      timeMin: opts.timeMin,
      timeMax: opts.timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    })

    const events: CalendarEvent[] = (res.data.items || []).map((e) => {
      const start = e.start?.dateTime || e.start?.date || ''
      const end = e.end?.dateTime || e.end?.date || ''
      return {
        id: e.id || '',
        summary: e.summary || '(無題)',
        start,
        end,
        isAllDay: !!e.start?.date,
      }
    })
    return events
  }

  try {
    return await doFetch()
  } catch (err: unknown) {
    const message = (err as { message?: string })?.message || ''
    if (message.includes('401') || message.includes('invalid') || message.includes('token')) {
      const newToken = await refreshAccessToken({
        refresh_token: refreshToken,
      })
      if (newToken) {
        accessToken = newToken
        await db.execute({
          sql: `UPDATE calendar_integrations SET access_token = ? WHERE user_id = ? AND provider = 'google'`,
          args: [newToken, userId],
        })
        return await doFetch()
      }
    }
    throw err
  }
}

/**
 * イベント作成
 */
export async function createCalendarEvent(
  userId: string,
  opts: {
    summary: string
    start: string // ISO8601
    end: string
    calendarId?: string
  }
): Promise<CalendarEvent | null> {
  const calendar = await getCalendarClient(userId)
  if (!calendar) return null

  const calendarId = opts.calendarId || 'primary'
  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: opts.summary,
      start: { dateTime: opts.start, timeZone: 'Asia/Tokyo' },
      end: { dateTime: opts.end, timeZone: 'Asia/Tokyo' },
    },
  })

  const e = res.data
  return {
    id: e.id || '',
    summary: e.summary || opts.summary,
    start: e.start?.dateTime || opts.start,
    end: e.end?.dateTime || opts.end,
    isAllDay: false,
  }
}

/**
 * イベント更新
 */
export async function updateCalendarEvent(
  userId: string,
  opts: {
    eventId: string
    summary?: string
    start?: string
    end?: string
    description?: string
    calendarId?: string
  }
): Promise<CalendarEvent | null> {
  const calendar = await getCalendarClient(userId)
  if (!calendar) return null

  const calendarId = opts.calendarId || 'primary'
  const requestBody: Record<string, unknown> = {}

  if (opts.summary) requestBody.summary = opts.summary
  if (opts.description !== undefined) requestBody.description = opts.description
  if (opts.start) requestBody.start = { dateTime: opts.start, timeZone: 'Asia/Tokyo' }
  if (opts.end) requestBody.end = { dateTime: opts.end, timeZone: 'Asia/Tokyo' }

  const res = await calendar.events.patch({
    calendarId,
    eventId: opts.eventId,
    requestBody,
  })

  const e = res.data
  return {
    id: e.id || opts.eventId,
    summary: e.summary || opts.summary || '',
    start: (e.start?.dateTime || opts.start) as string,
    end: (e.end?.dateTime || opts.end) as string,
    isAllDay: false,
  }
}

/**
 * イベント削除
 */
export async function deleteCalendarEvent(
  userId: string,
  opts: {
    eventId: string
    calendarId?: string
  }
): Promise<boolean> {
  const calendar = await getCalendarClient(userId)
  if (!calendar) return false

  const calendarId = opts.calendarId || 'primary'
  await calendar.events.delete({
    calendarId,
    eventId: opts.eventId,
  })
  return true
}

/**
 * 緊急タスク挿入：指定時刻以降のイベントを後ろにずらす
 */
export async function insertUrgentEvent(
  userId: string,
  opts: {
    summary: string
    start: string // ISO8601
    durationMinutes: number
    description?: string
    calendarId?: string
  }
): Promise<{
  urgentEvent?: CalendarEvent
  shiftedEvents: CalendarEvent[]
  error?: string
}> {
  const calendar = await getCalendarClient(userId)
  if (!calendar) {
    return { shiftedEvents: [], error: 'Calendar not connected' }
  }

  const calendarId = opts.calendarId || 'primary'
  const urgentEnd = new Date(new Date(opts.start).getTime() + opts.durationMinutes * 60000).toISOString()

  // 緊急タスクの開始時刻以降のイベントを取得
  const urgentStart = new Date(opts.start)
  const dayEnd = new Date(urgentStart)
  dayEnd.setHours(23, 59, 59, 999)

  const res = await calendar.events.list({
    calendarId,
    timeMin: opts.start,
    timeMax: dayEnd.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  })

  const events = res.data.items || []

  // 緊急タスクを作成
  const urgentEvent = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `🚨 ${opts.summary}`,
      description: opts.description || '緊急タスク',
      start: { dateTime: opts.start, timeZone: 'Asia/Tokyo' },
      end: { dateTime: urgentEnd, timeZone: 'Asia/Tokyo' },
      colorId: '11', // Red for urgent
    },
  })

  // 以降のイベントをずらしていく
  const shiftedEvents: CalendarEvent[] = []
  let shiftOffset = opts.durationMinutes * 60000 // ミリ秒

  for (const event of events.sort((a, b) => {
    const aStart = new Date(a.start?.dateTime || a.start?.date || 0)
    const bStart = new Date(b.start?.dateTime || b.start?.date || 0)
    return aStart.getTime() - bStart.getTime()
  })) {
    if (!event.id) continue

    const originalStart = event.start?.dateTime
    const originalEnd = event.end?.dateTime
    if (!originalStart || !originalEnd) continue

    const newStart = new Date(new Date(originalStart).getTime() + shiftOffset).toISOString()
    const newEnd = new Date(new Date(originalEnd).getTime() + shiftOffset).toISOString()

    await calendar.events.patch({
      calendarId,
      eventId: event.id,
      requestBody: {
        start: { dateTime: newStart, timeZone: 'Asia/Tokyo' },
        end: { dateTime: newEnd, timeZone: 'Asia/Tokyo' },
      },
    })

    shiftedEvents.push({
      id: event.id,
      summary: event.summary || '(無題)',
      start: newStart,
      end: newEnd,
    })

    shiftOffset += opts.durationMinutes * 60000
  }

  return {
    urgentEvent: {
      id: urgentEvent.data.id || '',
      summary: urgentEvent.data.summary || opts.summary,
      start: urgentEvent.data.start?.dateTime || opts.start,
      end: urgentEvent.data.end?.dateTime || urgentEnd,
    },
    shiftedEvents,
  }
}

/**
 * サブタスク完了時：完了イベントに変更し、以降のイベントを前にずらす
 */
export async function completeSubTaskEvent(
  userId: string,
  opts: {
    eventId: string
    completedAt: string // ISO8601 - 実際の完了時刻
    calendarId?: string
  }
): Promise<{
  completedEvent?: CalendarEvent
  shiftedEvents: CalendarEvent[]
  timeSavedMinutes: number
  error?: string
}> {
  const calendar = await getCalendarClient(userId)
  if (!calendar) {
    return { shiftedEvents: [], timeSavedMinutes: 0, error: 'Calendar not connected' }
  }

  const calendarId = opts.calendarId || 'primary'

  // 完了したイベントを取得
  const eventRes = await calendar.events.get({
    calendarId,
    eventId: opts.eventId,
  })

  const event = eventRes.data
  const originalEnd = event.end?.dateTime
  if (!originalEnd) {
    return { shiftedEvents: [], timeSavedMinutes: 0, error: 'Event has no end time' }
  }

  // 完了マークを付けて更新
  const completedEvent = await calendar.events.patch({
    calendarId,
    eventId: opts.eventId,
    requestBody: {
      summary: `✅ ${event.summary || ''}`,
      description: `完了: ${new Date(opts.completedAt).toLocaleString('ja-JP')}\n${event.description || ''}`,
      end: { dateTime: opts.completedAt, timeZone: 'Asia/Tokyo' },
    },
  })

  // 保存した時間を計算
  const originalEndTime = new Date(originalEnd)
  const completedTime = new Date(opts.completedAt)
  const timeSavedMinutes = Math.max(0, (originalEndTime.getTime() - completedTime.getTime()) / 60000)

  // 完了時刻以降のイベントを前にずらす
  const shiftedEvents: CalendarEvent[] = []

  if (timeSavedMinutes > 1) { // 1分以上節約できた場合のみずらす
    const laterEventsRes = await calendar.events.list({
      calendarId,
      timeMin: originalEnd,
      timeMax: new Date(new Date(originalEnd).getTime() + 24 * 3600000).toISOString(), // 24時間後まで
      singleEvents: true,
      orderBy: 'startTime',
    })

    const shiftOffsetMs = timeSavedMinutes * 60000

    for (const laterEvent of laterEventsRes.data.items || []) {
      if (!laterEvent.id || laterEvent.id === opts.eventId) continue

      const laterStart = laterEvent.start?.dateTime
      const laterEnd = laterEvent.end?.dateTime
      if (!laterStart || !laterEnd) continue

      const newStart = new Date(new Date(laterStart).getTime() - shiftOffsetMs).toISOString()
      const newEnd = new Date(new Date(laterEnd).getTime() - shiftOffsetMs).toISOString()

      await calendar.events.patch({
        calendarId,
        eventId: laterEvent.id,
        requestBody: {
          start: { dateTime: newStart, timeZone: 'Asia/Tokyo' },
          end: { dateTime: newEnd, timeZone: 'Asia/Tokyo' },
        },
      })

      shiftedEvents.push({
        id: laterEvent.id,
        summary: laterEvent.summary || '(無題)',
        start: newStart,
        end: newEnd,
      })
    }
  }

  return {
    completedEvent: {
      id: completedEvent.data.id || '',
      summary: completedEvent.data.summary || '',
      start: completedEvent.data.start?.dateTime || '',
      end: completedEvent.data.end?.dateTime || opts.completedAt,
    },
    shiftedEvents,
    timeSavedMinutes: Math.round(timeSavedMinutes),
  }
}
