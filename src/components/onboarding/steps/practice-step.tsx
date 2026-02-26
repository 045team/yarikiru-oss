'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { fireTaskEffect } from '@/lib/utils/completion-effects'

interface SubTask {
  id: string
  label: string
  isDone: boolean
  sort_order: number
}

interface Goal {
  id: string
  title: string
  subTasks: SubTask[]
}

interface GoalPlan {
  title: string
  subTasks: Array<{ label: string; estimatedMinutes: number }>
}

interface PracticeStepProps {
  goalTitle: string
  goalPlan: GoalPlan | null
  goalId: string | null
  onComplete: () => void
  onBack: () => void
}

export function PracticeStep({
  goalTitle,
  goalPlan,
  goalId,
  onComplete,
  onBack,
}: PracticeStepProps) {
  const [completed, setCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [goal, setGoal] = useState<Goal | null>(null)

  // 目標データを取得
  useEffect(() => {
    if (goalId) {
      const fetchGoal = async () => {
        try {
          // プロジェクト一覧から目標を取得
          const res = await fetch('/api/projects', { credentials: 'same-origin' })
          if (!res.ok) return

          const data = await res.json()
          const projects = data.projects || []

          // 目標を探す
          for (const project of projects) {
            const foundGoal = project.goals?.find((g: Goal) => g.id === goalId)
            if (foundGoal) {
              setGoal(foundGoal)
              break
            }
          }
        } catch (e) {
          console.error('Failed to fetch goal:', e)
        } finally {
          setLoading(false)
        }
      }

      fetchGoal()
    } else {
      // 目標IDがない場合はプランから表示
      setGoal({
        id: 'temp',
        title: goalTitle,
        subTasks: (goalPlan?.subTasks || []).map((st, idx) => ({
          id: `temp_${idx}`,
          label: st.label,
          isDone: false,
          sort_order: idx + 1,
        })),
      })
      setLoading(false)
    }
  }, [goalId, goalTitle, goalPlan])

  const handleToggleTask = async (subTaskId: string, currentIsDone: boolean) => {
    if (!goal) return

    // オンボーディング用モック：実際にはDB更新せず、UIのみ更新
    // TODO: 実際の実装ではここでAPIを呼び出す

    // ローカル状態を更新
    setGoal((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        subTasks: prev.subTasks.map((st) =>
          st.id === subTaskId ? { ...st, isDone: !currentIsDone } : st
        ),
      }
    })

    // 最初のタスク完了時
    const firstTask = goal.subTasks[0]
    if (subTaskId === firstTask?.id && !currentIsDone && !completed) {
      fireTaskEffect(new MouseEvent('click'))
      setCompleted(true)
    }
  }

  const displayGoal = goal || { title: goalTitle, subTasks: [] }
  const allCompleted = displayGoal.subTasks.length > 0 && displayGoal.subTasks.every(st => st.isDone)

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ヘッダー */}
      <div className="mb-6 text-center">
        <h2 className="mb-2 text-xl font-light text-gray-900">
          Step 3/3: 最初のタスクを完了してみましょう
        </h2>
        <p className="text-sm text-gray-500">
          ☑ 上の「{displayGoal.subTasks[0]?.label || '最初のタスク'}」をクリックして完了してみてください
        </p>
      </div>

      {/* ローディング */}
      {loading && (
        <div className="mb-6 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#d97756]" />
          <p className="mt-2 text-sm text-gray-500">読み込み中...</p>
        </div>
      )}

      {/* タスクリスト */}
      {!loading && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">{displayGoal.title}</h3>
          <div className="space-y-3">
            {displayGoal.subTasks.map((subTask) => (
              <button
                key={subTask.id}
                type="button"
                onClick={() => handleToggleTask(subTask.id, subTask.isDone)}
                className="flex w-full items-center gap-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg p-2 transition-colors"
              >
                {subTask.isDone ? (
                  <CheckCircle2 size={16} className="text-[#d97756]" />
                ) : (
                  <Circle size={16} className="text-gray-300" />
                )}
                <span className={subTask.isDone ? 'line-through text-gray-400' : ''}>
                  {subTask.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 完了メッセージ */}
      {completed && (
        <div className="mb-6 rounded-xl bg-green-50 p-4 text-center animate-in fade-in duration-300">
          <p className="text-sm font-medium text-green-700">
            🎉 素晴らしい！タスクを完了しました！
          </p>
        </div>
      )}

      {/* ボタン */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-light text-gray-400 hover:text-gray-600 transition-colors"
        >
          戻る
        </button>
        <button
          type="button"
          onClick={onComplete}
          disabled={!completed}
          className="rounded-full bg-[#d97756] px-6 py-2.5 text-sm font-light uppercase tracking-widest text-white transition-all hover:bg-[#c26243] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          次へ
        </button>
      </div>
    </div>
  )
}
