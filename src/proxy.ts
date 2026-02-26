import { clerkMiddleware, createRouteMatcher } from '@/lib/auth-stub'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js proxy for Clerk authentication
 *
 * This proxy runs before every request to protected routes.
 * It validates Clerk auth sessions and redirects unauthenticated users.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 * @deprecated-middleware - Renamed from middleware to proxy in Next.js 16
 */

// Define protected and public routes
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/goals(.*)',
  '/api/(.*)',
])
const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin/(.*)',
])
const isPublicRoute = createRouteMatcher([
  '/',
  '/login',
  '/signup',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback',
])

export const proxy = clerkMiddleware(async (auth, req: NextRequest) => {
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

/**
 * Matcher configuration for proxy
 *
 * Defines which routes the proxy should run on.
 * Include all routes except static files and Next.js internals.
 */
export const config = {
  matcher: [
    // Match all paths except:
    // - _next (Next.js internals)
    // - static files (images, fonts, etc.)
    // - favicon.ico
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)).*)',
  ],
}
