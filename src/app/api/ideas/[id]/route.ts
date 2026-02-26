// ============================================
// Idea Detail API
// GET /api/ideas/:id - Get an idea
// PUT /api/ideas/:id - Update an idea
// DELETE /api/ideas/:id - Archive an idea
// PATCH /api/ideas/:id/status - Update idea status
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import {
  getIdeaById,
  updateIdea,
  updateIdeaStatus,
  archiveIdea,
  deleteIdea,
} from '@/lib/turso/ideas'
import type { UpdateIdeaResponse } from '@/types/api'

// GET /api/ideas/:id - Get an idea
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  const { id } = await params

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const idea = await getIdeaById(id, userId)

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    return NextResponse.json({ idea })
  } catch (error) {
    console.error('Error fetching idea:', error)
    return NextResponse.json(
      { error: 'Failed to fetch idea', details: String(error) },
      { status: 500 }
    )
  }
}

// PUT /api/ideas/:id - Update an idea content
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  const { id } = await params

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { title, description } = body as { title?: string; description?: string }

    // Validate at least one field is provided
    if (!title && !description) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Validate title if provided
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return NextResponse.json(
          { error: 'Invalid title', fields: { title: 'Title cannot be empty' } },
          { status: 400 }
        )
      }
      if (title.length > 200) {
        return NextResponse.json(
          { error: 'Title too long', fields: { title: 'Title must be 200 characters or less' } },
          { status: 400 }
        )
      }
    }

    // Validate description if provided
    if (description !== undefined && typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Invalid description', fields: { description: 'Description must be a string' } },
        { status: 400 }
      )
    }

    const idea = await updateIdea(id, userId, {
      title: title?.trim(),
      description: description?.trim(),
    })

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    const response: UpdateIdeaResponse = { idea }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating idea:', error)
    return NextResponse.json(
      { error: 'Failed to update idea', details: String(error) },
      { status: 500 }
    )
  }
}

// PATCH /api/ideas/:id/status - Update idea status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  const { id } = await params

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { status } = body as { status: 'draft' | 'registered' | 'archived' }

    if (!status || !['draft', 'registered', 'archived'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status', fields: { status: 'Status must be draft, registered, or archived' } },
        { status: 400 }
      )
    }

    const idea = await updateIdeaStatus(id, userId, status)

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    const response: UpdateIdeaResponse = { idea }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating idea status:', error)
    return NextResponse.json(
      { error: 'Failed to update idea status', details: String(error) },
      { status: 500 }
    )
  }
}

// DELETE /api/ideas/:id - Archive an idea (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  const { id } = await params

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const permanent = searchParams.get('permanent') === 'true'

    if (permanent) {
      // Permanent delete
      const success = await deleteIdea(id, userId)

      if (!success) {
        return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
      }

      return NextResponse.json({ success: true, message: 'Idea permanently deleted' })
    } else {
      // Soft delete (archive)
      const success = await archiveIdea(id, userId)

      if (!success) {
        return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
      }

      return NextResponse.json({ success: true, message: 'Idea archived' })
    }
  } catch (error) {
    console.error('Error deleting idea:', error)
    return NextResponse.json(
      { error: 'Failed to delete idea', details: String(error) },
      { status: 500 }
    )
  }
}
