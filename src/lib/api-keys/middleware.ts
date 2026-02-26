/**
 * API Key Authentication Middleware
 *
 * Provides middleware for authenticating and rate limiting API requests
 * using API keys.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAPIKey, updateLastUsed, hasScope, type APIScope } from './index'

// ============================================
// Types
// ============================================

export interface APIKeyAuthResult {
    authorized: boolean
    userId?: string
    keyId?: string
    scopes?: APIScope[]
    error?: string
    statusCode?: number
}

export interface RateLimitState {
    count: number
    resetAt: number
}

// ============================================
// In-Memory Rate Limiting (for serverless)
// Note: In production with multiple instances, use Redis or similar
// ============================================

const rateLimitStore = new Map<string, RateLimitState>()

/**
 * Check and update rate limit for a key
 */
function checkRateLimit(keyId: string, limit: number): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now()
    const windowMs = 60 * 1000 // 1 minute window

    let state = rateLimitStore.get(keyId)

    if (!state || now > state.resetAt) {
        // Start new window
        state = {
            count: 0,
            resetAt: now + windowMs
        }
    }

    state.count++
    rateLimitStore.set(keyId, state)

    const remaining = Math.max(0, limit - state.count)
    const resetIn = Math.max(0, state.resetAt - now)

    return {
        allowed: state.count <= limit,
        remaining,
        resetIn
    }
}

/**
 * Clean up expired rate limit entries periodically
 */
function cleanupRateLimits(): void {
    const now = Date.now()
    const entries = getRateLimitEntries()
    for (const [keyId, state] of entries) {
        if (now > state.resetAt) {
            rateLimitStore.delete(keyId)
        }
    }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupRateLimits, 5 * 60 * 1000)
}

/**
 * Convert MapIterator to array for compatibility
 */
function getRateLimitEntries(): [string, RateLimitState][] {
    const entries: [string, RateLimitState][] = []
    rateLimitStore.forEach((value, key) => {
        entries.push([key, value])
    })
    return entries
}

// ============================================
// Middleware Functions
// ============================================

/**
 * Extract API key from Authorization header
 */
export function extractAPIKey(request: NextRequest): string | null {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader) {
        return null
    }

    // Support "Bearer <key>" format
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7).trim()
    }

    // Support raw key format
    return authHeader.trim()
}

/**
 * Authenticate and authorize an API request
 */
export async function authenticateAPIKey(
    request: NextRequest,
    requiredScope?: APIScope
): Promise<APIKeyAuthResult> {
    const rawKey = extractAPIKey(request)

    if (!rawKey) {
        return {
            authorized: false,
            error: 'Missing Authorization header. Use: Authorization: Bearer <api_key>',
            statusCode: 401
        }
    }

    // Validate the key
    const validation = await validateAPIKey(rawKey)

    if (!validation.valid) {
        return {
            authorized: false,
            error: validation.error || 'Invalid API key',
            statusCode: 401
        }
    }

    // Check scope if required
    if (requiredScope && validation.scopes) {
        if (!hasScope(validation.scopes, requiredScope)) {
            return {
                authorized: false,
                userId: validation.userId,
                error: `Missing required scope: ${requiredScope}`,
                statusCode: 403
            }
        }
    }

    // Check rate limit
    const rateLimitResult = checkRateLimit(validation.keyId!, validation.rateLimit!)

    if (!rateLimitResult.allowed) {
        return {
            authorized: false,
            userId: validation.userId,
            keyId: validation.keyId,
            error: 'Rate limit exceeded. Please try again later.',
            statusCode: 429
        }
    }

    // Update last used timestamp (async, don't wait)
    updateLastUsed(validation.keyId!).catch(() => {
        // Ignore errors in background update
    })

    return {
        authorized: true,
        userId: validation.userId,
        keyId: validation.keyId,
        scopes: validation.scopes
    }
}

/**
 * Higher-order function to wrap API route handlers with API key authentication
 *
 * @example
 * ```ts
 * export const GET = withAPIKeyAuth(
 *   async (request, { userId }) => {
 *     // Your handler logic here
 *     return NextResponse.json({ data: 'success' })
 *   },
 *   'projects:read' // Required scope
 * )
 * ```
 */
export function withAPIKeyAuth<T extends unknown[]>(
    handler: (request: NextRequest, context: { userId: string; scopes: APIScope[] }, ...args: T) => Promise<NextResponse>,
    requiredScope?: APIScope
) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
        const authResult = await authenticateAPIKey(request, requiredScope)

        if (!authResult.authorized) {
            return NextResponse.json(
                {
                    error: authResult.error,
                    success: false
                },
                { status: authResult.statusCode || 401 }
            )
        }

        return handler(request, { userId: authResult.userId!, scopes: authResult.scopes! }, ...args)
    }
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
    return NextResponse.json(
        { error: message, success: false },
        { status: 401 }
    )
}

/**
 * Create a forbidden response
 */
export function forbiddenResponse(message: string = 'Forbidden'): NextResponse {
    return NextResponse.json(
        { error: message, success: false },
        { status: 403 }
    )
}

/**
 * Create a rate limited response
 */
export function rateLimitedResponse(retryAfter: number = 60): NextResponse {
    return NextResponse.json(
        { error: 'Rate limit exceeded', success: false },
        {
            status: 429,
            headers: {
                'Retry-After': String(retryAfter),
                'X-RateLimit-Reset': String(retryAfter)
            }
        }
    )
}
