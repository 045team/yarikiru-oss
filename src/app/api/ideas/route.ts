// ============================================
// Ideas (Quick Capture) API
// POST /api/ideas - Create a quick idea
// GET /api/ideas - List user's ideas
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import {
  getIdeasByUserId,
  createIdea,
  getDraftIdeasCount,
} from '@/lib/turso/ideas'
import type {
  CreateIdeaRequest,
  CreateIdeaResponse,
  ListIdeasResponse,
} from '@/types/api'

// GET /api/ideas - List ideas
export async function GET(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as 'draft' | 'registered' | 'archived' | null
    const limit = searchParams.get('limit')
    const limitNum = limit ? parseInt(limit, 10) : undefined

    const ideas = await getIdeasByUserId(userId, {
      status: status || undefined,
      limit: limitNum,
    })

    // Get draft count for UI
    const draftCount = await getDraftIdeasCount(userId)

    const response: ListIdeasResponse = {
      ideas,
      // Include metadata for enhanced client functionality
      _meta: {
        draftCount,
        totalCount: ideas.length,
      },
    } as any

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching ideas:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ideas', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/ideas - Create a quick idea
export async function POST(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Validate request
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { title, description } = body as CreateIdeaRequest

    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required', fields: { title: 'Title cannot be empty' } },
        { status: 400 }
      )
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: 'Title too long', fields: { title: 'Title must be 200 characters or less' } },
        { status: 400 }
      )
    }

    if (description !== undefined && typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Invalid description', fields: { description: 'Description must be a string' } },
        { status: 400 }
      )
    }

    // Create idea with encryption
    const idea = await createIdea({
      userId,
      title: title.trim(),
      description: description?.trim(),
    })

    const response: CreateIdeaResponse = { idea }
    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating idea:', error)
    return NextResponse.json(
      { error: 'Failed to create idea', details: String(error) },
      { status: 500 }
    )
  }
}
