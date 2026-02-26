/**
 * Embeddings Quota Management
 *
 * Manages monthly and daily usage limits for embedding generation.
 * Prevents unexpected API costs by enforcing quotas.
 */

import { execute, executeOne, executeWithMVCC } from './client'
import type {
  EmbeddingsQuota,
  EmbeddingsQuotaInsert,
} from '@/types/turso'

/**
 * Get user's quota record
 */
export async function getUserQuota(userId: string): Promise<EmbeddingsQuota | null> {
  const sql = `SELECT * FROM user_embeddings_quota WHERE user_id = ?`
  return await executeOne<EmbeddingsQuota>(sql, [userId])
}

/**
 * Initialize quota record for a new user
 */
export async function initializeUserQuota(
  userId: string,
  monthLimit: number = 10000,
  dayLimit: number = 500
): Promise<EmbeddingsQuota> {
  const sql = `
    INSERT INTO user_embeddings_quota (user_id, month_count, month_limit, day_count, day_limit, last_reset)
    VALUES (?, 0, ?, 0, ?, datetime('now'))
    RETURNING *
  `

  const [result] = await executeWithMVCC<EmbeddingsQuota>(sql, [userId, monthLimit, dayLimit])
  return result!
}

/**
 * Check if user can generate more embeddings (quota not exceeded)
 * Resets counters if needed (new month/day)
 */
export async function checkQuotaAvailable(userId: string): Promise<{
  allowed: boolean
  quota: EmbeddingsQuota
  reason?: string
}> {
  let quota = await getUserQuota(userId)

  // Initialize if not exists
  if (!quota) {
    quota = await initializeUserQuota(userId)
  }

  const now = new Date()
  const lastReset = quota.last_reset ? new Date(quota.last_reset) : new Date(0)

  // Check if month reset needed
  const monthChanged = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()
  // Check if day reset needed
  const dayChanged = now.toDateString() !== lastReset.toDateString()

  // Perform resets if needed
  if (monthChanged || dayChanged) {
    const newMonthCount = monthChanged ? 0 : quota.month_count
    const newDayCount = dayChanged ? 0 : quota.day_count

    const updateSql = `
      UPDATE user_embeddings_quota
      SET month_count = ?, day_count = ?, last_reset = datetime('now')
      WHERE user_id = ?
      RETURNING *
    `

    const [updated] = await executeWithMVCC<EmbeddingsQuota>(updateSql, [newMonthCount, newDayCount, userId])
    quota = updated!
  }

  // Check limits
  if (quota.month_count >= quota.month_limit) {
    return {
      allowed: false,
      quota,
      reason: `Monthly limit reached (${quota.month_count}/${quota.month_limit})`,
    }
  }

  if (quota.day_count >= quota.day_limit) {
    return {
      allowed: false,
      quota,
      reason: `Daily limit reached (${quota.day_count}/${quota.day_limit})`,
    }
  }

  return { allowed: true, quota }
}

/**
 * Increment quota counters after successful embedding generation
 */
export async function incrementQuota(userId: string): Promise<EmbeddingsQuota> {
  const sql = `
    UPDATE user_embeddings_quota
    SET month_count = month_count + 1,
        day_count = day_count + 1,
        last_reset = datetime('now')
    WHERE user_id = ?
    RETURNING *
  `

  const [result] = await executeWithMVCC<EmbeddingsQuota>(sql, [userId])

  if (!result) {
    // Initialize if not exists
    return await initializeUserQuota(userId)
  }

  return result
}

/**
 * Update quota limits (e.g., for premium users)
 */
export async function updateQuotaLimits(
  userId: string,
  monthLimit?: number,
  dayLimit?: number
): Promise<EmbeddingsQuota | null> {
  const updates: string[] = []
  const values: (string | number)[] = []

  if (monthLimit !== undefined) {
    updates.push('month_limit = ?')
    values.push(monthLimit)
  }

  if (dayLimit !== undefined) {
    updates.push('day_limit = ?')
    values.push(dayLimit)
  }

  if (updates.length === 0) {
    return await getUserQuota(userId)
  }

  values.push(userId)

  const sql = `
    UPDATE user_embeddings_quota
    SET ${updates.join(', ')}
    WHERE user_id = ?
    RETURNING *
  `

  const [result] = await executeWithMVCC<EmbeddingsQuota>(sql, values)
  return result || null
}
