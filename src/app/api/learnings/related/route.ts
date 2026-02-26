/**
 * GET /api/learnings/related
 *
 * Fetch related learning items based on current context.
 * Uses semantic search to find relevant learnings.
 */

import { auth } from '@/lib/auth-stub'
import { NextResponse } from 'next/server'
import { generateEmbedding, cosineSimilarity, bufferToEmbedding } from '@/lib/turso/embeddings'
import { getMemberById } from '@/lib/turso/members'
import { execute } from '@/lib/turso/client'

export const runtime = 'edge'

interface RelatedLearningsRequest {
  goalId?: string
  projectId?: string
  limit?: number
  threshold?: number
}

interface RelatedLearning {
  id: string
  title: string
  url: string
  summary: string | null
  similarity: number
  tags: string[]
  createdAt: string
}

export async function GET(request: Request) {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const goalId = searchParams.get('goalId') || undefined
    const projectId = searchParams.get('projectId') || undefined
    const limit = parseInt(searchParams.get('limit') || '5')
    const threshold = parseFloat(searchParams.get('threshold') || '0.4')

    // Get user's member record
    const member = await getMemberById(userId)
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Check if user has configured Vertex AI credentials
    if (!member.vertex_ai_api_key) {
      return NextResponse.json(
        {
          error: 'Vertex AI credentials not configured',
          message: 'Please configure your GCP service account credentials in settings',
        },
        { status: 400 }
      )
    }

    // Parse service account credentials
    let credentials: Record<string, unknown>
    try {
      credentials = JSON.parse(member.vertex_ai_api_key)
    } catch {
      return NextResponse.json(
        { error: 'Invalid credentials format' },
        { status: 400 }
      )
    }

    // Build context query for embedding generation
    let contextQuery = ''

    if (goalId) {
      // Fetch goal details
      const goalRows = await execute(
        'SELECT title, description FROM yarikiru_goals WHERE id = ?',
        [goalId]
      )

      if (goalRows.length > 0) {
        const goal = goalRows[0] as any
        contextQuery = `${goal.title} ${goal.description || ''}`
      }
    } else if (projectId) {
      // Fetch project details
      const projectRows = await execute(
        'SELECT title, description FROM yarikiru_projects WHERE id = ?',
        [projectId]
      )

      if (projectRows.length > 0) {
        const project = projectRows[0] as any
        contextQuery = `${project.title} ${project.description || ''}`
      }
    }

    if (!contextQuery) {
      return NextResponse.json(
        { error: 'No context provided' },
        { status: 400 }
      )
    }

    // Generate embedding for context
    const { embedding: contextEmbedding } = await generateEmbedding(contextQuery, credentials)

    // Find related learning items
    const learnings = await findRelatedLearnings(contextEmbedding, threshold, limit)

    return NextResponse.json({
      learnings,
      context: {
        goalId,
        projectId,
        query: contextQuery.substring(0, 100) + (contextQuery.length > 100 ? '...' : ''),
      },
    })
  } catch (error) {
    console.error('Error fetching related learnings:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to fetch related learnings', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch related learnings' },
      { status: 500 }
    )
  }
}

/**
 * Find related learning items using semantic search
 */
async function findRelatedLearnings(
  contextEmbedding: number[],
  threshold: number,
  limit: number
): Promise<RelatedLearning[]> {
  // Fetch all learning items with embeddings
  const sql = `
    SELECT
      id,
      url,
      title,
      summary,
      embedding,
      tags,
      created_at
    FROM yarikiru_learning_items
    WHERE embedding IS NOT NULL
    ORDER BY created_at DESC
  `

  const rows = await execute(sql, [])

  const results: RelatedLearning[] = []

  for (const row of rows as any[]) {
    if (!row.embedding) continue

    const embedding = bufferToEmbedding(row.embedding)
    const similarity = cosineSimilarity(contextEmbedding, embedding)

    if (similarity >= threshold) {
      results.push({
        id: row.id,
        title: row.title || 'Learning Item',
        url: row.url,
        summary: row.summary,
        similarity,
        tags: row.tags ? JSON.parse(row.tags) : [],
        createdAt: row.created_at,
      })
    }
  }

  // Sort by similarity and limit results
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
}
