/**
 * GET /api/work-logs/aggregation
 *
 * work_logs データの集計を行い、AI時間予測のための統計データを返す。
 *
 * Query Parameters:
 *   - pattern: キーワード指定時、類似ゴールの統計を返す
 *
 * Response:
 *   {
 *     byGoal: [...],           // ゴール別の集計
 *     overallStats: {...},     // 全体統計
 *     recentSessions: [...],   // 最近のセッション
 *     patternStats?: {...}     // pattern指定時のみ
 *   }
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getDatabase } from '@/lib/turso'

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const pattern = searchParams.get('pattern')

  try {
    const db = getDatabase()

    // 基本集計データを取得
    const aggregation = await db.getWorkLogsAggregation(userId)

    // pattern指定時は追加統計を計算
    let patternStats = null
    if (pattern && pattern.length >= 2) {
      patternStats = await db.getTimeStatsByPattern(userId, pattern)
    }

    return NextResponse.json({
      ...aggregation,
      patternStats,
    })
  } catch (error) {
    console.error('Error fetching work logs aggregation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch aggregation', details: String(error) },
      { status: 500 }
    )
  }
}
