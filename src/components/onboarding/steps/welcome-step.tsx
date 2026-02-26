'use client'

import { Sparkles } from 'lucide-react'

interface WelcomeStepProps {
  onStart: () => void
  onSkip: () => void
}

export function WelcomeStep({ onStart, onSkip }: WelcomeStepProps) {
  return (
    <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ロゴ */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#d97756]">YARIKIRU</h1>
      </div>

      {/* メッセージ */}
      <h2 className="mb-4 text-2xl font-light text-gray-900 leading-relaxed">
        ようこそ、YARIKIRUへ！
      </h2>
      <p className="mb-8 text-gray-600 leading-relaxed">
        「目標を小さなタスクに分解して、やりきる」<br />
        それだけのシンプルなアプリです。
      </p>
      <p className="mb-8 text-sm text-gray-500">
        このチュートリアルでは、実際に目標を作成して体験します。
      </p>

      {/* アイコン */}
      <div className="mb-8 flex justify-center">
        <div className="rounded-full bg-[#d97756]/10 p-4">
          <Sparkles className="h-8 w-8 text-[#d97756]" />
        </div>
      </div>

      {/* ボタン */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded-full bg-[#d97756] px-8 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-[#c26243] hover:shadow-lg"
        >
          始める
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm font-light text-gray-400 hover:text-gray-600 transition-colors"
        >
          後で見る
        </button>
      </div>
    </div>
  )
}
