// ============================================
// Permission System
// ロールベースアクセス制御（RBAC）
// ============================================

import type { MemberRole } from '@/types/turso'

/**
 * Permission definition
 * 機能ごとの権限を定義
 */
export type Permission =
  | 'project:create'
  | 'project:read'
  | 'project:update'
  | 'project:delete'
  | 'goal:create'
  | 'goal:read'
  | 'goal:update'
  | 'goal:delete'
  | 'goal:complete'
  | 'member:manage'
  | 'member:read'
  | 'stats:read'
  | 'admin:all'

/**
 * Role-based permissions mapping
 * ロールごとの許可権限を定義
 */
const ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  admin: ['admin:all'], // 全権限（ワイルドカード扱い）
  moderator: [
    'project:read',
    'project:update',
    'goal:read',
    'goal:update',
    'goal:complete',
    'member:read',
    'stats:read',
  ],
  member: [
    'project:create',
    'project:read',
    'project:update',
    'goal:create',
    'goal:read',
    'goal:update',
    'goal:complete',
  ],
}

/**
 * Wildcard permission for admin
 */
const ADMIN_WILDCARD = 'admin:all'

/**
 * Check if a role has a specific permission
 *
 * @param role - The member role to check
 * @param permission - The permission to verify
 * @returns true if the role has the permission
 *
 * @example
 * ```ts
 * import { hasPermission } from '@/lib/permissions'
 * import type { MemberRole } from '@/types/turso'
 *
 * const isAdmin = hasPermission('admin', 'member:manage') // true
 * const isMemberAllowed = hasPermission('member', 'project:delete') // false
 * ```
 */
export function hasPermission(role: MemberRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role]

  // Admin has all permissions via wildcard
  if (permissions.includes(ADMIN_WILDCARD)) {
    return true
  }

  return permissions.includes(permission)
}

/**
 * Check if a role has any of the specified permissions
 *
 * @param role - The member role to check
 * @param permissions - Array of permissions to verify (OR condition)
 * @returns true if the role has at least one of the permissions
 *
 * @example
 * ```ts
 * const canAccess = hasAnyPermission('member', [
 *   'project:read',
 *   'project:create'
 * ]) // true
 * ```
 */
export function hasAnyPermission(role: MemberRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission))
}

/**
 * Check if a role has all of the specified permissions
 *
 * @param role - The member role to check
 * @param permissions - Array of permissions to verify (AND condition)
 * @returns true if the role has all of the permissions
 *
 * @example
 * ```ts
 * const canManage = hasAllPermissions('admin', [
 *   'project:delete',
 *   'member:manage'
 * ]) // true
 * ```
 */
export function hasAllPermissions(role: MemberRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission))
}

/**
 * Require a permission or throw an error
 *
 * Use this function when you want to enforce permission checks
 * and automatically throw on denial.
 *
 * @param role - The member role to check
 * @param permission - The required permission
 * @throws {PermissionDeniedError} if the role lacks the permission
 *
 * @example
 * ```ts
 * import { requirePermission } from '@/lib/permissions'
 *
 * function deleteProject(role: MemberRole, projectId: string) {
 *   requirePermission(role, 'project:delete')
 *   // ... proceed with deletion
 * }
 * ```
 */
export function requirePermission(role: MemberRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new PermissionDeniedError(role, permission)
  }
}

/**
 * Require any of the specified permissions
 *
 * @param role - The member role to check
 * @param permissions - Array of permissions (at least one required)
 * @throws {PermissionDeniedError} if the role lacks all permissions
 */
export function requireAnyPermission(role: MemberRole, permissions: Permission[]): void {
  if (!hasAnyPermission(role, permissions)) {
    throw new PermissionDeniedError(role, permissions.join(' | '))
  }
}

/**
 * Check if a role is in the allowed roles list
 *
 * @param role - The member role to check
 * @param allowedRoles - Array of roles that are permitted
 * @returns true if the role is in the allowed list
 *
 * @example
 * ```ts
 * const canAccess = requireRole('admin', ['admin', 'moderator']) // true
 * const isMemberAllowed = requireRole('member', ['admin', 'moderator']) // false
 * ```
 */
export function requireRole(role: MemberRole, allowedRoles: MemberRole[]): boolean {
  return allowedRoles.includes(role)
}

/**
 * Require a specific role or throw an error
 *
 * @param role - The member role to check
 * @param allowedRoles - Array of roles that are permitted
 * @throws {RoleDeniedError} if the role is not in the allowed list
 */
export function requireRoleOrThrow(role: MemberRole, allowedRoles: MemberRole[]): void {
  if (!requireRole(role, allowedRoles)) {
    throw new RoleDeniedError(role, allowedRoles)
  }
}

/**
 * Get all permissions for a given role
 *
 * @param role - The member role
 * @returns Array of permissions for the role (admin returns special wildcard indicator)
 *
 * @example
 * ```ts
 * import { getPermissionsForRole } from '@/lib/permissions'
 *
 * const memberPerms = getPermissionsForRole('member')
 * // ['project:create', 'project:read', ...]
 * ```
 */
export function getPermissionsForRole(role: MemberRole): Permission[] {
  return ROLE_PERMISSIONS[role]
}

/**
 * Check if role is admin
 */
export function isAdmin(role: MemberRole): boolean {
  return role === 'admin'
}

/**
 * Check if role is moderator or higher
 */
export function isModeratorOrAbove(role: MemberRole): boolean {
  return role === 'admin' || role === 'moderator'
}

// ============================================
// Error Classes
// ============================================

/**
 * Custom error for permission denial
 */
export class PermissionDeniedError extends Error {
  public readonly role: MemberRole
  public readonly permission: string
  public readonly code = 'PERMISSION_DENIED'

  constructor(role: MemberRole, permission: string) {
    super(`Role '${role}' does not have permission '${permission}'`)
    this.name = 'PermissionDeniedError'
    this.role = role
    this.permission = permission
  }
}

/**
 * Custom error for role denial
 */
export class RoleDeniedError extends Error {
  public readonly role: MemberRole
  public readonly allowedRoles: MemberRole[]
  public readonly code = 'ROLE_DENIED'

  constructor(role: MemberRole, allowedRoles: MemberRole[]) {
    super(`Role '${role}' is not in allowed roles: ${allowedRoles.join(', ')}`)
    this.name = 'RoleDeniedError'
    this.role = role
    this.allowedRoles = allowedRoles
  }
}

// ============================================
// HTTP Response Helpers
// ============================================

/**
 * Create a 403 Forbidden response for API routes
 *
 * @param message - Optional error message
 * @returns Response object with 403 status
 *
 * @example
 * ```ts
 * import { forbiddenResponse } from '@/lib/permissions'
 *
 * export async function DELETE(request: Request) {
 *   const member = await getCurrentMember()
 *   if (!hasPermission(member.role, 'project:delete')) {
 *     return forbiddenResponse('この操作を実行する権限がありません')
 *   }
 *   // ...
 * }
 * ```
 */
export function forbiddenResponse(message = 'Forbidden'): Response {
  return Response.json(
    {
      error: message,
      code: 'PERMISSION_DENIED',
    },
    { status: 403 }
  )
}

/**
 * Create a 401 Unauthorized response for API routes
 *
 * @param message - Optional error message
 * @returns Response object with 401 status
 */
export function unauthorizedResponse(message = 'Unauthorized'): Response {
  return Response.json(
    {
      error: message,
      code: 'UNAUTHORIZED',
    },
    { status: 401 }
  )
}
