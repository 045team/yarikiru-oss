// ============================================
// use-form-autosave Hook
// フォームの自動保存と下書き復元
// ============================================

import { useEffect, useRef, useCallback } from 'react'
import { useAutoSave, formatLastSaved } from '@/stores/form-autosave'
import type { ScheduleInput } from '@/lib/validation/schemas'

// ============================================
// Types
// ============================================

export interface UseFormAutosaveOptions {
  /** フォームID（省略時はindustryIdとdayOfWeekから生成） */
  formId?: string
  /** 業種ID */
  industryId?: number
  /** 曜日（月, 火, 水, 木, 金, 土, 日） */
  dayOfWeek?: string
  /** 自動保存を有効にするか（デフォルト: true） */
  enabled?: boolean
  /** デバウンス時間（ミリ秒、デフォルト: 2000ms） */
  debounceMs?: number
  /** 下書き復元時のコールバック */
  onRestoreDraft?: (draft: ScheduleInput) => void
}

export interface UseFormAutosaveReturn {
  /** 「3分前に保存」形式の文字列 */
  timeAgo: string | null
  /** 下書きをクリアする関数 */
  clearDraft: () => void
  /** 下書きが存在するか */
  hasDraft: boolean
  /** 保存中かどうか */
  isSaving: boolean
}

// ============================================
// Hook
// ============================================

export function useFormAutosave({
  formId: propFormId,
  industryId,
  dayOfWeek = '月',
  enabled = true,
  debounceMs = 2000,
  onRestoreDraft,
}: UseFormAutosaveOptions = {}): UseFormAutosaveReturn {
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const hasRestoredRef = useRef(false)

  // formIdを生成（propがあれば優先）
  const formId = propFormId || `schedule-${industryId || 'new'}-${dayOfWeek}`

  const {
    updateDraft,
    getDraft,
    lastSaved,
    clearDraft: clearDraftStore,
    isSaving,
  } = useAutoSave()

  // 下書き復元（初回マウント時のみ）
  useEffect(() => {
    if (!enabled || hasRestoredRef.current) return

    const draft = getDraft(formId)
    if (draft && Object.keys(draft).length > 0) {
      // コールバックで親コンポーネントに通知
      onRestoreDraft?.(draft)
    }
    hasRestoredRef.current = true
  }, [formId, getDraft, enabled, onRestoreDraft])

  // フォームデータの自動保存（デバウンス済み）
  const saveFormData = useCallback(
    (formData: ScheduleInput | null) => {
      if (!enabled || !formData) return

      // 保存中フラグをセット
      useAutoSave.setState((state) => ({
        isSaving: { ...state.isSaving, [formId]: true },
      }))

      // デバウンス処理
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        updateDraft(formId, formData)
      }, debounceMs)
    },
    [enabled, formId, updateDraft, debounceMs]
  )

  // コンポーネントアンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // 保存時間のフォーマット
  const lastSavedTime = lastSaved[formId]
  const timeAgo = lastSavedTime ? formatLastSaved(lastSavedTime) : null

  // 下書きが存在するか
  const hasDraft = !!useAutoSave.getState().drafts[formId]

  // 下書きクリア関数
  const clearDraft = useCallback(() => {
    clearDraftStore(formId)
    hasRestoredRef.current = false
  }, [formId, clearDraftStore])

  return {
    timeAgo,
    clearDraft,
    hasDraft,
    isSaving: isSaving[formId] || false,
  }
}

// ============================================
// Helper: Trigger autosave externally
// ============================================

/**
 * フォームデータを手動でトリガーして保存する関数を返すフック
 * 主にフォーム送信直前に確実に保存する場合に使用
 */
export function useManualAutosave(
  formId: string,
  enabled = true
): {
  manualSave: (data: ScheduleInput) => void
  clearDraft: () => void
  hasDraft: boolean
} {
  const { updateDraft, getDraft, clearDraft: clearDraftStore } = useAutoSave()

  const manualSave = useCallback(
    (data: ScheduleInput) => {
      if (enabled) {
        updateDraft(formId, data)
      }
    },
    [enabled, formId, updateDraft]
  )

  const clearDraft = useCallback(() => {
    clearDraftStore(formId)
  }, [formId, clearDraftStore])

  const hasDraft = !!getDraft(formId)

  return { manualSave, clearDraft, hasDraft }
}
