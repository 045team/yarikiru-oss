/**
 * Code Rules Repository
 *
 * Database operations for code quality rules and review history.
 */

import { execute, executeOne, executeWithMVCC } from './client'
import type { CodeRuleFinding, ReviewHistoryEntry, UserCodeRule } from '../types/code-rules'

// ============================================
// User Code Rules (Custom Settings)
// ============================================

export async function getUserCodeRules(userId: string): Promise<UserCodeRule[]> {
  const sql = `
    SELECT id, user_id, rule_id, is_enabled, created_at, updated_at
    FROM yarikiru_code_rules
    WHERE user_id = ?
    ORDER BY created_at ASC
  `
  const rows = await execute(sql, [userId])
  return rows.map((row: any) => ({
    id: row[0],
    userId: row[1],
    ruleId: row[2],
    isEnabled: row[3] === 1,
    createdAt: row[4],
    updatedAt: row[5],
  }))
}

export async function getUserCodeRule(userId: string, ruleId: string): Promise<UserCodeRule | null> {
  const sql = `
    SELECT id, user_id, rule_id, is_enabled, created_at, updated_at
    FROM yarikiru_code_rules
    WHERE user_id = ? AND rule_id = ?
  `
  const row = await executeOne(sql, [userId, ruleId])
  if (!row) return null

  return {
    id: (row as any)[0],
    userId: (row as any)[1],
    ruleId: (row as any)[2],
    isEnabled: (row as any)[3] === 1,
    createdAt: (row as any)[4],
    updatedAt: (row as any)[5],
  }
}

export async function upsertUserCodeRule(
  userId: string,
  ruleId: string,
  isEnabled: boolean
): Promise<UserCodeRule> {
  const existing = await getUserCodeRule(userId, ruleId)

  if (existing) {
    const sql = `
      UPDATE yarikiru_code_rules
      SET is_enabled = ?, updated_at = datetime('now')
      WHERE id = ?
      RETURNING *
    `
    const [row] = await execute(sql, [isEnabled ? 1 : 0, existing.id])
    const updated = row as any
    return {
      id: updated[0],
      userId: updated[1],
      ruleId: updated[2],
      isEnabled: updated[3] === 1,
      createdAt: updated[4],
      updatedAt: updated[5],
    }
  }

  const id = `ucr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  const sql = `
    INSERT INTO yarikiru_code_rules (id, user_id, rule_id, is_enabled)
    VALUES (?, ?, ?, ?)
    RETURNING *
  `
  const [row] = await executeWithMVCC(sql, [id, userId, ruleId, isEnabled ? 1 : 0])
  const created = row as any
  return {
    id: created[0],
    userId: created[1],
    ruleId: created[2],
    isEnabled: created[3] === 1,
    createdAt: created[4],
    updatedAt: created[5],
  }
}

export async function deleteUserCodeRule(userId: string, ruleId: string): Promise<boolean> {
  const sql = `DELETE FROM yarikiru_code_rules WHERE user_id = ? AND rule_id = ?`
  const result = await execute(sql, [userId, ruleId])
  return result.length > 0
}

export async function resetUserCodeRulesToDefault(userId: string): Promise<void> {
  const sql = `DELETE FROM yarikiru_code_rules WHERE user_id = ?`
  await execute(sql, [userId])
}

// ============================================
// Review History
// ============================================

export async function createReviewHistory(data: {
  userId: string
  goalId: string | null
  rulesPassed: number
  rulesFailed: number
  findings: CodeRuleFinding[]
}): Promise<ReviewHistoryEntry> {
  const id = `rvh_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  const findingsJson = JSON.stringify(data.findings)

  const sql = `
    INSERT INTO yarikiru_review_history (id, user_id, goal_id, rules_passed, rules_failed, findings)
    VALUES (?, ?, ?, ?, ?, ?)
    RETURNING *
  `
  const [row] = await executeWithMVCC(sql, [
    id,
    data.userId,
    data.goalId,
    data.rulesPassed,
    data.rulesFailed,
    findingsJson,
  ])

  const result = row as any
  return {
    id: result[0],
    userId: result[1],
    goalId: result[2],
    reviewDate: result[3],
    rulesPassed: result[4],
    rulesFailed: result[5],
    findings: data.findings,
  }
}

export async function getReviewHistory(
  userId: string,
  limit: number = 50
): Promise<ReviewHistoryEntry[]> {
  const sql = `
    SELECT id, user_id, goal_id, review_date, rules_passed, rules_failed, findings
    FROM yarikiru_review_history
    WHERE user_id = ?
    ORDER BY review_date DESC
    LIMIT ?
  `
  const rows = await execute(sql, [userId, limit])

  return rows.map((row: any) => {
    let findings: CodeRuleFinding[] = []
    try {
      findings = JSON.parse((row as any)[6] || '[]')
    } catch (e) {
      console.error('Failed to parse findings:', e)
    }

    return {
      id: row[0],
      userId: row[1],
      goalId: row[2],
      reviewDate: row[3],
      rulesPassed: row[4],
      rulesFailed: row[5],
      findings,
    }
  })
}

export async function getReviewHistoryByGoal(
  userId: string,
  goalId: string
): Promise<ReviewHistoryEntry[]> {
  const sql = `
    SELECT id, user_id, goal_id, review_date, rules_passed, rules_failed, findings
    FROM yarikiru_review_history
    WHERE user_id = ? AND goal_id = ?
    ORDER BY review_date DESC
  `
  const rows = await execute(sql, [userId, goalId])

  return rows.map((row: any) => {
    let findings: CodeRuleFinding[] = []
    try {
      findings = JSON.parse((row as any)[6] || '[]')
    } catch (e) {
      console.error('Failed to parse findings:', e)
    }

    return {
      id: row[0],
      userId: row[1],
      goalId: row[2],
      reviewDate: row[3],
      rulesPassed: row[4],
      rulesFailed: row[5],
      findings,
    }
  })
}

export async function getReviewStats(userId: string): Promise<{
  totalReviews: number
  averagePassRate: number
  totalFindings: number
}> {
  const sql = `
    SELECT
      COUNT(*) as total_reviews,
      AVG(CAST(rules_passed AS FLOAT) / (rules_passed + rules_failed)) as avg_pass_rate,
      SUM(rules_failed) as total_findings
    FROM yarikiru_review_history
    WHERE user_id = ? AND (rules_passed + rules_failed) > 0
  `
  const row = await executeOne(sql, [userId])

  if (!row) {
    return { totalReviews: 0, averagePassRate: 0, totalFindings: 0 }
  }

  const result = row as any
  return {
    totalReviews: result[0] || 0,
    averagePassRate: Math.round((result[1] || 0) * 100) / 100,
    totalFindings: result[2] || 0,
  }
}
