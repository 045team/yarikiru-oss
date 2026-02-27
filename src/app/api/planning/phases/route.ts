import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import { auth } from '@/lib/auth-stub'

/**
 * GET /api/planning/phases
 * .planning/phases/ の全フェーズを GSD 状態付きで返す
 * Query: ?planningPath=/path/to/project
 *
 * GSD workflow: discuss → plan → execute → verify
 * 状態に応じた推奨コマンドを返す
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const planningPath =
    request.nextUrl.searchParams.get('planningPath') ??
    process.env.YARIKIRU_PLANNING_PATH

  if (!planningPath) {
    return NextResponse.json(
      { error: 'YARIKIRU_PLANNING_PATH が設定されていません' },
      { status: 400 }
    )
  }

  const baseDir = path.resolve(planningPath)
  const phasesDir = path.join(baseDir, '.planning', 'phases')

  if (!fs.existsSync(phasesDir) || !fs.statSync(phasesDir).isDirectory()) {
    return NextResponse.json({ phases: [] })
  }

  const folders = fs
    .readdirSync(phasesDir)
    .filter((f) => {
      const full = path.join(phasesDir, f)
      return fs.statSync(full).isDirectory()
    })
    .sort()

  const roadmapContent = await (async () => {
    const p = path.join(baseDir, '.planning', 'ROADMAP.md')
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8')
    return ''
  })()

  const phases = folders.map((folder) => {
    const phasePath = path.join(phasesDir, folder)
    const numMatch = folder.match(/^(\d+)/)
    const phaseNum = numMatch ? parseInt(numMatch[1], 10) : 0
    const prefix = numMatch ? numMatch[1] : ''

    const files = fs.readdirSync(phasePath)
    const hasContext = files.some((f) => f.endsWith('-CONTEXT.md'))
    const hasPlan = files.some((f) => f.endsWith('-PLAN.md'))
    const hasResearch = files.some((f) => f.endsWith('-RESEARCH.md'))
    const hasSummary = files.some((f) => f.endsWith('-SUMMARY.md'))
    const hasVerification = files.some((f) => f.endsWith('-VERIFICATION.md'))
    const hasUat = files.some((f) => f.endsWith('-UAT.md'))

    const isCompleted = hasVerification

    const { suggestedCommand, suggestedLabel, altCommand } = (() => {
      if (!hasPlan) {
        const alt = !hasContext
          ? { cmd: `/gsd:discuss-phase ${phaseNum}`, label: '討論' }
          : null
        return {
          suggestedCommand: `/gsd:plan-phase ${phaseNum}`,
          suggestedLabel: '計画',
          altCommand: alt,
        }
      }
      if (!hasSummary) {
        return {
          suggestedCommand: `/gsd:execute-phase ${phaseNum}`,
          suggestedLabel: '実行',
          altCommand: null,
        }
      }
      if (!hasVerification && !hasUat) {
        return {
          suggestedCommand: `/gsd:verify-work ${phaseNum}`,
          suggestedLabel: '検証',
          altCommand: null,
        }
      }
      return {
        suggestedCommand: `/gsd:execute-phase ${phaseNum}`,
        suggestedLabel: '再実行',
        altCommand: null,
      }
    })()

    let title = folder
    if (roadmapContent && phaseNum > 0) {
      const headingMatch = roadmapContent.match(
        new RegExp(
          `##\\s+Phase\\s+0?${phaseNum}:\\s*(.+?)(?=\\n|$)`,
          'im'
        )
      )
      if (headingMatch) {
        title = headingMatch[1].trim()
      }
    }

    const tasks: { label: string; completed: boolean }[] = []
    const planFile = files.find((f) => f.endsWith('-PLAN.md'))
    if (planFile) {
      try {
        const content = fs.readFileSync(
          path.join(phasePath, planFile),
          'utf8'
        )
        const taskMatches = content.match(/<task[^>]*>([\s\S]*?)<\/task>/gi)
        if (taskMatches) {
          for (const t of taskMatches) {
            const nameMatch = t.match(/<name>([\s\S]*?)<\/name>/i)
            const doneMatch = t.match(/<done>([\s\S]*?)<\/done>/i)
            const label = nameMatch ? nameMatch[1].trim() : 'Task'
            tasks.push({
              label: label.substring(0, 200),
              completed: !!doneMatch && doneMatch[1].trim().length > 0,
            })
          }
        } else {
          const checks = [...content.matchAll(/^- \[([ x])\] (.+)$/gm)]
          if (checks.length > 0) {
            for (const m of checks) {
              tasks.push({ label: m[2].trim(), completed: m[1] === 'x' })
            }
          } else {
            // NN-NN: 形式（01-01: label, - [x] 02-01: label, **07-01: label** 等）
            const numbered = [...content.matchAll(/^(?:\s*-\s*(?:\[([ x])\]\s*)?)?(?:\*\*)?(\d+-\d+):\s*(.+?)(?:\s*\*\*)?\s*$/gm)]
            for (const m of numbered) {
              const label = (m[2] + ': ' + m[3]).trim().replace(/\*\*/g, '').substring(0, 200)
              tasks.push({ label, completed: m[1] === 'x' })
            }
          }
        }
      } catch {
        /* ignore */
      }
    }

    return {
      id: folder,
      phaseNum,
      phaseIdPrefix: prefix || folder,
      title,
      hasContext,
      hasPlan,
      hasResearch,
      hasSummary,
      hasVerification,
      hasUat,
      isCompleted,
      suggestedCommand,
      suggestedLabel,
      altCommand,
      tasks,
    }
  })

  return NextResponse.json({ phases })
}
