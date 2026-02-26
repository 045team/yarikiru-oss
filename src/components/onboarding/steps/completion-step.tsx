'use client'

import { Sparkles } from 'lucide-react'

interface CompletionStepProps {
  onComplete: () => void
  onCreateAnother: () => void
}

export function CompletionStep({ onComplete, onCreateAnother }: CompletionStepProps) {
  return (
    <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* お祝いアイコン */}
      <div className="mb-6 flex justify-center">
        <div className="rounded-full bg-[#d97756]/10 p-6">
          <Sparkles className="h-12 w-12 text-[#d97756]" />
        </div>
      </div>

      {/* メッセージ */}
      <h2 className="mb-4 text-2xl font-bold text-gray-900 leading-relaxed">
        🎉 おめでとうございます！
      </h2>
      <p className="mb-8 text-gray-600 leading-relaxed">
        最初のタスクを完了しました。<br />
        YARIKIRUを使い始める準備ができました！
      </p>

      {/* 次のアクション */}
      <div className="mb-8">
        <p className="mb-4 text-sm text-gray-500">次はどうしますか？</p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onCreateAnother}
            className="w-full rounded-full border-2 border-[#d97756] px-6 py-3 text-base font-semibold text-[#d97756] transition-all hover:bg-[#d97756] hover:text-white"
          >
            新しい目標を作成する
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="w-full rounded-full bg-[#d97756] px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-[#c26243] hover:shadow-lg"
          >
            ダッシュボードへ
          </button>
        </div>
      </div>

      {/* ヒント */}
      <div className="rounded-xl bg-gray-50 p-4 text-left">
        <p className="text-xs text-gray-500">
          💡 ヒント: 今後はダッシュボードから自由に目標を作成・管理できます。
        </p>
      </div>
    </div>
  )
}
