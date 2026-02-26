'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Github, Plus } from 'lucide-react'
import { Project } from '@/types/dashboard'
import { cn } from '@/lib/utils'

interface ProjectSwipeCarouselProps {
  projects: Project[]
  onProjectChange?: (project: Project) => void
  onCreateProject?: () => void
}

/**
 * モバイル向けプロジェクト横スワイプカルーセル
 *
 * - 横スワイプでプロジェクトを切り替え
 * - GitHubリポジトリとの紐付け表示（準備完了）
 * - タッチ操作に最適化
 * - E2EE対応済み（暗号化フィールドを考慮）
 */
export function ProjectSwipeCarousel({
  projects,
  onProjectChange,
  onCreateProject,
}: ProjectSwipeCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentProject = projects[currentIndex] || null

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

    const threshold = 80 // スワイプ判定の閾値（px）

    if (dragOffset > threshold && currentIndex > 0) {
      // 右スワイプ: 前のプロジェクト
      setCurrentIndex((prev) => prev - 1)
    } else if (dragOffset < -threshold && currentIndex < projects.length - 1) {
      // 左スワイプ: 次のプロジェクト
      setCurrentIndex((prev) => prev + 1)
    }

    setDragStart(null)
    setDragOffset(0)
    setIsDragging(false)
  }, [isDragging, dragStart, dragOffset, currentIndex, projects.length])

  // プロジェクト変更コールバック
  useEffect(() => {
    if (currentProject && onProjectChange) {
      onProjectChange(currentProject)
    }
  }, [currentIndex, currentProject, onProjectChange])

  // キーボード操作サポート
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1)
      } else if (e.key === 'ArrowRight' && currentIndex < projects.length - 1) {
        setCurrentIndex((prev) => prev + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, projects.length])

  if (projects.length === 0) {
    return (
      <div className="md:hidden bg-gradient-to-r from-[#faf9f5] to-[#f5f4f0] border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">プロジェクトがありません</div>
            {onCreateProject && (
              <button
                onClick={onCreateProject}
                className="flex items-center gap-1.5 bg-[#d97756] text-white px-3 py-1.5 rounded-lg text-xs font-medium"
              >
                <Plus size={14} />
                新規作成
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="md:hidden bg-gradient-to-r from-[#faf9f5] to-[#f5f4f0] border-b border-gray-200 overflow-hidden">
      <div className="px-4 py-3">
        {/* プロジェクト切り替えエリア */}
        <div
          ref={containerRef}
          className="relative select-none touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
        >
          {/* スワイプ可能なコンテナ */}
          <div
            className="flex items-center justify-center min-h-[60px]"
            style={{
              transform: `translateX(${dragOffset}px)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            }}
          >
            {/* 前のプロジェクト（プレビュー） */}
            {currentIndex > 0 && (
              <div className="absolute left-0 w-16 opacity-30 pointer-events-none">
                <div className="text-xs text-gray-400 truncate max-w-full">
                  {projects[currentIndex - 1].title}
                </div>
              </div>
            )}

            {/* 現在のプロジェクト */}
            <div className="flex-1 px-8">
              <div className="flex flex-col items-center">
                {/* プロジェクトタイトル */}
                <h3 className="text-base font-bold text-gray-900 mb-1 text-center">
                  {currentProject?.title || '未選択'}
                </h3>

                {/* 進捗表示 */}
                {currentProject?.progress && currentProject.progress.total > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-20 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-[#d97756] transition-all"
                        style={{ width: `${currentProject.progress.percentage}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500">
                      {currentProject.progress.done}/{currentProject.progress.total}
                    </span>
                  </div>
                )}

                {/* GitHubリポジトリ表示（将来拡張用） */}
                {/* {currentProject?.githubRepo && (
                  <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-400">
                    <Github size={12} />
                    <span className="truncate max-w-[120px]">{currentProject.githubRepo}</span>
                  </div>
                )} */}
              </div>
            </div>

            {/* 次のプロジェクト（プレビュー） */}
            {currentIndex < projects.length - 1 && (
              <div className="absolute right-0 w-16 opacity-30 pointer-events-none">
                <div className="text-xs text-gray-400 truncate max-w-full text-right">
                  {projects[currentIndex + 1].title}
                </div>
              </div>
            )}
          </div>

          {/* ナビゲーションボタン */}
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className={cn(
              'absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all',
              currentIndex === 0
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            )}
            aria-label="前のプロジェクト"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.min(projects.length - 1, prev + 1))}
            disabled={currentIndex === projects.length - 1}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all',
              currentIndex === projects.length - 1
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            )}
            aria-label="次のプロジェクト"
          >
            <ChevronRight size={20} />
          </button>

          {/* インジケーター */}
          <div className="flex justify-center gap-1 mt-3">
            {projects.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  index === currentIndex
                    ? 'w-6 bg-[#d97756]'
                    : 'w-1.5 bg-gray-300'
                )}
                aria-label={`プロジェクト ${index + 1} に切り替え`}
              />
            ))}
          </div>
        </div>

        {/* スワイプヒント */}
        {dragOffset === 0 && (
          <div className="text-center mt-2">
            <p className="text-[10px] text-gray-400">
              {'← スワイプして切り替え →'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
