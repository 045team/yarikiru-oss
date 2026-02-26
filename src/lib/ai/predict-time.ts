// ============================================
// AI Time Prediction by Task Category
// YARIKIRU v4.0 - カテゴリ別時間予測
// ============================================

// ============================================
// Type Definitions
// ============================================

export interface TaskCategory {
  id: string
  name: string
  keywords: string[]
  description: string
  defaultMinutes: number
}

export interface CategoryTimeStats {
  categoryId: string
  categoryName: string
  matchCount: number
  avgMinutes: number
  medianMinutes: number
  minMinutes: number
  maxMinutes: number
  stdDevMinutes: number
}

export interface TimePredictionResult {
  predictedMinutes: number | null
  confidence: 'high' | 'medium' | 'low' | 'none'
  category: string | null
  dataPoints: number
  categoryStats: CategoryTimeStats | null
  isFallback: boolean
}

export interface HistoricalGoalData {
  title: string
  actualMinutes: number
  estimatedMinutes: number | null
  completedAt: string
}

// ============================================
// Task Categories Definition
// ============================================

/**
 * タスクカテゴリ定義
 * 各カテゴリはキーワードとデフォルト所要時間を持つ
 */
export const TASK_CATEGORIES: TaskCategory[] = [
  {
    id: 'frontend',
    name: 'フロントエンド実装',
    keywords: ['UI', 'フロント', 'フロントエンド', '画面', 'ページ', 'コンポーネント', 'スタイリング', 'CSS', 'Tailwind', 'React', 'Vue', '表示', 'インターフェース'],
    description: 'UI/フロントエンド関連の実装タスク',
    defaultMinutes: 60,
  },
  {
    id: 'backend',
    name: 'バックエンド実装',
    keywords: ['API', 'バックエンド', 'サーバー', 'エンドポイント', 'DB', 'データベース', 'スキーマ', 'マイグレーション', '認証', 'Auth'],
    description: 'API/バックエンド関連の実装タスク',
    defaultMinutes: 90,
  },
  {
    id: 'test',
    name: 'テスト',
    keywords: ['テスト', 'Test', 'テストコード', '単体テスト', '結合テスト', 'E2E', 'Jest', 'Playwright', 'テスト追加', 'テスト実装'],
    description: 'テスト関連のタスク',
    defaultMinutes: 45,
  },
  {
    id: 'bugfix',
    name: 'バグ修正',
    keywords: ['バグ', 'Bug', '修正', 'エラー', 'Error', '不具合', 'デバッグ', 'Debug', '修正対応'],
    description: 'バグ修正関連のタスク',
    defaultMinutes: 30,
  },
  {
    id: 'refactor',
    name: 'リファクタリング',
    keywords: ['リファクタ', 'Refactor', 'リファクタリング', '整理', '改善', 'クリーンアップ', '最適化', 'Optimize'],
    description: 'リファクタリング・コード改善タスク',
    defaultMinutes: 60,
  },
  {
    id: 'documentation',
    name: 'ドキュメント',
    keywords: ['ドキュメント', 'Documentation', 'README', 'コメント', '説明', '記載', 'ドキュメント化'],
    description: 'ドキュメント作成・更新タスク',
    defaultMinutes: 30,
  },
  {
    id: 'deployment',
    name: 'デプロイ',
    keywords: ['デプロイ', 'Deploy', 'リリース', '本番', '本番反映', '公開', '環境構築', 'セットアップ', 'Setup'],
    description: 'デプロイ・環境設定関連のタスク',
    defaultMinutes: 45,
  },
  {
    id: 'feature',
    name: '機能実装',
    keywords: ['機能', '実装', '追加', '新規', '作成', '実装する', '追加する', '機能追加'],
    description: '新機能実装タスク（カテゴリ特定不可の場合）',
    defaultMinutes: 75,
  },
  {
    id: 'planning',
    name: '設計・計画',
    keywords: ['設計', 'デザイン', '計画', '仕様', '要件', '調査', '検討', '検討する', '調査する'],
    description: '設計・計画・調査関連のタスク',
    defaultMinutes: 30,
  },
  {
    id: 'data',
    name: 'データ処理',
    keywords: ['データ', 'Data', 'マイグレーション', 'Migration', 'インポート', 'エクスポート', '変換', '処理'],
    description: 'データ処理・マイグレーション関連のタスク',
    defaultMinutes: 60,
  },
]

// ============================================
// Category Detection
// ============================================

/**
 * ゴールタイトルからカテゴリを検出
 *
 * @param title - ゴールタイトル
 * @returns 検出されたカテゴリ（マッチしない場合はnull）
 */
export function detectCategory(title: string): TaskCategory | null {
  if (!title || title.trim().length < 2) {
    return null
  }

  const normalizedTitle = title.toLowerCase()
  let bestMatch: TaskCategory | null = null
  let maxMatches = 0

  for (const category of TASK_CATEGORIES) {
    let matchCount = 0
    for (const keyword of category.keywords) {
      if (normalizedTitle.includes(keyword.toLowerCase())) {
        matchCount++
      }
    }
    if (matchCount > maxMatches) {
      maxMatches = matchCount
      bestMatch = category
    }
  }

  return maxMatches > 0 ? bestMatch : null
}

/**
 * ゴールタイトルから全ての一致するカテゴリを取得
 *
 * @param title - ゴールタイトル
 * @returns 一致するカテゴリの配列（スコア順）
 */
export function detectAllCategories(title: string): Array<{ category: TaskCategory; score: number }> {
  if (!title || title.trim().length < 2) {
    return []
  }

  const normalizedTitle = title.toLowerCase()
  const results: Array<{ category: TaskCategory; score: number }> = []

  for (const category of TASK_CATEGORIES) {
    let matchCount = 0
    for (const keyword of category.keywords) {
      if (normalizedTitle.includes(keyword.toLowerCase())) {
        matchCount++
      }
    }
    if (matchCount > 0) {
      results.push({ category, score: matchCount })
    }
  }

  return results.sort((a, b) => b.score - a.score)
}

// ============================================
// Statistics Calculation
// ============================================

/**
 * 配列から中央値を計算
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

/**
 * 配列から標準偏差を計算
 */
function calculateStdDev(values: number[], avg: number): number {
  if (values.length < 2) return 0
  const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length
  return Math.round(Math.sqrt(variance))
}

/**
 * IQR法で外れ値を除外
 */
function removeOutliers(values: number[]): number[] {
  if (values.length < 4) return values

  const sorted = [...values].sort((a, b) => a - b)
  const q1Index = Math.floor(sorted.length * 0.25)
  const q3Index = Math.floor(sorted.length * 0.75)
  const q1 = sorted[q1Index]
  const q3 = sorted[q3Index]
  const iqr = q3 - q1
  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr

  return values.filter(v => v >= lowerBound && v <= upperBound)
}

// ============================================
// Time Prediction Functions
// ============================================

/**
 * カテゴリ別の統計データを取得
 *
 * @param historicalGoals - 過去のゴールデータ
 * @param category - 対象カテゴリ
 * @returns カテゴリ統計情報
 */
export function getCategoryStats(
  historicalGoals: HistoricalGoalData[],
  category: TaskCategory
): CategoryTimeStats | null {
  // カテゴリのキーワードにマッチするゴールを抽出
  const matchingGoals = historicalGoals.filter(goal => {
    const normalizedTitle = goal.title.toLowerCase()
    return category.keywords.some(keyword => normalizedTitle.includes(keyword.toLowerCase()))
  })

  if (matchingGoals.length === 0) {
    return null
  }

  const minutes = matchingGoals.map(g => g.actualMinutes)
  const filteredMinutes = removeOutliers(minutes)

  if (filteredMinutes.length === 0) {
    return null
  }

  const sum = filteredMinutes.reduce((a, b) => a + b, 0)
  const avg = Math.round(sum / filteredMinutes.length)
  const min = Math.min(...filteredMinutes)
  const max = Math.max(...filteredMinutes)
  const median = calculateMedian(filteredMinutes)
  const stdDev = calculateStdDev(filteredMinutes, avg)

  return {
    categoryId: category.id,
    categoryName: category.name,
    matchCount: filteredMinutes.length,
    avgMinutes: avg,
    medianMinutes: median,
    minMinutes: min,
    maxMinutes: max,
    stdDevMinutes: stdDev,
  }
}

/**
 * ゴールタイトルから所要時間を予測
 *
 * @param title - ゴールタイトル
 * @param historicalGoals - 過去のゴールデータ
 * @param options - オプション（useMedian: trueの場合は中央値を使用）
 * @returns 予測結果
 */
export function predictTimeByCategory(
  title: string,
  historicalGoals: HistoricalGoalData[],
  options: { useMedian?: boolean; includeUncategorized?: boolean } = {}
): TimePredictionResult {
  const { useMedian = false, includeUncategorized = true } = options

  if (!title || title.trim().length < 2) {
    return {
      predictedMinutes: null,
      confidence: 'none',
      category: null,
      dataPoints: 0,
      categoryStats: null,
      isFallback: false,
    }
  }

  // カテゴリを検出
  const detectedCategory = detectCategory(title)

  if (!detectedCategory) {
    // カテゴリが検出できない場合の処理
    if (includeUncategorized && historicalGoals.length > 0) {
      // 全体の平均値を使用
      const allMinutes = historicalGoals.map(g => g.actualMinutes)
      const filteredMinutes = removeOutliers(allMinutes)
      const avg = Math.round(filteredMinutes.reduce((a, b) => a + b, 0) / filteredMinutes.length)

      return {
        predictedMinutes: avg,
        confidence: 'low',
        category: '未分類',
        dataPoints: filteredMinutes.length,
        categoryStats: {
          categoryId: 'uncategorized',
          categoryName: '未分類',
          matchCount: filteredMinutes.length,
          avgMinutes: avg,
          medianMinutes: calculateMedian(filteredMinutes),
          minMinutes: Math.min(...filteredMinutes),
          maxMinutes: Math.max(...filteredMinutes),
          stdDevMinutes: calculateStdDev(filteredMinutes, avg),
        },
        isFallback: true,
      }
    }

    return {
      predictedMinutes: null,
      confidence: 'none',
      category: null,
      dataPoints: 0,
      categoryStats: null,
      isFallback: false,
    }
  }

  // カテゴリ統計を計算
  const stats = getCategoryStats(historicalGoals, detectedCategory)

  if (!stats) {
    // 該当カテゴリのデータがない場合、デフォルト値を使用
    return {
      predictedMinutes: detectedCategory.defaultMinutes,
      confidence: 'low',
      category: detectedCategory.name,
      dataPoints: 0,
      categoryStats: null,
      isFallback: true,
    }
  }

  // データポイント数に基づく信頼度
  let confidence: 'high' | 'medium' | 'low'
  if (stats.matchCount >= 5) {
    confidence = 'high'
  } else if (stats.matchCount >= 3) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  // 平均値または中央値を使用
  const predictedMinutes = useMedian ? stats.medianMinutes : stats.avgMinutes

  return {
    predictedMinutes,
    confidence,
    category: detectedCategory.name,
    dataPoints: stats.matchCount,
    categoryStats: stats,
    isFallback: false,
  }
}

/**
 * 複数カテゴリの統計情報を一括取得
 *
 * @param historicalGoals - 過去のゴールデータ
 * @returns 全カテゴリの統計情報
 */
export function getAllCategoryStats(
  historicalGoals: HistoricalGoalData[]
): CategoryTimeStats[] {
  const results: CategoryTimeStats[] = []

  for (const category of TASK_CATEGORIES) {
    const stats = getCategoryStats(historicalGoals, category)
    if (stats) {
      results.push(stats)
    }
  }

  return results.sort((a, b) => b.matchCount - a.matchCount)
}

/**
 * ゴールタイトルから予測に使用されたキーワードを抽出
 *
 * @param title - ゴールタイトル
 * @param category - 検出されたカテゴリ
 * @returns マッチしたキーワードの配列
 */
export function extractMatchedKeywords(title: string, category: TaskCategory | null): string[] {
  if (!category) return []

  const normalizedTitle = title.toLowerCase()
  const matched: string[] = []

  for (const keyword of category.keywords) {
    if (normalizedTitle.includes(keyword.toLowerCase())) {
      matched.push(keyword)
    }
  }

  return matched
}

// ============================================
// Helper Functions
// ============================================

/**
 * 分から時間文字列に変換
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours}時間`
  }
  return `${hours}時間${mins}分`
}

/**
 * 信頼度を日本語に変換
 */
export function confidenceToLabel(confidence: 'high' | 'medium' | 'low' | 'none'): string {
  switch (confidence) {
    case 'high':
      return '高い'
    case 'medium':
      return '中'
    case 'low':
      return '低い'
    case 'none':
      return 'なし'
  }
}

/**
 * デフォルトのカテゴリIDリストを取得
 */
export function getTaskCategoryIds(): string[] {
  return TASK_CATEGORIES.map(c => c.id)
}

/**
 * カテゴリIDからカテゴリ情報を取得
 */
export function getCategoryById(id: string): TaskCategory | undefined {
  return TASK_CATEGORIES.find(c => c.id === id)
}

/**
 * 類似ゴールのデータを整形
 * DBから取得したデータをHistoricalGoalData形式に変換
 */
export function formatHistoricalGoals(data: Array<{
  id: string
  title: string
  actual_minutes: number
  estimated_minutes: number | null
  completed_at: string
}>): HistoricalGoalData[] {
  return data.map(row => ({
    title: row.title,
    actualMinutes: row.actual_minutes,
    estimatedMinutes: row.estimated_minutes,
    completedAt: row.completed_at,
  }))
}
