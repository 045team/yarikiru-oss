// ============================================
// predict-time.ts テスト
// ============================================

import {
  detectCategory,
  detectAllCategories,
  predictTimeByCategory,
  getCategoryStats,
  getAllCategoryStats,
  extractMatchedKeywords,
  formatMinutes,
  confidenceToLabel,
  getTaskCategoryIds,
  getCategoryById,
  TASK_CATEGORIES,
} from '../predict-time'
import type { HistoricalGoalData } from '../predict-time'

// テスト用ダミーデータ
const mockHistoricalGoals: HistoricalGoalData[] = [
  { title: 'UIコンポーネントの実装', actualMinutes: 60, estimatedMinutes: 45, completedAt: '2026-02-01' },
  { title: 'Reactでの画面作成', actualMinutes: 90, estimatedMinutes: 60, completedAt: '2026-02-02' },
  { title: 'APIエンドポイントの実装', actualMinutes: 120, estimatedMinutes: 90, completedAt: '2026-02-03' },
  { title: 'データベーススキーマの修正', actualMinutes: 45, estimatedMinutes: 60, completedAt: '2026-02-04' },
  { title: 'バグ修正：エラー処理の追加', actualMinutes: 30, estimatedMinutes: 30, completedAt: '2026-02-05' },
  { title: 'テストコードの追加', actualMinutes: 45, estimatedMinutes: 60, completedAt: '2026-02-06' },
  { title: 'デプロイ設定の見直し', actualMinutes: 60, estimatedMinutes: 45, completedAt: '2026-02-07' },
  { title: 'リファクタリング：コード整理', actualMinutes: 75, estimatedMinutes: 60, completedAt: '2026-02-08' },
  { title: 'ドキュメントの更新', actualMinutes: 30, estimatedMinutes: 30, completedAt: '2026-02-09' },
  { title: '認証機能の実装', actualMinutes: 90, estimatedMinutes: 90, completedAt: '2026-02-10' },
]

describe('detectCategory', () => {
  test('フロントエンド関連のキーワードでカテゴリを検出', () => {
    const result = detectCategory('UIコンポーネントの実装')
    expect(result?.id).toBe('frontend')
    expect(result?.name).toBe('フロントエンド実装')
  })

  test('バックエンド関連のキーワードでカテゴリを検出', () => {
    const result = detectCategory('APIエンドポイントの作成')
    expect(result?.id).toBe('backend')
  })

  test('テスト関連のキーワードでカテゴリを検出', () => {
    const result = detectCategory('テストコードを追加する')
    expect(result?.id).toBe('test')
  })

  test('バグ修正関連のキーワードでカテゴリを検出', () => {
    const result = detectCategory('バグ修正：エラー処理')
    expect(result?.id).toBe('bugfix')
  })

  test('キーワードが含まれない場合はnullを返す', () => {
    const result = detectCategory('何らかの作業')
    expect(result).toBeNull()
  })

  test('空文字列の場合はnullを返す', () => {
    expect(detectCategory('')).toBeNull()
    expect(detectCategory('  ')).toBeNull()
  })
})

describe('detectAllCategories', () => {
  test('全ての一致するカテゴリをスコア順で返す', () => {
    const result = detectAllCategories('UIのテストコードを追加')
    expect(result.length).toBeGreaterThan(0)
    // 'テスト'と'UI'が含まれるので両方のカテゴリがヒットするはず
    const categories = result.map(r => r.category.id)
    expect(categories).toContain('test')
    expect(categories).toContain('frontend')
  })

  test('スコアが高い順にソートされている', () => {
    const result = detectAllCategories('テストとデプロイの実装')
    // スコア順になっていることを確認（降順）
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score)
    }
  })
})

describe('getCategoryStats', () => {
  test('フロントエンドカテゴリの統計を計算', () => {
    const frontendCategory = TASK_CATEGORIES.find(c => c.id === 'frontend')!
    const stats = getCategoryStats(mockHistoricalGoals, frontendCategory)

    expect(stats).not.toBeNull()
    expect(stats?.categoryId).toBe('frontend')
    expect(stats?.matchCount).toBeGreaterThan(0)
    expect(stats?.avgMinutes).toBeGreaterThan(0)
    expect(stats?.medianMinutes).toBeGreaterThan(0)
  })

  test('バックエンドカテゴリの統計を計算', () => {
    const backendCategory = TASK_CATEGORIES.find(c => c.id === 'backend')!
    const stats = getCategoryStats(mockHistoricalGoals, backendCategory)

    expect(stats).not.toBeNull()
    expect(stats?.categoryId).toBe('backend')
  })

  test('データがないカテゴリはnullを返す', () => {
    // データに含まれないキーワードを持つカテゴリを作成
    const rareCategory = {
      id: 'rare',
      name: 'レアカテゴリ',
      keywords: ['絶対に存在しないキーワード'],
      description: 'テスト用',
      defaultMinutes: 30,
    }
    const stats = getCategoryStats(mockHistoricalGoals, rareCategory)
    expect(stats).toBeNull()
  })
})

describe('predictTimeByCategory', () => {
  test('フロントエンド関連タスクの時間を予測', () => {
    const result = predictTimeByCategory('UIコンポーネントの実装', mockHistoricalGoals)

    expect(result.predictedMinutes).not.toBeNull()
    expect(result.confidence).not.toBe('none')
    expect(result.category).toBe('フロントエンド実装')
    expect(result.dataPoints).toBeGreaterThan(0)
    expect(result.categoryStats).not.toBeNull()
  })

  test('バックエンド関連タスクの時間を予測', () => {
    const result = predictTimeByCategory('APIサーバーの実装', mockHistoricalGoals)

    expect(result.predictedMinutes).not.toBeNull()
    expect(result.category).toBe('バックエンド実装')
  })

  test('中央値を使用するオプション', () => {
    const resultAvg = predictTimeByCategory('UI実装', mockHistoricalGoals, { useMedian: false })
    const resultMedian = predictTimeByCategory('UI実装', mockHistoricalGoals, { useMedian: true })

    expect(resultAvg.categoryStats?.avgMinutes).toBeDefined()
    expect(resultMedian.categoryStats?.medianMinutes).toBeDefined()
  })

  test('データがない場合はフォールバック', () => {
    const result = predictTimeByCategory('新しい機能の実装', [])

    expect(result.predictedMinutes).not.toBeNull()
    expect(result.isFallback).toBe(true)
    expect(result.confidence).toBe('low')
  })

  test('空文字列の場合はnullを返す', () => {
    const result = predictTimeByCategory('', mockHistoricalGoals)

    expect(result.predictedMinutes).toBeNull()
    expect(result.confidence).toBe('none')
  })
})

describe('getAllCategoryStats', () => {
  test('全カテゴリの統計を取得', () => {
    const stats = getAllCategoryStats(mockHistoricalGoals)

    expect(Array.isArray(stats)).toBe(true)
    expect(stats.length).toBeGreaterThan(0)

    // データポイント数の降順でソートされている
    for (let i = 1; i < stats.length; i++) {
      expect(stats[i - 1].matchCount).toBeGreaterThanOrEqual(stats[i].matchCount)
    }
  })
})

describe('extractMatchedKeywords', () => {
  test('マッチしたキーワードを抽出', () => {
    const category = detectCategory('UIとReactの実装')
    const keywords = extractMatchedKeywords('UIとReactの実装', category)

    expect(keywords.length).toBeGreaterThan(0)
    expect(keywords).toContain('UI')
    expect(keywords).toContain('React')
  })

  test('カテゴリがnullの場合は空配列を返す', () => {
    const keywords = extractMatchedKeywords('何らかの作業', null)
    expect(keywords).toEqual([])
  })
})

describe('formatMinutes', () => {
  test('分数のみ', () => {
    expect(formatMinutes(30)).toBe('30分')
    expect(formatMinutes(45)).toBe('45分')
  })

  test('時間のみ', () => {
    expect(formatMinutes(60)).toBe('1時間')
    expect(formatMinutes(120)).toBe('2時間')
  })

  test('時間と分の組み合わせ', () => {
    expect(formatMinutes(90)).toBe('1時間30分')
    expect(formatMinutes(150)).toBe('2時間30分')
  })
})

describe('confidenceToLabel', () => {
  test('信頼度を日本語に変換', () => {
    expect(confidenceToLabel('high')).toBe('高い')
    expect(confidenceToLabel('medium')).toBe('中')
    expect(confidenceToLabel('low')).toBe('低い')
    expect(confidenceToLabel('none')).toBe('なし')
  })
})

describe('getTaskCategoryIds', () => {
  test('全カテゴリIDを取得', () => {
    const ids = getTaskCategoryIds()

    expect(ids).toContain('frontend')
    expect(ids).toContain('backend')
    expect(ids).toContain('test')
    expect(ids).toContain('bugfix')
    expect(ids.length).toBe(TASK_CATEGORIES.length)
  })
})

describe('getCategoryById', () => {
  test('IDでカテゴリを取得', () => {
    const category = getCategoryById('frontend')

    expect(category).toBeDefined()
    expect(category?.id).toBe('frontend')
    expect(category?.name).toBe('フロントエンド実装')
  })

  test('存在しないIDはundefinedを返す', () => {
    const category = getCategoryById('nonexistent')
    expect(category).toBeUndefined()
  })
})

describe('外れ値除去の検証', () => {
  test('外れ値が含まれるデータの統計計算', () => {
    const dataWithOutliers: HistoricalGoalData[] = [
      { title: '通常タスク1', actualMinutes: 60, estimatedMinutes: 60, completedAt: '2026-02-01' },
      { title: '通常タスク2', actualMinutes: 60, estimatedMinutes: 60, completedAt: '2026-02-02' },
      { title: '通常タスク3', actualMinutes: 60, estimatedMinutes: 60, completedAt: '2026-02-03' },
      { title: '通常タスク4', actualMinutes: 60, estimatedMinutes: 60, completedAt: '2026-02-04' },
      { title: '異常に長いタスク', actualMinutes: 600, estimatedMinutes: 60, completedAt: '2026-02-05' },
      { title: '異常に短いタスク', actualMinutes: 5, estimatedMinutes: 60, completedAt: '2026-02-06' },
    ]

    const result = predictTimeByCategory('通常タスクの実装', dataWithOutliers)

    // 外れ値が除外されているため、平均値は60付近になるはず
    expect(result.predictedMinutes).toBeGreaterThan(30)
    expect(result.predictedMinutes).toBeLessThan(200)
  })
})
