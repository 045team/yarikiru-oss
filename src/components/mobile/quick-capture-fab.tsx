'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X, Lightbulb, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickCaptureFabProps {
  onCapture?: (text: string) => Promise<void>
  disabled?: boolean
}

/**
 * モバイル向けクイックキャプチャFAB（Floating Action Button）
 *
 * - 思いつきを素早く登録
 * - テキスト入力またはQuick Capture
 * - アニメーション付き展開/折りたたみ
 * - E2EE対応（サーバー側で暗号化）
 */
export function QuickCaptureFab({ onCapture, disabled = false }: QuickCaptureFabProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 開くときにフォーカス
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!text.trim() || !onCapture || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onCapture(text.trim())
      setText('')
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to capture idea:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 md:hidden">
      {/* 展開時の入力パネル */}
      {isOpen && (
        <div
          className={cn(
            'absolute bottom-16 right-0 w-72 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden transition-all duration-300',
            isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
          )}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#faf9f5] to-[#f5f4f0] border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-[#d97756]" />
              <span className="text-sm font-medium text-gray-700">思いつきをキャプチャー</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
            >
              <X size={16} />
            </button>
          </div>

          {/* 入力エリア */}
          <div className="p-4">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ふと思いついたことをメモ..."
              className="w-full h-32 p-3 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#d97756]/20 focus:border-[#d97756]"
              disabled={isSubmitting}
            />

            {/* ヒント */}
            <p className="text-[10px] text-gray-400 mt-2">
              {'⌘⏎ で送信 • Esc でキャンセル'}
            </p>

            {/* 送信ボタン */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!text.trim() || isSubmitting || disabled}
              className={cn(
                'w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all',
                (!text.trim() || isSubmitting || disabled)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#d97756] to-[#b45309] text-white hover:shadow-lg'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Send size={16} />
                  キャプチャー
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* FABボタン */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300',
          isOpen
            ? 'bg-gray-800 hover:bg-gray-700'
            : 'bg-gradient-to-r from-[#d97756] to-[#b45309] hover:shadow-xl',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-label={isOpen ? '閉じる' : '思いつきをキャプチャー'}
      >
        {isOpen ? (
          <X size={24} className="text-white" />
        ) : (
          <Plus size={24} className="text-white" />
        )}
      </button>

      {/* パルスアニメーション（閉じている時のみ） */}
      {!isOpen && (
        <>
          <span className="absolute inset-0 rounded-full bg-[#d97756] opacity-20 animate-ping" />
          <span className="absolute inset-0 rounded-full bg-[#d97756] opacity-10 animate-pulse" />
        </>
      )}
    </div>
  )
}
