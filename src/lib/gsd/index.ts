/**
 * GSD Module - Single Source of Truth for Phase Management
 *
 * GSD Format files are the source of truth.
 * This module provides read-only access and transformation for UI.
 */

export {
  // Types
  type GSDYAMLFrontmatter,
  type GSDTask,
  type GSDPlan,
  type UIPhaseDisplay,
  type UITaskDisplay,
  // Parser functions
  extractYAMLFrontmatter,
  parseGSDPlan,
  toUIDisplay,
  toUITaskDisplay,
  // Discovery functions
  discoverPhases,
  getPhasePlans,
  getAllPhasesForUI,
} from './parser'

export {
  // Sync types
  type PhaseCache,
  type PhaseChange,
  type SyncResult,
  // Sync functions
  syncPhases,
  loadCache,
  saveCache,
  shouldUpdateSTATE,
  generateSTATEUpdate,
  // Quick access
  getCachedPhases,
  getCachedPhase,
  getPendingPhases,
  getExecutingPhases,
  getCompletedPhases,
} from './sync'
