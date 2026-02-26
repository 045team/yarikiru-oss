// ============================================
// API Type Definitions
// ============================================

// ------------------------------------------
// GitHub Repositories
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

export interface CreateGitHubRepositoryRequest {
  githubId: number
  name: string
  fullName: string
  ownerLogin: string
  description?: string
  url: string
  language?: string
  stargazersCount?: number
}

export interface CreateGitHubRepositoryResponse {
  repository: GitHubRepository
}

export interface ListGitHubRepositoriesResponse {
  repositories: GitHubRepository[]
}

// ------------------------------------------
// Ideas (Quick Capture)
// ------------------------------------------

export interface Idea {
  id: string
  userId: string
  title: string
  description: string | null
  status: 'draft' | 'registered' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface CreateIdeaRequest {
  title: string
  description?: string
}

export interface CreateIdeaResponse {
  idea: Idea
}

export interface ListIdeasResponse {
  ideas: Idea[]
}

export interface UpdateIdeaStatusRequest {
  status: 'draft' | 'registered' | 'archived'
}

export interface UpdateIdeaResponse {
  idea: Idea
}

// ------------------------------------------
// Common API Response
// ------------------------------------------

export interface ApiErrorResponse {
  error: string
  details?: string
}

export interface ApiValidationErrorResponse {
  error: string
  fields?: Record<string, string>
}
