/**
 * GSD Parser - Transforms GSD format to UI-friendly format
 *
 * GSD (Get Shit Done) Format is the SINGLE SOURCE OF TRUTH
 * This parser only reads and transforms - never modifies the original files
 */

import fs from 'fs'
import path from 'path'

// ============================================
// GSD Format Types (Source of Truth)
// ============================================

export interface GSDYAMLFrontmatter {
  phase: string
  plan: string
  type: 'execute' | 'research' | 'plan'
  wave: number
  depends_on: string[]
  files_modified?: string[]
  autonomous?: boolean
  must_haves?: {
    truths: string[]
    artifacts?: Array<{
      path: string
      provides: string
      min_lines?: number
    }>
    key_links?: Array<{
      from: string
      to: string
      via: string
      pattern?: string
    }>
  }
}

export interface GSDTask {
  type: 'auto' | 'manual'
  name: string
  files: string[]
  action: string
  verify?: string
  done?: string
}

export interface GSDPlan {
  frontmatter: GSDYAMLFrontmatter
  objective: string
  context?: string
  tasks: GSDTask[]
  verification: string[]
  successCriteria: string[]
}

// ============================================
// UI Display Types (Derived)
// ============================================

export interface UIPhaseDisplay {
  id: string
  title: string
  status: 'pending' | 'executing' | 'completed'
  progress: {
    total: number
    completed: number
    percentage: number
  }
  truths: string[]
  artifacts: Array<{
    path: string
    description: string
    status: 'pending' | 'done'
  }>
  dependencies: string[]
  wave: number
}

export interface UITaskDisplay {
  id: string
  name: string
  type: 'auto' | 'manual'
  status: 'pending' | 'in_progress' | 'done'
  files: string[]
  description: string
  verification?: string
}

// ============================================
// Parser Functions
// ============================================

/**
 * Extract YAML frontmatter from markdown content
 */
export function extractYAMLFrontmatter(content: string): { yaml: Record<string, unknown>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)

  if (!match) {
    return { yaml: {}, body: content }
  }

  const yamlStr = match[1]
  const body = match[2]

  // Simple YAML parser (handles basic key-value and nested objects)
  const yaml: Record<string, unknown> = {}
  let currentKey = ''
  let currentArray: unknown[] | null = null
  let currentObject: Record<string, unknown> | null = null
  let inMustHaves = false
  let inArtifacts = false
  let inTruths = false
  let inKeyLinks = false

  const lines = yamlStr.split('\n')
  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue

    // Check for nested object starts
    if (line.startsWith('must_haves:')) {
      inMustHaves = true
      yaml.must_haves = { truths: [], artifacts: [], key_links: [] }
      currentObject = yaml.must_haves as Record<string, unknown>
      continue
    }

    if (inMustHaves) {
      if (line.trim().startsWith('truths:')) {
        inTruths = true
        inArtifacts = false
        inKeyLinks = false
        currentArray = (yaml.must_haves as Record<string, unknown[]>).truths
        continue
      }
      if (line.trim().startsWith('artifacts:')) {
        inArtifacts = true
        inTruths = false
        inKeyLinks = false
        currentArray = (yaml.must_haves as Record<string, unknown[]>).artifacts
        continue
      }
      if (line.trim().startsWith('key_links:')) {
        inKeyLinks = true
        inTruths = false
        inArtifacts = false
        currentArray = (yaml.must_haves as Record<string, unknown[]>).key_links
        continue
      }
    }

    // Handle array items
    if (line.trim().startsWith('- ')) {
      const value = line.trim().substring(2)

      if (inTruths && currentArray) {
        (currentArray as string[]).push(value.replace(/^"(.*)"$/, '$1'))
      } else if ((inArtifacts || inKeyLinks) && currentArray) {
        // Parse object in array
        if (value.includes(':')) {
          const [key, val] = value.split(':').map(s => s.trim())
          const obj: Record<string, string> = {}
          obj[key.replace(/^"(.*)"$/, '$1')] = val.replace(/^"(.*)"$/, '$1')
          currentArray.push(obj)
        }
      }
      continue
    }

    // Handle nested object properties
    if ((inArtifacts || inKeyLinks) && line.includes(':') && !line.trim().startsWith('-')) {
      const indent = line.search(/\S/)
      if (indent > 2 && currentArray && currentArray.length > 0) {
        const [key, val] = line.trim().split(':').map(s => s.trim())
        const lastItem = currentArray[currentArray.length - 1] as Record<string, string>
        if (lastItem && typeof lastItem === 'object') {
          lastItem[key] = val.replace(/^"(.*)"$/, '$1')
        }
      }
      continue
    }

    // Handle simple key-value pairs
    if (line.includes(':') && !line.trim().startsWith('-')) {
      const [key, ...valParts] = line.split(':')
      const val = valParts.join(':').trim()

      // Reset nested context
      if (!line.startsWith(' ') && !line.startsWith('\t')) {
        inMustHaves = false
        inTruths = false
        inArtifacts = false
        inKeyLinks = false
      }

      if (val === '') {
        currentKey = key.trim()
        yaml[currentKey] = []
        currentArray = yaml[currentKey] as unknown[]
      } else {
        // Parse value
        let parsedVal: unknown = val.replace(/^"(.*)"$/, '$1')

        if (parsedVal === 'true') parsedVal = true
        else if (parsedVal === 'false') parsedVal = false
        else if (!isNaN(Number(parsedVal)) && parsedVal !== '') parsedVal = Number(parsedVal)
        else if (String(parsedVal).startsWith('[')) {
          // Parse inline array
          parsedVal = String(parsedVal)
            .replace(/[\[\]]/g, '')
            .split(',')
            .map(s => s.trim().replace(/^"(.*)"$/, '$1'))
        }

        yaml[key.trim()] = parsedVal
      }
    }
  }

  return { yaml, body }
}

/**
 * Parse GSD plan file
 */
export function parseGSDPlan(filePath: string): GSDPlan | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const { yaml, body } = extractYAMLFrontmatter(content)

    // Extract sections from body
    const sections = {
      objective: '',
      context: '',
      tasks: [] as GSDTask[],
      verification: [] as string[],
      successCriteria: [] as string[],
    }

    // Parse objective
    const objectiveMatch = body.match(/## Objective\n\n([\s\S]*?)(?=\n## |$)/)
    if (objectiveMatch) {
      sections.objective = objectiveMatch[1].trim()
    }

    // Parse tasks
    const taskMatches = body.matchAll(/<task type="([^"]+)">\s*<name>([^<]+)<\/name>([\s\S]*?)<\/task>/g)
    for (const match of taskMatches) {
      const task: GSDTask = {
        type: match[1] as 'auto' | 'manual',
        name: match[2].trim(),
        files: [],
        action: '',
      }

      // Extract files
      const filesMatch = match[3].match(/<files>([\s\S]*?)<\/files>/)
      if (filesMatch) {
        task.files = filesMatch[1]
          .split('\n')
          .map(s => s.trim())
          .filter(s => s)
      }

      // Extract action
      const actionMatch = match[3].match(/<action>([\s\S]*?)<\/action>/)
      if (actionMatch) {
        task.action = actionMatch[1].trim()
      }

      // Extract verify
      const verifyMatch = match[3].match(/<verify>([\s\S]*?)<\/verify>/)
      if (verifyMatch) {
        task.verify = verifyMatch[1].trim()
      }

      // Extract done
      const doneMatch = match[3].match(/<done>([\s\S]*?)<\/done>/)
      if (doneMatch) {
        task.done = doneMatch[1].trim()
      }

      sections.tasks.push(task)
    }

    // Parse verification checklist
    const verifyMatch = body.match(/## Verification\n\n([\s\S]*?)(?=\n## |$)/)
    if (verifyMatch) {
      const items = verifyMatch[1].matchAll(/- \[ \] (.+)/g)
      for (const item of items) {
        sections.verification.push(item[1].trim())
      }
    }

    // Parse success criteria
    const successMatch = body.match(/## Success Criteria\n\n([\s\S]*?)(?=\n## |$)/)
    if (successMatch) {
      const items = successMatch[1].matchAll(/\d+\. \*\*([^*]+)\*\*: (.+)/g)
      for (const item of items) {
        sections.successCriteria.push(`${item[1].trim()}: ${item[2].trim()}`)
      }
    }

    return {
      frontmatter: yaml as unknown as GSDYAMLFrontmatter,
      objective: sections.objective,
      context: sections.context,
      tasks: sections.tasks,
      verification: sections.verification,
      successCriteria: sections.successCriteria,
    }
  } catch (error) {
    console.error(`Failed to parse GSD plan: ${filePath}`, error)
    return null
  }
}

/**
 * Transform GSD plan to UI display format
 */
export function toUIDisplay(plan: GSDPlan): UIPhaseDisplay {
  const { frontmatter, tasks, objective } = plan

  // Safely extract phase and plan from frontmatter
  const phase = String(frontmatter.phase || 'unknown')
  const planNum = String(frontmatter.plan || '0')

  // Determine status based on file existence
  const status = determinePhaseStatus(phase, planNum)

  // Calculate progress
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => isTaskComplete(t)).length

  return {
    id: `${phase}-${planNum}`,
    title: extractTitle(objective) || `Phase ${phase}.${planNum}`,
    status,
    progress: {
      total: totalTasks,
      completed: completedTasks,
      percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    },
    truths: (frontmatter.must_haves as { truths?: string[] })?.truths || [],
    artifacts: ((frontmatter.must_haves as { artifacts?: Array<{ path: string; provides: string }> })?.artifacts || []).map(a => ({
      path: a.path,
      description: a.provides,
      status: fs.existsSync(a.path) ? 'done' : 'pending',
    })),
    dependencies: frontmatter.depends_on,
    wave: frontmatter.wave,
  }
}

/**
 * Transform GSD task to UI task display
 */
export function toUITaskDisplay(task: GSDTask, index: number): UITaskDisplay {
  return {
    id: `task-${index}`,
    name: task.name,
    type: task.type,
    status: isTaskComplete(task) ? 'done' : 'pending',
    files: task.files,
    description: extractTaskDescription(task.action),
    verification: task.verify,
  }
}

// ============================================
// Helper Functions
// ============================================

function extractTitle(objective: string): string {
  const firstLine = objective.split('\n')[0]
  return firstLine.replace(/^[#\s]+/, '').substring(0, 100)
}

function extractTaskDescription(action: string): string {
  // Extract first meaningful description line
  const lines = action.split('\n').filter(l => l.trim() && !l.startsWith('```') && !l.startsWith('*'))
  return lines[0]?.replace(/^\d+\.\s*/, '').substring(0, 200) || ''
}

function determinePhaseStatus(phase: string, plan: string): 'pending' | 'executing' | 'completed' {
  if (!phase || !plan) {
    return 'pending'
  }

  // Check if SUMMARY file exists (completed)
  const phasesDir = path.join(process.cwd(), '.planning', 'phases')

  // Try multiple naming conventions for phase folder
  let phaseFolder: string | null = null
  if (fs.existsSync(phasesDir)) {
    const folders = fs.readdirSync(phasesDir)
    // Try exact match first
    if (folders.includes(phase)) {
      phaseFolder = phase
    } else {
      // Try partial match (e.g., "05-marketing-automation" for phase "05")
      phaseFolder = folders.find(f => f.startsWith(phase + '-') || f === phase) || null
    }
  }

  if (!phaseFolder) {
    return 'pending'
  }

  // Check for SUMMARY file (completed)
  const summaryPath = path.join(phasesDir, phaseFolder, `${phase}-${plan}-SUMMARY.md`)
  if (fs.existsSync(summaryPath)) {
    return 'completed'
  }

  // Also check for *-SUMMARY.md pattern
  const phaseFiles = fs.readdirSync(path.join(phasesDir, phaseFolder))
  if (phaseFiles.some(f => f.includes(`-${plan}-SUMMARY.md`) || f === `${phase}-${plan}-SUMMARY.md`)) {
    return 'completed'
  }

  // Check if PLAN file exists (executing)
  const planPath = path.join(phasesDir, phaseFolder, `${phase}-${plan}-PLAN.md`)
  if (fs.existsSync(planPath)) {
    return 'executing'
  }

  // Also check for PLAN-*.md pattern
  if (phaseFiles.some(f => f.endsWith('-PLAN.md') || f.startsWith('PLAN-'))) {
    return 'executing'
  }

  return 'pending'
}

function isTaskComplete(task: GSDTask): boolean {
  // Check if all files exist
  return task.files.every(file => {
    const fullPath = path.join(process.cwd(), file)
    return fs.existsSync(fullPath)
  })
}

// ============================================
// Phase Discovery Functions
// ============================================

/**
 * Discover all phases in .planning/phases directory
 */
export function discoverPhases(): string[] {
  const phasesDir = path.join(process.cwd(), '.planning', 'phases')

  if (!fs.existsSync(phasesDir)) {
    return []
  }

  return fs.readdirSync(phasesDir).filter(name => {
    const phasePath = path.join(phasesDir, name)
    return fs.statSync(phasePath).isDirectory()
  })
}

/**
 * Get all plans for a phase
 */
export function getPhasePlans(phaseId: string): string[] {
  const phaseDir = path.join(process.cwd(), '.planning', 'phases', phaseId)

  if (!fs.existsSync(phaseDir)) {
    return []
  }

  return fs.readdirSync(phaseDir)
    .filter(name => name.endsWith('-PLAN.md'))
    .map(name => path.join(phaseDir, name))
}

/**
 * Get all phases with their plans in UI format
 */
export function getAllPhasesForUI(): UIPhaseDisplay[] {
  const phases = discoverPhases()
  const result: UIPhaseDisplay[] = []

  for (const phaseId of phases) {
    const planFiles = getPhasePlans(phaseId)

    for (const planFile of planFiles) {
      const plan = parseGSDPlan(planFile)
      if (plan) {
        result.push(toUIDisplay(plan))
      }
    }
  }

  // Sort by wave, then phase
  return result.sort((a, b) => {
    if (a.wave !== b.wave) return a.wave - b.wave
    return a.id.localeCompare(b.id)
  })
}
