/**
 * GET /api/learnings - 学習したいこと一覧
 * POST /api/learnings - URLからAI分解で学習ステップを追加
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../lib/turso/client'
import { encryptForDb, decryptFromDb } from '@/lib/e2ee'

async function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = await getDb()
    const result = await db.execute({
      sql: `
        SELECT id, url, title, what, how, impact, status, created_at, user_id
        FROM yarikiru_learning_items
        WHERE user_id = ? OR user_id = 'system_recommendation'
        ORDER BY created_at DESC
      `,
      args: [userId],
    })

    const learnings = await Promise.all(result.rows.map(async (row) => ({
      id: row[0],
      url: row[1],
      title: row[2] ? await decryptFromDb(String(row[2])) : null,
      what: row[3] ? await decryptFromDb(String(row[3])) : null,
      how: row[4] ? await decryptFromDb(String(row[4])) : null,
      impact: row[5] ? await decryptFromDb(String(row[5])) : null,
      status: row[6],
      createdAt: row[7],
      isRecommendation: row[8] === 'system_recommendation',
    })))

    return NextResponse.json({ learnings })
  } catch (error) {
    console.error('Error fetching learnings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch learnings', details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { url, title, what, how, impact, status } = body
    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const db = await getDb()
    const id = `li_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    const encTitle = title ? await encryptForDb(title) : null
    const encWhat = what ? await encryptForDb(what) : null
    const encHow = how ? await encryptForDb(how) : null
    const encImpact = impact ? await encryptForDb(impact) : null

    await db.execute({
      sql: `
        INSERT INTO yarikiru_learning_items (id, user_id, url, title, what, how, impact, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        userId,
        url.trim(),
        encTitle,
        encWhat,
        encHow,
        encImpact,
        status || 'unread'
      ],
    })

    return NextResponse.json({
      learning: {
        id,
        url: url.trim(),
        title,
        what,
        how,
        impact,
        status: status || 'unread'
      },
    })
  } catch (error) {
    console.error('Error creating learning item:', error)
    return NextResponse.json(
      { error: 'Failed to create learning item', details: String(error) },
      { status: 500 }
    )
  }
}
