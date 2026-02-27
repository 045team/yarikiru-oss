import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { auth } from '@/lib/auth-stub'

/**
 * GET /api/planning/phase/[phaseId]
 * .planning/phases/{phaseFolder}/ 内の PLAN, SUMMARY, VERIFICATION を返す
 * phaseId: "01" または "01-local-db-foundation"（プレフィックスまたはフォルダ名）
 * Query: ?planningPath=/path/to/project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { phaseId } = await params
  if (!phaseId || typeof phaseId !== 'string') {
    return NextResponse.json({ error: 'phaseId required' }, { status: 400 })
  }

  let baseDir: string
  const planningPath = request.nextUrl.searchParams.get('planningPath') ?? process.env.YARIKIRU_PLANNING_PATH

  if (planningPath) {
    baseDir = path.resolve(planningPath)
  } else {
    return NextResponse.json(
      { error: 'YARIKIRU_PLANNING_PATH が設定されていません' },
      { status: 400 }
    )
  }

  const phasesDir = path.join(baseDir, '.planning', 'phases')
  if (!fs.existsSync(phasesDir) || !fs.statSync(phasesDir).isDirectory()) {
    return NextResponse.json(
      { error: `.planning/phases が見つかりません` },
      { status: 404 }
    )
  }

  const folders = fs.readdirSync(phasesDir).filter((f) => {
    const full = path.join(phasesDir, f)
    return fs.statSync(full).isDirectory()
  })

  const phaseFolder =
    folders.find((f) => f === phaseId) ??
    folders.find((f) => f.startsWith(phaseId + '-')) ??
    folders.find((f) => f.startsWith(phaseId))

  if (!phaseFolder) {
    return NextResponse.json(
      { error: `Phase "${phaseId}" に対応するフォルダが見つかりません` },
      { status: 404 }
    )
  }

  const phasePath = path.join(phasesDir, phaseFolder)
  const files = fs.readdirSync(phasePath)
  const prefix = phaseFolder.match(/^(\d+)/)?.[1] ?? ''

  const readFile = (suffix: string): string | null => {
    const candidates = files.filter((file) => file.endsWith(suffix))
    const preferred = prefix ? candidates.find((f) => f.startsWith(prefix + '-') || f.startsWith(prefix + '_')) : null
    const f = preferred ?? candidates[0]
    if (!f) return null
    try {
      return fs.readFileSync(path.join(phasePath, f), 'utf8')
    } catch {
      return null
    }
  }

  const plan = readFile('-PLAN.md')
  const summary = readFile('-SUMMARY.md')
  const verification = readFile('-VERIFICATION.md')

  return NextResponse.json({
    phaseId: phaseFolder,
    plan: plan ?? '',
    summary: summary ?? '',
    verification: verification ?? '',
  })
}
