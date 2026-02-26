// ============================================
// CSV Validation Utilities
// CSV専用バリデーションスキーマとユーティリティ
// ============================================

import { z } from 'zod'

// ============================================
// CSV Import Types
// ============================================

/**
 * CSVヘッダー定義
 */
export const CSV_HEADERS = {
  REQUIRED: ['曜日', '時間帯', '業務カテゴリ', 'タスク', '所要時間'] as const,
  OPTIONAL: ['頻度', '疼痛点', '優先度'] as const,
} as const

/**
 * CSVヘッダー名のバリエーション
 * ユーザーが様々な表記でCSVを作成できるように対応
 */
export const HEADER_ALIASES: Record<string, string> = {
  // 曜日のバリエーション
  '曜日': '曜日',
  'Day': '曜日',
  'day': '曜日',
  'day_of_week': '曜日',

  // 時間帯のバリエーション
  '時間帯': '時間帯',
  'Time': '時間帯',
  'time': '時間帯',
  'time_slot': '時間帯',
  '開始時間': '時間帯',

  // 業務カテゴリのバリエーション
  '業務カテゴリ': '業務カテゴリ',
  'Category': '業務カテゴリ',
  'category': '業務カテゴリ',
  'business_category': '業務カテゴリ',
  'カテゴリ': '業務カテゴリ',

  // タスクのバリエーション
  'タスク': 'タスク',
  'Task': 'タスク',
  'task': 'タスク',
  '内容': 'タスク',
  '作業内容': 'タスク',

  // 所要時間のバリエーション
  '所要時間': '所要時間',
  'Duration': '所要時間',
  'duration': '所要時間',
  '時間': '所要時間',
  '時間長': '所要時間',

  // 頻度のバリエーション
  '頻度': '頻度',
  'Frequency': '頻度',
  'frequency': '頻度',

  // 疼痛点のバリエーション
  '疼痛点': '疼痛点',
  'Pain Point': '疼痛点',
  'pain_point': '疼痛点',
  '課題': '疼痛点',
  '問題点': '疼痛点',

  // 優先度のバリエーション
  '優先度': '優先度',
  'Priority': '優先度',
  'priority': '優先度',
}

// ============================================
// CSV Validation Schemas
// ============================================

/**
 * 時間帯フォーマットスキーマ（HH:MM形式）
 */
const timeSlotSchema = z
  .string()
  .regex(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/, {
    message: '時間帯はHH:MM形式で入力してください（例: 09:00, 14:30）',
  })

/**
 * 曜日スキーマ
 */
const dayOfWeekValues = ['月', '火', '水', '木', '金', '土', '日'] as const
const dayOfWeekSchema = z.enum(dayOfWeekValues, {
  message: '曜日は「月」「火」「水」「木」「金」「土」「日」のいずれかを指定してください',
})

/**
 * 優先度スキーマ
 */
const priorityValues = ['高', '中', '低'] as const
const prioritySchema = z.enum(priorityValues, {
  message: '優先度は「高」「中」「低」のいずれかを指定してください',
})

/**
 * CSV用簡易スケジュールスキーマ
 * バリデーションエラーを日本語で表示するためのカスタムスキーマ
 */
export const CSVScheduleSchema = z.object({
  day_of_week: dayOfWeekSchema,
  time_slot: timeSlotSchema,
  business_category: z
    .string()
    .min(1, { message: '業務カテゴリは必須です' })
    .max(100, { message: '業務カテゴリは100文字以内で入力してください' }),
  task: z
    .string()
    .min(1, { message: 'タスクは必須です' })
    .max(500, { message: 'タスクは500文字以内で入力してください' }),
  duration: z
    .string()
    .min(1, { message: '所要時間は必須です' })
    .max(50, { message: '所要時間は50文字以内で入力してください' }),
  frequency: z.string().max(100, { message: '頻度は100文字以内で入力してください' }).optional(),
  pain_points: z.string().max(500, { message: '疼痛点は500文字以内で入力してください' }).optional(),
  priority: prioritySchema.optional(),
})

export type CSVScheduleInput = z.infer<typeof CSVScheduleSchema>

// ============================================
// Validation Utility Functions
// ============================================

/**
 * ヘッダー正規化（エイリアスを標準ヘッダー名に変換）
 */
export function normalizeHeader(header: string): string {
  const trimmed = header.trim()
  return HEADER_ALIASES[trimmed] || trimmed
}

/**
 * 必須ヘッダーチェック
 */
export function validateRequiredHeaders(
  headers: string[]
): { valid: boolean; missing: string[] } {
  const normalizedHeaders = new Set(headers.map(normalizeHeader))
  const missing = CSV_HEADERS.REQUIRED.filter((h) => !normalizedHeaders.has(h))

  return {
    valid: missing.length === 0,
    missing,
  }
}

/**
 * 曜日正規化（様々な表記を標準形式に変換）
 */
export function normalizeDayOfWeek(dayStr: string): string {
  const trimmed = dayStr.trim()

  // 完全形→短縮形
  const fullDayMap: Record<string, string> = {
    '月曜日': '月',
    '火曜日': '火',
    '水曜日': '水',
    '木曜日': '木',
    '金曜日': '金',
    '土曜日': '土',
    '日曜日': '日',
    'Monday': '月',
    'Tuesday': '火',
    'Wednesday': '水',
    'Thursday': '木',
    'Friday': '金',
    'Saturday': '土',
    'Sunday': '日',
    'Mon': '月',
    'Tue': '火',
    'Wed': '水',
    'Thu': '木',
    'Fri': '金',
    'Sat': '土',
    'Sun': '日',
  }

  return fullDayMap[trimmed] || trimmed
}

/**
 * 時間帯フォーマットバリデーション
 */
export function isValidTimeSlot(timeSlot: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/
  return timeRegex.test(timeSlot.trim())
}

/**
 * 優先度フォーマットバリデーション
 */
export function isValidPriority(priority: string): boolean {
  return ['高', '中', '低'].includes(priority)
}

/**
 * 空行チェック
 */
export function isEmptyRow(row: Record<string, unknown>): boolean {
  const values = Object.values(row).filter(
    (v) => v !== undefined && v !== null && v.toString().trim() !== ''
  )
  return values.length === 0
}

/**
 * 行番号を人間が読みやすい形式に変換
 * （ヘッダー行を考慮）
 */
export function getHumanReadableRowNumber(csvRowNumber: number): number {
  return csvRowNumber + 1 // 0-indexed → 1-indexed + ヘッダー行分
}

/**
 * CSVパースエラーを整形してユーザーフレンドリーなメッセージに変換
 */
export function formatParseError(error: {
  row: number
  message: string
}): string {
  return `行${error.row}: ${error.message}`
}

/**
 * バリデーション結果サマリー生成
 */
export interface ValidationResultSummary {
  totalRows: number
  validRows: number
  errorRows: number
  errors: Array<{ row: number; message: string }>
}

export function createValidationSummary(
  totalRows: number,
  errors: Array<{ row: number; message: string }>
): ValidationResultSummary {
  const errorRowSet = new Set(errors.map((e) => e.row))
  const errorRows = errorRowSet.size
  const validRows = totalRows - errorRows

  return {
    totalRows,
    validRows,
    errorRows,
    errors,
  }
}

// ============================================
// CSV Template Generation
// ============================================

/**
 * CSVインポートテンプレート生成
 */
export function generateCSVImportTemplate(): string {
  const BOM = '\uFEFF'
  const headers = [...CSV_HEADERS.REQUIRED, ...CSV_HEADERS.OPTIONAL]

  // サンプルデータ行
  const sampleData = [
    ['月', '09:00', '営業活動', 'メールチェック・返信', '30分', '毎日', '手作業で時間がかかる', '中'],
    ['火', '10:00', '会議', '週次定例会議', '1時間', '毎週', '', '高'],
    ['水', '14:00', '開発作業', 'コードレビュー', '1.5時間', '毎週', '工数がかかる', '高'],
    ['木', '15:00', '営業活動', '顧客訪問準備', '45分', '隔週', '資料作成に時間がかかる', '中'],
    ['金', '11:00', '研修', '技術勉強会', '2時間', '月1回', '', '低'],
  ]

  const csvContent = [
    headers.join(','),
    ...sampleData.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n')

  return BOM + csvContent
}
