// ============================================
// GitHub Client
// ============================================

import { Octokit } from '@octokit/rest'
import type {
  GitHubRepo,
  GitHubIssue,
  GitHubCommit,
  GitHubCommitDetail,
  ListIssuesOptions,
  ListCommitsOptions,
  GitHubRateLimit,
  GitHubApiError,
  PATValidationResult,
} from './types'

// ------------------------------------------
// Rate Limit Handler
// ------------------------------------------

interface RateLimitState {
  remaining: number
  resetTime: Date | null
}

const rateLimitState: RateLimitState = {
  remaining: 5000,
  resetTime: null,
}

/**
 * Check if we should wait before making a request
 */
function shouldWaitForRateLimit(): { wait: boolean; waitTimeMs?: number } {
  if (rateLimitState.remaining > 100) {
    return { wait: false }
  }

  if (rateLimitState.resetTime) {
    const waitTime = rateLimitState.resetTime.getTime() - Date.now()
    if (waitTime > 0) {
      return { wait: true, waitTimeMs: waitTime }
    }
  }

  return { wait: false }
}

/**
 * Update rate limit state from response headers
 */
function updateRateLimitFromHeaders(headers: Record<string, string | undefined>): void {
  const remaining = headers['x-ratelimit-remaining']
  const reset = headers['x-ratelimit-reset']

  if (remaining) {
    rateLimitState.remaining = parseInt(remaining, 10)
  }

  if (reset) {
    rateLimitState.resetTime = new Date(parseInt(reset, 10) * 1000)
  }
}

// ------------------------------------------
// GitHub Client Class
// ------------------------------------------

/**
 * GitHub API client with rate limiting and error handling
 */
export class GitHubClient {
  private octokit: Octokit
  private owner: string | null = null

  constructor(accessToken: string, owner?: string) {
    this.octokit = new Octokit({
      auth: accessToken,
      request: {
        timeout: 30000, // 30 second timeout
      },
    })
    this.owner = owner || null
  }

  /**
   * Validate a personal access token
   */
  static async validatePAT(token: string): Promise<PATValidationResult> {
    try {
      const octokit = new Octokit({ auth: token })
      const { data } = await octokit.rest.users.getAuthenticated()

      return {
        valid: true,
        login: data.login,
        scopes: data.public_repos ? ['public_repo'] : [],
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get current rate limit status
   */
  async getRateLimit(): Promise<GitHubRateLimit> {
    const { data } = await this.octokit.rest.rateLimit.get()
    const core = data.resources.core

    return {
      limit: core.limit,
      remaining: core.remaining,
      reset: new Date(core.reset * 1000),
      used: core.used,
    }
  }

  /**
   * Get authenticated user's repositories
   */
  async getRepos(options?: {
    type?: 'all' | 'owner' | 'public' | 'private' | 'member'
    sort?: 'created' | 'updated' | 'pushed' | 'full_name'
    direction?: 'asc' | 'desc'
    perPage?: number
    page?: number
  }): Promise<GitHubRepo[]> {
    const { wait, waitTimeMs } = shouldWaitForRateLimit()
    if (wait && waitTimeMs) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitTimeMs, 60000)))
    }

    const response = await this.octokit.rest.repos.listForAuthenticatedUser({
      type: options?.type || 'all',
      sort: options?.sort || 'updated',
      direction: options?.direction || 'desc',
      per_page: options?.perPage || 100,
      page: options?.page || 1,
    })

    updateRateLimitFromHeaders(response.headers as Record<string, string | undefined>)

    return response.data.map((repo) => this.mapRepo(repo))
  }

  /**
   * Get a single repository
   */
  async getRepo(owner: string, repo: string): Promise<GitHubRepo | null> {
    try {
      const { data } = await this.octokit.rest.repos.get({ owner, repo })
      return this.mapRepo(data)
    } catch (error) {
      if ((error as { status?: number }).status === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * Get issues from a repository
   */
  async getIssues(
    owner: string,
    repo: string,
    options?: ListIssuesOptions
  ): Promise<GitHubIssue[]> {
    const { wait, waitTimeMs } = shouldWaitForRateLimit()
    if (wait && waitTimeMs) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitTimeMs, 60000)))
    }

    const response = await this.octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: options?.state || 'open',
      labels: options?.labels?.join(','),
      sort: options?.sort || 'created',
      direction: options?.direction || 'desc',
      since: options?.since,
      per_page: options?.perPage || 100,
      page: options?.page || 1,
    })

    updateRateLimitFromHeaders(response.headers as Record<string, string | undefined>)

    // Filter out pull requests
    return response.data.filter((issue) => !issue.pull_request).map((issue) => this.mapIssueFromOctokit(issue))
  }

  /**
   * Get a single issue
   */
  async getIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue | null> {
    try {
      const { data } = await this.octokit.rest.issues.get({
        owner,
        repo,
        issue_number: issueNumber,
      })

      if (data.pull_request) {
        return null
      }

      return this.mapIssueFromOctokit(data)
    } catch (error) {
      if ((error as { status?: number }).status === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * Create an issue in a repository
   */
  async createIssue(
    owner: string,
    repo: string,
    title: string,
    body?: string,
    options?: {
      labels?: string[]
      assignees?: string[]
      milestone?: number
    }
  ): Promise<GitHubIssue> {
    const { data } = await this.octokit.rest.issues.create({
      owner,
      repo,
      title,
      body,
      labels: options?.labels,
      assignees: options?.assignees,
      milestone: options?.milestone,
    })

    return this.mapIssueFromOctokit(data)
  }

  /**
   * Update an issue
   */
  async updateIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    updates: {
      title?: string
      body?: string
      state?: 'open' | 'closed'
      labels?: string[]
      assignees?: string[]
      milestone?: number | null
    }
  ): Promise<GitHubIssue> {
    const { data } = await this.octokit.rest.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      ...updates,
    })

    return this.mapIssueFromOctokit(data)
  }

  /**
   * Close an issue
   */
  async closeIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
    return this.updateIssue(owner, repo, issueNumber, { state: 'closed' })
  }

  /**
   * Get commits from a repository
   */
  async getCommits(
    owner: string,
    repo: string,
    options?: ListCommitsOptions
  ): Promise<GitHubCommit[]> {
    const { wait, waitTimeMs } = shouldWaitForRateLimit()
    if (wait && waitTimeMs) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitTimeMs, 60000)))
    }

    const response = await this.octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: options?.sha,
      path: options?.path,
      author: options?.author,
      since: options?.since,
      until: options?.until,
      per_page: options?.perPage || 100,
      page: options?.page || 1,
    })

    updateRateLimitFromHeaders(response.headers as Record<string, string | undefined>)

    return response.data.map((commit) => this.mapCommitFromOctokit(commit))
  }

  /**
   * Get a single commit with details
   */
  async getCommit(owner: string, repo: string, sha: string): Promise<GitHubCommitDetail | null> {
    try {
      const { data } = await this.octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: sha,
      })

      return {
        sha: data.sha,
        htmlUrl: data.html_url,
        message: data.commit.message,
        author: data.commit.author
          ? {
              name: data.commit.author.name,
              email: data.commit.author.email,
              date: data.commit.author.date,
            }
          : null,
        committer: data.commit.committer
          ? {
              name: data.commit.committer.name,
              email: data.commit.committer.email,
              date: data.commit.committer.date,
            }
          : null,
        files: (data.files || []).map((file) => ({
          filename: file.filename,
          status: file.status as 'added' | 'modified' | 'removed' | 'renamed',
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
        })),
        stats: data.stats
          ? {
              additions: data.stats.additions ?? 0,
              deletions: data.stats.deletions ?? 0,
              total: data.stats.total ?? 0,
            }
          : { additions: 0, deletions: 0, total: 0 },
      }
    } catch (error) {
      if ((error as { status?: number }).status === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * Search commits by keyword in commit messages
   */
  async searchCommitsInRepo(
    owner: string,
    repo: string,
    query: string
  ): Promise<GitHubCommit[]> {
    const { wait, waitTimeMs } = shouldWaitForRateLimit()
    if (wait && waitTimeMs) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitTimeMs, 60000)))
    }

    const response = await this.octokit.rest.search.commits({
      q: `${query} repo:${owner}/${repo}`,
      per_page: 100,
    })

    updateRateLimitFromHeaders(response.headers as Record<string, string | undefined>)

    return response.data.items.map((item) => ({
      sha: item.sha,
      htmlUrl: item.html_url,
      message: item.commit.message,
      author: item.commit.author
        ? {
            name: item.commit.author.name ?? '',
            email: item.commit.author.email ?? '',
            date: item.commit.author.date ?? '',
          }
        : null,
      committer: item.commit.committer
        ? {
            name: item.commit.committer.name ?? '',
            email: item.commit.committer.email ?? '',
            date: item.commit.committer.date ?? '',
          }
        : null,
    }))
  }

  // ------------------------------------------
  // Private Mapping Methods
  // ------------------------------------------

  private mapRepo(repo: {
    id: number
    name: string
    full_name: string
    owner: { login: string; id: number; avatar_url: string }
    description: string | null
    url: string
    html_url: string
    language: string | null
    stargazers_count: number
    forks_count: number
    private: boolean
    fork: boolean
    created_at: string
    updated_at: string
    pushed_at: string | null
  }): GitHubRepo {
    return {
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: {
        login: repo.owner.login,
        id: repo.owner.id,
        avatarUrl: repo.owner.avatar_url,
      },
      description: repo.description,
      url: repo.url,
      htmlUrl: repo.html_url,
      language: repo.language,
      stargazersCount: repo.stargazers_count,
      forksCount: repo.forks_count,
      isPrivate: repo.private,
      isFork: repo.fork,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
    }
  }

  private mapIssue(issue: {
    id: number
    number: number
    title: string
    body: string | null
    state: string
    html_url: string
    labels: Array<{ id: number; name: string; color: string }>
    assignees: Array<{ login: string; id: number; avatar_url: string }>
    milestone: { title: string; number: number } | null
    created_at: string
    updated_at: string
    closed_at: string | null
    user: { login: string; id: number; avatar_url: string }
    pull_request?: unknown
  }): GitHubIssue {
    return {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state as 'open' | 'closed',
      htmlUrl: issue.html_url,
      labels: issue.labels.map((label) => ({
        id: label.id,
        name: label.name,
        color: label.color,
      })),
      assignees: issue.assignees.map((assignee) => ({
        login: assignee.login,
        id: assignee.id,
        avatarUrl: assignee.avatar_url,
      })),
      milestone: issue.milestone
        ? {
            title: issue.milestone.title,
            number: issue.milestone.number,
          }
        : null,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      closedAt: issue.closed_at,
      user: {
        login: issue.user.login,
        id: issue.user.id,
        avatarUrl: issue.user.avatar_url,
      },
    }
  }

  // Handle actual Octokit response types (body is optional, author fields are optional)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapIssueFromOctokit(issue: any): GitHubIssue {
    return {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body ?? null,
      state: issue.state as 'open' | 'closed',
      htmlUrl: issue.html_url,
      labels: (issue.labels || []).map((label: { id?: number; name?: string; color?: string }) => ({
        id: label.id ?? 0,
        name: label.name ?? '',
        color: label.color ?? '',
      })),
      assignees: (issue.assignees || []).map((assignee: { login: string; id: number; avatar_url: string }) => ({
        login: assignee.login,
        id: assignee.id,
        avatarUrl: assignee.avatar_url,
      })),
      milestone: issue.milestone
        ? {
            title: issue.milestone.title,
            number: issue.milestone.number,
          }
        : null,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      closedAt: issue.closed_at,
      user: {
        login: issue.user.login,
        id: issue.user.id,
        avatarUrl: issue.user.avatar_url,
      },
    }
  }

  private mapCommit(commit: {
    sha: string
    html_url: string
    commit: {
      message: string
      author: { name: string; email: string; date: string } | null
      committer: { name: string; email: string; date: string } | null
    }
  }): GitHubCommit {
    return {
      sha: commit.sha,
      htmlUrl: commit.html_url,
      message: commit.commit.message,
      author: commit.commit.author
        ? {
            name: commit.commit.author.name,
            email: commit.commit.author.email,
            date: commit.commit.author.date,
          }
        : null,
      committer: commit.commit.committer
        ? {
            name: commit.commit.committer.name,
            email: commit.commit.committer.email,
            date: commit.commit.committer.date,
          }
        : null,
    }
  }

  // Handle actual Octokit response types (author fields have optional properties)
  private mapCommitFromOctokit(commit: {
    sha: string
    html_url: string
    commit: {
      message: string
      author: { name?: string; email?: string; date?: string } | null
      committer: { name?: string; email?: string; date?: string } | null
    }
  }): GitHubCommit {
    return {
      sha: commit.sha,
      htmlUrl: commit.html_url,
      message: commit.commit.message,
      author: commit.commit.author
        ? {
            name: commit.commit.author.name ?? '',
            email: commit.commit.author.email ?? '',
            date: commit.commit.author.date ?? '',
          }
        : null,
      committer: commit.commit.committer
        ? {
            name: commit.commit.committer.name ?? '',
            email: commit.commit.committer.email ?? '',
            date: commit.commit.committer.date ?? '',
          }
        : null,
    }
  }
}

// ------------------------------------------
// Error Handling
// ------------------------------------------

/**
 * Parse GitHub API error
 */
export function parseGitHubError(error: unknown): GitHubApiError {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>

    if ('status' in err && 'message' in err) {
      return {
        status: err.status as number,
        message: err.message as string,
        documentationUrl: err.documentation_url as string | undefined,
      }
    }
  }

  return {
    status: 500,
    message: error instanceof Error ? error.message : 'Unknown error',
  }
}

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  return parseGitHubError(error).status === 403
}

/**
 * Check if error is a not found error
 */
export function isNotFoundError(error: unknown): boolean {
  return parseGitHubError(error).status === 404
}
