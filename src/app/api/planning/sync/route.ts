import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { auth } from '@/lib/auth-stub'
import { getTursoClient, ensureDbSchema } from '@/lib/turso/client'
import { mcpSyncPlanning } from '@/lib/mcp/core-operations'
import { readPlanning } from '@/lib/gsd/read-planning'

/**
 * POST /api/planning/sync
 * GSD .planning をDBに同期
 * Body: { planningPath?: string } - 省略時は YARIKIRU_PLANNING_PATH 環境変数を使用
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let baseDir: string
    const body = await request.json().catch(() => ({}))
    const planningPath = body?.planningPath ?? process.env.YARIKIRU_PLANNING_PATH

    if (planningPath) {
      baseDir = path.resolve(planningPath)
    } else {
      return NextResponse.json(
        {
          error:
            'YARIKIRU_PLANNING_PATH が設定されていません。.env.local に GSD プロジェクトのルートパスを設定するか、ターミナルで yarikiru sync を実行してください。',
          needsConfig: true,
        },
        { status: 400 }
      )
    }

    const data = readPlanning(baseDir)
    if (!data) {
      return NextResponse.json(
        {
          error: `${baseDir}/.planning が見つかりません`,
          needsConfig: true,
        },
        { status: 404 }
      )
    }

    await ensureDbSchema()
    const db = getTursoClient()
    const result = await mcpSyncPlanning(db, { ...data, planningPath: baseDir }, userId)

    return NextResponse.json({
      success: true,
      projectId: result.projectId,
      goalsCount: data.goalsData.length,
    })
  } catch (err) {
    console.error('Planning sync error:', err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Sync failed',
      },
      { status: 500 }
    )
  }
}
