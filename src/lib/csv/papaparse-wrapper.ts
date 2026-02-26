// ============================================
// PapaParse CSV Wrapper
// UTF-8対応CSVパーサーラッパー
// ============================================

import * as Papa from 'papaparse'
import { ScheduleSchema, type ScheduleInput } from '../validation/schemas'

// ============================================
// Type Definitions
// ============================================

/**
 * CSV行定義（日本語ヘッダー）
 */
export interface CSVRow {
  '曜日': string
  '時間帯': string
  '業務カテゴリ': string
  'タスク': string
  '所要時間': string
  '頻度'?: string
  '疼痛点'?: string
  '優先度'?: string
}

/**
 * パース結果型
 */
export interface ParseResult {
  data: ScheduleInput[]
  errors: Array<{ row: number; message: string }>
  totalRows: number
}

/**
 * ヘッダーバリデーション結果
 */
export interface HeaderValidationResult {
  valid: boolean
  missing: string[]
  extra: string[]
}

// ============================================
// Constants
// ============================================

/**
 * 必須ヘッダー定義
 */
const REQUIRED_HEADERS = [
  '曜日',
  '時間帯',
  '業務カテゴリ',
  'タスク',
  '所要時間',
] as const

/**
 * オプションヘッダー定義
 */
const OPTIONAL_HEADERS = [
  '頻度',
  '疼痛点',
  '優先度',
] as const

/**
 * 曜日正規化マッピング
 * 様々な表記を標準形式（月, 火, 水, 木, 金, 土, 日）に変換
 */
const DAY_OF_WEEK_MAP: Record<string, string> = {
  // 日本語完全形
  '月曜日': '月',
  '火曜日': '火',
  '水曜日': '水',
  '木曜日': '木',
  '金曜日': '金',
  '土曜日': '土',
  '日曜日': '日',

  // 英語
  'Monday': '月',
  'Tuesday': '火',
  'Wednesday': '水',
  'Thursday': '木',
  'Friday': '金',
  'Saturday': '土',
  'Sunday': '日',

  // 英語短縮形
  'Mon': '月',
  'Tue': '火',
  'Wed': '水',
  'Thu': '木',
  'Fri': '金',
  'Sat': '土',
  'Sun': '日',

  // 数字形式
  '1': '月',
  '2': '火',
  '3': '水',
  '4': '木',
  '5': '金',
  '6': '土',
  '7': '日',

  // すでに標準形の場合はそのまま
  '月': '月',
  '火': '火',
  '水': '水',
  '木': '木',
  '金': '金',
  '土': '土',
  '日': '日',
}

// ============================================
// Utility Functions
// ============================================

/**
 * 曜日文字列を標準形式に正規化
 */
function normalizeDayOfWeek(dayStr: string): string {
  const trimmed = dayStr.trim()
  return DAY_OF_WEEK_MAP[trimmed] || trimmed
}

/**
 * 時間帯形式のバリデーション（HH:MM形式）
 */
function isValidTimeSlot(timeSlot: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/
  return timeRegex.test(timeSlot.trim())
}

/**
 * 空行チェック
 */
function isEmptyRow(row: Partial<CSVRow>): boolean {
  const values = Object.values(row).filter(
    (v) => v !== undefined && v !== null && v.toString().trim() !== ''
  )
  return values.length === 0
}

// ============================================
// Main Export Functions
// ============================================

/**
 * CSVヘッダーバリデーション
 *
 * @param file - CSVファイル
 * @returns ヘッダーバリデーション結果
 */
export async function validateCSVHeaders(
  file: File
): Promise<HeaderValidationResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      preview: 1, // 先頭1行のみ読み込み
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        if (results.data.length === 0) {
          resolve({
            valid: false,
            missing: Array.from(REQUIRED_HEADERS),
            extra: [],
          })
          return
        }

        const headers = results.data[0] as string[]
        const headerSet = new Set(
          headers.map((h) => h?.trim()).filter((h): h is string => !!h)
        )

        const missing = REQUIRED_HEADERS.filter((h) => !headerSet.has(h))
        const extra = headers.filter(
          (h) => h && !REQUIRED_HEADERS.includes(h as any) && !OPTIONAL_HEADERS.includes(h as any)
        )

        resolve({
          valid: missing.length === 0,
          missing,
          extra: extra.filter(Boolean) as string[],
        })
      },
      error: (error) => {
        console.error('CSV header validation error:', error)
        resolve({
          valid: false,
          missing: Array.from(REQUIRED_HEADERS),
          extra: [],
        })
      },
    })
  })
}

/**
 * スケジュールCSVパース
 *
 * @param file - CSVファイル
 * @returns パース結果（データとエラー）
 */
export async function parseScheduleCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const errors: Array<{ row: number; message: string }> = []
        const validData: ScheduleInput[] = []

        // ヘッダーチェック
        const parsedHeaders = results.meta.fields || []
        const headerSet = new Set(parsedHeaders)
        const missingHeaders = REQUIRED_HEADERS.filter((h) => !headerSet.has(h))

        if (missingHeaders.length > 0) {
          resolve({
            data: [],
            errors: [
              {
                row: 0,
                message: `必須ヘッダーが不足しています: ${missingHeaders.join(', ')}`,
              },
            ],
            totalRows: 0,
          })
          return
        }

        // 行単位の処理
        results.data.forEach((row, index) => {
          const rowNum = index + 2 // ヘッダー行 + 1ベースの行番号

          // 空行スキップ
          if (isEmptyRow(row)) {
            return
          }

          // 必須フィールドチェック
          const requiredFields: (keyof CSVRow)[] = [
            '曜日',
            '時間帯',
            '業務カテゴリ',
            'タスク',
            '所要時間',
          ]

          const missingFields = requiredFields.filter(
            (field) => !row[field] || row[field]?.trim() === ''
          )

          if (missingFields.length > 0) {
            errors.push({
              row: rowNum,
              message: `必須フィールドが不足しています: ${missingFields.join(', ')}`,
            })
            return
          }

          // 時間帯形式バリデーション
          if (!isValidTimeSlot(row['時間帯']!)) {
            errors.push({
              row: rowNum,
              message: '時間帯の形式が正しくありません（HH:MM形式で入力してください）',
            })
            return
          }

          // 曜日正規化
          const normalizedDay = normalizeDayOfWeek(row['曜日']!)

          // 有効な曜日チェック
          const validDays = ['月', '火', '水', '木', '金', '土', '日']
          if (!validDays.includes(normalizedDay)) {
            errors.push({
              row: rowNum,
              message: `曜日が正しくありません: "${row['曜日']}"`,
            })
            return
          }

          // ScheduleInput形式に変換
          const scheduleInput: ScheduleInput = {
            industry_id: undefined, // バッチ処理時に設定
            day_of_week: normalizedDay,
            time_slot: row['時間帯']!.trim(),
            business_category: row['業務カテゴリ']!.trim(),
            task: row['タスク']!.trim(),
            duration: row['所要時間']!.trim(),
            frequency: row['頻度']?.trim() || undefined,
            pain_points: row['疼痛点']?.trim() || undefined,
            priority: (row['優先度']?.trim() || undefined) as '高' | '中' | '低' | undefined,
            ai_solution: undefined,
            cost_reduction_estimate: undefined,
          }

          // Zodバリデーション
          const validationResult = ScheduleSchema.safeParse(scheduleInput)

          if (!validationResult.success) {
            const errorMessages = validationResult.error.issues
              .map((e) => `${e.path.join('.')}: ${e.message}`)
              .join(', ')
            errors.push({
              row: rowNum,
              message: `バリデーションエラー: ${errorMessages}`,
            })
            return
          }

          validData.push(validationResult.data)
        })

        resolve({
          data: validData,
          errors,
          totalRows: results.data.length,
        })
      },
      error: (error) => {
        console.error('CSV parse error:', error)
        resolve({
          data: [],
          errors: [
            {
              row: 0,
              message: `CSVパースエラー: ${error.message}`,
            },
          ],
          totalRows: 0,
        })
      },
    })
  })
}

/**
 * CSVテンプレート文字列生成
 *
 * @returns CSVテンプレート（BOM付きUTF-8）
 */
export function generateCSVTemplate(): string {
  const BOM = '\uFEFF'
  const headers = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS]
  const sampleRows = [
    ['月', '09:00', '営業活動', 'メールチェック・返信', '30分', '毎日', '手作業で時間がかかる', '中'],
    ['月', '10:00', '会議', '週次定例会議', '1時間', '毎週', '', '高'],
    ['火', '14:00', '開発作業', 'コードレビュー', '1.5時間', '毎週', '工数がかかる', '高'],
  ]

  const csvContent = [
    headers.join(','),
    ...sampleRows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n')

  return BOM + csvContent
}

// ============================================
// Re-exports
// ============================================

export { Papa }
