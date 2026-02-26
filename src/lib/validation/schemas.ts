// ============================================
// Zod Validation Schemas
// ランタイムバリデーションスキーマ定義
// ============================================

import { z } from 'zod'

// ============================================
// 共通スキーマ
// ============================================

const datetimeSchema = z.string().datetime()
const optionalDatetimeSchema = z.string().datetime().optional()

// ============================================
// 1. Industry Schema
// ============================================

export const IndustrySchema = z.object({
  id: z.number().optional(),
  category: z.string().min(1, '業種カテゴリは必須です'),
  industry: z.string().min(1, '業種名は必須です'),
  stakeholders: z.string().nullable().optional(),
  business_layer: z.string().nullable().optional(),
  it_layer: z.string().nullable().optional(),
  ai_layer: z.string().nullable().optional(),
  created_at: optionalDatetimeSchema,
  updated_at: optionalDatetimeSchema,
})

export type IndustryInput = z.infer<typeof IndustrySchema>
export type IndustryUpdate = Partial<IndustryInput>

// ============================================
// 2. Task Schema
// ============================================

const priorityEnum = z.enum(['高', '中', '低'])
const difficultyEnum = z.enum(['低', '中', '高'])

export const TaskSchema = z.object({
  id: z.number().optional(),
  industry_id: z.number().nullable().optional(),
  task_category: z.string().min(1, 'タスクカテゴリは必須です'),
  task_detail: z.string().min(1, 'タスク詳細は必須です'),
  frequency: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  urgency: priorityEnum.nullable().optional(),
  importance: priorityEnum.nullable().optional(),
  pain_points: z.string().nullable().optional(),
  current_process: z.string().nullable().optional(),
  ai_solution: z.string().nullable().optional(),
  implementation_difficulty: difficultyEnum.nullable().optional(),
  effect: z.string().nullable().optional(),
  cost_reduction: z.string().nullable().optional(),
  priority: priorityEnum.nullable().optional(),
  created_at: optionalDatetimeSchema,
  updated_at: optionalDatetimeSchema,
})

export type TaskInput = z.infer<typeof TaskSchema>
export type TaskUpdate = Partial<TaskInput>

// ============================================
// 3. Schedule Schema
// ============================================

export const ScheduleSchema = z.object({
  id: z.number().optional(),
  industry_id: z.number().nullable().optional(),
  day_of_week: z.string().min(1, '曜日は必須です'),
  time_slot: z.string().min(1, '時間帯は必須です'),
  business_category: z.string().min(1, '業務カテゴリは必須です'),
  task: z.string().min(1, 'タスクは必須です'),
  duration: z.string().min(1, '所要時間は必須です'),
  frequency: z.string().nullable().optional(),
  pain_points: z.string().nullable().optional(),
  ai_solution: z.string().nullable().optional(),
  priority: priorityEnum.nullable().optional(),
  cost_reduction_estimate: z.string().nullable().optional(),
  created_at: optionalDatetimeSchema,
  updated_at: optionalDatetimeSchema,
})

export type ScheduleInput = z.infer<typeof ScheduleSchema>
export type ScheduleUpdate = Partial<ScheduleInput>

// ============================================
// 4. PainPoint Schema
// ============================================

const PainPointCategorySchema = z.enum([
  '時間削減',
  'エラー防止',
  'ストレス軽減',
  'コスト削減',
])

export const PainPointSchema = z.object({
  id: z.number().optional(),
  task_id: z.number().nullable().optional(),
  schedule_id: z.number().nullable().optional(),
  industry_id: z.number().nullable().optional(),
  pain_point_category: PainPointCategorySchema,
  pain_point_description: z.string().min(1, '疼痛点説明は必須です'),
  affected_tasks: z.string().nullable().optional(),
  weekly_time_spent: z.number().nullable().optional(),
  monthly_time_spent: z.number().nullable().optional(),
  hourly_cost: z.number().nullable().optional(),
  frequency_score: z.number().int().min(1).max(5).nullable().optional(),
  urgency_score: z.number().int().min(1).max(5).nullable().optional(),
  impact_score: z.number().int().min(1).max(5).nullable().optional(),
  priority_score: z.number().nullable().optional(),
  priority_rank: z.number().int().nullable().optional(),
  analyzed_by: z.string().default('GPT-4o').optional(),
  confidence_score: z.number().min(0).max(1).nullable().optional(),
  analysis_metadata: z.string().nullable().optional(),
  created_at: optionalDatetimeSchema,
  updated_at: optionalDatetimeSchema,
})

export type PainPointInput = z.infer<typeof PainPointSchema>
export type PainPointUpdate = Partial<PainPointInput>

// ============================================
// 5. AISolution Schema
// ============================================

const SolutionTypeSchema = z.enum(['無料ツール', '有料プラン'])
const ImplementationDifficultySchema = z.enum(['低', '中', '高'])
const SolutionStatusSchema = z.enum(['proposed', 'development', 'launch', 'retired'])

export const AISolutionSchema = z.object({
  id: z.number().optional(),
  pain_point_id: z.number().nullable().optional(),
  industry_id: z.number().nullable().optional(),
  solution_name: z.string().min(1, 'ソリューション名は必須です'),
  solution_type: SolutionTypeSchema,
  solution_description: z.string().min(1, '説明は必須です'),
  ai_models: z.string().nullable().optional(),
  tech_stack: z.string().nullable().optional(),
  data_requirements: z.string().nullable().optional(),
  time_reduction_percent: z.number().min(0).max(100).nullable().optional(),
  time_reduction_minutes_weekly: z.number().min(0).nullable().optional(),
  cost_savings_monthly: z.number().min(0).nullable().optional(),
  roi_months: z.number().int().min(0).nullable().optional(),
  payback_period: z.number().min(0).nullable().optional(),
  implementation_difficulty: ImplementationDifficultySchema,
  development_weeks: z.number().int().min(0).nullable().optional(),
  tech_complexity_score: z.number().int().min(1).max(5).nullable().optional(),
  data_availability_score: z.number().int().min(1).max(5).nullable().optional(),
  user_adoption_score: z.number().int().min(1).max(5).nullable().optional(),
  pricing_model: z.string().nullable().optional(),
  pricing_amount: z.number().min(0).nullable().optional(),
  target_users: z.string().nullable().optional(),
  status: SolutionStatusSchema.default('proposed').optional(),
  launch_date: z.string().datetime().nullable().optional(),
  generated_by: z.string().default('GPT-4o').optional(),
  confidence_score: z.number().min(0).max(1).nullable().optional(),
  generation_metadata: z.string().nullable().optional(),
  created_at: optionalDatetimeSchema,
  updated_at: optionalDatetimeSchema,
})

export type AISolutionInput = z.infer<typeof AISolutionSchema>
export type AISolutionUpdate = Partial<AISolutionInput>

// ============================================
// 6. MarketingAsset Schema
// ============================================

const MarketingAssetTypeSchema = z.enum(['email', 'landing_page', 'ad_copy'])

export const MarketingAssetSchema = z.object({
  id: z.number().optional(),
  user_id: z.string().nullable().optional(),
  industry_id: z.number().nullable().optional(),
  solution_id: z.number().nullable().optional(),
  asset_type: MarketingAssetTypeSchema,
  asset_name: z.string().min(1, '資料名は必須です'),
  email_subject: z.string().nullable().optional(),
  email_preview_text: z.string().nullable().optional(),
  email_body: z.string().nullable().optional(),
  email_cta_text: z.string().nullable().optional(),
  email_cta_url: z.string().url().nullable().optional(),
  lp_headline: z.string().nullable().optional(),
  lp_subheadline: z.string().nullable().optional(),
  lp_hero_text: z.string().nullable().optional(),
  lp_pain_points: z.array(z.string()).nullable().optional(),
  lp_solution_text: z.string().nullable().optional(),
  lp_cta_text: z.string().nullable().optional(),
  ab_test_group: z.string().nullable().optional(),
  ab_test_variant: z.string().nullable().optional(),
  sent_count: z.number().int().min(0).default(0).optional(),
  opened_count: z.number().int().min(0).default(0).optional(),
  clicked_count: z.number().int().min(0).default(0).optional(),
  converted_count: z.number().int().min(0).default(0).optional(),
  open_rate: z.number().min(0).max(100).nullable().optional(),
  click_rate: z.number().min(0).max(100).nullable().optional(),
  conversion_rate: z.number().min(0).max(100).nullable().optional(),
  generated_by: z.string().default('gpt-4.1-turbo').optional(),
  generation_metadata: z.string().nullable().optional(),
  prompt_version: z.string().optional(),
  created_at: optionalDatetimeSchema,
  updated_at: optionalDatetimeSchema,
})

export type MarketingAssetInput = z.infer<typeof MarketingAssetSchema>
export type MarketingAssetUpdate = Partial<Omit<MarketingAssetInput, 'id' | 'user_id'>>

// コンテンツ生成リクエストスキーマ
export const ContentGenerationRequestSchema = z.object({
  solutionId: z.string().nullable().optional(),
  painPointIds: z.array(z.string()).min(1, '少なくとも1つの疼痛点を選択してください'),
  assetType: MarketingAssetTypeSchema,
  targetAudience: z.object({
    role: z.string().min(1, 'ターゲット役割は必須です'),
    companySize: z.string().min(1, '企業規模は必須です'),
    painIntensity: z.enum(['high', 'medium', 'low']),
  }),
  customPrompt: z.string().optional(),
})

export type ContentGenerationRequestInput = z.infer<typeof ContentGenerationRequestSchema>

// ============================================
// 7. User Schema
// ============================================

const SubscriptionPlanSchema = z.enum(['free', 'basic', 'pro'])
const SubscriptionStatusSchema = z.enum(['active', 'canceled', 'expired'])

export const UserSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email('有効なメールアドレスを入力してください'),
  full_name: z.string().nullable().optional(),
  industry_id: z.number().nullable().optional(),
  role: z.string().nullable().optional(),
  company_name: z.string().nullable().optional(),
  subscription_plan: SubscriptionPlanSchema.default('free').optional(),
  subscription_status: SubscriptionStatusSchema.default('active').optional(),
  subscription_start_date: z.string().datetime().nullable().optional(),
  subscription_end_date: z.string().datetime().nullable().optional(),
  tools_used: z.string().nullable().optional(),
  weekly_reports_count: z.number().int().min(0).default(0).optional(),
  photos_classified: z.number().int().min(0).default(0).optional(),
  last_sign_in_at: z.string().datetime().nullable().optional(),
  created_at: optionalDatetimeSchema,
  updated_at: optionalDatetimeSchema,
})

export type UserInput = z.infer<typeof UserSchema>
export type UserUpdate = Partial<UserInput>

// ============================================
// 8. UserActivity Schema
// ============================================

const ActivityTypeSchema = z.enum([
  'page_view',
  'tool_used',
  'email_opened',
  'email_clicked',
  'landing_page_view',
  'signup',
  'subscription_upgrade',
])

export const UserActivitySchema = z.object({
  id: z.number().optional(),
  user_id: z.string().uuid(),
  industry_id: z.number().nullable().optional(),
  activity_type: ActivityTypeSchema,
  activity_data: z.string().nullable().optional(),
  marketing_asset_id: z.number().nullable().optional(),
  ab_test_group: z.string().nullable().optional(),
  ab_test_variant: z.string().nullable().optional(),
  ip_address: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional(),
  created_at: optionalDatetimeSchema,
})

export type UserActivityInput = z.infer<typeof UserActivitySchema>
export type UserActivityUpdate = Partial<UserActivityInput>

// ============================================
// 9. KPI Schema
// ============================================

const KPICategorySchema = z.enum(['revenue', 'customer', 'operation', 'other'])
const KPIPeriodTypeSchema = z.enum(['daily', 'weekly', 'monthly'])

export const KPISchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  project_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1, 'KPI名は必須です'),
  description: z.string().nullable().optional(),
  category: KPICategorySchema,
  target_value: z.number().positive('目標値は正の数値です'),
  current_value: z.number().min(0, '実績値は0以上です').default(0),
  unit: z.string().min(1, '単位は必須です'),
  period_type: KPIPeriodTypeSchema,
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  created_at: optionalDatetimeSchema,
  updated_at: optionalDatetimeSchema,
}).refine(
  (data) => new Date(data.end_date) > new Date(data.start_date),
  { message: '終了日は開始日より後の日付です', path: ['end_date'] }
)

export type KPIInput = z.infer<typeof KPISchema>
export type KPIUpdate = Partial<Omit<KPIInput, 'id' | 'user_id'>>

// ============================================
// 10. KPISnapshot Schema
// ============================================

export const KPISnapshotSchema = z.object({
  id: z.string().uuid().optional(),
  kpi_id: z.string().uuid(),
  value: z.number(),
  recorded_at: optionalDatetimeSchema,
})

export type KPISnapshotInput = z.infer<typeof KPISnapshotSchema>

// ============================================
// 11. Project Schema
// ============================================

const ProjectStatusSchema = z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled'])

export const ProjectSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  name: z.string().min(1, 'プロジェクト名は必須です'),
  description: z.string().nullable().optional(),
  status: ProjectStatusSchema.default('planning'),
  start_date: z.string().datetime().nullable().optional(),
  target_end_date: z.string().datetime().nullable().optional(),
  actual_end_date: z.string().datetime().nullable().optional(),
  created_at: optionalDatetimeSchema,
  updated_at: optionalDatetimeSchema,
})

export type ProjectInput = z.infer<typeof ProjectSchema>
export type ProjectUpdate = Partial<Omit<ProjectInput, 'id' | 'user_id'>>

// ============================================
// 12. Milestone Schema
// ============================================

const MilestoneStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'delayed'])

export const MilestoneSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  name: z.string().min(1, 'マイルストーン名は必須です'),
  description: z.string().nullable().optional(),
  target_date: z.string().datetime(),
  status: MilestoneStatusSchema.default('pending'),
  created_at: optionalDatetimeSchema,
  updated_at: optionalDatetimeSchema,
})

export type MilestoneInput = z.infer<typeof MilestoneSchema>
export type MilestoneUpdate = Partial<Omit<MilestoneInput, 'id' | 'project_id'>>

// ============================================
// 13. ProjectTask Schema
// ============================================

const ProjectTaskStatusSchema = z.enum(['todo', 'in_progress', 'done', 'blocked'])
const ProjectTaskPrioritySchema = z.enum(['1', '2', '3']).transform((val) => parseInt(val, 10))

export const ProjectTaskSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  milestone_id: z.string().uuid().nullable().optional(),
  parent_task_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1, 'タスク名は必須です'),
  description: z.string().nullable().optional(),
  status: ProjectTaskStatusSchema.default('todo'),
  priority: ProjectTaskPrioritySchema.default(2),
  due_date: z.string().datetime().nullable().optional(),
  estimated_hours: z.number().positive().nullable().optional(),
  actual_hours: z.number().min(0).nullable().optional(),
  created_at: optionalDatetimeSchema,
  updated_at: optionalDatetimeSchema,
})

export type ProjectTaskInput = z.infer<typeof ProjectTaskSchema>
export type ProjectTaskUpdate = Partial<Omit<ProjectTaskInput, 'id' | 'project_id'>>

// ============================================
// 14. ProjectSolutionLink Schema
// ============================================

export const ProjectSolutionLinkSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  solution_id: z.number(),  // ai_solutions.id (number型)
  created_at: optionalDatetimeSchema,
})

export type ProjectSolutionLinkInput = z.infer<typeof ProjectSolutionLinkSchema>

// ============================================
// 15. A/B Test Schema
// ============================================

const ABTestStatusSchema = z.enum(['draft', 'running', 'completed', 'stopped'])

export const ABTestSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  name: z.string().min(1, 'テスト名は必須です'),
  description: z.string().nullable().optional(),
  status: ABTestStatusSchema.default('draft'),
  start_date: z.string().datetime().nullable().optional(),
  end_date: z.string().datetime().nullable().optional(),
  asset_type: z.enum(['email', 'landing_page', 'ad_copy']),
  variant_a_id: z.string().uuid(),
  variant_b_id: z.string().uuid(),
})

export type ABTestInput = z.infer<typeof ABTestSchema>
export type ABTestUpdate = Partial<Omit<ABTestInput, 'id' | 'user_id'>>

// ============================================
// 16. ABTestImpression Schema
// ============================================

const ImpressionTypeSchema = z.enum(['view', 'click', 'conversion'])

export const ABTestImpressionSchema = z.object({
  id: z.string().uuid().optional(),
  ab_test_id: z.string().uuid(),
  variant_id: z.string().uuid(),
  user_id: z.string().uuid().nullable().optional(),
  session_id: z.string().nullable().optional(),
  impression_type: ImpressionTypeSchema,
  ip_address: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional(),
  referrer: z.string().nullable().optional(),
  created_at: optionalDatetimeSchema,
})

export type ABTestImpressionInput = z.infer<typeof ABTestImpressionSchema>

// ============================================
// 17. Member Schema (会員管理)
// ============================================

const MemberRoleSchema = z.enum(['admin', 'moderator', 'member'])
const MemberStatusSchema = z.enum(['active', 'suspended', 'deleted'])
const MemberSubscriptionPlanSchema = z.enum(['free', 'basic', 'pro'])
const MemberSubscriptionStatusSchema = z.enum(['active', 'canceled', 'expired'])

export const MemberSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email('有効なメールアドレスを入力してください'),
  full_name: z.string().nullable().optional(),
  role: MemberRoleSchema.default('member'),
  status: MemberStatusSchema.default('active'),
  subscription_plan: MemberSubscriptionPlanSchema.default('free'),
  subscription_status: MemberSubscriptionStatusSchema.default('active'),
  subscription_start_date: z.string().datetime().nullable().optional(),
  subscription_end_date: z.string().datetime().nullable().optional(),
  company_name: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  bio: z.string().nullable().optional(),
  preferences: z.string().nullable().optional(), // JSON string
  vertex_ai_api_key: z.string().nullable().optional(), // GCP service account credentials (JSON string)
  last_active_at: z.string().datetime().nullable().optional(),
  last_sign_in_at: z.string().datetime().nullable().optional(),
  created_at: optionalDatetimeSchema,
  updated_at: optionalDatetimeSchema,
})

export type MemberInput = z.infer<typeof MemberSchema>
export type MemberInsert = z.infer<typeof MemberSchema>
export type MemberUpdate = Partial<Omit<MemberInsert, 'id' | 'created_at' | 'updated_at'>>

// ============================================
// 18. MemberActivity Schema (会員アクティビティ)
// ============================================

const MemberActivityTypeSchema = z.enum([
  'page_view',
  'login',
  'logout',
  'project_created',
  'project_updated',
  'goal_completed',
  'task_completed',
  'subscription_updated',
  'profile_updated',
  'settings_changed',
  'export_download',
  'report_generated',
])

export const MemberActivitySchema = z.object({
  id: z.string().uuid().optional(),
  member_id: z.string().uuid(),
  activity_type: MemberActivityTypeSchema,
  activity_data: z.string().nullable().optional(), // JSON string
  ip_address: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional(),
  created_at: optionalDatetimeSchema,
})

export type MemberActivityInput = z.infer<typeof MemberActivitySchema>
export type MemberActivityInsert = z.infer<typeof MemberActivitySchema>
export type MemberActivityUpdate = Partial<Omit<MemberActivityInsert, 'id' | 'member_id'>>

// ============================================
// 19. MemberSession Schema (会員セッション)
// ============================================

export const MemberSessionSchema = z.object({
  id: z.string().uuid().optional(),
  member_id: z.string().uuid(),
  session_token: z.string().min(1, 'セッショントークンは必須です'),
  user_agent: z.string().nullable().optional(),
  ip_address: z.string().nullable().optional(),
  expires_at: z.string().datetime(),
  created_at: optionalDatetimeSchema,
  last_accessed_at: z.string().datetime().nullable().optional(),
})

export type MemberSessionInput = z.infer<typeof MemberSessionSchema>
export type MemberSessionInsert = z.infer<typeof MemberSessionSchema>
export type MemberSessionUpdate = Partial<Omit<MemberSessionInsert, 'id'>>

// ============================================
// 20. ProjectGitHubRepository Schema (プロジェクトとGitHubリポジトリの紐付け)
// ============================================

export const ProjectGitHubRepositorySchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  github_repository_id: z.string().uuid(),
  is_primary: z.boolean().default(false),
  created_at: optionalDatetimeSchema,
})

export type ProjectGitHubRepositoryInput = z.infer<typeof ProjectGitHubRepositorySchema>
export type ProjectGitHubRepositoryUpdate = Partial<Omit<ProjectGitHubRepositoryInput, 'id'>>

// ============================================
// 21. GitHubRepository Schema (GitHubリポジトリ)
// ============================================

export const GitHubRepositorySchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  github_account_id: z.string().uuid().nullable().optional(),
  github_id: z.number(),
  name: z.string(),
  full_name: z.string(),
  owner_login: z.string(),
  description: z.string().nullable().optional(),
  url: z.string().url(),
  language: z.string().nullable().optional(),
  stargazers_count: z.number().default(0),
  is_active: z.boolean().default(true),
  created_at: optionalDatetimeSchema,
  updated_at: optionalDatetimeSchema,
})

export type GitHubRepositoryInput = z.infer<typeof GitHubRepositorySchema>
export type GitHubRepositoryUpdate = Partial<Omit<GitHubRepositoryInput, 'id' | 'user_id' | 'github_id'>>

// ============================================
// 22. GitHubAccount Schema (GitHubアカウント連携)
// ============================================

export const GitHubAccountSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  github_user_id: z.number(),
  github_login: z.string(),
  access_token: z.string(),
  refresh_token: z.string().nullable().optional(),
  token_expires_at: z.string().datetime().nullable().optional(),
  scope: z.string().nullable().optional(),
  created_at: optionalDatetimeSchema,
  updated_at: optionalDatetimeSchema,
})

export type GitHubAccountInput = z.infer<typeof GitHubAccountSchema>
export type GitHubAccountUpdate = Partial<Omit<GitHubAccountInput, 'id' | 'user_id' | 'github_user_id'>>

