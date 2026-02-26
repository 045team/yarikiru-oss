/**
 * GSD .planning 読み込み - CLI / API で共有
 */

import fs from 'fs'
import path from 'path'

export interface PhaseTask {
  label: string
  status: 'todo' | 'done'
}

export interface PhaseData {
  title: string
  description: string
  tasks: PhaseTask[]
}

export interface PlanningData {
  projectData: { title: string; description: string }
  goalsData: PhaseData[]
  stateData: string | null
}

/**
 * 指定パスから .planning を読み込み、同期用データを返す
 * @param baseDir - .planning の親ディレクトリ（例: プロジェクトルート）
 */
export function readPlanning(baseDir: string): PlanningData | null {
  const planningDir = path.join(baseDir, '.planning')
  if (!fs.existsSync(planningDir) || !fs.statSync(planningDir).isDirectory()) {
    return null
  }

  // PROJECT.md
  let projectTitle = 'GSD Project'
  let projectDescription = ''
  const projectFile = path.join(planningDir, 'PROJECT.md')
  if (fs.existsSync(projectFile)) {
    projectDescription = fs.readFileSync(projectFile, 'utf8')
    const titleMatch = projectDescription.match(/^#\s+(.+)$/m)
    if (titleMatch) projectTitle = titleMatch[1]
  }

  const projectData = { title: projectTitle, description: projectDescription }

  // goals/phases
  const goalsData: PhaseData[] = []
  const phasesDir = path.join(planningDir, 'phases')
  if (fs.existsSync(phasesDir)) {
    const phases = fs
      .readdirSync(phasesDir)
      .filter((f) => fs.statSync(path.join(phasesDir, f)).isDirectory())
    for (const phaseName of phases) {
      const phasePath = path.join(phasesDir, phaseName)
      let phaseDesc = ''
      const tasks: PhaseTask[] = []

      const files = fs.readdirSync(phasePath)
      const planFile = files.find((f) => f.endsWith('-PLAN.md'))

      if (planFile) {
        const planContent = fs.readFileSync(path.join(phasePath, planFile), 'utf8')
        phaseDesc = planContent

        const taskMatches = planContent.match(/<task>([\s\S]*?)<\/task>/g)
        if (taskMatches) {
          for (const tMatch of taskMatches) {
            const content = tMatch.replace(/<\/?task>/g, '').trim()
            tasks.push({ label: content.substring(0, 100), status: 'todo' })
          }
        } else {
          const checkMatches = [...planContent.matchAll(/^- \[(x| )\] (.+)$/gm)]
          for (const m of checkMatches) {
            tasks.push({ label: m[2], status: m[1] === 'x' ? 'done' : 'todo' })
          }
        }
      }
      goalsData.push({ title: phaseName, description: phaseDesc, tasks })
    }
  } else {
    const roadmapFile = path.join(planningDir, 'ROADMAP.md')
    if (fs.existsSync(roadmapFile)) {
      goalsData.push({
        title: 'Phase from ROADMAP',
        description: fs.readFileSync(roadmapFile, 'utf8'),
        tasks: [],
      })
    }
  }

  // STATE.md
  let stateData: string | null = null
  const stateFile = path.join(planningDir, 'STATE.md')
  if (fs.existsSync(stateFile)) {
    stateData = fs.readFileSync(stateFile, 'utf8')
  }

  return { projectData, goalsData, stateData }
}
