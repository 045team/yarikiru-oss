// ============================================
// GitHub Sync Logic
// ============================================

import { execute, executeOne } from '../../turso/client'
import { GitHubClient, parseGitHubError, isRateLimitError } from './client'
import type {
  GitHubIssue,
  SyncIssuesOptions,
  SyncResult,
  GitHubIssueMapping,
  GitHubCommitLink,
} from './types'

// ------------------------------------------
// Types
// ------------------------------------------

interface GitHubAccount {
  id: string
  user_id: string
  github_user_id: number
  github_login: string
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  scope: string
  created_at: string
  updated_at: string
}

interface Repository {
  id: string
  user_id: string
  github_account_id: string | null
  github_id: number
  name: string
  full_name: string
  owner_login: string
  description: string | null
  url: string
  language: string | null
  stargazers_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Goal {
  id: string
  project_id: string
  user_id: string
  title: string
  status: string
  github_issue_id: number | null
  github_issue_number: number | null
  github_repository_id: string | null
  github_state: string | null
  github_updated_at: string | null
}

// ------------------------------------------
// Account Operations
// ------------------------------------------

/**
 * Get GitHub account for a user
 */
export async function getGitHubAccount(userId: string): Promise<GitHubAccount | null> {
  const row = await executeOne<GitHubAccount>(
    `SELECT * FROM github_accounts WHERE user_id = ?`,
    [userId]
  )
  return row
}

/**
 * Get GitHub client for a user
 */
export async function getGitHubClientForUser(userId: string): Promise<GitHubClient | null> {
  const account = await getGitHubAccount(userId)
  if (!account) {
    return null
  }
  return new GitHubClient(account.access_token, account.github_login)
}

// ------------------------------------------
// Repository Operations
// ------------------------------------------

/**
 * Get repository by ID
 */
export async function getRepositoryById(
  repositoryId: string,
  userId: string
): Promise<Repository | null> {
  const row = await executeOne<Repository>(
    `SELECT * FROM github_repositories WHERE id = ? AND user_id = ?`,
    [repositoryId, userId]
  )
  return row
}

/**
 * Get all active repositories for a user
 */
export async function getActiveRepositories(userId: string): Promise<Repository[]> {
  const rows = await execute<Repository>(
    `SELECT * FROM github_repositories WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC`,
    [userId]
  )
  return rows
}

// ------------------------------------------
// Issue Sync Operations
// ------------------------------------------

/**
 * Sync GitHub issues to YARIKIRU goals
 */
export async function syncIssuesToGoals(
  userId: string,
  repositoryId: string,
  options?: Partial<SyncIssuesOptions>
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    issuesCreated: 0,
    issuesUpdated: 0,
    issuesClosed: 0,
    errors: [],
  }

  try {
    // Get GitHub account
    const account = await getGitHubAccount(userId)
    if (!account) {
      return {
        ...result,
        success: false,
        errors: [{ message: 'GitHub account not connected' }],
      }
    }

    // Get repository
    const repository = await getRepositoryById(repositoryId, userId)
    if (!repository) {
      return {
        ...result,
        success: false,
        errors: [{ message: 'Repository not found' }],
      }
    }

    // Initialize GitHub client
    const client = new GitHubClient(account.access_token)

    // Fetch issues from GitHub
    const issues = await client.getIssues(repository.owner_login, repository.name, {
      state: options?.state || 'open',
      since: options?.since,
    })

    // Process each issue
    for (const issue of issues) {
      try {
        await processIssue(userId, repositoryId, issue, repository.full_name)
        if (issue.state === 'closed') {
          result.issuesClosed++
        }
      } catch (error) {
        result.errors.push({
          issueNumber: issue.number,
          message: parseGitHubError(error).message,
        })
      }
    }

    // Update sync log
    await createSyncLog(userId, repositoryId, 'success', result)

    return result
  } catch (error) {
    if (isRateLimitError(error)) {
      return {
        ...result,
        success: false,
        errors: [{ message: 'GitHub API rate limit exceeded. Please try again later.' }],
      }
    }

    return {
      ...result,
      success: false,
      errors: [{ message: parseGitHubError(error).message }],
    }
  }
}

/**
 * Process a single GitHub issue
 */
async function processIssue(
  userId: string,
  repositoryId: string,
  issue: GitHubIssue,
  repoFullName: string
): Promise<{ created: boolean; updated: boolean }> {
  // Check if goal already exists for this issue
  const existingGoal = await executeOne<Goal>(
    `SELECT * FROM goals WHERE github_issue_id = ? AND user_id = ?`,
    [issue.id, userId]
  )

  if (existingGoal) {
    // Update existing goal
    await execute(
      `UPDATE goals SET
        title = ?,
        github_state = ?,
        github_updated_at = ?,
        updated_at = datetime('now'),
        status = CASE WHEN ? = 'closed' THEN 'done' ELSE status END
      WHERE id = ?`,
      [issue.title, issue.state, issue.updatedAt, issue.state, existingGoal.id]
    )

    // Update mapping
    await updateIssueMapping(existingGoal.id, repositoryId, issue)

    return { created: false, updated: true }
  }

  // Find or create project for this repository
  let projectId = await findOrCreateProject(userId, repoFullName, repositoryId)

  // Create new goal from issue
  const goalId = crypto.randomUUID().toString()
  await execute(
    `INSERT INTO goals (
      id, project_id, user_id, title, status,
      github_issue_id, github_issue_number, github_repository_id,
      github_state, github_updated_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'todo', ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      goalId,
      projectId,
      userId,
      issue.title,
      issue.id,
      issue.number,
      repositoryId,
      issue.state,
      issue.updatedAt,
    ]
  )

  // Create issue mapping
  await createIssueMapping(goalId, repositoryId, issue)

  return { created: true, updated: false }
}

/**
 * Find or create project for repository
 */
async function findOrCreateProject(
  userId: string,
  repoFullName: string,
  repositoryId: string
): Promise<string> {
  const existingProject = await executeOne<{ id: string }>(
    `SELECT id FROM projects WHERE user_id = ? AND github_repository_id = ?`,
    [userId, repositoryId]
  )

  if (existingProject) {
    return existingProject.id
  }

  // Create new project
  const projectId = crypto.randomUUID().toString()
  await execute(
    `INSERT INTO projects (id, user_id, title, github_repository_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [projectId, userId, repoFullName, repositoryId]
  )

  return projectId
}

/**
 * Sync a YARIKIRU goal to GitHub issue
 */
export async function syncGoalToIssue(
  userId: string,
  goalId: string,
  repositoryId: string
): Promise<{ success: boolean; issueNumber?: number; error?: string }> {
  try {
    // Get goal
    const goal = await executeOne<Goal>(
      `SELECT * FROM goals WHERE id = ? AND user_id = ?`,
      [goalId, userId]
    )

    if (!goal) {
      return { success: false, error: 'Goal not found' }
    }

    // Get GitHub client
    const client = await getGitHubClientForUser(userId)
    if (!client) {
      return { success: false, error: 'GitHub account not connected' }
    }

    // Get repository
    const repository = await getRepositoryById(repositoryId, userId)
    if (!repository) {
      return { success: false, error: 'Repository not found' }
    }

    // Check if issue already exists
    if (goal.github_issue_number) {
      // Update existing issue
      const updatedIssue = await client.updateIssue(
        repository.owner_login,
        repository.name,
        goal.github_issue_number,
        {
          title: goal.title,
          state: goal.status === 'done' ? 'closed' : 'open',
        }
      )

      await updateIssueMapping(goalId, repositoryId, updatedIssue)

      return { success: true, issueNumber: updatedIssue.number }
    }

    // Create new issue
    const newIssue = await client.createIssue(
      repository.owner_login,
      repository.name,
      goal.title,
      `Created from YARIKIRU goal: ${goalId}`
    )

    // Update goal with GitHub info
    await execute(
      `UPDATE goals SET
        github_issue_id = ?,
        github_issue_number = ?,
        github_repository_id = ?,
        github_state = 'open',
        github_updated_at = ?,
        updated_at = datetime('now')
      WHERE id = ?`,
      [newIssue.id, newIssue.number, repositoryId, newIssue.updatedAt, goalId]
    )

    // Create issue mapping
    await createIssueMapping(goalId, repositoryId, newIssue)

    return { success: true, issueNumber: newIssue.number }
  } catch (error) {
    return { success: false, error: parseGitHubError(error).message }
  }
}

// ------------------------------------------
// Issue Mapping Operations
// ------------------------------------------

/**
 * Create issue mapping
 */
async function createIssueMapping(
  goalId: string,
  repositoryId: string,
  issue: GitHubIssue
): Promise<void> {
  await execute(
    `INSERT INTO github_issue_mappings (
      goal_id, repo, issue_number, issue_id, issue_url, synced_at
    ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(goal_id, repo, issue_number) DO UPDATE SET
      issue_id = excluded.issue_id,
      issue_url = excluded.issue_url,
      synced_at = datetime('now')`,
    [goalId, repositoryId, issue.number, issue.id, issue.htmlUrl]
  )
}

/**
 * Update issue mapping
 */
async function updateIssueMapping(
  goalId: string,
  repositoryId: string,
  issue: GitHubIssue
): Promise<void> {
  await execute(
    `UPDATE github_issue_mappings SET
      issue_id = ?,
      issue_url = ?,
      synced_at = datetime('now')
    WHERE goal_id = ? AND repo = ? AND issue_number = ?`,
    [issue.id, issue.htmlUrl, goalId, repositoryId, issue.number]
  )
}

/**
 * Get issue mappings for a goal
 */
export async function getIssueMappingsForGoal(goalId: string): Promise<GitHubIssueMapping[]> {
  const rows = await execute<any[]>(
    `SELECT goal_id, repo, issue_number, issue_id, issue_url, synced_at
     FROM github_issue_mappings WHERE goal_id = ?`,
    [goalId]
  )

  return rows.map((row) => ({
    goalId: row[0] as string,
    repositoryId: row[1] as string,
    issueNumber: row[2] as number,
    issueId: row[3] as number,
    issueUrl: row[4] as string,
    syncedAt: row[5] as string,
    syncDirection: 'bidirectional' as const,
  }))
}

// ------------------------------------------
// Commit Link Operations
// ------------------------------------------

/**
 * Link a commit to a goal
 */
export async function linkCommitToGoal(
  userId: string,
  goalId: string,
  repositoryId: string,
  commitSha: string,
  commitUrl: string,
  message: string,
  linkedBy: 'manual' | 'auto_branch' | 'auto_message' = 'manual'
): Promise<GitHubCommitLink> {
  const id = `gcl_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

  await execute(
    `INSERT INTO github_commit_links (
      id, goal_id, repo, commit_sha, commit_url, message, linked_at, linked_by
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
    ON CONFLICT(goal_id, repo, commit_sha) DO UPDATE SET
      message = excluded.message,
      linked_at = datetime('now')`,
    [id, goalId, repositoryId, commitSha, commitUrl, message, linkedBy]
  )

  return {
    id,
    goalId,
    repositoryId,
    commitSha,
    commitUrl,
    message,
    linkedAt: new Date().toISOString(),
    linkedBy,
  }
}

/**
 * Get commits linked to a goal
 */
export async function getLinkedCommits(goalId: string): Promise<GitHubCommitLink[]> {
  const rows = await execute<any[]>(
    `SELECT id, goal_id, repo, commit_sha, commit_url, message, linked_at, linked_by
     FROM github_commit_links WHERE goal_id = ? ORDER BY linked_at DESC`,
    [goalId]
  )

  return rows.map((row) => ({
    id: row[0] as string,
    goalId: row[1] as string,
    repositoryId: row[2] as string,
    commitSha: row[3] as string,
    commitUrl: row[4] as string,
    message: row[5] as string,
    linkedAt: row[6] as string,
    linkedBy: row[7] as 'manual' | 'auto_branch' | 'auto_message',
  }))
}

/**
 * Remove commit link
 */
export async function unlinkCommitFromGoal(
  goalId: string,
  commitSha: string
): Promise<boolean> {
  const result = await execute(
    `DELETE FROM github_commit_links WHERE goal_id = ? AND commit_sha = ?`,
    [goalId, commitSha]
  )

  return result.length > 0
}

/**
 * Auto-link commits by scanning commit messages for goal IDs
 */
export async function autoLinkCommitsFromMessages(
  userId: string,
  repositoryId: string,
  commits: Array<{ sha: string; htmlUrl: string; message: string }>
): Promise<number> {
  let linkedCount = 0

  // Get all goals for this user
  const goals = await execute<{ id: string }>(
    `SELECT id FROM goals WHERE user_id = ?`,
    [userId]
  )

  const goalIds = new Set(goals.map((g) => g.id))

  for (const commit of commits) {
    // Check for goal ID patterns in commit message
    const goalIdPattern = /\b([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\b/gi
    const matches = commit.message.match(goalIdPattern)

    if (matches) {
      for (const match of matches) {
        if (goalIds.has(match)) {
          await linkCommitToGoal(
            userId,
            match,
            repositoryId,
            commit.sha,
            commit.htmlUrl,
            commit.message,
            'auto_message'
          )
          linkedCount++
        }
      }
    }
  }

  return linkedCount
}

// ------------------------------------------
// Sync Log Operations
// ------------------------------------------

/**
 * Create sync log entry
 */
async function createSyncLog(
  userId: string,
  repositoryId: string,
  status: 'pending' | 'success' | 'error',
  result: SyncResult
): Promise<void> {
  const id = `gsl_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

  await execute(
    `INSERT INTO github_sync_logs (
      id, user_id, repository_id, sync_type, status,
      issues_created, issues_updated, issues_closed,
      started_at, completed_at
    ) VALUES (?, ?, ?, 'incremental', ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      id,
      userId,
      repositoryId,
      status,
      result.issuesCreated,
      result.issuesUpdated,
      result.issuesClosed,
    ]
  )
}

/**
 * Get last sync time for repository
 */
export async function getLastSyncTime(
  userId: string,
  repositoryId: string
): Promise<string | null> {
  const row = await executeOne<{ completed_at: string }>(
    `SELECT completed_at FROM github_sync_logs
     WHERE user_id = ? AND repository_id = ? AND status = 'success'
     ORDER BY completed_at DESC LIMIT 1`,
    [userId, repositoryId]
  )

  return row?.completed_at || null
}

/**
 * Get sync history for user
 */
export async function getSyncHistory(
  userId: string,
  limit: number = 10
): Promise<Array<{
  id: string
  repositoryId: string
  status: string
  issuesCreated: number
  issuesUpdated: number
  issuesClosed: number
  completedAt: string | null
}>> {
  const rows = await execute<any[]>(
    `SELECT id, repository_id, status, issues_created, issues_updated, issues_closed, completed_at
     FROM github_sync_logs WHERE user_id = ?
     ORDER BY started_at DESC LIMIT ?`,
    [userId, limit]
  )

  return rows.map((row) => ({
    id: row[0] as string,
    repositoryId: row[1] as string,
    status: row[2] as string,
    issuesCreated: row[3] as number,
    issuesUpdated: row[4] as number,
    issuesClosed: row[5] as number,
    completedAt: row[6] as string | null,
  }))
}
