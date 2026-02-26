/**
 * GET /api/auth/google/calendar/callback
 * Google OAuth コールバック - トークン取得してDB保存
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../../../../lib/turso/client'
import { cookies } from 'next/headers'

function getBaseUrl(request: NextRequest) {
  try {
    const origin = new URL(request.url).origin
    if (origin) return origin
  } catch {
    // fallback
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000'
  )
}

export async function GET(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect(
      new URL(`/dashboard?error=google_denied&err=${error}`, request.url)
    )
  }

  const cookieStore = await cookies()
  const savedState = cookieStore.get('google_oauth_state')?.value

  if (!state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL('/dashboard?error=invalid_state', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard?error=no_code', request.url))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/dashboard?error=google_config', request.url))
  }

  const redirectUri = `${getBaseUrl(request)}/api/auth/google/calendar/callback`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    const errData = await tokenRes.text()
    console.error('Token exchange failed:', errData)
    return NextResponse.redirect(new URL('/dashboard?error=token_failed', request.url))
  }

  const tokenData = (await tokenRes.json()) as {
    access_token: string
    refresh_token?: string
  }

  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })

  const integrationId = `cal_${userId}_google`
  const existing = await db.execute({
    sql: 'SELECT id FROM calendar_integrations WHERE user_id = ? AND provider = ?',
    args: [userId, 'google'],
  })

  if (existing.rows.length > 0) {
    await db.execute({
      sql: `
        UPDATE calendar_integrations
        SET access_token = ?, refresh_token = ?, sync_enabled = 1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND provider = ?
      `,
      args: [
        tokenData.access_token,
        tokenData.refresh_token || null,
        userId,
        'google',
      ],
    })
  } else {
    await db.execute({
      sql: `
        INSERT INTO calendar_integrations (id, user_id, provider, access_token, refresh_token, sync_enabled)
        VALUES (?, ?, 'google', ?, ?, 1)
      `,
      args: [
        integrationId,
        userId,
        tokenData.access_token,
        tokenData.refresh_token || null,
      ],
    })
  }

  const res = NextResponse.redirect(new URL('/dashboard', request.url))
  res.cookies.delete('google_oauth_state')
  return res
}
