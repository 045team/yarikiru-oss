'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface SubTask {
  id: string
  goal_id: string
  label: string
  sort_order: number
  is_done: number
  started_at?: string
  completed_at?: string
}

interface Goal {
  id: string
  title: string
  description: string | null
  status: string
  estimatedMinutes: number | null
  actualMinutes: number | null
}

interface Project {
  id: string
  name: string
  description: string | null
}

interface WorkflowVisualizationClientProps {
  projectId: string
  project: Project
  goals: Goal[]
  subTasks: SubTask[]
}

export function WorkflowVisualizationClient({
  projectId,
  project,
  goals,
  subTasks,
}: WorkflowVisualizationClientProps) {
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(
    goals.length > 0 ? goals[0].id : null
  )
  const [viewMode, setViewMode] = useState<'dag' | 'waves'>('dag')

  const selectedGoal = goals.find(g => g.id === selectedGoalId)
  const goalSubTasks = selectedGoal
    ? subTasks.filter(st => st.goal_id === selectedGoal.id)
    : []

  // 並列グループを計算（簡易版）
  const parallelGroups = calculateParallelGroups(goalSubTasks)

  return (
    <div className="space-y-6">
      {/* Goal Selector */}
      {goals.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-bold text-foreground">
              中目標を選択:
            </label>
            <select
              value={selectedGoalId ?? ''}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
            >
              {goals.map(goal => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          </div>
        </Card>
      )}

      {/* View Mode Toggle */}
      <div className="flex gap-2 pr-2">
        <Button
          variant={viewMode === 'dag' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('dag')}
        >
          DAG表示
        </Button>
        <Button
          variant={viewMode === 'waves' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('waves')}
        >
          ウーブ表示
        </Button>
      </div>

      {/* DAG Visualization */}
      {viewMode === 'dag' && (
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-bold">タスク依存関係図 (DAG)</h2>
          <DAGView subTasks={goalSubTasks} />
        </Card>
      )}

      {/* Waves Visualization */}
      {viewMode === 'waves' && (
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-bold">並列実行プラン</h2>
          <WavesView parallelGroups={parallelGroups} />
        </Card>
      )}
    </div>
  )
}

// DAG View Component
function DAGView({ subTasks }: { subTasks: SubTask[] }) {
  if (subTasks.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        表示するサブタスクがありません
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {subTasks.map((task, index) => {
          const isDone = task.is_done === 1
          const priority = getTaskPriority(task.label)
          const priorityColor = getPriorityColor(priority)

          return (
            <div key={task.id} className="mb-4">
              <div
                className={`flex items-center gap-3 rounded-lg border p-3 ${isDone
                    ? 'bg-muted/50 border-muted'
                    : `border-l-4 ${priorityColor}`
                  }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {task.sort_order}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {task.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ID: {task.id}
                  </p>
                </div>
                <div className="text-right">
                  {isDone ? (
                    <span className="text-xs text-green-600">✓ 完了</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">進行中</span>
                  )}
                </div>
              </div>
              {index < subTasks.length - 1 && (
                <div className="ml-5 flex items-center justify-center py-2">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <div className="h-px w-4 bg-border" />
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Waves View Component
function WavesView({ parallelGroups }: { parallelGroups: ParallelGroup[] }) {
  if (parallelGroups.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        並列グループがありません
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {parallelGroups.map((group, groupIndex) => (
        <div key={group.id} className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">{group.name}</h3>
              <p className="text-sm text-muted-foreground">
                {group.tasks.length}個のタスク
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                ~{group.estimatedMinutes}分
              </p>
              {group.canStartAfter.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  依存: {group.canStartAfter.join(', ')}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {group.tasks.map(task => {
              const isDone = task.is_done === 1
              const priority = getTaskPriority(task.label)

              return (
                <div
                  key={task.id}
                  className={`rounded border p-2 text-xs ${isDone
                      ? 'bg-muted/50 border-muted text-muted-foreground'
                      : `border-l-4 ${getPriorityBorderColor(priority)}`
                    }`}
                >
                  <p className="font-medium">{task.label.substring(0, 40)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isDone ? '✓ 完了' : '○ 未完了'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// Types
interface ParallelGroup {
  id: string
  name: string
  tasks: SubTask[]
  canStartAfter: string[]
  estimatedMinutes: number
  priority: 'critical' | 'high' | 'medium' | 'low'
}

// Helper Functions
function calculateParallelGroups(subTasks: SubTask[]): ParallelGroup[] {
  // 簡易版：sort_order に基づいてグループ化
  const groups: ParallelGroup[] = []
  const groupSize = 4 // 並列実行するタスク数

  for (let i = 0; i < subTasks.length; i += groupSize) {
    const tasksInGroup = subTasks.slice(i, i + groupSize)
    const priority = getGroupPriority(tasksInGroup)

    groups.push({
      id: `group_${i / groupSize}`,
      name: `並列グループ ${Math.floor(i / groupSize) + 1}`,
      tasks: tasksInGroup,
      canStartAfter: i > 0 ? [`group_${(i / groupSize) - 1}`] : [],
      estimatedMinutes: tasksInGroup.length * 15,
      priority,
    })
  }

  return groups
}

function getTaskPriority(label: string): 'critical' | 'high' | 'medium' | 'low' {
  if (label.includes('【最優先】')) return 'critical'
  if (label.includes('【即時】')) return 'high'
  if (label.includes('【中期】')) return 'medium'
  return 'low'
}

function getGroupPriority(tasks: SubTask[]): 'critical' | 'high' | 'medium' | 'low' {
  const priorities = tasks.map(t => getTaskPriority(t.label))
  if (priorities.includes('critical')) return 'critical'
  if (priorities.includes('high')) return 'high'
  if (priorities.includes('medium')) return 'medium'
  return 'low'
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return 'border-l-red-500'
    case 'high':
      return 'border-l-orange-500'
    case 'medium':
      return 'border-l-green-500'
    default:
      return 'border-l-blue-500'
  }
}

function getPriorityBorderColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return 'border-red-500'
    case 'high':
      return 'border-orange-500'
    case 'medium':
      return 'border-green-500'
    default:
      return 'border-blue-500'
  }
}
