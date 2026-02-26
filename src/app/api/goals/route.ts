import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../lib/turso/client'
import { hasProAccess } from '@/lib/revenuecat-server'
import { getMemberById } from '@/lib/turso/members'
import { generateEmbedding, embeddingToBuffer } from '@/lib/turso/embeddings'
import { encryptForDb, decryptFromDb } from '@/lib/e2ee'

/**
 * GET /api/goals
 * Fetch all goals for the authenticated user
 */
export async function GET(request: NextRequest) {
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
      sql: `SELECT g.id, g.title, g.project_id, g.status, g.created_at, g.updated_at
             FROM yarikiru_goals g
             JOIN yarikiru_projects p ON g.project_id = p.id
             WHERE p.user_id = ? AND g.status != 'archived'
             ORDER BY g.created_at DESC`,
      args: [userId],
    })

    const goals = await Promise.all(result.rows.map(async row => ({
      id: row[0],
      title: await decryptFromDb(row[1] as string),
      projectId: row[2],
      status: row[3],
      createdAt: row[4],
      updatedAt: row[5],
    })))

    return NextResponse.json({ goals })
  } catch (error) {
    console.error('Error fetching goals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch goals', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/goals
 * Create a new goal for the authenticated user
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, description } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })

    // Freemium Gate
    const isPro = await hasProAccess(userId)
    if (!isPro) {
      const countResult = await db.execute({
        sql: `SELECT COUNT(g.id) FROM yarikiru_goals g JOIN yarikiru_projects p ON g.project_id = p.id WHERE p.user_id = ? AND g.status != 'archived'`,
        args: [userId]
      })
      const goalCount = Number(countResult.rows[0]?.[0]) || 0
      if (goalCount >= 3) {
        return NextResponse.json({ error: 'Free plan limit reached', needsUpgrade: true }, { status: 403 })
      }
    }

    // Find or create default project
    let projectResult = await db.execute({
      sql: `SELECT id FROM yarikiru_projects WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      args: [userId]
    })

    let projectId
    if (projectResult.rows.length === 0) {
      const ts = Date.now()
      projectId = `p_${ts}_general`
      const encProjTitle = await encryptForDb('General Tasks')
      await db.execute({
        sql: `INSERT INTO yarikiru_projects (id, user_id, title) VALUES (?, ?, ?)`,
        args: [projectId, userId, encProjTitle]
      })
    } else {
      projectId = projectResult.rows[0][0]
    }

    const goalId = `g_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    const encTitle = await encryptForDb(title)
    const encDesc = description ? await encryptForDb(description) : null

    await db.execute({
      sql: `INSERT INTO yarikiru_goals (id, project_id, title, description, estimated_minutes, status, priority)
             VALUES (?, ?, ?, ?, 30, 'active', 0)`,
      args: [
        goalId,
        projectId,
        encTitle,
        encDesc,
      ],
    })

    // Generate embedding for the goal
    try {
      const member = await getMemberById(userId)
      if (member?.vertex_ai_api_key) {
        const credentials = JSON.parse(member.vertex_ai_api_key) as Record<string, unknown>
        const text = `${title}\n${description || ''}`.trim()
        const { embedding } = await generateEmbedding(text, credentials)
        const buffer = embeddingToBuffer(embedding)
        await db.execute({
          sql: `UPDATE yarikiru_goals SET embedding = ? WHERE id = ?`,
          args: [buffer, goalId]
        })
      }
    } catch (error) {
      // Log error but don't fail the goal creation
      console.error('[POST /api/goals] Failed to generate embedding:', error)
    }

    const goal = {
      id: goalId,
      title,
      description,
      status: 'active',
      projectId
    }

    return NextResponse.json({ goal }, { status: 201 })
  } catch (error) {
    console.error('Error creating goal:', error)
    return NextResponse.json(
      { error: 'Failed to create goal', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
