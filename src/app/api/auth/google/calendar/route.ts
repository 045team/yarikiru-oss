/**
 * GET /api/auth/google/calendar
 * Google OAuth 開始 - Google の認可画面へリダイレクト
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { randomBytes } from 'crypto'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ')

function getBaseUrl(request: NextRequest) {
  // リクエストのオリジンを使用（ポート・ホストが確実に一致）
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

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set')
    return NextResponse.redirect(
      new URL('/dashboard?error=google_config', request.url)
    )
  }

  const state = randomBytes(32).toString('hex')
  const baseUrl = getBaseUrl(request)
  const redirectUri = `${baseUrl}/api/auth/google/calendar/callback`

  // デバッグ: 使用中の redirect_uri をログ出力（本番では削除可）
  if (process.env.NODE_ENV === 'development') {
    console.log('[Google OAuth] redirect_uri:', redirectUri)
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  const res = NextResponse.redirect(authUrl)
  res.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return res
}
