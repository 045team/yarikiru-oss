// ============================================
// Authentication & Authorization Helpers
// 認証と権限チェックの統合ヘルパー
// ============================================

import { auth as clerkAuth, currentUser } from '@/lib/auth-stub'
import { NextResponse } from 'next/server'
import { getMemberById, getMemberByEmail } from '@/lib/turso/members'
import {
  hasPermission,
  requirePermission,
  isAdmin,
  isModeratorOrAbove,
  forbiddenResponse,
  unauthorizedResponse,
  type Permission,
} from './permissions'
import type { Member, MemberRole } from '@/types/turso'

// ============================================
// Type Definitions
// ============================================

/**
 * Authenticated member with role information
 */
export interface AuthenticatedMember extends Member {
  isAuthenticated: true
}

/**
 * Authentication result (null if not authenticated)
 */
export type AuthResult = AuthenticatedMember | null

/**
 * Authorization result with member data
 */
export type AuthWithPermissionResult = AuthenticatedMember
export type AdminAuthResult = AuthenticatedMember

// ============================================
// Legacy Error Classes (Backward Compatibility)
// ============================================

/**
 * Admin authentication error class
 * @deprecated Use PermissionDeniedError from permissions.ts instead
 */
export class AdminAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AdminAuthError'
  }
}

// ============================================
// Current Member Helpers
// ============================================

/**
 * Get the current member from Clerk session
 *
 * @returns Member data or null if not authenticated
 *
 * @example
 * ```ts
 * import { getCurrentMember } from '@/lib/auth'
 *
 * export async function GET() {
 *   const member = await getCurrentMember()
 *   if (!member) {
 *     return unauthorizedResponse()
 *   }
 *   // ... proceed with authenticated request
 * }
 * ```
 */
export async function getCurrentMember(): Promise<AuthResult> {
  const { userId } = await clerkAuth()

  if (!userId) {
    return null
  }

  const member = await getMemberById(userId)

  // Member exists in database
  if (member) {
    return {
      ...member,
      isAuthenticated: true,
    }
  }

  // User is authenticated via Clerk but not in members table
  // This can happen for newly signed-up users
  return null
}

/**
 * Get current member by email (legacy support)
 *
 * @deprecated Use getCurrentMember() instead which uses userId
 */
export async function getCurrentMemberByEmail(): Promise<Member | null> {
  const user = await currentUser()

  if (!user?.emailAddresses?.[0]?.emailAddress) {
    return null
  }

  const email = user.emailAddresses[0].emailAddress
  return await getMemberByEmail(email)
}

/**
 * Get the current member or throw 401
 *
 * @throws Returns a 401 Response if not authenticated
 * @returns Authenticated member
 *
 * @example
 * ```ts
 * import { requireAuth } from '@/lib/auth'
 *
 * export async function GET() {
 *   const member = await requireAuth()
 *   // member is guaranteed to be authenticated here
 * }
 * ```
 */
export async function requireAuth(): Promise<AuthenticatedMember> {
  const member = await getCurrentMember()

  if (!member) {
    throw unauthorizedResponse()
  }

  return member
}

/**
 * Get current member with specific permission requirement
 *
 * @param permission - Required permission
 * @returns Authenticated member with permission
 * @throws Returns 401 or 403 Response if auth/permission fails
 *
 * @example
 * ```ts
 * import { requireAuthWithPermission } from '@/lib/auth'
 *
 * export async function DELETE(request: Request) {
 *   const member = await requireAuthWithPermission('project:delete')
 *   // member is authenticated and has permission here
 *   // ... proceed with deletion
 * }
 * ```
 */
export async function requireAuthWithPermission(
  permission: Permission
): Promise<AuthWithPermissionResult> {
  const member = await requireAuth()

  if (!hasPermission(member.role, permission)) {
    throw forbiddenResponse(`Required permission: ${permission}`)
  }

  return member
}

// ============================================
// Admin & Role Helpers
// ============================================

/**
 * Check if the current user is an admin
 * Returns the member record if admin, null otherwise
 *
 * @deprecated Use requireAdmin() for throwing version
 */
export async function getAdminMember(): Promise<Member | null> {
  const member = await getCurrentMember()

  if (!member) {
    return null
  }

  if (member.role !== 'admin' || member.status !== 'active') {
    return null
  }

  return member
}

/**
 * Require admin role (new implementation)
 *
 * @returns Authenticated admin member
 * @throws Returns 401 or 403 Response if not admin
 *
 * @example
 * ```ts
 * import { requireAdmin } from '@/lib/auth'
 *
 * export async function DELETE(request: Request) {
 *   const admin = await requireAdmin()
 *   // admin is guaranteed to have admin role here
 * }
 * ```
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const member = await requireAuth()

  if (!isAdmin(member.role)) {
    throw forbiddenResponse('Admin role required')
  }

  return member
}

/**
 * Require moderator role or higher
 *
 * @returns Authenticated moderator or admin member
 * @throws Returns 401 or 403 Response if not moderator/admin
 */
export async function requireModeratorOrAbove(): Promise<AuthenticatedMember> {
  const member = await requireAuth()

  if (!isModeratorOrAbove(member.role)) {
    throw forbiddenResponse('Moderator role required')
  }

  return member
}

/**
 * Check if current user has specific role (legacy)
 *
 * @deprecated Use can() or checkServerPermission() instead
 */
export async function hasRole(requiredRole: string): Promise<boolean> {
  const member = await getCurrentMember()

  if (!member || member.status !== 'active') {
    return false
  }

  return member.role === requiredRole
}

// ============================================
// Permission Check Helpers
// ============================================

/**
 * Check if current user has a specific permission
 *
 * @param permission - Permission to check
 * @returns true if authenticated and has permission
 *
 * @example
 * ```ts
 * import { can } from '@/lib/auth'
 *
 * export async function GET() {
 *   if (await can('project:delete')) {
 *     // show delete button
 *   }
 * }
 * ```
 */
export async function can(permission: Permission): Promise<boolean> {
  const member = await getCurrentMember()

  if (!member) {
    return false
  }

  return hasPermission(member.role, permission)
}

/**
 * Check if current user has any of the specified permissions
 *
 * @param permissions - Array of permissions to check
 * @returns true if authenticated and has at least one permission
 */
export async function canAny(permissions: Permission[]): Promise<boolean> {
  const member = await getCurrentMember()

  if (!member) {
    return false
  }

  return permissions.some((permission) => hasPermission(member.role, permission))
}

/**
 * Check if current user is admin
 *
 * @returns true if authenticated and is admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const member = await getCurrentMember()

  if (!member) {
    return false
  }

  return isAdmin(member.role)
}

/**
 * Check if current user is moderator or higher
 *
 * @returns true if authenticated and is moderator/admin
 */
export async function isCurrentUserModeratorOrAbove(): Promise<boolean> {
  const member = await getCurrentMember()

  if (!member) {
    return false
  }

  return isModeratorOrAbove(member.role)
}

// ============================================
// Server Component Helpers
// ============================================

/**
 * Get member info for server components (non-throwing)
 *
 * Use this in server components where you want to conditionally
 * render UI based on authentication/role.
 *
 * @returns Member info or null
 *
 * @example
 * ```tsx
 * import { getServerMember } from '@/lib/auth'
 *
 * export default async function DashboardPage() {
 *   const member = await getServerMember()
 *
 *   return (
 *     <div>
 *       {member?.role === 'admin' && <AdminPanel />}
 *       {member && <UserPanel email={member.email} />}
 *     </div>
 *   )
 * }
 * ```
 */
export async function getServerMember(): Promise<AuthResult> {
  return getCurrentMember()
}

/**
 * Check permissions in server components
 *
 * @param permission - Permission to check
 * @returns true if current user has the permission
 *
 * @example
 * ```tsx
 * import { checkServerPermission } from '@/lib/auth'
 *
 * export default async function Page() {
 *   const canDelete = await checkServerPermission('project:delete')
 *
 *   return (
 *     <div>
 *       {canDelete && <DeleteButton />}
 *     </div>
 *   )
 * }
 * ```
 */
export async function checkServerPermission(permission: Permission): Promise<boolean> {
  return can(permission)
}

// ============================================
// Client-Side Helpers (for passing from server)
// ============================================

/**
 * Minimal member info for client-side use
 *
 * Only include safe, non-sensitive data
 */
export interface ClientMemberInfo {
  isAuthenticated: boolean
  id: string
  email: string
  fullName: string | null
  role: MemberRole
}

/**
 * Convert Member to ClientMemberInfo (safe for client)
 *
 * @param member - Member from database
 * @returns Safe client-side member info
 */
export function toClientMemberInfo(member: Member | null): ClientMemberInfo | null {
  if (!member) {
    return null
  }

  return {
    isAuthenticated: true,
    id: member.id,
    email: member.email,
    fullName: member.full_name,
    role: member.role,
  }
}

// ============================================
// API Response Helpers
// ============================================

/**
 * Create standardized error response
 */
export function apiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Create standardized success response
 */
export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status })
}

/**
 * Create standardized error response (alias for backward compatibility)
 * @deprecated Use apiError instead
 */
function errorResponse(message: string, status: number = 403) {
  return NextResponse.json({ error: message }, { status })
}

// ============================================
// Middleware Helpers
// ============================================

/**
 * Check if a route requires authentication
 *
 * @param request - Next.js request object
 * @returns true if the route requires authentication
 *
 * This is a helper for middleware to determine if a route
 * should be protected. Modify the publicRoutes list as needed.
 */
export function isProtectedRoute(request: Request): boolean {
  const { pathname } = new URL(request.url)

  const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/api/auth',
    '/api/clerk',
  ]

  // Check if the route starts with any public route
  return !publicRoutes.some((route) => pathname.startsWith(route))
}
