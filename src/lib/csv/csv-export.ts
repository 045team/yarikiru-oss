// ============================================
// CSV Export Utilities
// CSVエクスポート機能（BOM付きUTF-8）
// ============================================

import { type Schedule } from "../../types/database"

// ============================================
// Constants
// ============================================

/**
 * CSVエクスポートヘッダー
 */
const CSV_HEADERS = [
  "曜日",
  "時間帯",
  "業務カテゴリ",
  "タスク",
  "所要時間",
  "頻度",
  "疼痛点",
  "優先度",
] as const

/**
 * 曜日ラベル変換マップ
 */
const DAY_LABEL_MAP: Record<string, string> = {
  月: "月",
  火: "火",
  水: "水",
  木: "木",
  金: "金",
  土: "土",
  日: "日",
}

// ============================================
// Export Functions
// ============================================

/**
 * スケジュールデータをCSV形式でエクスポート
 *
 * @param schedules - エクスポートするスケジュールデータ
 * @returns BOM付きUTF-8のCSV文字列
 */
export function generateScheduleCSV(schedules: Schedule[]): string {
  if (schedules.length === 0) {
    return ""
  }

  // BOM（Byte Order Mark）を付与してExcelで日本語が正しく表示されるようにする
  const BOM = "\uFEFF"

  // ヘッダー行
  const headers = CSV_HEADERS.join(",")

  // データ行
  const rows = schedules.map((schedule) => {
    const dayLabel = DAY_LABEL_MAP[schedule.day_of_week] || schedule.day_of_week

    // 各フィールドをCSVエスケープ（必要ならダブルクォートで囲む）
    return [
      dayLabel,
      schedule.time_slot || "",
      schedule.business_category || "",
      schedule.task || "",
      schedule.duration || "",
      schedule.frequency || "",
      schedule.pain_points || "",
      schedule.priority || "",
    ]
      .map((cell) => {
        // カンマ、ダブルクォート、改行をエスケープ
        const escaped = (cell || "")
          .replace(/"/g, '""')
          .replace(/\n/g, '"\n"')
        return `"${escaped}"`
      })
      .join(",")
  })

  // CSVを結合
  const csvContent = [headers, ...rows].join("\n")

  return BOM + csvContent
}

/**
 * CSV文字列をBlobに変換
 *
 * @param csvContent - CSV文字列
 * @param filename - ファイル名
 * @returns Download用のBlob
 */
export function createCSVDownloadBlob(
  csvContent: string,
  filename: string
): { blob: Blob; downloadUrl: string } {
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)

  return { blob, downloadUrl: url }
}

/**
 * CSVダウンロードをトリガーする関数
 *
 * @param csvContent - CSV文字列
 * @param filename - ファイル名（拡張子なし）
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const { blob, downloadUrl } = createCSVDownloadBlob(csvContent, filename)

  const link = document.createElement("a")
  link.href = downloadUrl
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // クリーンアップ
  setTimeout(() => {
    URL.revokeObjectURL(downloadUrl)
  }, 100)
}

/**
 * エクスポート用ファイル名を生成
 *
 * @param industryId - 業種ID
 * @returns タイムスタンプ付きのファイル名
 */
export function generateExportFilename(industryId: number): string {
  const now = new Date()
  const timestamp = now
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19) // YYYY-MM-DD-HHMMSS

  return `schedule_export_${industryId}_${timestamp}`
}

/**
 * スケジュールデータを検証してエクスポート可能かチェック
 *
 * @param schedules - 検証するスケジュールデータ
 * @returns 検証結果
 */
export interface ExportValidationResult {
  canExport: boolean
  reason?: string
  recordCount: number
}

export function validateExportData(schedules: Schedule[]): ExportValidationResult {
  if (!schedules || schedules.length === 0) {
    return {
      canExport: false,
      reason: "エクスポートするデータがありません",
      recordCount: 0,
    }
  }

  return {
    canExport: true,
    recordCount: schedules.length,
  }
}
