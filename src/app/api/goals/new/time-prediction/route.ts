/**
 * POST /api/goals/new/time-prediction
 *
 * 新規ゴール作成前に、タイトルから所要時間を予測するエンドポイント。
 * カテゴリベースの予測を使用し、より精度の高い見積もりを提供します。
 *
 * Body: { title: string }
 * Response: {
 *   predictedMinutes: number | null,
 *   confidence: 'high' | 'medium' | 'low' | 'none',
 *   category: string | null,
 *   dataPoints: number,
 *   isFallback: boolean,
 *   matchedKeywords: string[]
 * }
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getDatabase } from '@/lib/turso'
import {
  predictTimeByCategory,
  formatHistoricalGoals,
  extractMatchedKeywords,
  detectCategory,
} from '@/lib/ai/predict-time'
import { decryptFromDb } from '@/lib/e2ee'

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title } = body as { title?: string }

    if (!title || title.trim().length < 2) {
      return NextResponse.json({
        predictedMinutes: null,
        confidence: 'none',
        category: null,
        dataPoints: 0,
        isFallback: false,
        matchedKeywords: [],
      })
    }

    const db = getDatabase()

    // 過去の完了済みゴールデータを取得
    const goals = await db.execute<{
      id: string
      title: string
      actual_minutes: number
      estimated_minutes: number | null
      completed_at: string
    }>(`
      SELECT
        g.id,
        g.title,
        g.actual_minutes,
        g.estimated_minutes,
        g.completed_at
      FROM yarikiru_goals g
      JOIN yarikiru_projects p ON g.project_id = p.id
      WHERE p.user_id = ?
        AND g.status = 'done'
        AND g.actual_minutes IS NOT NULL
        AND g.actual_minutes > 0
      ORDER BY g.completed_at DESC
      LIMIT 100
    `, [userId])

    const historicalGoals = formatHistoricalGoals(goals)

    // カテゴリ別予測を実行
    const prediction = predictTimeByCategory(title, historicalGoals, {
      useMedian: false,
      includeUncategorized: true,
    })

    // マッチしたキーワードを抽出
    const category = detectCategory(title)
    const matchedKeywords = extractMatchedKeywords(title, category)

    return NextResponse.json({
      predictedMinutes: prediction.predictedMinutes,
      confidence: prediction.confidence,
      category: prediction.category,
      dataPoints: prediction.dataPoints,
      isFallback: prediction.isFallback,
      matchedKeywords,
    })
  } catch (error) {
    console.error('Error predicting time for new goal:', error)
    return NextResponse.json({
      predictedMinutes: null,
      confidence: 'none',
      category: null,
      dataPoints: 0,
      isFallback: false,
      matchedKeywords: [],
    })
  }
}
