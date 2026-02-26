// ============================================
// Ideas (Quick Capture) - Turso Operations
// ============================================

import { execute, executeOne } from './client'
import { encryptForDb, decryptFromDb } from '../e2ee'
import type { IdeaStatus, Idea, CreateIdeaInput } from '@/types/turso'

// Re-export types for backward compatibility
export type { IdeaStatus, Idea, CreateIdeaInput }

// ------------------------------------------
// Queries
// ------------------------------------------

/**
 * Get all ideas for a user
 */
export async function getIdeasByUserId(
  userId: string,
  options: { status?: IdeaStatus; limit?: number } = {}
): Promise<Idea[]> {
  let sql = `
    SELECT id, user_id, title, description, status, created_at, updated_at
    FROM ideas
    WHERE user_id = ?
  `
  const params: (string | number)[] = [userId]

  if (options.status) {
    sql += ' AND status = ?'
    params.push(options.status)
  }

  sql += ' ORDER BY created_at DESC'

  if (options.limit) {
    sql += ' LIMIT ?'
    params.push(options.limit)
  }

  const rows = await execute<any>(sql, params)

  return Promise.all(
    rows.map(async (row) => ({
      id: row[0] as string,
      userId: row[1] as string,
      title: await decryptFromDb(row[2] as string),
      description: row[3] ? await decryptFromDb(row[3] as string) : null,
      status: row[4] as IdeaStatus,
      createdAt: row[5] as string,
      updatedAt: row[6] as string,
    }))
  )
}

/**
 * Get a single idea by ID
 */
export async function getIdeaById(
  id: string,
  userId: string
): Promise<Idea | null> {
  const row = await executeOne<any>(
    `SELECT id, user_id, title, description, status, created_at, updated_at
     FROM ideas
     WHERE id = ? AND user_id = ?`,
    [id, userId]
  )

  if (!row) return null

  return {
    id: row[0] as string,
    userId: row[1] as string,
    title: await decryptFromDb(row[2] as string),
    description: row[3] ? await decryptFromDb(row[3] as string) : null,
    status: row[4] as IdeaStatus,
    createdAt: row[5] as string,
    updatedAt: row[6] as string,
  }
}

/**
 * Get draft ideas count
 */
export async function getDraftIdeasCount(userId: string): Promise<number> {
  const row = await executeOne<any>(
    `SELECT COUNT(*) as count FROM ideas WHERE user_id = ? AND status = 'draft'`,
    [userId]
  )

  return row?.[0] as number || 0
}

// ------------------------------------------
// Mutations
// ------------------------------------------

/**
 * Create a new idea
 */
export async function createIdea(input: CreateIdeaInput): Promise<Idea> {
  const id = crypto.randomUUID()
  const encryptedTitle = await encryptForDb(input.title.trim())
  const encryptedDescription = input.description
    ? await encryptForDb(input.description.trim())
    : null

  await execute(
    `INSERT INTO ideas (id, user_id, title, description, status)
     VALUES (?, ?, ?, ?, 'draft')`,
    [id, input.userId, encryptedTitle, encryptedDescription]
  )

  const idea = await getIdeaById(id, input.userId)
  if (!idea) {
    throw new Error('Failed to create idea')
  }

  return idea
}

/**
 * Update idea status
 */
export async function updateIdeaStatus(
  id: string,
  userId: string,
  status: IdeaStatus
): Promise<Idea | null> {
  await execute(
    `UPDATE ideas SET status = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`,
    [status, id, userId]
  )

  return getIdeaById(id, userId)
}

/**
 * Update idea content
 */
export async function updateIdea(
  id: string,
  userId: string,
  updates: {
    title?: string
    description?: string
    status?: IdeaStatus
  }
): Promise<Idea | null> {
  const fields: string[] = []
  const values: (string | number)[] = []

  if (updates.title !== undefined) {
    fields.push('title = ?')
    const encryptedTitle = await encryptForDb(updates.title.trim())
    values.push(encryptedTitle)
  }
  if (updates.description !== undefined) {
    fields.push('description = ?')
    const encryptedDesc = updates.description
      ? await encryptForDb(updates.description.trim())
      : null
    values.push(encryptedDesc)
  }
  if (updates.status !== undefined) {
    fields.push('status = ?')
    values.push(updates.status)
  }

  if (fields.length === 0) {
    return getIdeaById(id, userId)
  }

  fields.push('updated_at = datetime(\'now\')')
  values.push(id, userId)

  await execute(
    `UPDATE ideas SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    values
  )

  return getIdeaById(id, userId)
}

/**
 * Archive (soft delete) an idea
 */
export async function archiveIdea(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await execute(
    `UPDATE ideas SET status = 'archived', updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`,
    [id, userId]
  )

  return result.length > 0
}

/**
 * Permanently delete an idea
 */
export async function deleteIdea(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await execute(
    `DELETE FROM ideas WHERE id = ? AND user_id = ?`,
    [id, userId]
  )

  return result.length > 0
}

/**
 * Convert an idea to a project
 */
export async function convertIdeaToProject(
  id: string,
  userId: string,
  projectTitle: string,
  projectDescription?: string
): Promise<{ idea: Idea; projectId: string } | null> {
  // This would be implemented when we have the projects module integrated
  // For now, just update the idea status to 'registered'
  const idea = await updateIdeaStatus(id, userId, 'registered')

  if (!idea) return null

  // TODO: Create project from idea
  // This would call the projects repo to create a new project

  return { idea, projectId: '' }
}
