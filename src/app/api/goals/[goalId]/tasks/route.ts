import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../../../lib/turso/client'

/**
 * GET /api/goals/[goalId]/tasks
 * Fetch all tasks for a specific goal
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
      sql: `SELECT id FROM goals WHERE id = ? AND user_id = ?`,
      args: [goalId, userId],
    })

    if (verifyResult.rows.length === 0) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Fetch tasks
    const tasksResult = await db.execute({
      sql: `
        SELECT id, title, estimated_minutes, priority, is_completed, scheduled_date, created_at
        FROM generated_tasks
        WHERE goal_id = ?
        ORDER BY created_at ASC
      `,
      args: [goalId],
    })

    const tasks = tasksResult.rows.map(row => ({
      id: row[0],
      title: row[1],
      estimatedMinutes: row[2],
      priority: row[3],
      isCompleted: row[4] === 1,
      scheduledDate: row[5],
      createdAt: row[6],
    }))

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
