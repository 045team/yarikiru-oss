import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../../lib/turso/client'
import { predictTimeByCategory, formatHistoricalGoals } from '@/lib/ai/predict-time'
import { encryptForDb, decryptFromDb } from '@/lib/e2ee'

/**
 * POST /api/goals/plan
 * 新しいゴールの計画を作成する（時間見積もり・サブタスク分解）
 * Body: { title, projectId?, description? }
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, projectId, description } = body as {
      title: string
      projectId?: string
      description?: string
    }

    if (!title || title.trim().length < 2) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })

    // 過去のゴールデータを取得（予測用）
    const historicalResult = await db.execute({
      sql: `
        SELECT g.id, g.title, g.actual_minutes, g.estimated_minutes, g.completed_at
        FROM yarikiru_goals g
        JOIN yarikiru_projects p ON g.project_id = p.id
        WHERE p.user_id = ?
          AND g.status = 'done'
          AND g.actual_minutes IS NOT NULL
          AND g.actual_minutes > 0
        ORDER BY g.completed_at DESC
        LIMIT 100
      `,
      args: [userId],
    })

    const historicalGoals = formatHistoricalGoals(
      await Promise.all(historicalResult.rows.map(async row => ({
        id: String(row[0]),
        title: await decryptFromDb(String(row[1])),
        actual_minutes: Number(row[2]),
        estimated_minutes: row[3] ? Number(row[3]) : null,
        completed_at: String(row[4]),
      })))
    )

    // AI予測を実行
    const prediction = predictTimeByCategory(title, historicalGoals, {
      useMedian: false,
      includeUncategorized: true,
    })

    // サブタスクのテンプレート生成
    const baseSubTasks = generateSubTaskTemplates(title, prediction.category)

    // 並列実行プランの計算
    const parallelGroups = calculateParallelGroups(baseSubTasks)

    // プロジェクトが指定されていない場合はデフォルトプロジェクトを使用
    let targetProjectId = projectId
    if (!targetProjectId) {
      const projectResult = await db.execute({
        sql: 'SELECT id FROM yarikiru_projects WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        args: [userId],
      })

      if (projectResult.rows.length === 0) {
        // プロジェクトがない場合は作成
        const newProjectId = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`
        await db.execute({
          sql: 'INSERT INTO yarikiru_projects (id, user_id, title, description, status) VALUES (?, ?, ?, ?, ?)',
          args: [newProjectId, userId, 'YARIKIRUをやり切る', null, 'active'],
        })
        targetProjectId = newProjectId
      } else {
        targetProjectId = String(projectResult.rows[0][0])
      }
    }

    return NextResponse.json({
      plan: {
        title,
        projectId: targetProjectId,
        description,
        estimatedMinutes: prediction.predictedMinutes,
        confidence: prediction.confidence,
        category: prediction.category,
        subTasks: baseSubTasks,
        parallelGroups,
      },
      historical: {
        dataPoints: prediction.dataPoints,
        categoryStats: prediction.categoryStats,
      },
    })
  } catch (error) {
    console.error('Error planning goal:', error)
    return NextResponse.json(
      { error: 'Failed to plan goal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * ゴールタイトルからサブタスクテンプレートを生成
 */
function generateSubTaskTemplates(
  title: string,
  category: string | null
): Array<{ label: string; estimatedMinutes: number }> {
  const lowerTitle = title.toLowerCase()

  // カテゴリ別のテンプレート
  if (category?.includes('フロントエンド') || lowerTitle.includes('ui') || lowerTitle.includes('フロント')) {
    return [
      { label: 'コンポーネント設計と props 検討', estimatedMinutes: 20 },
      { label: 'UI コンポーネント実装', estimatedMinutes: 45 },
      { label: 'スタイリングとレスポンシブ対応', estimatedMinutes: 30 },
      { label: 'インタラクションと状態管理', estimatedMinutes: 25 },
      { label: '動作確認とブラウザテスト', estimatedMinutes: 15 },
    ]
  }

  if (category?.includes('バックエンド') || lowerTitle.includes('api') || lowerTitle.includes('バックエンド')) {
    return [
      { label: 'API 仕様設計', estimatedMinutes: 20 },
      { label: 'エンドポイント実装', estimatedMinutes: 45 },
      { label: 'データバリデーション', estimatedMinutes: 20 },
      { label: 'エラーハンドリング', estimatedMinutes: 15 },
      { label: 'API テスト', estimatedMinutes: 20 },
    ]
  }

  if (category?.includes('テスト') || lowerTitle.includes('テスト') || lowerTitle.includes('test')) {
    return [
      { label: 'テスト計画とケース定義', estimatedMinutes: 15 },
      { label: 'テストコード実装', estimatedMinutes: 30 },
      { label: 'テストデータ準備', estimatedMinutes: 15 },
      { label: 'テスト実行と結果確認', estimatedMinutes: 20 },
      { label: '失敗ケースの修正', estimatedMinutes: 20 },
    ]
  }

  // デフォルトテンプレート
  return [
    { label: '要件定義と設計', estimatedMinutes: 20 },
    { label: '実装', estimatedMinutes: 45 },
    { label: 'テスト', estimatedMinutes: 20 },
    { label: 'ドキュメント更新', estimatedMinutes: 15 },
  ]
}

/**
 * 並列実行グループを計算
 */
function calculateParallelGroups(
  subTasks: Array<{ label: string; estimatedMinutes: number }>
): Array<{
  id: string
  name: string
  tasks: Array<{ label: string; estimatedMinutes: number }>
  estimatedMinutes: number
  canStartAfter: string[]
}> {
  const groups: Array<{
    id: string
    name: string
    tasks: Array<{ label: string; estimatedMinutes: number }>
    estimatedMinutes: number
    canStartAfter: string[]
  }> = []
  const groupSize = 2

  for (let i = 0; i < subTasks.length; i += groupSize) {
    const tasksInGroup = subTasks.slice(i, i + groupSize)

    groups.push({
      id: `wave_${Math.floor(i / groupSize) + 1}`,
      name: `ウェーブ ${Math.floor(i / groupSize) + 1}`,
      tasks: tasksInGroup,
      estimatedMinutes: tasksInGroup.reduce((sum, t) => sum + t.estimatedMinutes, 0),
      canStartAfter: i > 0 ? [`wave_${Math.floor(i / groupSize)}`] : [],
    })
  }

  return groups
}
