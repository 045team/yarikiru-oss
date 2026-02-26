'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { safeResponseJson } from '@/lib/safe-json'

interface DecomposeButtonProps {
  goalId: string
  goalTitle: string
}

/**
 * AI Task Decomposition Button Component
 *
 * Triggers AI-powered task breakdown for a goal
 */
export function DecomposeButton({ goalId, goalTitle }: DecomposeButtonProps) {
  const router = useRouter()
  const [isDecomposing, setIsDecomposing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)

  const handleDecompose = async () => {
    if (!confirm(`「${goalTitle}」のタスク分解を開始します。よろしいですか？`)) {
      return
    }

    setIsDecomposing(true)
    setError(null)
    setProgress('AIがタスクを分析中...')

    try {
      const response = await fetch(`/api/goals/${goalId}/decompose`, {
        method: 'POST',
      })

      const data = await safeResponseJson<{
        error?: string
        tasksCreated?: number
      }>(response)

      if (!response.ok || !data) {
        if (data?.error === 'AI service not configured') {
          throw new Error('AIサービスが設定されていません。ANTHROPIC_API_KEY環境変数を設定してください。')
        }
        throw new Error(
          data?.error || `タスク分解に失敗しました (${response.status})`
        )
      }

      setProgress(`${data.tasksCreated ?? 0}個のタスクを作成しました`)

      // Redirect to refresh the page
      setTimeout(() => {
        router.refresh()
      }, 1000)
    } catch (err) {
      console.error('Failed to decompose:', err)
      setError(err instanceof Error ? err.message : 'タスク分解に失敗しました')
      setIsDecomposing(false)
      setProgress(null)
    }
  }

  return (
    <div className="flex flex-col items-center">
      {error && (
        <div className="mb-4 max-w-md rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {progress && (
        <div className="mb-4 max-w-md rounded-lg border border-primary/30 bg-primary/10 p-4">
          <p className="flex items-center gap-2 text-sm text-primary">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {progress}
          </p>
        </div>
      )}

      <Button
        variant="cta"
        onClick={handleDecompose}
        disabled={isDecomposing}
        size="lg"
        className="min-w-[200px]"
      >
        {isDecomposing ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            分解中...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AIでタスク分解
          </span>
        )}
      </Button>
    </div>
  )
}
