import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../../../lib/turso/client'

/**
 * GET /api/goals/[goalId]/urgent
 * Get all urgent tasks for a goal
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { goalId } = await params

  try {
    const db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })

    // Verify goal belongs to user
    const verifyResult = await db.execute({
      sql: 'SELECT id FROM goals WHERE id = ? AND user_id = ?',
      args: [goalId, userId],
    })

    if (verifyResult.rows.length === 0) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Get urgent tasks
    const result = await db.execute({
      sql: `
        SELECT id, title, estimated_minutes, priority, is_completed, is_urgent, subtasks
        FROM generated_tasks
        WHERE goal_id = ? AND is_urgent = 1
        ORDER BY priority ASC, created_at ASC
      `,
      args: [goalId],
    })

    const tasks = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      estimatedMinutes: row.estimated_minutes,
      priority: row.priority,
      isCompleted: row.is_completed === 1,
      isUrgent: row.is_urgent === 1,
      subtasks: row.subtasks ? JSON.parse(row.subtasks) : [],
    }))

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Error fetching urgent tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch urgent tasks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
