'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface GoalPlan {
  title: string
  projectId: string
  description?: string
  estimatedMinutes: number | null
  confidence: string
  category: string | null
  subTasks: Array<{ label: string; estimatedMinutes: number }>
  parallelGroups: any[]
}

interface AIDemoStepProps {
  goalTitle: string
  onPlanCreated: (plan: GoalPlan) => void
  onGoalCreated: (goalId: string) => void
  onCreateGoal: (plan: GoalPlan) => Promise<void>
  onBack: () => void
}

export function AIDemoStep({
  goalTitle,
  onPlanCreated,
  onGoalCreated,
  onCreateGoal,
  onBack,
}: AIDemoStepProps) {
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<GoalPlan | null>(null)
  const [creating, setCreating] = useState(false)

  // AI分解を実行（モック）
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        // 少し遅延をさせて「AIが考えてる」感を出す
        await new Promise(resolve => setTimeout(resolve, 1500))

        // オンボーディング用のモックプラン
        const mockPlan: GoalPlan = {
          title: goalTitle,
          projectId: 'tutorial',
          estimatedMinutes: 90,
          confidence: 'high',
          category: 'learning',
          subTasks: [
            { label: '計画を立てる', estimatedMinutes: 15 },
            { label: '準備をする', estimatedMinutes: 20 },
            { label: '実行に取り掛かる', estimatedMinutes: 30 },
            { label: '振り返る', estimatedMinutes: 15 },
            { label: '次のアクションを決める', estimatedMinutes: 10 },
          ],
          parallelGroups: [],
        }

        setPlan(mockPlan)
        onPlanCreated(mockPlan)
      } catch (e) {
        console.error('AI分解エラー:', e)
        // フォールバック: 最小限のタスク
        const fallbackPlan: GoalPlan = {
          title: goalTitle,
          projectId: 'tutorial',
          estimatedMinutes: 60,
          confidence: 'low',
          category: null,
          subTasks: [
            { label: '最初のステップ', estimatedMinutes: 30 },
            { label: '次のステップ', estimatedMinutes: 30 },
          ],
          parallelGroups: [],
        }
        setPlan(fallbackPlan)
        onPlanCreated(fallbackPlan)
      } finally {
        setLoading(false)
      }
    }

    fetchPlan()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // マウント時のみ実行

  const handleCreateGoal = async () => {
    if (!plan) return

    setCreating(true)
    try {
      // オンボーディング用モック：実際にはDBに保存せず、完了として進む
      // TODO: 実際の実装ではここでAPIを呼び出す

      // モック用のgoalIdを生成
      const mockGoalId = crypto.randomUUID()

      // 少し遅延をさせて「作成中」感を出す
      await new Promise(resolve => setTimeout(resolve, 1000))

      onGoalCreated(mockGoalId)
    } catch (e) {
      console.error(e)
      alert('エラーが発生しました。もう一度お試しください。')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ヘッダー */}
      <div className="mb-6 text-center">
        <h2 className="mb-2 text-xl font-light text-gray-900">
          {loading ? 'AIがタスクを分解中...' : 'タスク分解完了！'}
        </h2>
        <p className="text-sm text-gray-500">Step 2/3</p>
      </div>

      {/* ローディング */}
      {loading && (
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#d97756]" />
          </div>
          <p className="text-sm text-gray-600">「{goalTitle}」を分解中...</p>
        </div>
      )}

      {/* 分解結果 */}
      {!loading && plan && (
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">{plan.title}</h3>
          <div className="space-y-2">
            {plan.subTasks.map((task, index) => (
              <div key={index} className="flex items-center gap-3 text-sm text-gray-700">
                <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                <span>{task.label}</span>
                <span className="ml-auto text-xs text-gray-400">{task.estimatedMinutes}分</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              💡 これがあなたの「小タスク」です！クリックして進捗を管理できます。
            </p>
          </div>
        </div>
      )}

      {/* ボタン */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-light text-gray-400 hover:text-gray-600 transition-colors"
          disabled={loading || creating}
        >
          戻る
        </button>
        <button
          type="button"
          onClick={handleCreateGoal}
          disabled={loading || creating}
          className="rounded-full bg-[#d97756] px-6 py-2.5 text-sm font-light uppercase tracking-widest text-white transition-all hover:bg-[#c26243] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? '作成中...' : 'この計画で作成'}
        </button>
      </div>
    </div>
  )
}
