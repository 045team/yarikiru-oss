// ============================================
// Turso Database Type Definitions
// SQLite (libsql) ベースの型定義
// ============================================

import { z } from 'zod'
import {
  IndustrySchema,
  TaskSchema,
  ScheduleSchema,
  PainPointSchema,
  AISolutionSchema,
  MarketingAssetSchema,
  UserSchema,
  UserActivitySchema,
  KPISchema,
  KPISnapshotSchema,
  ProjectSchema,
  MilestoneSchema,
  ProjectTaskSchema,
  ProjectSolutionLinkSchema,
  MemberSchema,
  MemberActivitySchema,
  MemberSessionSchema,
} from '@/lib/validation/schemas'

// ============================================
// 共通型定義
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================
// Zod推論型（主要エンティティ）
// ============================================

// Industries
export type Industry = z.infer<typeof IndustrySchema>
export type IndustryInsert = z.infer<typeof IndustrySchema>
export type IndustryUpdate = Partial<IndustryInsert>

// Tasks
export type Task = z.infer<typeof TaskSchema>
export type TaskInsert = z.infer<typeof TaskSchema>
export type TaskUpdate = Partial<TaskInsert>

// Schedules
export type Schedule = z.infer<typeof ScheduleSchema>
export type ScheduleInsert = z.infer<typeof ScheduleSchema>
export type ScheduleUpdate = Partial<ScheduleInsert>

// Pain Points
export type PainPoint = z.infer<typeof PainPointSchema>
export type PainPointInsert = z.infer<typeof PainPointSchema>
export type PainPointUpdate = Partial<PainPointInsert>

// AI Solutions
export type AISolution = z.infer<typeof AISolutionSchema>
export type AISolutionInsert = z.infer<typeof AISolutionSchema>
export type AISolutionUpdate = Partial<AISolutionInsert>

// Marketing Assets
export type MarketingAsset = z.infer<typeof MarketingAssetSchema>
export type MarketingAssetInsert = z.infer<typeof MarketingAssetSchema>
export type MarketingAssetUpdate = Partial<MarketingAssetInsert>

// Users
export type User = z.infer<typeof UserSchema>
export type UserInsert = z.infer<typeof UserSchema>
export type UserUpdate = Partial<UserInsert>

// User Activity
export type UserActivity = z.infer<typeof UserActivitySchema>
export type UserActivityInsert = z.infer<typeof UserActivitySchema>
export type UserActivityUpdate = Partial<UserActivityInsert>

// KPIs
export type KPI = z.infer<typeof KPISchema>
export type KPIInsert = z.infer<typeof KPISchema>
export type KPIUpdate = Partial<Omit<KPIInsert, 'user_id'>>

// KPI Snapshots
export type KPISnapshot = z.infer<typeof KPISnapshotSchema>
export type KPISnapshotInsert = z.infer<typeof KPISnapshotSchema>

// KPI Status
export type KPIStatus = 'ON_TRACK' | 'AT_RISK' | 'BEHIND' | 'COMPLETED' | 'NOT_STARTED'

// ============================================
// Project Management Types (Zod推論型)
// ============================================

// Project Status
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'

// Milestone Status
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'delayed'

// ProjectTask Status
export type ProjectTaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked'

// ProjectTask Priority
export type ProjectTaskPriority = 1 | 2 | 3  // 1: high, 2: medium, 3: low

// Zodスキーマも再エクスポート（循環参照回避）
export { ProjectTaskSchema } from '@/lib/validation/schemas'

// Projects
export type Project = z.infer<typeof ProjectSchema>
export type ProjectInsert = z.infer<typeof ProjectSchema>
export type ProjectUpdate = Partial<Omit<ProjectInsert, 'id' | 'user_id'>>

// Milestones
export type Milestone = z.infer<typeof MilestoneSchema>
export type MilestoneInsert = z.infer<typeof MilestoneSchema>
export type MilestoneUpdate = Partial<Omit<MilestoneInsert, 'id' | 'project_id'>>

// ProjectTask（既存のTaskと区別するため別名使用）
export type ProjectTask = z.infer<typeof ProjectTaskSchema>
export type ProjectTaskInsert = z.infer<typeof ProjectTaskSchema>
export type ProjectTaskUpdate = Partial<Omit<ProjectTaskInsert, 'id' | 'project_id'>>

// ProjectSolutionLink
export type ProjectSolutionLink = z.infer<typeof ProjectSolutionLinkSchema>
export type ProjectSolutionLinkInsert = z.infer<typeof ProjectSolutionLinkSchema>

// ============================================
// Member Management Types (Zod推論型)
// ============================================

// Members
export type Member = z.infer<typeof MemberSchema>
export type MemberInsert = z.infer<typeof MemberSchema>
export type MemberUpdate = Partial<Omit<MemberInsert, 'id' | 'created_at' | 'updated_at'>>

// Member Activities
export type MemberActivity = z.infer<typeof MemberActivitySchema>
export type MemberActivityInsert = z.infer<typeof MemberActivitySchema>
export type MemberActivityUpdate = Partial<Omit<MemberActivityInsert, 'id' | 'member_id'>>

// Member Sessions
export type MemberSession = z.infer<typeof MemberSessionSchema>
export type MemberSessionInsert = z.infer<typeof MemberSessionSchema>
export type MemberSessionUpdate = Partial<Omit<MemberSessionInsert, 'id'>>

// ============================================
// Legacy Type Exports（後方互換性維持）
// ============================================

// これらの型はZod推論型に置き換えられましたが、
// 既存コードとの互換性維持のため再エクスポートします

export type PainPointCategory =
  | '時間削減'
  | 'エラー防止'
  | 'ストレス軽減'
  | 'コスト削減'

export type SolutionType = '無料ツール' | '有料プラン'
export type ImplementationDifficulty = '低' | '中' | '高'
export type SolutionStatus = 'proposed' | 'development' | 'launch' | 'retired'
export type MarketingAssetType = 'email' | 'landing_page' | 'ad_copy'
export type SubscriptionPlan = 'free' | 'basic' | 'pro'
export type SubscriptionStatus = 'active' | 'canceled' | 'expired'
export type ActivityType =
  | 'page_view'
  | 'tool_used'
  | 'email_opened'
  | 'email_clicked'
  | 'landing_page_view'
  | 'signup'
  | 'subscription_upgrade'

// ============================================
// GitHub Integration Types
// ============================================

export type GitHubAccount = z.infer<typeof import('@/lib/validation/schemas').GitHubAccountSchema>
export type GitHubAccountInsert = z.infer<typeof import('@/lib/validation/schemas').GitHubAccountSchema>

export type GitHubRepository = z.infer<typeof import('@/lib/validation/schemas').GitHubRepositorySchema>
export type GitHubRepositoryInsert = z.infer<typeof import('@/lib/validation/schemas').GitHubRepositorySchema>
export type GitHubRepositoryUpdate = Partial<Omit<GitHubRepositoryInsert, 'id' | 'user_id' | 'github_id'>>

export type ProjectGitHubRepository = z.infer<typeof import('@/lib/validation/schemas').ProjectGitHubRepositorySchema>
export type ProjectGitHubRepositoryInsert = z.infer<typeof import('@/lib/validation/schemas').ProjectGitHubRepositorySchema>
export type ProjectGitHubRepositoryUpdate = Partial<Omit<ProjectGitHubRepositoryInsert, 'id'>>

// ============================================
// Ideas (Quick Capture)
// ============================================

export type IdeaStatus = 'draft' | 'registered' | 'archived'

export interface Idea {
  id: string
  userId: string
  title: string
  description: string | null
  status: IdeaStatus
  createdAt: string
  updatedAt: string
}

export interface CreateIdeaInput {
  userId: string
  title: string
  description?: string
}

export interface UpdateIdeaStatusInput {
  ideaId: string
  status: IdeaStatus
}

// ============================================
// Utility Types
// ============================================

// JSONヘルパー関数用の型
export type JSONArray<T> = T[]
export type JSONObject = { [key: string]: Json }

// JSON文字列 → パース済みオブジェクトの変換ヘルパー
export function parseJSONField<T>(field: string | null): T | null {
  if (!field) return null
  try {
    return JSON.parse(field) as T
  } catch {
    return null
  }
}

// パース済みオブジェクト → JSON文字列の変換ヘルパー
export function stringifyJSONField<T>(value: T | null): string | null {
  if (value === null) return null
  return JSON.stringify(value)
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  status: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    hasMore: boolean
  }
}

// ============================================
// AI Analysis Types
// ============================================

export interface PainPointAnalysisInput {
  tasks: Task[]
  schedules: Schedule[]
  industry: Industry
}

export interface PainPointAnalysisOutput {
  pain_points: PainPoint[]
  summary: {
    total_pain_points: number
    by_category: Record<PainPointCategory, number>
    total_weekly_time_waste: number
    top_priority_pain_points: PainPoint[]
  }
}

export interface AISolutionGenerationInput {
  pain_point: PainPoint
  industry: Industry
  constraints?: {
    max_development_weeks?: number
    budget_limit?: number
    available_tech_stack?: string[]
  }
}

export interface AISolutionGenerationOutput {
  solutions: AISolution[]
  ranking: {
    solution_id: number
    score: number
    reasoning: string
  }[]
}

// ============================================
// A/B Test Types
// ============================================

export type ABTestStatus = 'draft' | 'running' | 'completed' | 'stopped'

export interface ABTest {
  id: string
  user_id: string
  name: string
  description: string | null
  status: ABTestStatus
  start_date: string | null
  end_date: string | null
  asset_type: MarketingAssetType
  variant_a_id: string
  variant_b_id: string
  winner: 'A' | 'B' | 'inconclusive' | null
  confidence_level: number | null
  created_at: string
  updated_at: string
  variant_a_name?: string
  variant_b_name?: string
}

export type ABTestInsert = Omit<ABTest, 'id' | 'created_at' | 'updated_at' | 'variant_a_name' | 'variant_b_name'>
export type ABTestUpdate = Partial<Omit<ABTestInsert, 'user_id'>>

export interface ABTestImpression {
  id: string
  ab_test_id: string
  variant_id: string
  user_id: string | null
  session_id: string | null
  impression_type: 'view' | 'click' | 'conversion'
  ip_address: string | null
  user_agent: string | null
  referrer: string | null
  created_at: string
}

export type ABTestImpressionInsert = Omit<ABTestImpression, 'id' | 'created_at'>

// ============================================
// Member Management Types (会員管理)
// ============================================

// Member Role
export type MemberRole = 'admin' | 'moderator' | 'member'

// Member Status
export type MemberStatus = 'active' | 'suspended' | 'deleted'

// Member Subscription Plan
export type MemberSubscriptionPlan = 'free' | 'basic' | 'pro'

// Member Subscription Status
export type MemberSubscriptionStatus = 'active' | 'canceled' | 'expired'

// Member Activity Type
export type MemberActivityType =
  | 'page_view'
  | 'login'
  | 'logout'
  | 'project_created'
  | 'project_updated'
  | 'goal_completed'
  | 'task_completed'
  | 'subscription_updated'
  | 'profile_updated'
  | 'settings_changed'
  | 'export_download'
  | 'report_generated'

// Member Filters
export interface MemberFilters {
  role?: MemberRole
  status?: MemberStatus
  subscription_plan?: MemberSubscriptionPlan
  limit?: number
  offset?: number
}

// Activity Stats
export interface ActivityStats {
  total_activities: number
  activities_by_type: Partial<Record<MemberActivityType, number>>
  last_activity_at: string | null
  most_common_activity: MemberActivityType | null
}

// ============================================
// Embeddings & Vector Search (ベクトル検索)
// ============================================

export interface EmbeddingsQuota {
  user_id: string
  month_count: number
  month_limit: number
  day_count: number
  day_limit: number
  last_reset: string
}

export interface EmbeddingsQuotaInsert {
  user_id: string
  month_count?: number
  month_limit?: number
  day_count?: number
  day_limit?: number
}

// Search Layer Types (3-layer protocol)
export type SearchLayer = 'index' | 'timeline' | 'full'

export interface SearchResultIndex {
  id: string
  score: number
  type: 'learning_item' | 'work_log' | 'goal' | 'sub_task'
}

export interface SearchResultFull extends SearchResultIndex {
  content: string
  created_at: string
  metadata?: Record<string, unknown>
}

export interface SearchRequest {
  query: string
  layer: SearchLayer
  limit?: number
  ids?: string[] // For 'full' layer
  type?: 'learning_item' | 'work_log' | 'goal' | 'sub_task' | 'all'
}
