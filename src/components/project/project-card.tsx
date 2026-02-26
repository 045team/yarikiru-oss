'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CopyablePrompt } from '@/components/ui/copyable-prompt'
import type { Project } from '@/types/turso'

interface ProjectCardProps {
  project: Project
  taskCount: number
  completedTaskCount: number
  onView: (projectId: string) => void
  onEdit?: (project: Project) => void
  onDelete?: (projectId: string) => void
}

const statusConfig: Record<
  Project['status'],
  { label: string; color: string }
> = {
  planning: { label: '計画中', color: 'bg-slate-100 text-slate-700' },
  active: { label: '進行中', color: 'bg-blue-100 text-blue-700' },
  on_hold: { label: '一時停止', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: '完了', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'キャンセル', color: 'bg-red-100 text-red-700' },
}

export function ProjectCard({
  project,
  taskCount,
  completedTaskCount,
  onView,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  const config = statusConfig[project.status]
  const progress = taskCount > 0 ? (completedTaskCount / taskCount) * 100 : 0

  // 期間計算
  const isOverdue =
    project.target_end_date &&
    new Date(project.target_end_date) < new Date() &&
    project.status !== 'completed'

  return (
    <Card className={`hover:shadow-md transition-shadow ${isOverdue ? 'border-red-300' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{project.name}</CardTitle>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {project.description}
              </p>
            )}
          </div>
          <Badge className={config.color}>{config.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 進捗バー */}
        {taskCount > 0 && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>タスク進捗</span>
              <span>{completedTaskCount}/{taskCount}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* 期間情報 */}
        {project.target_end_date && (
          <div className="text-sm">
            <div className="text-muted-foreground">目標終了日</div>
            <div className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
              {new Date(project.target_end_date).toLocaleDateString('ja-JP')}
              {isOverdue && ' < 遅延'}
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex justify-end gap-2">
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(project)}
            >
              編集
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => project.id && onView(project.id)}
          >
            詳細を見る
          </Button>
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => project.id && onDelete(project.id)}
            >
              削除
            </Button>
          )}
        </div>

        {/* Copy command for AI Agent */}
        {project.id && (
          <CopyablePrompt
            prompt={`/yarikiru:work-phase ${project.id}`}
            label="AI作業フェーズ開始コマンド"
          />
        )}
      </CardContent>
    </Card>
  )
}
