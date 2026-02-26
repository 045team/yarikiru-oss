import { z } from 'zod'
import type { ScheduleInput } from './schemas'

// ============================================
// Schedule Types for Validation
// ============================================

/**
 * 既存スケジュールの型定義（簡易版）
 */
export interface ExistingSchedule {
  id?: number
  day_of_week: string
  time_slot: string
  duration: string
  industry_id?: number | null
  business_category: string
  task: string
}

/**
 * バリデーション結果
 */
export interface ScheduleValidationResult {
  valid: boolean
  errors: string[]
  conflicts?: TimeSlotConflict[]
}

/**
 * 時間枠競合情報
 */
export interface TimeSlotConflict {
  existingSchedule: ExistingSchedule
  reason: string
}

// ============================================
// Time Slot Conflict Validators
// ============================================

/**
 * 時間枠競合チェックバリデーター
 * 同じ曜日・時間帯の重複を検出
 */
export function timeSlotConflictValidator(
  data: { day_of_week: string; time_slot: string; duration: string },
  existingSchedules: ExistingSchedule[]
): ScheduleValidationResult {
  const errors: string[] = []
  const conflicts: TimeSlotConflict[] = []

  // 同じ曜日のスケジュールをフィルタリング
  const sameDaySchedules = existingSchedules.filter(
    (s) => s.day_of_week === data.day_of_week
  )

  // 時間帯の重複チェック
  for (const existing of sameDaySchedules) {
    const isOverlap = checkTimeOverlap(
      data.time_slot,
      data.duration,
      existing.time_slot,
      existing.duration
    )

    if (isOverlap) {
      conflicts.push({
        existingSchedule: existing,
        reason: `${existing.time_slot}〜${existing.task}と時間が重複しています`,
      })
      errors.push(
        `時間枠競合: ${existing.time_slot}の「${existing.task}」と重複しています`
      )
    }
  }

  return {
    valid: conflicts.length === 0,
    errors,
    conflicts: conflicts.length > 0 ? conflicts : undefined,
  }
}

/**
 * 二つの時間枠が重複しているかチェック
 */
function checkTimeOverlap(
  start1: string,
  duration1: string,
  start2: string,
  duration2: string
): boolean {
  const minutes1 = parseDurationToMinutes(duration1)
  const minutes2 = parseDurationToMinutes(duration2)

  if (minutes1 === null || minutes2 === null) {
    return false
  }

  const [h1, m1] = start1.split(':').map(Number)
  const [h2, m2] = start2.split(':').map(Number)

  const start1Minutes = h1 * 60 + m1
  const end1Minutes = start1Minutes + minutes1
  const start2Minutes = h2 * 60 + m2
  const end2Minutes = start2Minutes + minutes2

  // 重複チェック: 開始時間が終了時間より前で、終了時間が開始時間より後
  return start1Minutes < end2Minutes && end1Minutes > start2Minutes
}

/**
 * 所要時間を分数に変換
 */
function parseDurationToMinutes(duration: string): number | null {
  if (!duration || duration.trim() === '') {
    return null
  }

  const trimmed = duration.trim()

  // "分" で終わる場合
  if (trimmed.endsWith('分')) {
    const minutes = parseInt(trimmed.replace('分', '').trim(), 10)
    return isNaN(minutes) ? null : minutes
  }

  // "時間" で終わる場合
  if (trimmed.endsWith('時間')) {
    const hoursStr = trimmed.replace('時間', '').trim()
    const hours = parseFloat(hoursStr)
    return isNaN(hours) ? null : Math.round(hours * 60)
  }

  // 数字のみの場合（分として扱う）
  const minutes = parseInt(trimmed, 10)
  return isNaN(minutes) ? null : minutes
}

// ============================================
// Duplicate Schedule Validators
// ============================================

/**
 * 重複チェックバリデーター
 * 完全に同じタスクの重複を検出
 */
export function duplicateScheduleValidator(
  existingSchedules: ExistingSchedule[],
  newSchedule: ScheduleInput
): ScheduleValidationResult {
  const errors: string[] = []

  // 完全に一致するスケジュールを検索
  const duplicate = existingSchedules.find(
    (s) =>
      s.day_of_week === newSchedule.day_of_week &&
      s.time_slot === newSchedule.time_slot &&
      s.business_category === newSchedule.business_category &&
      s.task === newSchedule.task
  )

  if (duplicate) {
    errors.push(
      `重複: ${duplicate.day_of_week}曜 ${duplicate.time_slot}の「${duplicate.task}」は既に登録されています`
    )

    return {
      valid: false,
      errors,
    }
  }

  return {
    valid: true,
    errors: [],
  }
}

// ============================================
// Duration Validation
// ============================================

/**
 * 所要時間バリデーション
 * 15分単位のチェックと形式のバリデーション
 */
export function validateDuration(duration: string): {
  valid: boolean
  error?: string
  minutes?: number
} {
  const minutes = parseDurationToMinutes(duration)

  if (minutes === null) {
    return {
      valid: false,
      error: '所要時間の形式が正しくありません。「30分」「1時間」「1.5時間」などの形式で入力してください',
    }
  }

  if (minutes <= 0) {
    return {
      valid: false,
      error: '所要時間は0より大きい値を指定してください',
    }
  }

  if (minutes > 1440) {
    return {
      valid: false,
      error: '所要時間は24時間以内で指定してください',
    }
  }

  // 15分単位チェック
  if (minutes % 15 !== 0) {
    return {
      valid: false,
      error: '所要時間は15分単位で指定してください（30分、1時間、1.5時間など）',
      minutes,
    }
  }

  return {
    valid: true,
    minutes,
  }
}

/**
 * 15分単位のチェックのみ実行
 */
export function isDurationIn15MinuteIncrements(duration: string): boolean {
  const minutes = parseDurationToMinutes(duration)
  return minutes !== null && minutes > 0 && minutes % 15 === 0
}

// ============================================
// Time Slot Format Validation
// ============================================

/**
 * 時間スロット形式のバリデーション
 * HH:MM形式であることを確認
 */
export function validateTimeSlotFormat(timeSlot: string): {
  valid: boolean
  error?: string
} {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/

  if (!timeSlot || timeSlot.trim() === '') {
    return {
      valid: false,
      error: '時間帯は必須です',
    }
  }

  if (!timeRegex.test(timeSlot)) {
    return {
      valid: false,
      error: '時間帯は「HH:MM」形式で入力してください（例: 09:00, 14:30）',
    }
  }

  return {
    valid: true,
  }
}

// ============================================
// Combined Validation
// ============================================

/**
 * スケジュールの全バリデーションを実行
 * 時間枠競合、重複、形式チェックをまとめて実行
 */
export function validateScheduleInput(
  data: ScheduleInput,
  existingSchedules: ExistingSchedule[] = []
): ScheduleValidationResult {
  const errors: string[] = []
  const allConflicts: TimeSlotConflict[] = []

  // 1. 時間スロット形式チェック
  const timeSlotValidation = validateTimeSlotFormat(data.time_slot)
  if (!timeSlotValidation.valid) {
    errors.push(timeSlotValidation.error || '時間帯の形式が正しくありません')
  }

  // 2. 所要時間チェック
  const durationValidation = validateDuration(data.duration)
  if (!durationValidation.valid) {
    errors.push(durationValidation.error || '所要時間の形式が正しくありません')
  }

  // 3. 曜日チェック
  const validDays = ['月', '火', '水', '木', '金', '土', '日']
  if (!validDays.includes(data.day_of_week)) {
    errors.push('曜日は「月」「火」「水」「木」「金」「土」「日」のいずれかを指定してください')
  }

  // 4. 時間枠競合チェック（形式チェックがOKの場合のみ）
  if (timeSlotValidation.valid) {
    const conflictResult = timeSlotConflictValidator(
      {
        day_of_week: data.day_of_week,
        time_slot: data.time_slot,
        duration: data.duration,
      },
      existingSchedules
    )

    if (!conflictResult.valid) {
      errors.push(...conflictResult.errors)
      if (conflictResult.conflicts) {
        allConflicts.push(...conflictResult.conflicts)
      }
    }
  }

  // 5. 重複チェック
  const duplicateResult = duplicateScheduleValidator(existingSchedules, data)
  if (!duplicateResult.valid) {
    errors.push(...duplicateResult.errors)
  }

  return {
    valid: errors.length === 0,
    errors,
    conflicts: allConflicts.length > 0 ? allConflicts : undefined,
  }
}

// ============================================
// Zod Refine Extensions
// ============================================

/**
 * ScheduleSchema用のrefine関数
 * 既存スケジュールとの時間枠競合チェックを追加
 */
export function createScheduleRefine(existingSchedules: ExistingSchedule[] = []) {
  return (data: ScheduleInput, ctx: z.RefinementCtx) => {
    const result = validateScheduleInput(data, existingSchedules)

    if (!result.valid) {
      result.errors.forEach((error) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error,
        })
      })
    }
  }
}
