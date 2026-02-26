/**
 * Auto-Embedding System
 *
 * Automatically generates and updates embeddings for goals, tasks, and work logs.
 * Triggered by data changes (create/update) via API hooks.
 */

import { execute } from '@/lib/turso/client'
import { embeddingToBuffer } from '@/lib/turso/embeddings'

// ============================================
// Types
// ============================================

export interface EmbeddingJob {
  id: string
  type: 'goal' | 'sub_task' | 'work_log' | 'learning_item'
  entityId: string
  text: string
  priority: 'high' | 'normal' | 'low'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  processedAt?: string
  error?: string
}

// ============================================
// Embedding Text Generation
// ============================================

/**
 * Generate text for embedding from goal data
 */
export function generateGoalEmbeddingText(goal: {
  title: string
  description?: string
  status?: string
}): string {
  const parts = [goal.title]
  if (goal.description) {
    parts.push(goal.description)
  }
  if (goal.status) {
    parts.push(`Status: ${goal.status}`)
  }
  return parts.join(' | ')
}

/**
 * Generate text for embedding from sub-task data
 */
export function generateSubTaskEmbeddingText(subTask: {
  label: string
  status?: string
}): string {
  const parts = [subTask.label]
  if (subTask.status) {
    parts.push(`Status: ${subTask.status}`)
  }
  return parts.join(' | ')
}

/**
 * Generate text for embedding from work log data
 */
export function generateWorkLogEmbeddingText(workLog: {
  notes?: string
  approach?: string
  effectiveness?: number
}): string {
  const parts: string[] = []
  if (workLog.notes) {
    parts.push(workLog.notes)
  }
  if (workLog.approach) {
    parts.push(`Approach: ${workLog.approach}`)
  }
  if (workLog.effectiveness) {
    parts.push(`Effectiveness: ${workLog.effectiveness}/5`)
  }
  return parts.join(' | ') || 'Work log'
}

/**
 * Generate text for embedding from learning item data
 */
export function generateLearningItemEmbeddingText(item: {
  title?: string
  url?: string
  summary?: string
  tags?: string[]
}): string {
  const parts: string[] = []
  if (item.title) {
    parts.push(item.title)
  }
  if (item.summary) {
    parts.push(item.summary)
  }
  if (item.tags && item.tags.length > 0) {
    parts.push(`Tags: ${item.tags.join(', ')}`)
  }
  return parts.join(' | ') || item.url || 'Learning item'
}

// ============================================
// Embedding Update Functions
// ============================================

/**
 * Update embedding for a goal
 */
export async function updateGoalEmbedding(
  goalId: string,
  embedding: number[]
): Promise<void> {
  const embeddingBuffer = embeddingToBuffer(embedding)
  // Convert Uint8Array to base64 string for storage
  const base64Blob = Buffer.from(embeddingBuffer).toString('base64')

  await execute(
    'UPDATE yarikiru_goals SET embedding = ? WHERE id = ?',
    [base64Blob, goalId]
  )
}

/**
 * Update embedding for a sub-task
 */
export async function updateSubTaskEmbedding(
  subTaskId: string,
  embedding: number[]
): Promise<void> {
  const embeddingBuffer = embeddingToBuffer(embedding)
  // Convert Uint8Array to base64 string for storage
  const base64Blob = Buffer.from(embeddingBuffer).toString('base64')

  await execute(
    'UPDATE yarikiru_sub_tasks SET embedding = ? WHERE id = ?',
    [base64Blob, subTaskId]
  )
}

/**
 * Update embedding for a work log
 */
export async function updateWorkLogEmbedding(
  workLogId: string,
  embedding: number[]
): Promise<void> {
  const embeddingBuffer = embeddingToBuffer(embedding)
  // Convert Uint8Array to base64 string for storage
  const base64Blob = Buffer.from(embeddingBuffer).toString('base64')

  await execute(
    'UPDATE yarikiru_work_logs SET embedding = ? WHERE id = ?',
    [base64Blob, workLogId]
  )
}

/**
 * Update embedding for a learning item
 */
export async function updateLearningItemEmbedding(
  learningItemId: string,
  embedding: number[]
): Promise<void> {
  const embeddingBuffer = embeddingToBuffer(embedding)
  // Convert Uint8Array to base64 string for storage
  const base64Blob = Buffer.from(embeddingBuffer).toString('base64')

  await execute(
    'UPDATE yarikiru_learning_items SET embedding = ? WHERE id = ?',
    [base64Blob, learningItemId]
  )
}

// ============================================
// Batch Embedding Generation
// ============================================

/**
 * Generate embeddings for all goals without embeddings
 */
export async function generateMissingGoalEmbeddings(
  generateEmbedding: (text: string) => Promise<number[]>
): Promise<{ success: number; failed: number }> {
  // Fetch goals without embeddings
  const goals = await execute(
    `SELECT id, title, description, status
     FROM yarikiru_goals
     WHERE embedding IS NULL
     LIMIT 50`
  )
  if (!goals || goals.length === 0) {
    return { success: 0, failed: 0 }
  }

  let success = 0
  let failed = 0

  for (const goal of goals as any[]) {
    try {
      const text = generateGoalEmbeddingText(goal)
      const embedding = await generateEmbedding(text)
      await updateGoalEmbedding(goal.id, embedding)
      success++
    } catch (error) {
      console.error(`Failed to generate embedding for goal ${goal.id}:`, error)
      failed++
    }
  }

  return { success, failed }
}

/**
 * Generate embeddings for all sub-tasks without embeddings
 */
export async function generateMissingSubTaskEmbeddings(
  generateEmbedding: (text: string) => Promise<number[]>
): Promise<{ success: number; failed: number }> {
  // Fetch sub-tasks without embeddings
  const subTasks = await execute(
    `SELECT id, label, status
     FROM yarikiru_sub_tasks
     WHERE embedding IS NULL
     LIMIT 50`
  )
  if (!subTasks || subTasks.length === 0) {
    return { success: 0, failed: 0 }
  }

  let success = 0
  let failed = 0

  for (const subTask of subTasks as any[]) {
    try {
      const text = generateSubTaskEmbeddingText(subTask)
      const embedding = await generateEmbedding(text)
      await updateSubTaskEmbedding(subTask.id, embedding)
      success++
    } catch (error) {
      console.error(`Failed to generate embedding for sub-task ${subTask.id}:`, error)
      failed++
    }
  }

  return { success, failed }
}

/**
 * Generate embeddings for all work logs without embeddings
 */
export async function generateMissingWorkLogEmbeddings(
  generateEmbedding: (text: string) => Promise<number[]>
): Promise<{ success: number; failed: number }> {
  // Fetch work logs without embeddings
  const workLogs = await execute(
    `SELECT id, notes, approach, effectiveness
     FROM yarikiru_work_logs
     WHERE embedding IS NULL
     LIMIT 50`
  )
  if (!workLogs || workLogs.length === 0) {
    return { success: 0, failed: 0 }
  }

  let success = 0
  let failed = 0

  for (const workLog of workLogs as any[]) {
    try {
      const text = generateWorkLogEmbeddingText(workLog)
      const embedding = await generateEmbedding(text)
      await updateWorkLogEmbedding(workLog.id, embedding)
      success++
    } catch (error) {
      console.error(`Failed to generate embedding for work log ${workLog.id}:`, error)
      failed++
    }
  }

  return { success, failed }
}

/**
 * Generate embeddings for all learning items without embeddings
 */
export async function generateMissingLearningItemEmbeddings(
  generateEmbedding: (text: string) => Promise<number[]>
): Promise<{ success: number; failed: number }> {
  // Fetch learning items without embeddings
  const learningItems = await execute(
    `SELECT id, title, url, summary, tags
     FROM yarikiru_learning_items
     WHERE embedding IS NULL
     LIMIT 50`
  )
  if (!learningItems || learningItems.length === 0) {
    return { success: 0, failed: 0 }
  }

  let success = 0
  let failed = 0

  for (const item of learningItems as any[]) {
    try {
      const text = generateLearningItemEmbeddingText(item)
      const embedding = await generateEmbedding(text)
      await updateLearningItemEmbedding(item.id, embedding)
      success++
    } catch (error) {
      console.error(`Failed to generate embedding for learning item ${item.id}:`, error)
      failed++
    }
  }

  return { success, failed }
}

// ============================================
// Statistics
// ============================================

/**
 * Get embedding coverage statistics
 */
export async function getEmbeddingStats(): Promise<{
  goals: { total: number; withEmbedding: number }
  subTasks: { total: number; withEmbedding: number }
  workLogs: { total: number; withEmbedding: number }
  learningItems: { total: number; withEmbedding: number }
}> {
  const [goals, subTasks, workLogs, learningItems] = await Promise.all([
    execute('SELECT COUNT(*) as total, SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) as with_embedding FROM yarikiru_goals'),
    execute('SELECT COUNT(*) as total, SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) as with_embedding FROM yarikiru_sub_tasks'),
    execute('SELECT COUNT(*) as total, SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) as with_embedding FROM yarikiru_work_logs'),
    execute('SELECT COUNT(*) as total, SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) as with_embedding FROM yarikiru_learning_items'),
  ])

  return {
    goals: {
      total: (goals[0] as any).total,
      withEmbedding: (goals[0] as any).with_embedding,
    },
    subTasks: {
      total: (subTasks[0] as any).total,
      withEmbedding: (subTasks[0] as any).with_embedding,
    },
    workLogs: {
      total: (workLogs[0] as any).total,
      withEmbedding: (workLogs[0] as any).with_embedding,
    },
    learningItems: {
      total: (learningItems[0] as any).total,
      withEmbedding: (learningItems[0] as any).with_embedding,
    },
  }
}
