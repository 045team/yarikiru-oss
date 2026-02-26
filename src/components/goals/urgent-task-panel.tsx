/**
 * UrgentTaskPanel - 緊急タスク専用サイドパネル
 *
 * 「緊急タスクだけ横に割り込める機能」のためのUIコンポーネント。
 * スライドオーバー式で、緊急タスクのみを表示・操作できる。
 */
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertTriangle, X, Plus, Minus, Loader2 } from 'lucide-react'
import { TaskToggle } from './task-toggle'

interface UrgentTask {
  id: string
  title: string
  estimatedMinutes: number
  priority: 'high' | 'medium' | 'low'
  isCompleted: boolean
  isUrgent: boolean
  subtasks?: Array<{ title: string; completed: boolean }>
}

interface UrgentTaskPanelProps {
  goalId: string
}

export function UrgentTaskPanel({ goalId }: UrgentTaskPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tasks, setTasks] = useState<UrgentTask[]>([])
  const [loading, setLoading] = useState(false)

  // 緊急タスクを取得
  const fetchUrgentTasks = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/goals/${goalId}/urgent`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Failed to fetch urgent tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  // パネルが開くときにデータを取得
  useEffect(() => {
    if (isOpen) {
      fetchUrgentTasks()
    }
  }, [isOpen, goalId])

  // 緊急フラグを切り替え
  const toggleUrgent = async (taskId: string, currentState: boolean) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isUrgent: !currentState }),
      })

      if (res.ok) {
        // リストから削除（緊急解除の場合）または追加
        setTasks(prev => prev.filter(t => t.id !== taskId))
        if (tasks.length === 1) {
          setIsOpen(false)
        }
      }
    } catch (error) {
      console.error('Failed to toggle urgent:', error)
    }
  }

  const urgentCount = tasks.filter(t => !t.isCompleted).length
  const totalMinutes = tasks.filter(t => !t.isCompleted).reduce((sum, t) => sum + t.estimatedMinutes, 0)

  return (
    <>
      {/* トリガーボタン - 固定配置 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-lg bg-accent px-3 py-4 text-white shadow-lg transition-all duration-200 hover:pr-5 hover:bg-accent/90"
          aria-label="緊急タスクを開く"
        >
          <AlertTriangle className="h-5 w-5" />
          {urgentCount > 0 && (
            <span className="ml-2 text-sm font-bold">{urgentCount}</span>
          )}
        </button>
      )}

      {/* スライドオーバーパネル */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-sm transform bg-background shadow-xl transition-transform duration-300 ease-in-out sm:max-w-md ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* ヘッダー */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold text-foreground">
                緊急タスク
              </h2>
              {urgentCount > 0 && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">
                  {urgentCount}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="閉じる"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 内容 */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  緊急タスクはありません
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  タスクリストから緊急タスクを追加できます
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 合計時間表示 */}
                {totalMinutes > 0 && (
                  <div className="mb-4 rounded-lg bg-accent/10 px-4 py-2">
                    <p className="text-sm font-medium text-accent">
                      残り約 {Math.floor(totalMinutes / 60)}時間{totalMinutes % 60}分
                    </p>
                  </div>
                )}

                {tasks.map((task) => (
                  <Card
                    key={task.id}
                    className={`border-l-4 ${
                      task.isCompleted
                        ? 'border-l-muted opacity-60'
                        : 'border-l-accent'
                    }`}
                  >
                    <div className="p-3">
                      <div className="flex items-start gap-3">
                        <TaskToggle
                          taskId={task.id}
                          initialCompleted={task.isCompleted}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium ${
                              task.isCompleted
                                ? 'text-muted-foreground line-through'
                                : 'text-foreground'
                            }`}
                          >
                            {task.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {task.estimatedMinutes}分
                          </p>
                        </div>
                        <button
                          onClick={() => toggleUrgent(task.id, task.isUrgent)}
                          className="rounded p-1 text-accent transition-colors hover:bg-accent/10"
                          aria-label="緊急タスクを解除"
                          title="緊急タスクから解除"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* フッター */}
          <div className="border-t border-border px-6 py-4">
            <p className="text-xs text-muted-foreground">
              緊急タスクは通常のタスクリストより優先して表示されます
            </p>
          </div>
        </div>
      </div>

      {/* オーバーレイ */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

/**
 * UrgentTaskToggleButton - タスクリスト内で使用する緊急トグルボタン
 */
interface UrgentTaskToggleButtonProps {
  taskId: string
  isUrgent: boolean
  onToggle?: (taskId: string, newState: boolean) => void
}

export function UrgentTaskToggleButton({
  taskId,
  isUrgent,
  onToggle,
}: UrgentTaskToggleButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isUrgent: !isUrgent }),
      })

      if (res.ok) {
        onToggle?.(taskId, !isUrgent)
      }
    } catch (error) {
      console.error('Failed to toggle urgent:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`rounded p-1.5 transition-colors ${
        isUrgent
          ? 'bg-accent text-white hover:bg-accent/90'
          : 'text-muted-foreground hover:bg-accent/10 hover:text-accent'
      }`}
      aria-label={isUrgent ? '緊急タスクを解除' : '緊急タスクに追加'}
      title={isUrgent ? '緊急タスクから解除' : '緊急タスクに追加'}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isUrgent ? (
        <Minus className="h-4 w-4" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
    </button>
  )
}
