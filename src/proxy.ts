import { localProxy } from '@/lib/auth-stub'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/** Local-First OSS: ルートリダイレクト処理。認証は auth-stub が常に local-oss-user を返す。 */
export const proxy = localProxy(async (_auth, req: NextRequest) => {
  // Allow MCP endpoint to handle its own API Key authentication
  if (req.nextUrl.pathname.startsWith('/api/mcp')) {
    return NextResponse.next()
  }

  // Allow Webhooks endpoints to handle their own authentication
  if (req.nextUrl.pathname.startsWith('/api/webhooks')) {
    return NextResponse.next()
  }

  // Local-First OSS: Redirect root to dashboard, bypass login
  if (req.nextUrl.pathname === '/') {
    const dashboardUrl = new URL('/dashboard', req.url)
    return NextResponse.redirect(dashboardUrl)
  }

  // Bypass all other authentication for local-first tool
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)).*)'],
}
