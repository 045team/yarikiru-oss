/**
 * GET /api/calendar - 枠組み（今日/今週/今月）ブロック取得
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../lib/turso/client'

async function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })
}

type Timeframe = 'today' | 'week' | 'month'

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const timeframe = (searchParams.get('timeframe') || 'today') as Timeframe
  if (!['today', 'week', 'month'].includes(timeframe)) {
    return NextResponse.json({ error: 'Invalid timeframe' }, { status: 400 })
  }

  try {
    const db = await getDb()
    const result = await db.execute({
      sql: `
        SELECT id, time_label, title, block_type, is_current
        FROM yarikiru_calendar_blocks
        WHERE user_id = ? AND timeframe = ?
        ORDER BY sort_order ASC, created_at ASC
      `,
      args: [userId, timeframe],
    })

    const blocks = result.rows.map((row) => ({
      id: row[0],
      time: row[1],
      title: row[2],
      type: row[3],
      isCurrent: (row[4] as number) === 1,
    }))

    // ダミーデータがない場合はデフォルトを返す
    if (blocks.length === 0) {
      const defaults: Record<Timeframe, Array<{ time: string; title: string; type: string; isCurrent: boolean }>> = {
        today: [
          { time: '09:00', title: '1日の設計と要素分解', type: 'planning', isCurrent: false },
          { time: '10:00', title: 'Dr.メグル: UIの微調整', type: 'focus', isCurrent: false },
          { time: '13:00', title: 'Dr.メグル: ロジック実装', type: 'focus', isCurrent: true },
          { time: '16:00', title: '未定 (余白)', type: 'empty', isCurrent: false },
        ],
        week: [
          { time: 'Mon', title: 'Dr.メグル コア実装完了', type: 'planning', isCurrent: false },
          { time: 'Wed', title: 'テストユーザーによる検証', type: 'focus', isCurrent: true },
          { time: 'Fri', title: 'バグフィックスとデプロイ', type: 'focus', isCurrent: false },
        ],
        month: [
          { time: 'Week 1', title: 'Dr.メグル MVPリリース', type: 'focus', isCurrent: true },
          { time: 'Week 2', title: 'YARIKIRU 基盤構築', type: 'planning', isCurrent: false },
          { time: 'Week 4', title: '両プロジェクトの統合レビュー', type: 'empty', isCurrent: false },
        ],
      }
      return NextResponse.json({
        blocks: defaults[timeframe].map((b, i) => ({ id: `dummy_${i}`, ...b })),
      })
    }

    return NextResponse.json({ blocks })
  } catch (error) {
    console.error('Error fetching calendar:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar', details: String(error) },
      { status: 500 }
    )
  }
}
