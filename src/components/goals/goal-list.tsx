/**
 * GoalList - 目標一覧表示コンポーネント
 */
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Target, Calendar, ChevronRight } from 'lucide-react'
import { CopyablePrompt } from '@/components/ui/copyable-prompt'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export interface Goal {
  id: string
  title: string
  description: string | null
  deadline: string | null
  status: string
  createdAt: string
  updatedAt: string
  taskCount?: number
  completedTasks?: number
}

interface GoalListProps {
  goals: Goal[]
  onGoalClick?: (goal: Goal) => void
  onCreateGoal?: () => void
}

export function GoalList({ goals, onGoalClick, onCreateGoal }: GoalListProps) {
  const getCompletionPercentage = (goal: Goal) => {
    if (goal.taskCount === 0) return 0
    return Math.round((goal.completedTasks || 0) / goal.taskCount * 100)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      completed: 'secondary',
      archived: 'outline',
    } as const
    const labels = {
      active: 'アクティブ',
      completed: '完了',
      archived: 'アーカイブ',
    }
    return (
      <Badge variant={variants[status as keyof typeof variants] ?? 'default'}>
        {labels[status as keyof typeof labels] ?? status}
      </Badge>
    )
  }

  const getPriorityColor = (deadline: string | null) => {
    if (!deadline) return 'text-muted-foreground'
    const today = new Date()
    const deadlineDate = new Date(deadline)
    const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return 'text-destructive'
    if (diffDays <= 3) return 'text-accent'
    if (diffDays <= 7) return 'text-teal-600'
    return 'text-primary'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">目標一覧</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {goals.length}個の目標
          </p>
        </div>
        {onCreateGoal && (
          <Button variant="cta" onClick={onCreateGoal}>
            + 新しい目標
          </Button>
        )}
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="mx-auto mb-4 h-16 w-16 text-muted" aria-hidden />
            <h3 className="mb-2 text-lg font-medium text-foreground">
              まだ目標がありません
            </h3>
            <p className="mb-6 text-muted-foreground">
              最初の目標を作成して、「やりきる」を始めましょう
            </p>
            {onCreateGoal && (
              <Button variant="cta" onClick={onCreateGoal}>
                目標を作成する
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {goals.map((goal) => {
            const completion = getCompletionPercentage(goal)
            return (
              <Card
                key={goal.id}
                className="cursor-pointer transition-colors duration-200 hover:border-primary/40"
                onClick={() => onGoalClick?.(goal)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          {goal.title}
                        </h3>
                        {getStatusBadge(goal.status)}
                      </div>

                      {goal.description && (
                        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                          {goal.description}
                        </p>
                      )}

                      <div className="flex items-center gap-6 text-sm">
                        {goal.deadline && (
                          <div className={`flex items-center gap-1 ${getPriorityColor(goal.deadline)}`}>
                            <Calendar className="h-4 w-4" aria-hidden />
                            <span>
                              {format(new Date(goal.deadline), 'yyyy年M月d日', { locale: ja })}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="font-medium">{goal.completedTasks || 0}</span>
                          <span>/</span>
                          <span>{goal.taskCount || 0}</span>
                          <span className="text-xs">タスク完了</span>
                        </div>
                      </div>

                      {(goal.taskCount || 0) > 0 && (
                        <div className="mt-4">
                          <Progress value={completion} className="h-2" />
                          <p className="mt-1 text-xs text-muted-foreground">
                            完了率: {completion}%
                          </p>
                        </div>
                      )}
                      {goal.id && (
                        <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                          <CopyablePrompt
                            prompt={`/yarikiru ${goal.id}`}
                            label="AI完了コマンド"
                          />
                        </div>
                      )}
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
