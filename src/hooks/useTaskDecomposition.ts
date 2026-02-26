// ============================================
// useTaskDecomposition Hook
// React hook for MCP-powered task decomposition
// Works with any local LLM via MCP protocol
// ============================================

import { useState, useCallback } from 'react'
import { getDatabase } from '@/lib/turso'
import {
  decomposeGoal,
  refineDecomposition,
  processGoalDecomposition,
  type GoalInput,
  type TaskDecompositionOutput,
  type MainTask,
} from '@/lib/ai/task-decomposer'

export interface UseTaskDecompositionReturn {
  // State
  isLoading: boolean
  error: string | null
  decomposition: TaskDecompositionOutput | null
  goalId: string | null

  // Actions
  decompose: (input: GoalInput) => Promise<void>
  refine: (feedback: string) => Promise<void>
  save: () => Promise<void>
  reset: () => void

  // Computed
  completionPercentage: number
  nextTask: MainTask | null
  highPriorityTasks: MainTask[]
  mediumPriorityTasks: MainTask[]
  lowPriorityTasks: MainTask[]
}

export function useTaskDecomposition(): UseTaskDecompositionReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [decomposition, setDecomposition] = useState<TaskDecompositionOutput | null>(null)
  const [goalId, setGoalId] = useState<string | null>(null)
  const [currentInput, setCurrentInput] = useState<GoalInput | null>(null)

  /**
   * Decompose a goal into tasks
   */
  const decompose = useCallback(async (input: GoalInput) => {
    setIsLoading(true)
    setError(null)

    try {
      setCurrentInput(input)

      // Process the goal decomposition
      const result = await processGoalDecomposition(input)

      setDecomposition(result.decomposition)
      setGoalId(result.goalId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to decompose goal'
      setError(errorMessage)
      console.error('Error decomposing goal:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Refine the decomposition based on feedback
   */
  const refine = useCallback(async (feedback: string) => {
    if (!decomposition) {
      setError('No decomposition to refine')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const refined = await refineDecomposition(decomposition, feedback)
      setDecomposition(refined)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refine decomposition'
      setError(errorMessage)
      console.error('Error refining decomposition:', err)
    } finally {
      setIsLoading(false)
    }
  }, [decomposition])

  /**
   * Save the decomposition to the database
   */
  const save = useCallback(async () => {
    if (!decomposition || !goalId || !currentInput) {
      setError('No decomposition to save')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const db = getDatabase()

      // Create the goal
      await db.createGoal({
        user_id: currentInput.userId,
        title: currentInput.title,
        description: currentInput.description,
        deadline: currentInput.deadline.toISOString(),
        available_hours_per_day: currentInput.availableHoursPerDay,
        context: currentInput.context,
        decomposition_metadata: {
          totalEstimatedMinutes: decomposition.totalEstimatedMinutes,
          recommendedSchedule: decomposition.recommendedSchedule,
          assumptions: decomposition.assumptions,
        },
      })

      // Create the tasks
      await db.createGeneratedTasks(goalId, decomposition.mainTasks)

      console.log('Goal and tasks saved successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save decomposition'
      setError(errorMessage)
      console.error('Error saving decomposition:', err)
      throw err // Re-throw to allow caller to handle
    } finally {
      setIsLoading(false)
    }
  }, [decomposition, goalId, currentInput])

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
    setDecomposition(null)
    setGoalId(null)
    setCurrentInput(null)
  }, [])

  /**
   * Calculate completion percentage
   */
  const completionPercentage = decomposition
    ? decomposition.mainTasks.reduce((acc, task) => {
        const taskSubtasks = task.subTasks
        const completedSubtasks = taskSubtasks.filter(st => st.completed).length
        return acc + (completedSubtasks / taskSubtasks.length) * 100
      }, 0) / decomposition.mainTasks.length
    : 0

  /**
   * Get next pending task
   */
  const nextTask = decomposition
    ? decomposition.mainTasks.find(task =>
        task.subTasks.some(st => !st.completed)
      ) || null
    : null

  /**
   * Filter tasks by priority
   */
  const highPriorityTasks = decomposition
    ? decomposition.mainTasks.filter(task => task.priority === 'high')
    : []

  const mediumPriorityTasks = decomposition
    ? decomposition.mainTasks.filter(task => task.priority === 'medium')
    : []

  const lowPriorityTasks = decomposition
    ? decomposition.mainTasks.filter(task => task.priority === 'low')
    : []

  return {
    // State
    isLoading,
    error,
    decomposition,
    goalId,

    // Actions
    decompose,
    refine,
    save,
    reset,

    // Computed
    completionPercentage,
    nextTask,
    highPriorityTasks,
    mediumPriorityTasks,
    lowPriorityTasks,
  }
}

// ============================================
// Hook for Loading Saved Goals
// ============================================

export function useGoalTasks(userId: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [goals, setGoals] = useState<any[]>([])

  const loadGoals = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const db = getDatabase()
      const userGoals = await db.getGoalsByUserId(userId)
      setGoals(userGoals)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load goals'
      setError(errorMessage)
      console.error('Error loading goals:', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const loadGoalWithTasks = useCallback(async (goalId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const db = getDatabase()
      const [goal, tasks, progress] = await Promise.all([
        db.getGoalById(goalId),
        db.getTasksByGoalId(goalId),
        db.getGoalProgress(goalId),
      ])

      return { goal, tasks, progress }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load goal'
      setError(errorMessage)
      console.error('Error loading goal:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateTaskStatus = useCallback(async (taskId: string, status: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const db = getDatabase()
      await db.updateGeneratedTaskStatus(taskId, status)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task'
      setError(errorMessage)
      console.error('Error updating task:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateSubtaskStatus = useCallback(async (
    taskId: string,
    subtaskIndex: number,
    completed: boolean
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const db = getDatabase()
      await db.updateSubtaskStatus(taskId, subtaskIndex, completed)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update subtask'
      setError(errorMessage)
      console.error('Error updating subtask:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteGoal = useCallback(async (goalId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const db = getDatabase()
      await db.deleteGoal(goalId)

      // Update local state
      setGoals(prev => prev.filter(g => g.id !== goalId))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete goal'
      setError(errorMessage)
      console.error('Error deleting goal:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isLoading,
    error,
    goals,
    loadGoals,
    loadGoalWithTasks,
    updateTaskStatus,
    updateSubtaskStatus,
    deleteGoal,
  }
}
