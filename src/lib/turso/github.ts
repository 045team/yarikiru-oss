// ============================================
// GitHub Repositories - Turso Operations
// ============================================

import { execute, executeOne } from './client'

// ------------------------------------------
// Types
// ------------------------------------------

export interface GitHubRepository {
  id: string
  userId: string
  githubAccountId: string | null
  githubId: number
  name: string
  fullName: string
  ownerLogin: string
  description: string | null
  url: string
  language: string | null
  stargazersCount: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateGitHubRepositoryInput {
  userId: string
  githubId: number
  name: string
  fullName: string
  ownerLogin: string
  description?: string
  url: string
  language?: string
  stargazersCount?: number
  githubAccountId?: string
}

// ------------------------------------------
// Queries
// ------------------------------------------

/**
 * Get all GitHub repositories for a user
 */
export async function getGitHubRepositoriesByUserId(
  userId: string,
  options: { includeInactive?: boolean } = {}
): Promise<GitHubRepository[]> {
  const sql = options.includeInactive
    ? `
      SELECT
        id, user_id, github_account_id, github_id, name, full_name, owner_login,
        description, url, language, stargazers_count, is_active, created_at, updated_at
      FROM github_repositories
      WHERE user_id = ?
      ORDER BY created_at DESC
      `
    : `
      SELECT
        id, user_id, github_account_id, github_id, name, full_name, owner_login,
        description, url, language, stargazers_count, is_active, created_at, updated_at
      FROM github_repositories
      WHERE user_id = ? AND is_active = 1
      ORDER BY created_at DESC
      `

  const rows = await execute<any>(sql, [userId])

  return rows.map(row => mapRowToGitHubRepository(row))
}

/**
 * Get a single GitHub repository by ID
 */
export async function getGitHubRepositoryById(
  id: string,
  userId: string
): Promise<GitHubRepository | null> {
  const row = await executeOne<any>(
    `SELECT
      id, user_id, github_account_id, github_id, name, full_name, owner_login,
      description, url, language, stargazers_count, is_active, created_at, updated_at
    FROM github_repositories
    WHERE id = ? AND user_id = ?`,
    [id, userId]
  )

  return row ? mapRowToGitHubRepository(row) : null
}

/**
 * Get a GitHub repository by GitHub ID
 */
export async function getGitHubRepositoryByGithubId(
  githubId: number,
  userId: string
): Promise<GitHubRepository | null> {
  const row = await executeOne<any>(
    `SELECT
      id, user_id, github_account_id, github_id, name, full_name, owner_login,
      description, url, language, stargazers_count, is_active, created_at, updated_at
    FROM github_repositories
    WHERE github_id = ? AND user_id = ?`,
    [githubId, userId]
  )

  return row ? mapRowToGitHubRepository(row) : null
}

// ------------------------------------------
// Mutations
// ------------------------------------------

/**
 * Create a new GitHub repository
 */
export async function createGitHubRepository(
  input: CreateGitHubRepositoryInput
): Promise<GitHubRepository> {
  const id = `gr_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

  await execute(
    `INSERT INTO github_repositories (
      id, user_id, github_account_id, github_id, name, full_name, owner_login,
      description, url, language, stargazers_count, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      id,
      input.userId,
      input.githubAccountId || null,
      input.githubId,
      input.name,
      input.fullName,
      input.ownerLogin,
      input.description || null,
      input.url,
      input.language || null,
      input.stargazersCount || 0,
    ]
  )

  const repo = await getGitHubRepositoryById(id, input.userId)
  if (!repo) {
    throw new Error('Failed to create GitHub repository')
  }

  return repo
}

/**
 * Update a GitHub repository
 */
export async function updateGitHubRepository(
  id: string,
  userId: string,
  updates: Partial<{
    description: string
    language: string
    stargazersCount: number
    isActive: boolean
  }>
): Promise<GitHubRepository | null> {
  const fields: string[] = []
  const values: (string | number | boolean)[] = []

  if (updates.description !== undefined) {
    fields.push('description = ?')
    values.push(updates.description)
  }
  if (updates.language !== undefined) {
    fields.push('language = ?')
    values.push(updates.language)
  }
  if (updates.stargazersCount !== undefined) {
    fields.push('stargazers_count = ?')
    values.push(updates.stargazersCount)
  }
  if (updates.isActive !== undefined) {
    fields.push('is_active = ?')
    values.push(updates.isActive ? 1 : 0)
  }

  if (fields.length === 0) {
    return getGitHubRepositoryById(id, userId)
  }

  fields.push('updated_at = datetime(\'now\')')
  values.push(id, userId)

  await execute(
    `UPDATE github_repositories SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    values
  )

  return getGitHubRepositoryById(id, userId)
}

/**
 * Archive (soft delete) a GitHub repository
 */
export async function archiveGitHubRepository(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await execute(
    `UPDATE github_repositories SET is_active = 0, updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`,
    [id, userId]
  )

  return result.length > 0
}

/**
 * Permanently delete a GitHub repository
 */
export async function deleteGitHubRepository(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await execute(
    `DELETE FROM github_repositories WHERE id = ? AND user_id = ?`,
    [id, userId]
  )

  return result.length > 0
}

// ------------------------------------------
// Helpers
// ------------------------------------------

function mapRowToGitHubRepository(row: any): GitHubRepository {
  return {
    id: row[0] as string,
    userId: row[1] as string,
    githubAccountId: row[2] as string | null,
    githubId: row[3] as number,
    name: row[4] as string,
    fullName: row[5] as string,
    ownerLogin: row[6] as string,
    description: row[7] as string | null,
    url: row[8] as string,
    language: row[9] as string | null,
    stargazersCount: row[10] as number,
    isActive: (row[11] as number) === 1,
    createdAt: row[12] as string,
    updatedAt: row[13] as string,
  }
}

// ============================================
// Project GitHub Repository Links
// ============================================

export interface ProjectGitHubRepository {
  id: string
  projectId: string
  githubRepositoryId: string
  isPrimary: boolean
  createdAt: string
}

export interface CreateProjectGitHubLinkInput {
  projectId: string
  githubRepositoryId: string
  isPrimary?: boolean
}

/**
 * Get all GitHub repositories linked to a project
 */
export async function getGitHubRepositoriesByProjectId(
  projectId: string
): Promise<GitHubRepository[]> {
  const rows = await execute<any>(
    `SELECT gr.*
     FROM github_repositories gr
     INNER JOIN project_github_repositories pgr ON gr.id = pgr.github_repository_id
     WHERE pgr.project_id = ?
     ORDER BY pgr.is_primary DESC, gr.stargazers_count DESC`,
    [projectId]
  )

  return rows.map(row => mapRowToGitHubRepository(row))
}

/**
 * Get the primary GitHub repository for a project
 */
export async function getPrimaryGitHubRepositoryByProjectId(
  projectId: string
): Promise<GitHubRepository | null> {
  const row = await executeOne<any>(
    `SELECT gr.*
     FROM github_repositories gr
     INNER JOIN project_github_repositories pgr ON gr.id = pgr.github_repository_id
     WHERE pgr.project_id = ? AND pgr.is_primary = 1
     LIMIT 1`,
    [projectId]
  )

  return row ? mapRowToGitHubRepository(row) : null
}

/**
 * Get all projects linked to a GitHub repository
 */
export async function getProjectsByGitHubRepositoryId(
  githubRepositoryId: string
): Promise<Array<{ projectId: string; isPrimary: boolean }>> {
  const rows = await execute<any>(
    `SELECT project_id, is_primary
     FROM project_github_repositories
     WHERE github_repository_id = ?`,
    [githubRepositoryId]
  )

  return rows.map(row => ({
    projectId: row[0] as string,
    isPrimary: (row[1] as number) === 1,
  }))
}

/**
 * Link a project to a GitHub repository
 */
export async function linkProjectToGitHub(
  input: CreateProjectGitHubLinkInput
): Promise<ProjectGitHubRepository> {
  const id = `pgr_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  const isPrimary = input.isPrimary ?? false

  // If setting as primary, first remove primary flag from other links
  if (isPrimary) {
    await execute(
      `UPDATE project_github_repositories SET is_primary = 0 WHERE project_id = ?`,
      [input.projectId]
    )
  }

  await execute(
    `INSERT INTO project_github_repositories (id, project_id, github_repository_id, is_primary)
     VALUES (?, ?, ?, ?)`,
    [id, input.projectId, input.githubRepositoryId, isPrimary ? 1 : 0]
  )

  const row = await executeOne<any>(
    `SELECT id, project_id, github_repository_id, is_primary, created_at
     FROM project_github_repositories WHERE id = ?`,
    [id]
  )

  if (!row) {
    throw new Error('Failed to create project-GitHub link')
  }

  return {
    id: row[0] as string,
    projectId: row[1] as string,
    githubRepositoryId: row[2] as string,
    isPrimary: (row[3] as number) === 1,
    createdAt: row[4] as string,
  }
}

/**
 * Set the primary GitHub repository for a project
 */
export async function setPrimaryGitHubRepository(
  projectId: string,
  githubRepositoryId: string
): Promise<void> {
  // First remove primary flag from all links
  await execute(
    `UPDATE project_github_repositories SET is_primary = 0 WHERE project_id = ?`,
    [projectId]
  )

  // Set the specified repository as primary
  await execute(
    `UPDATE project_github_repositories SET is_primary = 1
     WHERE project_id = ? AND github_repository_id = ?`,
    [projectId, githubRepositoryId]
  )
}

/**
 * Unlink a GitHub repository from a project
 */
export async function unlinkProjectFromGitHub(
  projectId: string,
  githubRepositoryId: string
): Promise<boolean> {
  const result = await execute(
    `DELETE FROM project_github_repositories
     WHERE project_id = ? AND github_repository_id = ?`,
    [projectId, githubRepositoryId]
  )

  return result.length > 0
}
