/**
 * File System Access API で .planning を読み取り、PlanningData 形式で返す
 */

export interface PhaseTask {
  label: string
  status: 'todo' | 'done'
}

export interface PhaseData {
  title: string
  description: string
  tasks: PhaseTask[]
  /** PLAN.md の内容（description と重複するが詳細表示用に保持） */
  plan?: string
  /** SUMMARY.md の内容 */
  summary?: string
  /** VERIFICATION.md の内容 */
  verification?: string
}

export interface PlanningData {
  projectData: { title: string; description: string }
  goalsData: PhaseData[]
  stateData: string | null
}

async function readFileAsText(file: File): Promise<string> {
  return file.text()
}

/**
 * showDirectoryPicker で取得したルートディレクトリから .planning を読み取る
 */
export async function readPlanningFromHandle(
  rootHandle: FileSystemDirectoryHandle
): Promise<PlanningData | null> {
  let planningHandle: FileSystemDirectoryHandle
  try {
    planningHandle = await rootHandle.getDirectoryHandle('.planning')
  } catch {
    return null
  }

  let projectTitle = 'GSD Project'
  let projectDescription = ''
  try {
    const projectFile = await planningHandle.getFileHandle('PROJECT.md')
    const file = await projectFile.getFile()
    projectDescription = await readFileAsText(file)
    const titleMatch = projectDescription.match(/^#\s+(.+)$/m)
    if (titleMatch) projectTitle = titleMatch[1]
  } catch {
    /* PROJECT.md なし */
  }
  const projectData = { title: projectTitle, description: projectDescription }

  const goalsData: PhaseData[] = []
  try {
    const phasesDir = await planningHandle.getDirectoryHandle('phases')
    for await (const [name, handle] of phasesDir.entries()) {
      if (handle.kind !== 'directory') continue
      const phaseHandle = handle as FileSystemDirectoryHandle
      let phaseDesc = ''
      let planContent = ''
      let summaryContent = ''
      let verificationContent = ''
      const tasks: PhaseTask[] = []

      for await (const [fname, fhandle] of phaseHandle.entries()) {
        if (fhandle.kind !== 'file') continue
        const file = await (fhandle as FileSystemFileHandle).getFile()
        const content = await readFileAsText(file)

        if (fname.endsWith('-PLAN.md') || fname.endsWith('_PLAN.md')) {
          planContent = content
          phaseDesc = content
          const taskMatches = content.match(/<task[^>]*>([\s\S]*?)<\/task>/gi)
          if (taskMatches) {
            for (const tMatch of taskMatches) {
              const nameMatch = tMatch.match(/<name>([\s\S]*?)<\/name>/i)
              const doneMatch = tMatch.match(/<done>([\s\S]*?)<\/done>/i)
              const label = nameMatch ? nameMatch[1].trim().substring(0, 200) : 'Task'
              tasks.push({ label, status: doneMatch && doneMatch[1].trim().length > 0 ? 'done' : 'todo' })
            }
          } else {
            const checks = [...content.matchAll(/^- \[([ x])\] (.+)$/gm)]
            if (checks.length > 0) {
              for (const m of checks) {
                tasks.push({ label: m[2].trim(), status: m[1] === 'x' ? 'done' : 'todo' })
              }
            } else {
              // NN-NN: 形式（01-01: label, - 01-01: label, - [x] 02-01: label, **07-01: label** 等）
              const numbered = [...content.matchAll(/^(?:\s*-\s*(?:\[([ x])\]\s*)?)?(?:\*\*)?(\d+-\d+):\s*(.+?)(?:\s*\*\*)?\s*$/gm)]
              if (numbered.length > 0) {
                for (const m of numbered) {
                  const label = (m[2] + ': ' + m[3]).trim().replace(/\*\*/g, '').substring(0, 200)
                  const done = m[1] === 'x'
                  tasks.push({ label, status: done ? 'done' : 'todo' })
                }
              }
            }
          }
        } else if (fname.endsWith('-SUMMARY.md') || fname.endsWith('_SUMMARY.md')) {
          summaryContent = content
        } else if (fname.endsWith('-VERIFICATION.md') || fname.endsWith('_VERIFICATION.md')) {
          verificationContent = content
        }
      }
      goalsData.push({
        title: name,
        description: phaseDesc,
        tasks,
        plan: planContent || undefined,
        summary: summaryContent || undefined,
        verification: verificationContent || undefined,
      })
    }
    goalsData.sort((a, b) => {
      const numA = parseInt(a.title.match(/^\d+/)?.[0] ?? '0', 10)
      const numB = parseInt(b.title.match(/^\d+/)?.[0] ?? '0', 10)
      return numA - numB
    })
  } catch {
    try {
      const roadmapFile = await planningHandle.getFileHandle('ROADMAP.md')
      const file = await roadmapFile.getFile()
      goalsData.push({
        title: 'Phase from ROADMAP',
        description: await readFileAsText(file),
        tasks: [],
      })
    } catch {
      /* phases も ROADMAP もなし */
    }
  }

  let stateData: string | null = null
  try {
    const stateFile = await planningHandle.getFileHandle('STATE.md')
    const file = await stateFile.getFile()
    stateData = await readFileAsText(file)
  } catch {
    /* STATE.md なし */
  }

  return { projectData, goalsData, stateData }
}
