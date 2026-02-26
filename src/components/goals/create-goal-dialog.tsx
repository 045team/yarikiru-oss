/**
 * CreateGoalDialog - 目標作成モーダルコンポーネント
 */
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CreateGoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateGoal: (data: CreateGoalData) => Promise<void>
}

export interface CreateGoalData {
  title: string
  description: string
  deadline: string | null
  priority: 'high' | 'medium' | 'low'
}

export function CreateGoalDialog({ open, onOpenChange, onCreateGoal }: CreateGoalDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) return

    setIsSubmitting(true)
    try {
      await onCreateGoal({
        title: title.trim(),
        description: description.trim(),
        deadline: deadline || null,
        priority,
      })

      // Reset form
      setTitle('')
      setDescription('')
      setDeadline('')
      setPriority('medium')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create goal:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open || !isSubmitting) {
      onOpenChange(open)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>新しい目標を作成</DialogTitle>
            <DialogDescription>
              やりきりたい目標を設定しましょう。15分単位のタスクに分解して達成します。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                目標のタイトル <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="例: Next.jsをマスターする"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">詳細な説明</Label>
              <Textarea
                id="description"
                placeholder="目標の詳細や、達成したいことを書いてください..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deadline">期限</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">優先度</Label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button variant="cta" type="submit" disabled={!title.trim() || isSubmitting}>
              {isSubmitting ? '作成中...' : '目標を作成'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
