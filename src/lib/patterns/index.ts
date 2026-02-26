/**
 * YARIKIRU Task Patterns Manager
 *
 * タスク分解パターンの保存・検索・マッチングを行うライブラリ
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PATTERNS_DIR = join(process.cwd(), '.yarikiru', 'patterns')

export interface TaskPattern {
  id: string
  name: string
  category: 'frontend' | 'backend' | 'database' | 'infra' | 'design' | 'testing' | 'docs' | 'other'
  description: string
  tags: string[]
  taskTemplate: {
    title: string
    estimatedMinutes: number
    priority: number
  }
  subTasks: Array<{
    label: string
    estimatedMinutes?: number
    dependencies?: string[]
  }>
  createdAt: string
  usedAt?: string
  usageCount: number
  successRate?: number
  avgActualMinutes?: number
}

/**
 * パターンを保存
 */
export function savePattern(pattern: TaskPattern): void {
  if (!existsSync(PATTERNS_DIR)) {
    mkdirSync(PATTERNS_DIR, { recursive: true })
  }

  const filePath = join(PATTERNS_DIR, `${pattern.id}.json`)
  writeFileSync(filePath, JSON.stringify(pattern, null, 2), 'utf-8')
}

/**
 * パターンを読み込み
 */
export function loadPattern(id: string): TaskPattern | null {
  const filePath = join(PATTERNS_DIR, `${id}.json`)
  if (!existsSync(filePath)) {
    return null
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as TaskPattern
  } catch {
    return null
  }
}

/**
 * すべてのパターンを読み込み
 */
export function loadAllPatterns(): TaskPattern[] {
  if (!existsSync(PATTERNS_DIR)) {
    return []
  }

  const patterns: TaskPattern[] = []
  const files = readdirSync(PATTERNS_DIR).filter(f => f.endsWith('.json') && f !== 'schema.json')

  for (const file of files) {
    try {
      const content = readFileSync(join(PATTERNS_DIR, file), 'utf-8')
      const pattern = JSON.parse(content) as TaskPattern
      patterns.push(pattern)
    } catch {
      // スキップ
    }
  }

  return patterns.sort((a, b) => b.usageCount - a.usageCount)
}

/**
 * タスクからパターンを生成して保存
 */
export function saveGoalAsPattern(
  goalId: string,
  goalTitle: string,
  subTasks: Array<{ label: string; sort_order: number }>,
  category?: TaskPattern['category'],
  tags?: string[]
): TaskPattern {
  const patternId = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

  const pattern: TaskPattern = {
    id: patternId,
    name: goalTitle,
    category: category || detectCategory(goalTitle),
    description: `自動生成パターン: ${goalTitle}`,
    tags: tags || extractTags(goalTitle),
    taskTemplate: {
      title: goalTitle,
      estimatedMinutes: subTasks.length * 15,
      priority: 5
    },
    subTasks: subTasks.map(st => ({
      label: st.label,
      estimatedMinutes: 15
    })),
    createdAt: new Date().toISOString(),
    usageCount: 0
  }

  savePattern(pattern)
  return pattern
}

/**
 * ゴール完了時にパターンの統計を更新
 */
export function updatePatternStats(
  patternId: string,
  actualMinutes: number,
  success: boolean
): void {
  const pattern = loadPattern(patternId)
  if (!pattern) return

  pattern.usageCount++
  pattern.usedAt = new Date().toISOString()

  // 平均実績時間を更新
  if (pattern.avgActualMinutes) {
    pattern.avgActualMinutes = (pattern.avgActualMinutes * (pattern.usageCount - 1) + actualMinutes) / pattern.usageCount
  } else {
    pattern.avgActualMinutes = actualMinutes
  }

  // 成功率を更新
  if (success) {
    if (pattern.successRate) {
      pattern.successRate = (pattern.successRate * (pattern.usageCount - 1) + 1) / pattern.usageCount
    } else {
      pattern.successRate = 1
    }
  } else {
    if (pattern.successRate) {
      pattern.successRate = (pattern.successRate * (pattern.usageCount - 1)) / pattern.usageCount
    } else {
      pattern.successRate = 0
    }
  }

  savePattern(pattern)
}

/**
 * 類似パターンを検索
 */
export function findSimilarPatterns(
  goalTitle: string,
  limit = 5
): Array<{ pattern: TaskPattern; score: number }> {
  const patterns = loadAllPatterns()
  const searchTerms = extractSearchTerms(goalTitle)

  const scored = patterns.map(pattern => {
    let score = 0
    const patternTerms = extractSearchTerms(pattern.name + ' ' + pattern.description + ' ' + pattern.tags.join(' '))

    // タイトル一致
    for (const term of searchTerms) {
      if (pattern.name.toLowerCase().includes(term.toLowerCase())) {
        score += 10
      }
    }

    // タグ一致
    for (const tag of pattern.tags) {
      for (const term of searchTerms) {
        if (tag.toLowerCase().includes(term.toLowerCase())) {
          score += 5
        }
      }
    }

    // カテゴリボーナス
    const category = detectCategory(goalTitle)
    if (pattern.category === category) {
      score += 3
    }

    // 使用頻度ボーナス
    score += Math.log(pattern.usageCount + 1)

    // 成功率ボーナス
    if (pattern.successRate) {
      score *= pattern.successRate
    }

    return { pattern, score }
  })

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * パターンからサブタスクを生成
 */
export function generateSubTasksFromPattern(
  patternId: string
): Array<{ label: string; sort_order: number }> {
  const pattern = loadPattern(patternId)
  if (!pattern) {
    return []
  }

  return pattern.subTasks.map((st, idx) => ({
    label: st.label,
    sort_order: idx + 1
  }))
}

/**
 * カテゴリを検出
 */
function detectCategory(text: string): TaskPattern['category'] {
  const lower = text.toLowerCase()

  const categoryKeywords: Record<string, string[]> = {
    frontend: ['ui', 'ux', 'component', 'react', 'vue', 'next', 'nuxt', 'svelte', 'frontend', 'フロント', '画面'],
    backend: ['api', 'server', 'backend', 'バックエンド', 'エンドポイント', 'ルート'],
    database: ['db', 'database', 'sql', 'turso', 'prisma', 'orm', 'migration', 'データベース'],
    infra: ['deploy', 'ci', 'cd', 'docker', 'kubernetes', 'aws', 'vercel', 'インフラ'],
    design: ['design', 'デザイン', 'figma', 'sketch'],
    testing: ['test', 'testing', 'jest', 'vitest', 'テスト'],
    docs: ['docs', 'documentation', 'readme', 'ドキュメント', '説明']
  }

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return category as TaskPattern['category']
      }
    }
  }

  return 'other'
}

/**
 * タグを抽出
 */
function extractTags(text: string): string[] {
  const tags: string[] = []

  // 【タグ】形式を抽出
  const tagMatches = text.match(/【(.+?)】/g)
  if (tagMatches) {
    for (const match of tagMatches) {
      tags.push(match.replace(/【|】/g, ''))
    }
  }

  // 技術キーワード
  const techKeywords = [
    'React', 'Vue', 'Next.js', 'Nuxt', 'TypeScript', 'Turso', 'Prisma',
    'Tailwind', 'Vercel', 'AWS', 'Docker', 'Kubernetes'
  ]

  for (const keyword of techKeywords) {
    if (text.includes(keyword)) {
      tags.push(keyword)
    }
  }

  return [...new Set(tags)]
}

/**
 * 検索用語を抽出
 */
function extractSearchTerms(text: string): string[] {
  // 日本語と英語の単語を抽出
  const words = text
    .replace(/【.+?】/g, '') // タグを除去
    .replace(/（.+?）/g, '') // 括弧を除去
    .replace(/\s+/g, ' ')
    .split(/[,、\s]+/)
    .filter(w => w.length >= 2)

  return [...new Set(words.map(w => w.toLowerCase()))]
}
