import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getDatabase } from '@/lib/turso'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ideaId, projectId } = await req.json()

    if (!ideaId) {
      return NextResponse.json({ error: 'ideaId is required' }, { status: 400 })
    }

    const db = getDatabase()

    // 思いつきを取得
    const ideasResult = await db.execute(
      `SELECT * FROM ideas WHERE id = ? AND user_id = ?`,
      [ideaId, userId]
    )

    if (!ideasResult || ideasResult.length === 0) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    const idea = ideasResult[0] as any

    // プロジェクトが指定されていない場合は、最初のプロジェクトを使用
    let targetProjectId = projectId
    if (!targetProjectId) {
      const projectsResult = await db.execute(
        `SELECT id FROM projects WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
        [userId]
      )

      if (!projectsResult || projectsResult.length === 0) {
        return NextResponse.json({ error: 'No project found. Please create a project first.' }, { status: 400 })
      }

      targetProjectId = projectsResult[0][0] as string
    }

    // 仮目標（ゴール）を作成
    const goalId = crypto.randomUUID()
    const tempGoalTitle = `仮目標: ${idea[3] || 'アイデアから作成'}`
    const now = new Date().toISOString()

    await db.execute(
      `INSERT INTO goals (
        id, user_id, project_id, title, description, status,
        priority, time, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        goalId,
        userId,
        targetProjectId,
        tempGoalTitle,
        idea[4] || '',
        'todo',
        'medium',
        60,
        now,
        now,
      ]
    )

    // 思いつきのステータスを「registered」に更新
    await db.execute(
      `UPDATE ideas SET status = ? WHERE id = ?`,
      ['registered', ideaId]
    )

    return NextResponse.json({
      success: true,
      goalId,
      projectId: targetProjectId,
      message: '思いつきを仮目標に変換しました',
    })
  } catch (error) {
    console.error('Failed to convert idea to goal:', error)
    return NextResponse.json(
      { error: 'Failed to convert idea to goal' },
      { status: 500 }
    )
  }
}
