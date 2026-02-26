import { execute, executeOne, executeWithMVCC } from './client'
import {
  MemberSchema,
  MemberActivitySchema,
  MemberSessionSchema,
} from '@/lib/validation/schemas'
import type {
  Member,
  MemberInsert,
  MemberUpdate,
  MemberActivity,
  MemberActivityInsert,
  MemberSession,
  MemberSessionInsert,
  MemberFilters,
  ActivityStats,
  MemberActivityType,
} from '@/types/turso'

// Re-export types for convenience
export type { MemberFilters, ActivityStats }

// ============================================
// Members Table Operations
// ============================================

/**
 * Get member by ID
 * For local-mode users (local-user), returns a synthetic member with Vertex AI credentials from env
 */
export async function getMemberById(memberId: string): Promise<Member | null> {
  // For local MCP mode, return synthetic member with Vertex AI credentials from environment
  if (memberId === 'local-user') {
    const vertexAIKey = process.env.VERTEX_AI_SERVICE_ACCOUNT_KEY
    const vertexProjectId = process.env.VERTEX_PROJECT_ID

    if (vertexAIKey) {
      return {
        id: 'local-user',
        email: 'local@yarikiru.dev',
        full_name: 'Local User',
        role: 'member',
        status: 'active',
        subscription_plan: 'pro',
        subscription_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        vertex_ai_api_key: vertexAIKey,
        // Other fields as null/defaults
        last_active_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
      } as Member
    }
  }

  const sql = `SELECT * FROM members WHERE id = ?`
  return await executeOne<Member>(sql, [memberId])
}

/**
 * Get member by email
 */
export async function getMemberByEmail(email: string): Promise<Member | null> {
  const sql = `SELECT * FROM members WHERE email = ?`
  return await executeOne<Member>(sql, [email])
}

/**
 * Create a new member
 */
export async function createMember(data: MemberInsert): Promise<Member> {
  const validated = MemberSchema.parse(data)
  const id = validated.id || crypto.randomUUID()

  const sql = `
    INSERT INTO members (
      id, email, full_name, role, status,
      subscription_plan, subscription_status, subscription_start_date, subscription_end_date,
      company_name, industry, phone, avatar_url, bio, preferences,
      last_active_at, last_sign_in_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `

  const [result] = await executeWithMVCC<Member>(sql, [
    id,
    validated.email,
    validated.full_name || null,
    validated.role || 'member',
    validated.status || 'active',
    validated.subscription_plan || 'free',
    validated.subscription_status || 'active',
    validated.subscription_start_date || null,
    validated.subscription_end_date || null,
    validated.company_name || null,
    validated.industry || null,
    validated.phone || null,
    validated.avatar_url || null,
    validated.bio || null,
    validated.preferences || null,
    validated.last_active_at || null,
    validated.last_sign_in_at || null,
  ])

  return result!
}

/**
 * Update member
 */
export async function updateMember(
  memberId: string,
  data: MemberUpdate
): Promise<Member | null> {
  const fields: string[] = []
  const values: (string | number | null)[] = []

  if (data.email !== undefined) {
    fields.push('email = ?')
    values.push(data.email)
  }
  if (data.full_name !== undefined) {
    fields.push('full_name = ?')
    values.push(data.full_name)
  }
  if (data.role !== undefined) {
    fields.push('role = ?')
    values.push(data.role)
  }
  if (data.status !== undefined) {
    fields.push('status = ?')
    values.push(data.status)
  }
  if (data.subscription_plan !== undefined) {
    fields.push('subscription_plan = ?')
    values.push(data.subscription_plan)
  }
  if (data.subscription_status !== undefined) {
    fields.push('subscription_status = ?')
    values.push(data.subscription_status)
  }
  if (data.subscription_start_date !== undefined) {
    fields.push('subscription_start_date = ?')
    values.push(data.subscription_start_date)
  }
  if (data.subscription_end_date !== undefined) {
    fields.push('subscription_end_date = ?')
    values.push(data.subscription_end_date)
  }
  if (data.company_name !== undefined) {
    fields.push('company_name = ?')
    values.push(data.company_name)
  }
  if (data.industry !== undefined) {
    fields.push('industry = ?')
    values.push(data.industry)
  }
  if (data.phone !== undefined) {
    fields.push('phone = ?')
    values.push(data.phone)
  }
  if (data.avatar_url !== undefined) {
    fields.push('avatar_url = ?')
    values.push(data.avatar_url)
  }
  if (data.bio !== undefined) {
    fields.push('bio = ?')
    values.push(data.bio)
  }
  if (data.preferences !== undefined) {
    fields.push('preferences = ?')
    values.push(data.preferences)
  }
  if (data.last_active_at !== undefined) {
    fields.push('last_active_at = ?')
    values.push(data.last_active_at)
  }
  if (data.last_sign_in_at !== undefined) {
    fields.push('last_sign_in_at = ?')
    values.push(data.last_sign_in_at)
  }

  if (fields.length === 0) return await getMemberById(memberId)

  values.push(memberId)

  const sql = `
    UPDATE members
    SET ${fields.join(', ')}
    WHERE id = ?
    RETURNING *
  `

  return await executeOne<Member>(sql, values)
}

/**
 * Delete member (soft delete by setting status to 'deleted')
 */
export async function deleteMember(memberId: string): Promise<boolean> {
  const sql = `
    UPDATE members
    SET status = 'deleted'
    WHERE id = ?
  `
  const result = await execute<{ changes: number }>(sql, [memberId])
  return result.length > 0 && (result[0] as any).changes > 0
}

/**
 * Hard delete member (permanently remove from database)
 * Use with caution!
 */
export async function hardDeleteMember(memberId: string): Promise<boolean> {
  const sql = `DELETE FROM members WHERE id = ?`
  const result = await execute<{ changes: number }>(sql, [memberId])
  return result.length > 0 && (result[0] as any).changes > 0
}

/**
 * List members with optional filters
 */
export async function listMembers(
  filters: MemberFilters = {}
): Promise<Member[]> {
  const conditions: string[] = []
  const values: (string | number)[] = []

  // Filter by status (default to active only if not specified)
  if (filters.status) {
    conditions.push('status = ?')
    values.push(filters.status)
  } else {
    conditions.push("status != 'deleted'")
  }

  if (filters.role) {
    conditions.push('role = ?')
    values.push(filters.role)
  }

  if (filters.subscription_plan) {
    conditions.push('subscription_plan = ?')
    values.push(filters.subscription_plan)
  }

  const limit = filters.limit || 100
  const offset = filters.offset || 0

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const sql = `
    SELECT * FROM members
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `

  return await execute<Member>(sql, [...values, limit, offset])
}

/**
 * Update last active timestamp
 */
export async function updateLastActive(memberId: string): Promise<void> {
  const sql = `
    UPDATE members
    SET last_active_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `
  await execute(sql, [memberId])
}

/**
 * Suspend member
 */
export async function suspendMember(memberId: string): Promise<Member | null> {
  return await updateMember(memberId, { status: 'suspended' })
}

/**
 * Activate member
 */
export async function activateMember(memberId: string): Promise<Member | null> {
  return await updateMember(memberId, { status: 'active' })
}

/**
 * Count members by status
 */
export async function countMembersByStatus(): Promise<Record<string, number>> {
  const sql = `
    SELECT status, COUNT(*) as count
    FROM members
    GROUP BY status
  `
  const rows = await execute<{ status: string; count: number }>(sql, [])

  const result: Record<string, number> = {
    active: 0,
    suspended: 0,
    deleted: 0,
  }

  for (const row of rows) {
    if (row.status in result) {
      result[row.status] = row.count
    }
  }

  return result
}

// ============================================
// MemberActivities Table Operations
// ============================================

/**
 * Create member activity log
 */
export async function createMemberActivity(
  data: MemberActivityInsert
): Promise<MemberActivity> {
  const validated = MemberActivitySchema.parse(data)
  const id = validated.id || crypto.randomUUID()

  const sql = `
    INSERT INTO member_activities (
      id, member_id, activity_type, activity_data, ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?)
    RETURNING *
  `

  const [result] = await executeWithMVCC<MemberActivity>(sql, [
    id,
    validated.member_id,
    validated.activity_type,
    validated.activity_data || null,
    validated.ip_address || null,
    validated.user_agent || null,
  ])

  return result!
}

/**
 * Get member activities
 */
export async function getMemberActivities(
  memberId: string,
  limit = 50
): Promise<MemberActivity[]> {
  const sql = `
    SELECT * FROM member_activities
    WHERE member_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `
  return await execute<MemberActivity>(sql, [memberId, limit])
}

/**
 * Get activity stats for a member
 */
export async function getActivityStats(
  memberId: string,
  period?: string
): Promise<ActivityStats> {
  let sql = `
    SELECT
      COUNT(*) as total_activities,
      activity_type,
      MAX(created_at) as last_activity_at
    FROM member_activities
    WHERE member_id = ?
  `

  const params: (string | number)[] = [memberId]

  if (period) {
    // Add date filtering based on period (e.g., '7d', '30d', '90d')
    const days = parseInt(period.replace(/\D/g, ''))
    if (!isNaN(days)) {
      sql += ` AND created_at >= datetime('now', '-' || ? || ' days')`
      params.push(days)
    }
  }

  sql += `
    GROUP BY activity_type
    ORDER BY total_activities DESC
  `

  const rows = await execute<{
    total_activities: number
    activity_type: MemberActivityType
    last_activity_at: string
  }>(sql, params)

  const activitiesByType: Partial<Record<MemberActivityType, number>> = {}
  let totalActivities = 0
  let mostCommonActivity: MemberActivityType | null = null
  let maxCount = 0
  let lastActivityAt: string | null = null

  for (const row of rows) {
    activitiesByType[row.activity_type] = row.total_activities
    totalActivities += row.total_activities

    if (row.total_activities > maxCount) {
      maxCount = row.total_activities
      mostCommonActivity = row.activity_type
    }

    if (!lastActivityAt || row.last_activity_at > lastActivityAt) {
      lastActivityAt = row.last_activity_at
    }
  }

  return {
    total_activities: totalActivities,
    activities_by_type: activitiesByType,
    last_activity_at: lastActivityAt,
    most_common_activity: mostCommonActivity,
  }
}

/**
 * Get recent activities across all members
 */
export async function getRecentActivities(
  limit = 100,
  activityType?: MemberActivityType
): Promise<MemberActivity[]> {
  let sql = `
    SELECT ma.*, m.email, m.full_name
    FROM member_activities ma
    JOIN members m ON ma.member_id = m.id
    WHERE m.status != 'deleted'
  `

  const params: (string | number)[] = []

  if (activityType) {
    sql += ` AND ma.activity_type = ?`
    params.push(activityType)
  }

  sql += `
    ORDER BY ma.created_at DESC
    LIMIT ?
  `

  params.push(limit)

  return await execute<MemberActivity>(sql, params)
}

// ============================================
// MemberSessions Table Operations
// ============================================

/**
 * Create a new session
 */
export async function createSession(
  data: MemberSessionInsert
): Promise<MemberSession> {
  const validated = MemberSessionSchema.parse(data)
  const id = validated.id || crypto.randomUUID()

  const sql = `
    INSERT INTO member_sessions (
      id, member_id, session_token, user_agent, ip_address, expires_at, last_accessed_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    RETURNING *
  `

  const [result] = await executeWithMVCC<MemberSession>(sql, [
    id,
    validated.member_id,
    validated.session_token,
    validated.user_agent || null,
    validated.ip_address || null,
    validated.expires_at,
  ])

  return result!
}

/**
 * Get session by token
 */
export async function getSession(
  sessionToken: string
): Promise<MemberSession | null> {
  const sql = `
    SELECT * FROM member_sessions
    WHERE session_token = ? AND expires_at > CURRENT_TIMESTAMP
  `
  return await executeOne<MemberSession>(sql, [sessionToken])
}

/**
 * Get session with member info
 */
export async function getSessionWithMember(
  sessionToken: string
): Promise<(MemberSession & Member) | null> {
  const sql = `
    SELECT ms.*, m.email, m.full_name, m.role, m.status
    FROM member_sessions ms
    JOIN members m ON ms.member_id = m.id
    WHERE ms.session_token = ? AND ms.expires_at > CURRENT_TIMESTAMP AND m.status = 'active'
  `
  return await executeOne<any>(sql, [sessionToken])
}

/**
 * Delete session (logout)
 */
export async function deleteSession(sessionToken: string): Promise<boolean> {
  const sql = `DELETE FROM member_sessions WHERE session_token = ?`
  const result = await execute<{ changes: number }>(sql, [sessionToken])
  return result.length > 0 && (result[0] as any).changes > 0
}

/**
 * Delete all sessions for a member
 */
export async function deleteAllMemberSessions(memberId: string): Promise<number> {
  const sql = `DELETE FROM member_sessions WHERE member_id = ?`
  const result = await execute<{ changes: number }>(sql, [memberId])
  return result.length > 0 ? (result[0] as any).changes : 0
}

/**
 * Clean expired sessions
 */
export async function cleanExpiredSessions(): Promise<number> {
  const sql = `DELETE FROM member_sessions WHERE expires_at <= CURRENT_TIMESTAMP`
  const result = await execute<{ changes: number }>(sql, [])
  return result.length > 0 ? (result[0] as any).changes : 0
}

/**
 * Update session last accessed time
 */
export async function updateSessionAccess(sessionToken: string): Promise<void> {
  const sql = `
    UPDATE member_sessions
    SET last_accessed_at = CURRENT_TIMESTAMP
    WHERE session_token = ?
  `
  await execute(sql, [sessionToken])
}

/**
 * Get active session count for a member
 */
export async function getActiveSessionCount(memberId: string): Promise<number> {
  const sql = `
    SELECT COUNT(*) as count
    FROM member_sessions
    WHERE member_id = ? AND expires_at > CURRENT_TIMESTAMP
  `
  const result = await executeOne<{ count: number }>(sql, [memberId])
  return result?.count || 0
}

// ============================================
// Admin Statistics Operations
// ============================================

/**
 * Get member statistics for admin dashboard
 */
export async function getMemberStats(): Promise<{
  total_members: number
  active_members: number
  suspended_members: number
  deleted_members: number
  by_role: Record<string, number>
  by_subscription_plan: Record<string, number>
  today_active_members: number
}> {
  // Get status counts
  const statusSql = `
    SELECT status, COUNT(*) as count
    FROM members
    GROUP BY status
  `
  const statusRows = await execute<{ status: string; count: number }>(statusSql, [])

  const statusCounts: Record<string, number> = {
    active: 0,
    suspended: 0,
    deleted: 0,
  }
  for (const row of statusRows) {
    statusCounts[row.status] = row.count
  }

  // Get role counts
  const roleSql = `
    SELECT role, COUNT(*) as count
    FROM members
    WHERE status != 'deleted'
    GROUP BY role
  `
  const roleRows = await execute<{ role: string; count: number }>(roleSql, [])

  const byRole: Record<string, number> = {
    admin: 0,
    moderator: 0,
    member: 0,
  }
  for (const row of roleRows) {
    byRole[row.role] = row.count
  }

  // Get subscription plan counts
  const planSql = `
    SELECT subscription_plan, COUNT(*) as count
    FROM members
    WHERE status != 'deleted'
    GROUP BY subscription_plan
  `
  const planRows = await execute<{ subscription_plan: string; count: number }>(planSql, [])

  const byPlan: Record<string, number> = {
    free: 0,
    basic: 0,
    pro: 0,
  }
  for (const row of planRows) {
    byPlan[row.subscription_plan] = row.count
  }

  // Get today's active members (last_active_at today)
  const todaySql = `
    SELECT COUNT(*) as count
    FROM members
    WHERE status = 'active'
      AND date(last_active_at) = date('now')
  `
  const todayResult = await executeOne<{ count: number }>(todaySql, [])

  return {
    total_members: statusCounts.active + statusCounts.suspended + statusCounts.deleted,
    active_members: statusCounts.active,
    suspended_members: statusCounts.suspended,
    deleted_members: statusCounts.deleted,
    by_role: byRole,
    by_subscription_plan: byPlan,
    today_active_members: todayResult?.count || 0,
  }
}

/**
 * Count total members with filters
 */
export async function countMembers(filters: MemberFilters = {}): Promise<number> {
  const conditions: string[] = []
  const values: (string | number)[] = []

  if (filters.status) {
    conditions.push('status = ?')
    values.push(filters.status)
  } else {
    conditions.push("status != 'deleted'")
  }

  if (filters.role) {
    conditions.push('role = ?')
    values.push(filters.role)
  }

  if (filters.subscription_plan) {
    conditions.push('subscription_plan = ?')
    values.push(filters.subscription_plan)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const sql = `SELECT COUNT(*) as count FROM members ${whereClause}`

  const result = await executeOne<{ count: number }>(sql, values)
  return result?.count || 0
}
