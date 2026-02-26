/**
 * GoalDetailClient - Client-side component for goal detail page
 *
 * Handles interactive elements like task toggling and urgent task management
 */
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { TaskToggle } from '@/components/goals/task-toggle'
import { UrgentTaskPanel } from '@/components/goals/urgent-task-panel'
import { DecomposeButton } from '@/components/goals/decompose-button'

interface Task {
  id: string
  title: string
  estimatedMinutes: number
  priority: string
  isCompleted: boolean
  isUrgent: boolean
  scheduledDate: string | null
}

interface GoalDetailClientProps {
  goalId: string
  goalTitle: string
  tasks: Task[]
}

export function GoalDetailClient({ goalId, goalTitle, tasks }: GoalDetailClientProps) {
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks)

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return '高'
      case 'medium':
        return '中'
      case 'low':
        return '低'
      default:
        return '中'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive/15 text-destructive'
      case 'medium':
        return 'bg-accent/15 text-accent'
      case 'low':
        return 'bg-primary/15 text-primary'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const handleTaskToggle = (taskId: string, isCompleted: boolean) => {
    setLocalTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, isCompleted } : t
      )
    )
  }

  const handleUrgentToggle = (taskId: string, isUrgent: boolean) => {
    setLocalTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, isUrgent } : t
      )
    )
  }

  return (
    <>
      {/* UrgentTaskPanel */}
      <UrgentTaskPanel goalId={goalId} />

      {/* Tasks Section */}
      <Card className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-foreground">タスク一覧</h3>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {localTasks.length}個のタスク
            </span>
          </div>
        </div>

        {localTasks.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">
              タスクがありません
            </h3>
            <p className="mb-6 text-muted-foreground">
              AIでタスク分解を開始して、目標を達成するための具体的なタスクを作成できます
            </p>

            {/* Task Decompose Button Component */}
            <DecomposeButton goalId={goalId} goalTitle={goalTitle} />
          </div>
        ) : (
          <div className="space-y-3">
            {localTasks.map((task, index) => (
              <div
                key={task.id}
                className={`flex items-center justify-between rounded-lg border p-4 transition-colors duration-200 ${
                  task.isCompleted
                    ? 'border-border bg-muted/50'
                    : task.isUrgent
                      ? 'border-accent bg-accent/5'
                      : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <div className="flex flex-1 items-start gap-4">
                  <TaskToggle
                    taskId={task.id}
                    initialCompleted={task.isCompleted}
                    onToggle={handleTaskToggle}
                  />
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-3">
                      <span className={`font-medium ${task.isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {index + 1}. {task.title}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                      {task.isUrgent && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-white">
                          緊急
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      推定 {task.estimatedMinutes} 分
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}
