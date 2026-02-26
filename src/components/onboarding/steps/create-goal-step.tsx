'use client'

import { useState } from 'react'
import { Lightbulb } from 'lucide-react'

interface CreateGoalStepProps {
  onNext: (title: string) => void
  onBack: () => void
}

const examples = [
  'Next.jsのブログを作る',
  'Reactの基礎を学ぶ',
  'ポートフォリオサイトを作る',
]

export function CreateGoalStep({ onNext, onBack }: CreateGoalStepProps) {
  const [title, setTitle] = useState('')
  const [example] = useState(examples[Math.floor(Math.random() * examples.length)])
  const [error, setError] = useState('')

  const handleSubmit = () => {
    if (!title.trim()) {
      setError('目標を入力してください')
      return
    }
    if (title.trim().length < 2) {
      setError('2文字以上で入力してください')
      return
    }
    setError('')
    onNext(title.trim())
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ヘッダー */}
      <div className="mb-6 text-center">
        <h2 className="mb-2 text-xl font-light text-gray-900">
          Step 1/3: 最初の目標を作成
        </h2>
        <p className="text-sm text-gray-500">何をやりたいですか？</p>
      </div>

      {/* 入力フォーム */}
      <div className="mb-6">
        <input
          type="text"
          autoFocus
          className={`w-full rounded-2xl border bg-white p-4 text-base font-light text-gray-700 placeholder-gray-300 focus:outline-none transition-colors ${
            error
              ? 'border-red-300 focus:border-red-500'
              : 'border-gray-200 focus:border-[#d97756]'
          }`}
          placeholder={`例: ${example}`}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSubmit()
            }
          }}
        />
        {error && (
          <p className="mt-2 text-xs text-red-500">{error}</p>
        )}
      </div>

      {/* ヒント */}
      <div className="mb-8 rounded-xl bg-[#d97756]/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#d97756]">
          <Lightbulb size={16} />
          <span>ヒント</span>
        </div>
        <ul className="space-y-1 text-xs text-gray-600">
          <li>・大きな目標でOK（例：アプリを作る）</li>
          <li>・「〇〇を学ぶ」「〇〇を実装する」など</li>
        </ul>
      </div>

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
          onClick={handleSubmit}
          disabled={!title.trim()}
          className="rounded-full bg-[#d97756] px-6 py-2.5 text-sm font-light uppercase tracking-widest text-white transition-all hover:bg-[#c26243] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          次へ
        </button>
      </div>
    </div>
  )
}
