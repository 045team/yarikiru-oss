'use client'

import { useState } from 'react'
import { X, Clock, Sparkles, TrendingUp, CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useGlossary } from '@/contexts/display-context'

interface SubTaskTemplate {
  label: string
  estimatedMinutes: number
}

interface ParallelGroup {
  id: string
  name: string
  tasks: SubTaskTemplate[]
  estimatedMinutes: number
  canStartAfter: string[]
}

interface GoalPlan {
  title: string
  projectId: string
  description?: string
  estimatedMinutes: number | null
  confidence: string
  category: string | null
  subTasks: SubTaskTemplate[]
  parallelGroups: ParallelGroup[]
}

interface PlanModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateGoal: (plan: GoalPlan) => void
}

export function PlanModal({ isOpen, onClose, onCreateGoal }: PlanModalProps) {
  const { getDisplayTerm } = useGlossary()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<GoalPlan | null>(null)

  if (!isOpen) return null

  const handlePlan = async () => {
    if (!title.trim()) return

    setLoading(true)
    try {
      const res = await fetch('/api/goals/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ title, description: description || undefined }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || '計画の作成に失敗しました')
      }

      const data = await res.json()
      setPlan(data.plan)
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGoal = () => {
    if (!plan) return
    onCreateGoal(plan)
    handleClose()
  }

  const handleClose = () => {
    setTitle('')
    setDescription('')
    setPlan(null)
    onClose()
  }

  const confidenceLabel: Record<string, string> = {
    high: '高い',
    medium: '中',
    low: '低い',
    none: 'なし',
  }

  const confidenceColor: Record<string, string> = {
    high: 'text-green-600 bg-green-50',
    medium: 'text-yellow-600 bg-yellow-50',
    low: 'text-orange-600 bg-orange-50',
    none: 'text-gray-600 bg-gray-50',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        <Card className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="text-[#d97756]" size={20} />
              新しい{getDisplayTerm('目標', 'Goal')}の計画
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

          {/* Input */}
          {!plan ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {getDisplayTerm('目標', 'Goal')}のタイトル
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: ユーザー認証機能を実装する"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#d97756] focus:outline-none focus:ring-1 focus:ring-[#d97756]/20"
                  onKeyDown={(e) => e.key === 'Enter' && title.trim() && handlePlan()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  説明（オプション）
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ゴールの詳細な説明や、達成基準などを記入してください"
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#d97756] focus:outline-none focus:ring-1 focus:ring-[#d97756]/20"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="rounded-full"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handlePlan}
                  disabled={!title.trim() || loading}
                  className="rounded-full bg-[#d97756] hover:bg-[#d97756]/90"
                >
                  {loading ? '分析中...' : '計画を作成'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Plan Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-2">{plan.title}</h3>
                {plan.description && (
                  <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                )}

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock size={14} className="text-gray-400" />
                    <span className="text-gray-700">
                      推定: {plan.estimatedMinutes ? `${Math.round(plan.estimatedMinutes / 60)}時間${plan.estimatedMinutes % 60}分` : '-'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp size={14} className="text-gray-400" />
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${confidenceColor[plan.confidence as keyof typeof confidenceColor] || 'text-gray-600 bg-gray-100'}`}>
                      確信度: {confidenceLabel[plan.confidence as keyof typeof confidenceLabel] || '-'}
                    </span>
                  </div>
                  {plan.category && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-xs">
                      {plan.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Subtasks */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2">
                  {getDisplayTerm('タスク', 'Task')} ({plan.subTasks.length}件)
                </h4>
                <div className="space-y-1">
                  {plan.subTasks.map((st, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded hover:bg-gray-50">
                      <Circle size={14} className="text-gray-300 shrink-0" />
                      <span className="flex-1 text-gray-700">{st.label}</span>
                      <span className="text-xs text-gray-400">{st.estimatedMinutes}分</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parallel Plan */}
              {plan.parallelGroups.length > 1 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-2">
                    並列実行プラン
                  </h4>
                  <div className="space-y-2">
                    {plan.parallelGroups.map((group) => (
                      <div key={group.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{group.name}</span>
                          <span className="text-xs text-gray-400">{group.estimatedMinutes}分</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {group.tasks.map(t => t.label).join(' + ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setPlan(null)}
                  className="rounded-full"
                >
                  戻る
                </Button>
                <Button
                  onClick={handleCreateGoal}
                  className="rounded-full bg-[#d97756] hover:bg-[#d97756]/90"
                >
                  この計画で{getDisplayTerm('目標', 'Goal')}を作成
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
