/**
 * TaskList - タスクリスト表示コンポーネント
 */
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react'

export interface Task {
  id: string
  title: string
  estimatedMinutes: number
  priority: 'high' | 'medium' | 'low'
  isCompleted: boolean
  scheduledDate: string | null
}

interface TaskListProps {
  tasks: Task[]
  onTaskToggle?: (taskId: string, isCompleted: boolean) => void
  showCompleted?: boolean
}

export function TaskList({ tasks, onTaskToggle, showCompleted = false }: TaskListProps) {
  const filteredTasks = showCompleted ? tasks : tasks.filter(t => !t.isCompleted)

  const getPriorityBadge = (priority: Task['priority']) => {
    const variants = {
      high: 'destructive',
      medium: 'default',
      low: 'secondary',
    } as const

    const labels = {
      high: '高',
      medium: '中',
      low: '低',
    }

    return (
      <Badge variant={variants[priority]} className="text-xs">
        {labels[priority]}
      </Badge>
    )
  }

  const incompleteTasks = filteredTasks.filter(t => !t.isCompleted)
  const completedCount = filteredTasks.filter(t => t.isCompleted).length
  const totalCount = filteredTasks.length
  const completionRate = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0

  const totalMinutes = incompleteTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            タスクリスト
            {totalCount > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({completedCount}/{totalCount} 完了)
              </span>
            )}
          </CardTitle>
          {totalMinutes > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                残り約{hours > 0 ? `${hours}時間` : ''}{minutes}分
              </span>
            </div>
          )}
        </div>
        {totalCount > 0 && completionRate < 100 && (
          <div className="mt-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {filteredTasks.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-muted" aria-hidden />
            <p className="text-muted-foreground">
              {showCompleted ? '完了したタスクはありません' : 'タスクがありません'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors duration-200 ${
                  task.isCompleted
                    ? 'border-border bg-muted/50'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onTaskToggle?.(task.id, !task.isCompleted)}
                  className="flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                  aria-label={task.isCompleted ? '未完了にする' : '完了にする'}
                >
                  {task.isCompleted ? (
                    <CheckCircle2 className="h-6 w-6 text-primary" aria-hidden />
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground transition-colors hover:text-primary" aria-hidden />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      task.isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
                    }`}
                  >
                    {task.title}
                  </p>
                  <div className="mt-1 flex items-center gap-3">
                    {getPriorityBadge(task.priority)}
                    <span className="text-xs text-muted-foreground">
                      {task.estimatedMinutes}分
                    </span>
                  </div>
                </div>

                {!task.isCompleted && task.priority === 'high' && (
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-accent" aria-hidden />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * TaskBoard - 複数列のタスク表示
 */
interface TaskBoardProps {
  tasks: Task[]
  onTaskToggle?: (taskId: string, isCompleted: boolean) => void
}

export function TaskBoard({ tasks, onTaskToggle }: TaskBoardProps) {
  const pendingTasks = tasks.filter(t => !t.isCompleted)
  const completedTasks = tasks.filter(t => t.isCompleted)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <TaskList
        tasks={pendingTasks}
        onTaskToggle={onTaskToggle}
        showCompleted={false}
      />
      {completedTasks.length > 0 && (
        <TaskList
          tasks={completedTasks}
          onTaskToggle={onTaskToggle}
          showCompleted={true}
        />
      )}
    </div>
  )
}
