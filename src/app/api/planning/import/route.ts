import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient, ensureDbSchema } from '@/lib/turso/client'
import { mcpSyncPlanning } from '@/lib/mcp/core-operations'

/**
 * POST /api/planning/import
 * クライアントから送信された .planning データでプロジェクトを作成
 * Body: { projectData, goalsData, stateData }
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { projectData, goalsData, stateData } = body

    if (!projectData || !goalsData || !Array.isArray(goalsData)) {
      return NextResponse.json(
        { error: 'projectData と goalsData が必要です' },
        { status: 400 }
      )
    }

    await ensureDbSchema()
    const db = getTursoClient()
    await mcpSyncPlanning(db, { projectData, goalsData, stateData: stateData ?? null, planningPath: null, forceCreate: true }, userId)

    return NextResponse.json({
      success: true,
      goalsCount: goalsData.length,
    })
  } catch (err) {
    console.error('Planning import error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Import failed' },
      { status: 500 }
    )
  }
}
