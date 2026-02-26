// ============================================
// Supabase Database Type Definitions
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================
// 1. Industries (業種マスタ)
// ============================================
export interface Industry {
  id: number
  category: string                          // 業種カテゴリ
  industry: string                          // 業種名
  stakeholders: string[]                    // 担当者リスト
  business_layer: string                    // 業務レイヤー
  it_layer: string                          // ITレイヤー
  ai_layer: string                          // AIレイヤー
  created_at: string
  updated_at: string
}

export interface IndustryInsert {
  id?: number
  category: string
  industry: string
  stakeholders?: string[]
  business_layer?: string
  it_layer?: string
  ai_layer?: string
  created_at?: string
  updated_at?: string
}

// ============================================
// 2. Tasks (タスク詳細)
// ============================================
export interface Task {
  id: number
  industry_id: number | null                // 業種ID
  task_category: string                     // タスクカテゴリ
  task_detail: string                       // タスク詳細
  frequency: string | null                  // 頻度
  duration: string | null                   // 所要時間
  urgency: string | null                    // 緊急度
  importance: string | null                 // 重要度
  pain_points: string | null                // 疼痛点
  current_process: string | null            // 現行プロセス
  ai_solution: string | null                // AI効率化案
  implementation_difficulty: string | null  // 実装難易度
  effect: string | null                     // 効果
  cost_reduction: string | null             // コスト削減
  priority: string | null                   // 優先度
  created_at: string
  updated_at: string
}

export interface TaskInsert {
  id?: number
  industry_id?: number | null
  task_category: string
  task_detail: string
  frequency?: string | null
  duration?: string | null
  urgency?: string | null
  importance?: string | null
  pain_points?: string | null
  current_process?: string | null
  ai_solution?: string | null
  implementation_difficulty?: string | null
  effect?: string | null
  cost_reduction?: string | null
  priority?: string | null
  created_at?: string
  updated_at?: string
}

// ============================================
// 3. Schedules (週間スケジュール)
// ============================================
export interface Schedule {
  id: number
  industry_id: number | null                // 業種ID
  day_of_week: string                       // 曜日
  time_slot: string                         // 時間帯
  business_category: string                 // 業務カテゴリ
  task: string                              // タスク
  duration: string                          // 所要時間
  frequency: string | null                  // 頻度
  pain_points: string | null                // ペインポイント
  ai_solution: string | null                // AI効率化案
  priority: string | null                   // 優先度
  cost_reduction_estimate: string | null    // コスト削減見込
  created_at: string
  updated_at: string
}

export interface ScheduleInsert {
  id?: number
  industry_id?: number | null
  day_of_week: string
  time_slot: string
  business_category: string
  task: string
  duration: string
  frequency?: string | null
  pain_points?: string | null
  ai_solution?: string | null
  priority?: string | null
  cost_reduction_estimate?: string | null
  created_at?: string
  updated_at?: string
}

// ============================================
// 4. Pain Points (疼痛点抽出結果)
// ============================================
export interface PainPoint {
  id: number
  task_id: number | null                    // 元タスクID
  schedule_id: number | null                // 元スケジュールID
  industry_id: number | null                // 業種ID

  pain_point_category: PainPointCategory    // 疼痛点カテゴリ
  pain_point_description: string            // 疼痛点説明
  affected_tasks: string[]                  // 影響を受けるタスク

  // 定量データ
  weekly_time_spent: number | null          // 週当たり時間（分）
  monthly_time_spent: number | null         // 月当たり時間（分）
  hourly_cost: number | null                // 時間単価（円/時間）

  // スコア
  frequency_score: number | null            // 頻度スコア（1-5）
  urgency_score: number | null              // 緊急度スコア（1-5）
  impact_score: number | null               // 影響度スコア（1-5）

  // 優先順位
  priority_score: number | null             // 総合スコア
  priority_rank: number | null              // 優先順位ランク

  // AI分析メタデータ
  analyzed_by: string                       // 分析モデル
  confidence_score: number | null           // 信頼度スコア（0-1）
  analysis_metadata: Json | null            // 分析メタデータ

  created_at: string
  updated_at: string
}

export type PainPointCategory =
  | '時間削減'
  | 'エラー防止'
  | 'ストレス軽減'
  | 'コスト削減'

export interface PainPointInsert {
  id?: number
  task_id?: number | null
  schedule_id?: number | null
  industry_id?: number | null
  pain_point_category: PainPointCategory
  pain_point_description: string
  affected_tasks?: string[]
  weekly_time_spent?: number | null
  monthly_time_spent?: number | null
  hourly_cost?: number | null
  frequency_score?: number | null
  urgency_score?: number | null
  impact_score?: number | null
  priority_score?: number | null
  priority_rank?: number | null
  analyzed_by?: string
  confidence_score?: number | null
  analysis_metadata?: Json | null
  created_at?: string
  updated_at?: string
}

// ============================================
// 5. AI Solutions (AIソリューション提案)
// ============================================
export interface AISolution {
  id: number
  pain_point_id: number | null              // 疼痛点ID
  industry_id: number | null                // 業種ID

  solution_name: string                     // ソリューション名
  solution_type: SolutionType               // ソリューションタイプ
  solution_description: string              // 説明

  // 技術詳細
  ai_models: string[]                       // 使用AIモデル
  tech_stack: string[]                      // 技術スタック
  data_requirements: string[]               // 必要データ

  // ビジネス価値
  time_reduction_percent: number | null     // 時間削減率（%）
  time_reduction_minutes_weekly: number | null  // 週当たり時間削減（分）
  cost_savings_monthly: number | null       // 月当たりコスト削減（円）

  roi_months: number | null                // ROI月数
  payback_period: number | null             // 回収期間（月）

  // 実装詳細
  implementation_difficulty: ImplementationDifficulty  // 実装難易度
  development_weeks: number | null          // 開発週数
  tech_complexity_score: number | null      // 技術複雑性スコア（1-5）
  data_availability_score: number | null    // データ可用性スコア（1-5）
  user_adoption_score: number | null        // ユーザー習熟度スコア（1-5）

  // マーケティング
  pricing_model: string | null              // 料金モデル
  pricing_amount: number | null             // 金額（円/月）
  target_users: string[]                    // ターゲットユーザー

  // ステータス
  status: SolutionStatus                    // ステータス
  launch_date: string | null                // ローンチ日

  // AI生成メタデータ
  generated_by: string                      // 生成モデル
  confidence_score: number | null           // 信頼度スコア
  generation_metadata: Json | null          // 生成メタデータ

  created_at: string
  updated_at: string
}

export type SolutionType = '無料ツール' | '有料プラン'
export type ImplementationDifficulty = '低' | '中' | '高'
export type SolutionStatus = 'proposed' | 'development' | 'launch' | 'retired'

export interface AISolutionInsert {
  id?: number
  pain_point_id?: number | null
  industry_id?: number | null
  solution_name: string
  solution_type: SolutionType
  solution_description: string
  ai_models?: string[]
  tech_stack?: string[]
  data_requirements?: string[]
  time_reduction_percent?: number | null
  time_reduction_minutes_weekly?: number | null
  cost_savings_monthly?: number | null
  roi_months?: number | null
  payback_period?: number | null
  implementation_difficulty?: ImplementationDifficulty
  development_weeks?: number | null
  tech_complexity_score?: number | null
  data_availability_score?: number | null
  user_adoption_score?: number | null
  pricing_model?: string | null
  pricing_amount?: number | null
  target_users?: string[]
  status?: SolutionStatus
  launch_date?: string | null
  generated_by?: string
  confidence_score?: number | null
  generation_metadata?: Json | null
  created_at?: string
  updated_at?: string
}

// ============================================
// 6. Marketing Assets (マーケティング資料)
// ============================================
export interface MarketingAsset {
  id: number
  user_id: string | null                    // ユーザーID
  industry_id: number | null                // 業種ID
  solution_id: number | null                // ソリューションID

  asset_type: MarketingAssetType            // 資料タイプ
  asset_name: string                        // 資料名

  // メール用
  email_subject: string | null              // メールタイトル
  email_preview_text: string | null         // プレビューテキスト
  email_body: string | null                 // メール本文
  email_cta_text: string | null             // CTAテキスト
  email_cta_url: string | null              // CTA URL

  // LP用
  lp_headline: string | null                // ヘッドライン
  lp_subheadline: string | null             // サブヘッドライン
  lp_hero_text: string | null               // ヒーローテキスト
  lp_pain_points: string[] | null           // 疼痛点リスト
  lp_solution_text: string | null           // ソリューション説明
  lp_cta_text: string | null                // CTAテキスト

  // A/Bテスト
  ab_test_group: string | null              // A/Bテストグループ
  ab_test_variant: string | null            // バリアント

  // パフォーマンス
  sent_count: number                        // 送信数
  opened_count: number                      // 開封数
  clicked_count: number                     // クリック数
  converted_count: number                   // コンバージョン数

  open_rate: number | null                  // 開封率（%）
  click_rate: number | null                 // クリック率（%）
  conversion_rate: number | null            // コンバージョン率（%）

  // AI生成メタデータ
  generated_by: string                      // 生成モデル
  generation_metadata: Json | null          // 生成メタデータ
  prompt_version: string | null             // プロンプトバージョン

  created_at: string
  updated_at: string
}

export type MarketingAssetType = 'email' | 'landing_page' | 'ad_copy'

export interface MarketingAssetInsert {
  id?: number
  user_id?: string | null
  industry_id?: number | null
  solution_id?: number | null
  asset_type: MarketingAssetType
  asset_name: string
  email_subject?: string | null
  email_preview_text?: string | null
  email_body?: string | null
  email_cta_text?: string | null
  email_cta_url?: string | null
  lp_headline?: string | null
  lp_subheadline?: string | null
  lp_hero_text?: string | null
  lp_pain_points?: string[] | null
  lp_solution_text?: string | null
  lp_cta_text?: string | null
  ab_test_group?: string | null
  ab_test_variant?: string | null
  sent_count?: number
  opened_count?: number
  clicked_count?: number
  converted_count?: number
  open_rate?: number | null
  click_rate?: number | null
  conversion_rate?: number | null
  generated_by?: string
  generation_metadata?: Json | null
  prompt_version?: string | null
  created_at?: string
  updated_at?: string
}

export interface MarketingAssetUpdate extends Partial<Omit<MarketingAssetInsert, 'id'>> {}

// コンテンツ生成リクエスト
export interface ContentGenerationRequest {
  solutionId: string | null
  painPointIds: string[]
  assetType: MarketingAssetType
  targetAudience: {
    role: string           // 例: '施工管理技士', '店舗オーナー'
    companySize: string     // 例: '1-10人', '11-50人'
    painIntensity: 'high' | 'medium' | 'low'
  }
  customPrompt?: string
}

// コンテンツ生成結果
export interface ContentGenerationResult {
  assetType: MarketingAssetType
  emailContent?: {
    subject: string
    previewText: string
    body: string
    ctaText: string
    ctaUrl: string
  }
  lpContent?: {
    headline: string
    subheadline: string
    heroText: string
    painPoints: string[]
    solutionText: string
    ctaText: string
  }
  metadata: {
    model: string
    promptVersion: string
    tokensUsed: number
    generatedAt: string
  }
}

// ============================================
// 7. User Profiles (ユーザープロフィール)
// ============================================
export interface UserProfile {
  id: string                                // UUID
  email: string | null
  full_name: string | null
  industry_id: number | null                // 所属業種
  role: string | null
  company_name: string | null

  // サブスクリプション
  subscription_plan: SubscriptionPlan       // サブスクリプションプラン
  subscription_status: SubscriptionStatus   // ステータス
  subscription_start_date: string | null
  subscription_end_date: string | null

  // 無料ツール使用状況
  tools_used: string[]                      // 使用ツールリスト
  weekly_reports_count: number              // 週報生成数
  photos_classified: number                 // 写真分類数

  // アクティビティ
  last_sign_in_at: string | null
  created_at: string
  updated_at: string
}

export type SubscriptionPlan = 'free' | 'basic' | 'pro'
export type SubscriptionStatus = 'active' | 'canceled' | 'expired'

export interface UserProfileInsert {
  id?: string
  email?: string | null
  full_name?: string | null
  industry_id?: number | null
  role?: string | null
  company_name?: string | null
  subscription_plan?: SubscriptionPlan
  subscription_status?: SubscriptionStatus
  subscription_start_date?: string | null
  subscription_end_date?: string | null
  tools_used?: string[]
  weekly_reports_count?: number
  photos_classified?: number
  last_sign_in_at?: string | null
  created_at?: string
  updated_at?: string
}

// ============================================
// 8. User Activity (ユーザー行動ログ)
// ============================================
export interface UserActivity {
  id: number
  user_id: string                           // UUID
  industry_id: number | null                // 業種ID

  activity_type: ActivityType               // アクティビティタイプ
  activity_data: Json | null                // アクティビティ詳細

  // マーケティング施策との紐付け
  marketing_asset_id: number | null
  ab_test_group: string | null
  ab_test_variant: string | null

  ip_address: string | null
  user_agent: string | null

  created_at: string
}

export type ActivityType =
  | 'page_view'
  | 'tool_used'
  | 'email_opened'
  | 'email_clicked'
  | 'landing_page_view'
  | 'signup'
  | 'subscription_upgrade'

export interface UserActivityInsert {
  id?: number
  user_id: string
  industry_id?: number | null
  activity_type: ActivityType
  activity_data?: Json | null
  marketing_asset_id?: number | null
  ab_test_group?: string | null
  ab_test_variant?: string | null
  ip_address?: string | null
  user_agent?: string | null
  created_at?: string
}

// ============================================
// View Types (分析用ビュー)
// ============================================

export interface IndustryPainPointSummary {
  industry: string
  category: string
  pain_point_category: string
  pain_point_count: number
  total_weekly_time: number | null
  avg_priority_score: number | null
  avg_urgency_score: number | null
}

export interface SolutionROISummary {
  industry: string
  solution_type: SolutionType
  solution_count: number
  total_monthly_savings: number | null
  avg_roi_months: number | null
  avg_time_reduction: number | null
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

export interface MarketingGenerationInput {
  industry: Industry
  pain_point: PainPoint
  solution: AISolution
  asset_type: MarketingAssetType
  target_audience: {
    role: string
    company_size: string
    pain_intensity: 'high' | 'medium' | 'low'
  }
}

export interface MarketingGenerationOutput {
  assets: MarketingAsset[]
  ab_test_variants: {
    group_name: string
    variants: MarketingAsset[]
  }[]
  predicted_performance: {
    expected_open_rate: number
    expected_click_rate: number
    expected_conversion_rate: number
  }
}

// ============================================
// 9. A/B Tests
// ============================================

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
}

export type ABTestStatus = 'draft' | 'running' | 'completed' | 'stopped'

export interface ABTestInsert extends Omit<ABTest, 'id' | 'created_at' | 'updated_at'> {}
export interface ABTestUpdate extends Partial<Omit<ABTestInsert, 'user_id'>> {}

// A/Bテストインプレッション
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

export interface ABTestImpressionInsert extends Omit<ABTestImpression, 'id' | 'created_at'> {}

// A/Bテスト統計
export interface ABTestStatistics {
  ab_test_id: string
  variant: 'A' | 'B'

  // インプレッション
  views: number
  clicks: number
  conversions: number

  // 計算済みレート
  click_rate: number
  conversion_rate: number

  // 統計的有意性
  is_winner: boolean | null
  confidence: number | null
  p_value: number | null
}

// パフォーマンスサマリー
export interface MarketingPerformanceSummary {
  total_assets: number
  total_sent: number
  total_opened: number
  total_clicked: number
  total_converted: number

  avg_open_rate: number
  avg_click_rate: number
  avg_conversion_rate: number

  top_performing: {
    asset_id: string
    asset_name: string
    conversion_rate: number
  } | null

  worst_performing: {
    asset_id: string
    asset_name: string
    conversion_rate: number
  } | null
}
