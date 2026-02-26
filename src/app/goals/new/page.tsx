'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/auth-stub'
import { safeResponseJson } from '@/lib/safe-json'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AppNav } from '@/components/layout/app-nav'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface TimePrediction {
  predictedMinutes: number | null
  confidence: 'high' | 'medium' | 'low' | 'none'
  category: string | null
  dataPoints: number
  isFallback: boolean
  matchedKeywords: string[]
}

/**
 * Goal Creation Page (Client Component)
 *
 * Form for creating a new business goal/project.
 * Direct API integration without Refine dependency.
 */
export default function NewGoalPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timePrediction, setTimePrediction] = useState<TimePrediction | null>(null)
  const [isPredicting, setIsPredicting] = useState(false)

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      setError('目標タイトルを入力してください')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          deadline: formData.deadline || null,
        }),
      })

      if (!response.ok) {
        const errorData = await safeResponseJson<{ error?: string, needsUpgrade?: boolean }>(response)
        if (response.status === 403 && errorData?.needsUpgrade) {
          alert('【アップグレードのお知らせ】\n無料プランでの目標作成上限（3件）に達しました。\n目標を無制限に作成するには、Yarikiru Proへのアップグレードをお願いします！')
          router.push('/settings/billing')
          return
        }
        throw new Error(
          errorData?.error || `Failed to create goal (${response.status})`
        )
      }

      const result = await safeResponseJson<{ goal: { id: string } }>(response)
      if (!result?.goal?.id) {
        throw new Error('Invalid response from server')
      }
      router.push(`/goals/${result.goal.id}`)
    } catch (err) {
      console.error('Failed to create goal:', err)
      setError(err instanceof Error ? err.message : '目標の作成に失敗しました')
      setIsSubmitting(false)
    }
  }

  // タイトル入力時に時間予測を取得
  useEffect(() => {
    const fetchPrediction = async () => {
      if (formData.title.trim().length < 2) {
        setTimePrediction(null)
        return
      }

      setIsPredicting(true)
      try {
        const response = await fetch('/api/goals/new/time-prediction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: formData.title.trim() }),
        })

        if (response.ok) {
          const data = await response.json() as TimePrediction
          setTimePrediction(data)
        }
      } catch (err) {
        console.error('Failed to fetch time prediction:', err)
      } finally {
        setIsPredicting(false)
      }
    }

    const debounceTimer = setTimeout(fetchPrediction, 300)
    return () => clearTimeout(debounceTimer)
  }, [formData.title])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError(null)
  }

  // 時間フォーマット関数
  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}分`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) {
      return `${hours}時間`
    }
    return `${hours}時間${mins}分`
  }

  // 信頼度のラベル
  const confidenceLabel: Record<string, string> = {
    high: '高い',
    medium: '中',
    low: '低い',
    none: 'なし',
  }

  // 信頼度の色
  const confidenceColor: Record<string, string> = {
    high: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-gray-100 text-gray-800 border-gray-200',
    none: 'bg-gray-50 text-gray-600 border-gray-200',
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/goals"
            className="text-sm text-primary transition-colors duration-200 hover:opacity-80"
          >
            ← 目標一覧に戻る
          </Link>
        </div>

        <Card className="p-8">
          <h2 className="mb-6 text-2xl font-bold text-foreground">新しい目標を作成</h2>

          {error && (
            <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title">目標タイトル *</Label>
              <Input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                placeholder="例: 新製品のローンチ"
                required
                className="mt-1"
              />

              {/* AI時間予測表示 */}
              {timePrediction && timePrediction.predictedMinutes !== null && (
                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="font-semibold text-primary">
                        AI推定: {formatMinutes(timePrediction.predictedMinutes)}
                      </span>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${confidenceColor[timePrediction.confidence]}`}>
                      信頼度: {confidenceLabel[timePrediction.confidence]}
                    </span>
                  </div>

                  {timePrediction.category && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>カテゴリ: {timePrediction.category}</span>
                      {timePrediction.dataPoints > 0 && (
                        <span>• 基于データ {timePrediction.dataPoints} 件</span>
                      )}
                    </div>
                  )}

                  {timePrediction.matchedKeywords && timePrediction.matchedKeywords.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {timePrediction.matchedKeywords.map((keyword, i) => (
                        <span key={i} className="rounded bg-background px-1.5 py-0.5 text-xs text-muted-foreground">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {isPredicting && (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>AIが予測中...</span>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="目標の詳細と達成したいことを記述してください..."
                rows={4}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="deadline">期限</Label>
              <Input
                id="deadline"
                name="deadline"
                type="date"
                value={formData.deadline}
                onChange={handleChange}
                className="mt-1"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Link href="/goals" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  キャンセル
                </Button>
              </Link>
              <Button
                type="submit"
                variant="cta"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? '作成中...' : '目標を作成'}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  )
}
