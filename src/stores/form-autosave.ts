// ============================================
// Form Auto-save Store (Zustand)
// localStorageにフォーム下書きを永続化
// ============================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ScheduleInput } from '@/lib/validation/schemas'

// ============================================
// Types
// ============================================

interface AutoSaveState {
  drafts: Record<string, ScheduleInput>
  lastSaved: Record<string, number>
  isSaving: Record<string, boolean>

  // Actions
  updateDraft: (formId: string, data: ScheduleInput) => void
  clearDraft: (formId: string) => void
  getDraft: (formId: string) => ScheduleInput | null
  clearAllDrafts: () => void
}

// ============================================
// Store
// ============================================

export const useAutoSave = create<AutoSaveState>()(
  persist(
    (set, get) => ({
      drafts: {},
      lastSaved: {},
      isSaving: {},

      updateDraft: (formId, data) => {
        set((state) => ({
          drafts: { ...state.drafts, [formId]: data },
          lastSaved: { ...state.lastSaved, [formId]: Date.now() },
          isSaving: { ...state.isSaving, [formId]: false },
        }))
      },

      clearDraft: (formId) => {
        set((state) => {
          const newDrafts = { ...state.drafts }
          const newLastSaved = { ...state.lastSaved }
          const newIsSaving = { ...state.isSaving }

          delete newDrafts[formId]
          delete newLastSaved[formId]
          delete newIsSaving[formId]

          return {
            drafts: newDrafts,
            lastSaved: newLastSaved,
            isSaving: newIsSaving,
          }
        })
      },

      getDraft: (formId) => {
        return get().drafts[formId] || null
      },

      clearAllDrafts: () => {
        set({
          drafts: {},
          lastSaved: {},
          isSaving: {},
        })
      },
    }),
    {
      name: 'schedule-form-autosave',
      partialize: (state) => ({
        drafts: state.drafts,
        lastSaved: state.lastSaved,
      }),
    }
  )
)

// ============================================
// Helpers
// ============================================

/**
 * formIdを生成するヘルパー関数
 * @param industryId 業種ID
 * @param dayOfWeek 曜日（月, 火, 水, 木, 金, 土, 日）
 * @returns formId（例: schedule-1-月）
 */
export function generateFormId(
  industryId: number | undefined,
  dayOfWeek: string
): string {
  return `schedule-${industryId || 'new'}-${dayOfWeek}`
}

/**
 * 保存時間を日本語でフォーマット
 * @param timestamp Unixタイムスタンプ（ミリ秒）
 * @returns フォーマット済み文字列（例: 3分前に保存）
 */
export function formatLastSaved(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) {
    return 'たった今保存'
  } else if (minutes < 60) {
    return `${minutes}分前に保存`
  } else if (hours < 24) {
    return `${hours}時間前に保存`
  } else {
    return `${days}日前に保存`
  }
}
