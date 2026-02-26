'use client'

import { useState, useRef, useCallback } from 'react'
import { Target, Calendar, BookOpen, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type TabType = 'goals' | 'learning'

interface TabSwipeNavProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

interface TabConfig {
  id: TabType
  label: string
  icon: React.ReactNode
}

const TABS: TabConfig[] = [
  { id: 'goals', label: '目標', icon: <Target size={16} /> },
  { id: 'learning', label: '学習', icon: <BookOpen size={16} /> },
]

/**
 * モバイル向けタブスワイプナビゲーション
 *
 * - 横スワイプでタブを切り替え
 * - インジケーターで現在位置を表示
 * - タッチ操作に最適化
 */
export function TabSwipeNav({ activeTab, onTabChange }: TabSwipeNavProps) {
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const currentIndex = TABS.findIndex(tab => tab.id === activeTab)

  // スワイプ操作ハンドラー
  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    setDragStart(clientX)
    setIsDragging(true)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || dragStart === null) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const diff = clientX - dragStart
    setDragOffset(diff)
  }, [isDragging, dragStart])

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || dragStart === null) return

    const threshold = 60 // スワイプ判定の閾値（px）

    if (dragOffset > threshold && currentIndex > 0) {
      // 右スワイプ: 前のタブ
      onTabChange(TABS[currentIndex - 1].id)
    } else if (dragOffset < -threshold && currentIndex < TABS.length - 1) {
      // 左スワイプ: 次のタブ
      onTabChange(TABS[currentIndex + 1].id)
    }

    setDragStart(null)
    setDragOffset(0)
    setIsDragging(false)
  }, [isDragging, dragStart, dragOffset, currentIndex, onTabChange])

  return (
    <div className="md:hidden bg-white border-b border-gray-200">
      {/* スワイプ可能なタブエリア */}
      <div
        className="relative select-none touch-pan-y px-4 py-2"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        {/* タブインジケーター */}
        <div className="flex items-center justify-between mb-3">
          {TABS.map((tab, index) => {
            const isActive = index === currentIndex
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex-1 flex flex-col items-center space-y-1 transition-all',
                  isActive ? 'opacity-100' : 'opacity-50'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                    isActive
                      ? 'bg-[#d97756] text-white'
                      : 'bg-gray-100 text-gray-400'
                  )}
                >
                  {tab.icon}
                </div>
                <span className={cn(
                  'text-[10px] font-medium transition-all',
                  isActive ? 'text-[#d97756]' : 'text-gray-400'
                )}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* アクティブタブインジケーター */}
        <div className="relative h-0.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-[#d97756] transition-all duration-300 ease-out"
            style={{
              left: `${(currentIndex / (TABS.length - 1)) * 100}%`,
              width: `${100 / TABS.length}%`,
              transform: 'translateX(-50%)',
            }}
          />
        </div>

        {/* スワイプヒント */}
        {dragOffset === 0 && (
          <div className="text-center mt-2">
            <p className="text-[10px] text-gray-400">
              {'← スワイプしてタブ切り替え →'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
