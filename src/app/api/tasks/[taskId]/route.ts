import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../../lib/turso/client'

/**
 * PATCH /api/tasks/[taskId]
 * Update task (is_completed or is_urgent)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { taskId } = await params

  try {
    const body = await request.json()
    const { isCompleted, isUrgent } = body

    const db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })

    // Verify task belongs to user's goal
    const verifyResult = await db.execute({
      sql: `
        SELECT gt.id
        FROM generated_tasks gt
        JOIN goals g ON gt.goal_id = g.id
        WHERE gt.id = ? AND g.user_id = ?
      `,
      args: [taskId, userId],
    })

    if (verifyResult.rows.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Build dynamic update based on provided fields
    const updates: string[] = []
    const values: (number | string)[] = []

    if (typeof isCompleted === 'boolean') {
      updates.push('is_completed = ?')
      values.push(isCompleted ? 1 : 0)
    }

    if (typeof isUrgent === 'boolean') {
      updates.push('is_urgent = ?')
      values.push(isUrgent ? 1 : 0)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    values.push(taskId)

    await db.execute({
      sql: `UPDATE generated_tasks SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
      args: values,
    })

    return NextResponse.json({
      success: true,
      taskId,
      isCompleted,
      isUrgent,
    })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Failed to update task', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
