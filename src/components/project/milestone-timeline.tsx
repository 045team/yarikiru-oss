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
import type { Milestone, MilestoneInsert } from '@/types/turso'

interface MilestoneTimelineProps {
  milestones: Milestone[]
  onCreate: (milestone: MilestoneInsert) => Promise<void>
  onUpdate: (milestoneId: string, data: any) => Promise<void>
}

const statusConfig: {
  status: Milestone['status']
  label: string
  color: string
}[] = [
  { status: 'pending', label: '未開始', color: 'bg-slate-200 text-slate-700' },
  { status: 'in_progress', label: '進行中', color: 'bg-blue-500 text-white' },
  { status: 'completed', label: '完了', color: 'bg-green-500 text-white' },
  { status: 'delayed', label: '遅延', color: 'bg-red-500 text-white' },
]

export function MilestoneTimeline({
  milestones,
  onCreate,
  onUpdate,
}: MilestoneTimelineProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [targetDate, setTargetDate] = useState('')

  const sortedMilestones = [...milestones].sort(
    (a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime()
  )

  const handleSubmit = async () => {
    const milestoneData: MilestoneInsert = {
      project_id: '', // Will be set by parent
      name,
      target_date: new Date(targetDate).toISOString(),
      status: 'pending',
    }
    await onCreate(milestoneData)
    setIsCreateOpen(false)
    setName('')
    setTargetDate('')
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">マイルストーン</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">追加</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>マイルストーン追加</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">名前</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="targetDate">目標日</Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  キャンセル
                </Button>
                <Button type="button" onClick={handleSubmit}>
                  追加
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        {/* 縦線 */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

        <div className="space-y-6">
          {sortedMilestones.map((milestone) => {
            const config = statusConfig.find((s) => s.status === milestone.status)
            const isOverdue =
              new Date(milestone.target_date) < new Date() &&
              milestone.status === 'pending'

            return (
              <div key={milestone.id} className="relative pl-10">
                {/* ノード */}
                <div
                  className={`absolute left-2.5 w-3 h-3 rounded-full ${
                    isOverdue ? 'bg-red-500' : config?.color || 'bg-slate-300'
                  }`}
                />

                <div className="bg-white rounded-lg p-4 border">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{milestone.name}</h3>
                      <div className="text-sm text-muted-foreground">
                        目標: {new Date(milestone.target_date).toLocaleDateString('ja-JP')}
                      </div>
                      {milestone.description && (
                        <p className="text-sm mt-1">{milestone.description}</p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isOverdue
                          ? 'bg-red-100 text-red-700'
                          : config?.color || 'bg-slate-100'
                      }`}
                    >
                      {isOverdue ? '遅延' : config?.label}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {sortedMilestones.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          マイルストーンがありません。追加ボタンから作成してください。
        </div>
      )}
    </div>
  )
}
