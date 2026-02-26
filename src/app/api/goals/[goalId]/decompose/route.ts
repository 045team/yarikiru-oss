import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../../../lib/turso/client'
import { encryptForDb, decryptFromDb } from '@/lib/e2ee'

/**
 * POST /api/goals/[goalId]/decompose
 * AI-powered task decomposition for a goal
 *
 * This endpoint uses Claude API to break down a goal into
 * manageable 15-minute tasks.
 */
export async function POST(
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

    // Get goal details
    const goalResult = await db.execute({
      sql: 'SELECT id, title, description, user_id FROM goals WHERE id = ?',
      args: [goalId],
    })

    if (goalResult.rows.length === 0) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const goal = {
      id: goalResult.rows[0][0],
      title: await decryptFromDb(String(goalResult.rows[0][1])),
      description: goalResult.rows[0][2] ? await decryptFromDb(String(goalResult.rows[0][2])) : null,
      userId: goalResult.rows[0][3],
    }

    // Verify ownership
    if (goal.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if tasks already exist
    const existingTasks = await db.execute({
      sql: 'SELECT COUNT(*) FROM generated_tasks WHERE goal_id = ?',
      args: [goalId],
    })

    const existingTaskCount = existingTasks.rows[0][0] as number
    if (existingTaskCount > 0) {
      return NextResponse.json({
        error: 'Tasks already exist for this goal',
        existingTaskCount,
      }, { status: 400 })
    }

    // Call Claude API for task decomposition
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicApiKey) {
      return NextResponse.json({
        error: 'AI service not configured',
        hint: 'Set ANTHROPIC_API_KEY environment variable',
      }, { status: 503 })
    }

    const prompt = `あなたはプロジェクト管理の専門家です。以下の目標を15分単位の具体的なタスクに分解してください。

目標: ${goal.title}
${goal.description ? `説明: ${goal.description}` : ''}

ルール:
1. 各タスクは15分で完了できるようにする
2. タスクは具体的で実行可能な形式にする（例: 「設計を考える」ではなく「APIエンドポイントの仕様を書く」）
3. 優先度（high, medium, low）を適切に設定
4. 依存関係がある場合は順序を考慮
5. 日本語で出力

JSON形式で返してください（タスクの配列）:
[
  {"title": "タスク名", "estimatedMinutes": 15, "priority": "high"},
  ...
]`

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      console.error('Claude API error:', errorText)
      throw new Error('Failed to get AI response')
    }

    const claudeData = await claudeResponse.json()
    const content = claudeData.content[0]?.text || ''

    // Extract JSON from response
    let tasks: Array<{ title: string; estimatedMinutes: number; priority: string }> = []

    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/) ||
        content.match(/(\[[\s\S]*\])/)

      if (jsonMatch) {
        tasks = JSON.parse(jsonMatch[1])
      } else {
        // Fallback: try parsing entire response
        tasks = JSON.parse(content)
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content)
      return NextResponse.json({
        error: 'Failed to parse AI response',
        rawContent: content.substring(0, 500),
      }, { status: 500 })
    }

    // Validate tasks
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({
        error: 'Invalid AI response: no tasks generated',
        rawContent: content.substring(0, 500),
      }, { status: 500 })
    }

    // Save tasks to database
    let createdCount = 0
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]
      const taskId = `task_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 9)}`
      const encTitle = await encryptForDb(task.title)

      await db.execute({
        sql: `
          INSERT INTO generated_tasks (id, goal_id, title, estimated_minutes, priority, is_completed)
          VALUES (?, ?, ?, ?, ?, 0)
        `,
        args: [
          taskId,
          goalId,
          encTitle,
          task.estimatedMinutes || 15,
          task.priority || 'medium',
        ],
      })
      createdCount++
    }

    return NextResponse.json({
      success: true,
      tasksCreated: createdCount,
      tasks,
    })
  } catch (error) {
    console.error('Error decomposing goal:', error)
    return NextResponse.json(
      {
        error: 'Failed to decompose goal',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
