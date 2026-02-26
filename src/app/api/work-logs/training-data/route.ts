/**
 * GET /api/work-logs/training-data
 *
 * AI時間予測モデルの訓練用データを返す。
 * 完了済みゴールの見積もり時間と実績時間のペアデータ。
 *
 * Query Parameters:
 *   - limit: 返却数上限（デフォルト100）
 *   - removeOutliers: 外れ値を除外するか（true/false）
 *
 * Response:
 *   {
 *     goals: [...],           // 訓練用ゴールデータ
 *     accuracy?: {...}        // 予測精度メトリクス
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
  const limit = searchParams.get('limit')
  const removeOutliers = searchParams.get('removeOutliers') === 'true'

  try {
    const db = getDatabase()

    // 訓練用データを取得
    const goals = await db.getCompletedGoalsForTraining(userId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      removeOutliers,
    })

    // 予測精度も取得
    const accuracy = await db.getPredictionAccuracy(userId)

    return NextResponse.json({
      goals,
      accuracy,
    })
  } catch (error) {
    console.error('Error fetching training data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch training data', details: String(error) },
      { status: 500 }
    )
  }
}
