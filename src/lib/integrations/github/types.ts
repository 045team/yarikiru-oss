// ============================================
// GitHub Integration Types
// ============================================

// ------------------------------------------
// GitHub API Types
// ------------------------------------------

/**
 * Repository information from GitHub API
 */
export interface GitHubRepo {
  id: number
  name: string
  fullName: string
  owner: {
    login: string
    id: number
    avatarUrl: string
  }
  description: string | null
  url: string
  htmlUrl: string
  language: string | null
  stargazersCount: number
  forksCount: number
  isPrivate: boolean
  isFork: boolean
  createdAt: string
  updatedAt: string
  pushedAt: string | null
}

/**
 * Issue information from GitHub API
 */
export interface GitHubIssue {
  id: number
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed'
  htmlUrl: string
  labels: Array<{
    id: number
    name: string
    color: string
  }>
  assignees: Array<{
    login: string
    id: number
    avatarUrl: string
  }>
  milestone: {
    title: string
    number: number
  } | null
  createdAt: string
  updatedAt: string
  closedAt: string | null
  user: {
    login: string
    id: number
    avatarUrl: string
  }
}

/**
 * Commit information from GitHub API
 */
export interface GitHubCommit {
  sha: string
  htmlUrl: string
  message: string
  author: {
    name: string
    email: string
    date: string
  } | null
  committer: {
    name: string
    email: string
    date: string
  } | null
}

/**
 * Commit details with file changes
 */
export interface GitHubCommitDetail extends GitHubCommit {
  files: Array<{
    filename: string
    status: 'added' | 'modified' | 'removed' | 'renamed'
    additions: number
    deletions: number
    changes: number
  }>
  stats: {
    additions: number
    deletions: number
    total: number
  }
}

// ------------------------------------------
// User Configuration Types
// ------------------------------------------

/**
 * User's GitHub configuration stored in database
 */
export interface GitHubConfig {
  id: string
  userId: string
  githubUserId: number
  githubLogin: string
  accessToken: string // encrypted
  refreshToken: string | null
  tokenExpiresAt: string | null
  scope: string
  createdAt: string
  updatedAt: string
}

/**
 * Repository sync configuration
 */
export interface GitHubRepoSyncConfig {
  repositoryId: string
  isActive: boolean
  autoSyncEnabled: boolean
  syncInterval: number // minutes
  lastSyncAt: string | null
}

// ------------------------------------------
// Issue Mapping Types
// ------------------------------------------

/**
 * Mapping between GitHub issues and YARIKIRU goals
 */
export interface GitHubIssueMapping {
  goalId: string
  repositoryId: string
  issueNumber: number
  issueId: number
  issueUrl: string
  syncedAt: string
  syncDirection: 'github_to_yarikiru' | 'yarikiru_to_github' | 'bidirectional'
}

/**
 * Commit link to goal
 */
export interface GitHubCommitLink {
  id: string
  goalId: string
  repositoryId: string
  commitSha: string
  commitUrl: string
  message: string
  linkedAt: string
  linkedBy: 'manual' | 'auto_branch' | 'auto_message'
}

// ------------------------------------------
// Sync Types
// ------------------------------------------

/**
 * Options for syncing issues
 */
export interface SyncIssuesOptions {
  repositoryId: string
  direction: 'github_to_yarikiru' | 'yarikiru_to_github' | 'bidirectional'
  state?: 'open' | 'closed' | 'all'
  labels?: string[]
  since?: string // ISO date string
}

/**
 * Result of sync operation
 */
export interface SyncResult {
  success: boolean
  issuesCreated: number
  issuesUpdated: number
  issuesClosed: number
  errors: Array<{
    issueNumber?: number
    message: string
  }>
}

/**
 * Options for listing issues
 */
export interface ListIssuesOptions {
  state?: 'open' | 'closed' | 'all'
  labels?: string[]
  sort?: 'created' | 'updated' | 'comments'
  direction?: 'asc' | 'desc'
  since?: string
  perPage?: number
  page?: number
}

/**
 * Options for listing commits
 */
export interface ListCommitsOptions {
  sha?: string
  path?: string
  author?: string
  since?: string
  until?: string
  perPage?: number
  page?: number
}

// ------------------------------------------
// API Types
// ------------------------------------------

/**
 * GitHub API rate limit info
 */
export interface GitHubRateLimit {
  limit: number
  remaining: number
  reset: Date
  used: number
}

/**
 * GitHub API error
 */
export interface GitHubApiError {
  status: number
  message: string
  documentationUrl?: string
}

// ------------------------------------------
// OAuth Types
// ------------------------------------------

/**
 * OAuth callback result
 */
export interface OAuthResult {
  success: boolean
  login?: string
  error?: string
}

/**
 * PAT (Personal Access Token) validation result
 */
export interface PATValidationResult {
  valid: boolean
  login?: string
  scopes?: string[]
  error?: string
}
