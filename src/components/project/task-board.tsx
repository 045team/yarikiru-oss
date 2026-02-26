'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProjectTask, ProjectTaskStatus } from '@/types/turso'

interface TaskBoardProps {
  projectId: string
  tasks: ProjectTask[]
  onTaskCreate: (task: any) => Promise<void>
  onTaskUpdate: (taskId: string, data: any) => Promise<void>
  onTaskDelete: (taskId: string) => Promise<void>
}

interface NewTaskData {
  title: string
  priority: 1 | 2 | 3
}

interface TaskBoardProps {
  projectId: string
  tasks: ProjectTask[]
  onTaskCreate: (task: any) => Promise<void>
  onTaskUpdate: (taskId: string, data: any) => Promise<void>
  onTaskDelete: (taskId: string) => Promise<void>
}

const statusConfig: {
  status: ProjectTaskStatus
  label: string
  color: string
}[] = [
  { status: 'todo', label: '未着手', color: 'bg-slate-100 border-slate-300' },
  { status: 'in_progress', label: '進行中', color: 'bg-blue-100 border-blue-300' },
  { status: 'done', label: '完了', color: 'bg-green-100 border-green-300' },
  { status: 'blocked', label: 'ブロック', color: 'bg-red-100 border-red-300' },
]

const priorityConfig: Record<string, { label: string; color: string }> = {
  '1': { label: '高', color: 'text-red-600' },
  '2': { label: '中', color: 'text-yellow-600' },
  '3': { label: '低', color: 'text-slate-600' },
}

export function TaskBoard({
  projectId,
  tasks,
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
}: TaskBoardProps) {
  const [selectedStatus, setSelectedStatus] = useState<ProjectTaskStatus | 'all'>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<1 | 2 | 3>(2)

  const filteredTasks = tasks.filter(
    (t) => selectedStatus === 'all' || t.status === selectedStatus
  )

  const onSubmit = async () => {
    await onTaskCreate({
      project_id: projectId,
      title: newTaskTitle,
      status: 'todo',
      priority: newTaskPriority,
    })
    setIsCreateDialogOpen(false)
    setNewTaskTitle('')
    setNewTaskPriority(2)
  }

  return (
    <div className="space-y-4">
      {/* フィルターと作成ボタン */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {statusConfig.map((config) => (
            <Button
              key={config.status}
              size="sm"
              variant={selectedStatus === config.status ? 'default' : 'outline'}
              onClick={() => setSelectedStatus(config.status)}
            >
              {config.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant={selectedStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedStatus('all')}
          >
            すべて
          </Button>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>タスク作成</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新規タスク</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">タスク名</Label>
                <Input
                  id="title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="priority">優先度</Label>
                <Select
                  value={String(newTaskPriority)}
                  onValueChange={(v) => setNewTaskPriority(Number(v) as 1 | 2 | 3)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">高</SelectItem>
                    <SelectItem value="2">中</SelectItem>
                    <SelectItem value="3">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  キャンセル
                </Button>
                <Button type="button" onClick={onSubmit}>
                  作成
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* タスク一覧 */}
      <div className="space-y-2">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className={`p-4 rounded-lg border ${
              statusConfig.find((s) => s.status === task.status)?.color
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{task.title}</h3>
                  <span
                    className={`text-sm font-medium ${
                      priorityConfig[String(task.priority ?? 2)].color
                    }`}
                  >
                    {priorityConfig[task.priority].label}
                  </span>
                </div>
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {task.description}
                  </p>
                )}
                {task.due_date && (
                  <div className="text-xs text-muted-foreground mt-2">
                    期限: {new Date(task.due_date).toLocaleDateString('ja-JP')}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost">
                  編集
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => task.id && onTaskDelete(task.id)}
                >
                  削除
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
