/**
 * PATCH /api/sub-tasks/[id] - 小目標の完了状態を更新
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../../lib/turso/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const isDone = body.isDone === true

  try {
    const db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })

    // 所有権確認: sub_task -> goal -> project -> user_id
    const check = await db.execute({
      sql: `
        SELECT st.id FROM yarikiru_sub_tasks st
        JOIN yarikiru_goals g ON st.goal_id = g.id
        JOIN yarikiru_projects p ON g.project_id = p.id
        WHERE st.id = ? AND p.user_id = ?
      `,
      args: [id, userId],
    })

    if (check.rows.length === 0) {
      return NextResponse.json({ error: 'SubTask not found' }, { status: 404 })
    }

    await db.execute({
      sql: `UPDATE yarikiru_sub_tasks SET is_done = ?, updated_at = datetime('now') WHERE id = ?`,
      args: [isDone ? 1 : 0, id],
    })

    return NextResponse.json({ success: true, isDone })
  } catch (error) {
    console.error('Error updating sub-task:', error)
    return NextResponse.json(
      { error: 'Failed to update sub-task', details: String(error) },
      { status: 500 }
    )
  }
}
