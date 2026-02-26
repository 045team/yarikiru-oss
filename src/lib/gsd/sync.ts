/**
 * GSD Sync - Real-time phase synchronization
 *
 * Keeps UI cache in sync with GSD files while respecting
 * the single source of truth principle.
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { parseGSDPlan, toUIDisplay, type GSDPlan, type UIPhaseDisplay } from './parser'

// ============================================
// Types
// ============================================

export interface PhaseCache {
  version: string
  lastSynced: string
  phases: UIPhaseDisplay[]
  changes: PhaseChange[]
  hash: string
}

export interface PhaseChange {
  phaseId: string
  type: 'added' | 'modified' | 'tasks_added' | 'completed'
  details: string
  timestamp: string
}

export interface SyncResult {
  cache: PhaseCache
  hasChanges: boolean
  changes: PhaseChange[]
}

// ============================================
// Cache Management
// ============================================

const CACHE_VERSION = '1.0.0'
const CACHE_DIR = '.planning/.cache'
const CACHE_FILE = 'phases.json'

function getCachePath(): string {
  return path.join(process.cwd(), CACHE_DIR, CACHE_FILE)
}

export function loadCache(): PhaseCache | null {
  const cachePath = getCachePath()
  if (!fs.existsSync(cachePath)) {
    return null
  }

  try {
    const content = fs.readFileSync(cachePath, 'utf-8')
    return JSON.parse(content) as PhaseCache
  } catch {
    return null
  }
}

export function saveCache(cache: PhaseCache): void {
  const cacheDir = path.join(process.cwd(), CACHE_DIR)
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true })
  }

  fs.writeFileSync(getCachePath(), JSON.stringify(cache, null, 2))
}

// ============================================
// Change Detection
// ============================================

function computeHash(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex')
}

function detectChanges(
  oldCache: PhaseCache | null,
  newPhases: UIPhaseDisplay[],
  phaseContents: Map<string, string>
): PhaseChange[] {
  const changes: PhaseChange[] = []
  const now = new Date().toISOString()

  if (!oldCache) {
    // First sync - all phases are "added"
    for (const phase of newPhases) {
      changes.push({
        phaseId: phase.id,
        type: 'added',
        details: `Phase "${phase.title}" added`,
        timestamp: now,
      })
    }
    return changes
  }

  const oldPhaseMap = new Map(oldCache.phases.map(p => [p.id, p]))

  for (const newPhase of newPhases) {
    const oldPhase = oldPhaseMap.get(newPhase.id)

    if (!oldPhase) {
      // New phase added
      changes.push({
        phaseId: newPhase.id,
        type: 'added',
        details: `Phase "${newPhase.title}" added`,
        timestamp: now,
      })
    } else {
      // Check for modifications
      const newContent = phaseContents.get(newPhase.id) || ''
      const newHash = computeHash(newContent)

      // Check status change
      if (oldPhase.status !== newPhase.status) {
        if (newPhase.status === 'completed') {
          changes.push({
            phaseId: newPhase.id,
            type: 'completed',
            details: `Phase "${newPhase.title}" completed`,
            timestamp: now,
          })
        } else {
          changes.push({
            phaseId: newPhase.id,
            type: 'modified',
            details: `Phase "${newPhase.title}" status changed to ${newPhase.status}`,
            timestamp: now,
          })
        }
      }

      // Check task count change
      if (oldPhase.progress.total !== newPhase.progress.total) {
        const diff = newPhase.progress.total - oldPhase.progress.total
        changes.push({
          phaseId: newPhase.id,
          type: 'tasks_added',
          details: `Phase "${newPhase.title}" - ${diff > 0 ? '+' : ''}${diff} tasks`,
          timestamp: now,
        })
      }
    }
  }

  return changes
}

// ============================================
// Main Sync Function
// ============================================

export async function syncPhases(): Promise<SyncResult> {
  const phasesDir = path.join(process.cwd(), '.planning', 'phases')
  const oldCache = loadCache()

  const phases: UIPhaseDisplay[] = []
  const phaseContents = new Map<string, string>()

  if (fs.existsSync(phasesDir)) {
    const phaseFolders = fs.readdirSync(phasesDir).filter(name => {
      const phasePath = path.join(phasesDir, name)
      return fs.statSync(phasePath).isDirectory()
    })

    for (const phaseFolder of phaseFolders) {
      const phasePath = path.join(phasesDir, phaseFolder)

      // Find all PLAN files in this phase
      const files = fs.readdirSync(phasePath)
      const planFiles = files.filter(f =>
        f.endsWith('-PLAN.md') || f.startsWith('PLAN-')
      )

      for (const planFile of planFiles) {
        const planPath = path.join(phasePath, planFile)
        const plan = parseGSDPlan(planPath)

        if (plan) {
          const display = toUIDisplay(plan)
          phases.push(display)

          // Store content for hash computation
          const content = fs.readFileSync(planPath, 'utf-8')
          phaseContents.set(display.id, content)
        }
      }
    }
  }

  // Sort by wave, then id
  phases.sort((a, b) => {
    if (a.wave !== b.wave) return a.wave - b.wave
    return a.id.localeCompare(b.id)
  })

  // Detect changes
  const changes = detectChanges(oldCache, phases, phaseContents)

  // Compute overall hash
  const allContent = Array.from(phaseContents.values()).join('')
  const hash = computeHash(allContent)

  // Build new cache
  const cache: PhaseCache = {
    version: CACHE_VERSION,
    lastSynced: new Date().toISOString(),
    phases,
    changes,
    hash,
  }

  // Save cache
  saveCache(cache)

  return {
    cache,
    hasChanges: changes.length > 0,
    changes,
  }
}

// ============================================
// STATE.md Update (Phase Completion Only)
// ============================================

export function shouldUpdateSTATE(changes: PhaseChange[]): boolean {
  // Only update STATE.md when a phase is completed
  return changes.some(c => c.type === 'completed')
}

export function generateSTATEUpdate(changes: PhaseChange[]): string | null {
  const completed = changes.filter(c => c.type === 'completed')
  if (completed.length === 0) return null

  const lines: string[] = []
  lines.push(`## Phase Completion - ${new Date().toISOString().split('T')[0]}`)
  lines.push('')

  for (const change of completed) {
    lines.push(`- ✅ ${change.details}`)
  }

  return lines.join('\n')
}

// ============================================
// Quick Access Functions
// ============================================

export function getCachedPhases(): UIPhaseDisplay[] {
  const cache = loadCache()
  return cache?.phases || []
}

export function getCachedPhase(phaseId: string): UIPhaseDisplay | null {
  const phases = getCachedPhases()
  return phases.find(p => p.id === phaseId) || null
}

export function getPendingPhases(): UIPhaseDisplay[] {
  return getCachedPhases().filter(p => p.status === 'pending')
}

export function getExecutingPhases(): UIPhaseDisplay[] {
  return getCachedPhases().filter(p => p.status === 'executing')
}

export function getCompletedPhases(): UIPhaseDisplay[] {
  return getCachedPhases().filter(p => p.status === 'completed')
}
