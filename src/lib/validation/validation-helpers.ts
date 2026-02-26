import { z } from 'zod'

// ============================================
// Formatted Error Types
// ============================================

export interface FormattedError {
  field: string
  message: string
  code?: string
}

export interface ValidationResult {
  valid: boolean
  errors: FormattedError[]
}

// ============================================
// Error Formatting Helpers
// ============================================

/**
 * Zodエラーを整形されたエラーメッセージ配列に変換
 */
export function formatValidationErrors(error: z.ZodError): FormattedError[] {
  const errors: FormattedError[] = []

  error.issues.forEach((err) => {
    const field = err.path.join('.')
    errors.push({
      field,
      message: err.message,
      code: err.code,
    })
  })

  return errors
}

/**
 * 特定フィールドのエラーメッセージを取得
 */
export function getErrorMessage(error: z.ZodError, field: string): string | null {
  const fieldError = error.issues.find((err) => err.path.includes(field))
  return fieldError?.message || null
}

/**
 * 複数のZodエラーをマージ
 */
export function mergeZodErrors(...errors: z.ZodError[]): z.ZodError {
  const allIssues = errors.flatMap((e) => e.issues)
  return new z.ZodError(allIssues)
}

// ============================================
// Time Validation Helpers
// ============================================

/**
 * 時間スロットのバリデーション
 * @param startTime - 開始時間 (HH:MM形式)
 * @param duration - 所要時間 ("30分", "1時間", "1.5時間" など)
 */
export function validateTimeSlot(startTime: string, duration: string): boolean {
  // 開始時間の形式チェック
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/
  if (!timeRegex.test(startTime)) {
    return false
  }

  // 所要時間のパースとバリデーション
  const durationMinutes = parseDuration(duration)
  if (durationMinutes === null || durationMinutes <= 0) {
    return false
  }

  // 1日の最大時間を超えないかチェック（24時間 = 1440分）
  const [hours, minutes] = startTime.split(':').map(Number)
  const startMinutes = hours * 60 + minutes
  const endMinutes = startMinutes + durationMinutes

  return endMinutes <= 1440
}

/**
 * 所要時間文字列を分数に変換
 * @param duration - "30分", "1時間", "1.5時間", "2" など
 * @returns 分数（パース失敗時はnull）
 */
export function parseDuration(duration: string): number | null {
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

/**
 * 所要時間が15分単位かチェック
 */
export function isValidDurationIncrement(duration: string): boolean {
  const minutes = parseDuration(duration)
  if (minutes === null) {
    return false
  }
  return minutes % 15 === 0
}

/**
 * 二つの時間帯が重複しているかチェック
 */
export function isTimeSlotOverlap(
  start1: string,
  duration1: string,
  start2: string,
  duration2: string
): boolean {
  const minutes1 = parseDuration(duration1)
  const minutes2 = parseDuration(duration2)

  if (minutes1 === null || minutes2 === null) {
    return false
  }

  const [h1, m1] = start1.split(':').map(Number)
  const [h2, m2] = start2.split(':').map(Number)

  const start1Minutes = h1 * 60 + m1
  const end1Minutes = start1Minutes + minutes1
  const start2Minutes = h2 * 60 + m2
  const end2Minutes = start2Minutes + minutes2

  // 重複チェック: AがBと重複するのは、Aの開始がBの終了前で、Aの終了がBの開始後の場合
  return start1Minutes < end2Minutes && end1Minutes > start2Minutes
}

// ============================================
// Field Validation Helpers
// ============================================

/**
 * 必須フィールドのバリデーション
 */
export function validateRequired(value: unknown, fieldName: string): void {
  if (value === null || value === undefined || value === '') {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: [fieldName],
        message: `${fieldName}は必須です`,
      },
    ])
  }
}

/**
 * 文字列長のバリデーション
 */
export function validateStringLength(
  value: string,
  fieldName: string,
  min: number,
  max?: number
): void {
  if (value.length < min) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.too_small,
        path: [fieldName],
        message: `${fieldName}は${min}文字以上で入力してください`,
        minimum: min,
        exact: undefined,
        inclusive: true,
        origin: 'value',
      },
    ])
  }

  if (max && value.length > max) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.too_big,
        path: [fieldName],
        message: `${fieldName}は${max}文字以下で入力してください`,
        maximum: max,
        exact: undefined,
        inclusive: true,
        origin: 'value',
      },
    ])
  }
}
