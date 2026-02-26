/**
 * GET /api/calendar/integration - Google連携の状態を取得
 */
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../../lib/turso/client'

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })

    const result = await db.execute({
      sql: `
        SELECT id, provider, sync_enabled
        FROM calendar_integrations
        WHERE user_id = ? AND provider = 'google'
      `,
      args: [userId],
    })

    if (result.rows.length === 0) {
      return NextResponse.json({ connected: false })
    }

    const row = result.rows[0]
    return NextResponse.json({
      connected: true,
      provider: row[1],
      syncEnabled: (row[2] as number) === 1,
    })
  } catch (error) {
    console.error('Error fetching calendar integration:', error)
    return NextResponse.json(
      { error: 'Failed to fetch integration' },
      { status: 500 }
    )
  }
}
