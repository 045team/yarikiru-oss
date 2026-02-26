"use client"

import * as React from "react"
import { CheckCircle2, XCircle, AlertTriangle, Filter } from "lucide-react"
import { type ScheduleInput } from "../../lib/validation/schemas"
import { Button } from "../ui/button"

// ============================================
// Types
// ============================================

export interface DataPreviewTableProps {
  data: ScheduleInput[]
  errors: Array<{ row: number; message: string }>
  maxDisplayRows?: number
}

interface RowData extends Omit<ScheduleInput, "day_of_week" | "time_slot" | "business_category" | "task" | "duration"> {
  day_of_week?: string
  time_slot?: string
  business_category?: string
  task?: string
  duration?: string
  _rowNumber: number
  _hasError: boolean
  _errorMessage?: string
}

// ============================================
// Constants
// ============================================

const DISPLAY_HEADERS = [
  { key: "day_of_week", label: "曜日" },
  { key: "time_slot", label: "時間帯" },
  { key: "business_category", label: "業務カテゴリ" },
  { key: "task", label: "タスク" },
  { key: "duration", label: "所要時間" },
] as const

const DAY_LABELS: Record<string, string> = {
  月: "月",
  火: "火",
  水: "水",
  木: "木",
  金: "金",
  土: "土",
  日: "日",
}

const PRIORITY_COLORS: Record<string, string> = {
  高: "bg-red-100 text-red-800",
  中: "bg-yellow-100 text-yellow-800",
  低: "bg-green-100 text-green-800",
}

// ============================================
// Helper Functions
// ============================================

/**
 * エラー行かどうかチェック
 */
function hasError(rowNumber: number, errors: Array<{ row: number; message: string }>): boolean {
  return errors.some((e) => e.row === rowNumber)
}

/**
 * エラーメッセージを取得
 */
function getErrorMessage(
  rowNumber: number,
  errors: Array<{ row: number; message: string }>
): string | undefined {
  return errors.find((e) => e.row === rowNumber)?.message
}

// ============================================
// Main Component
// ============================================

export function DataPreviewTable({
  data,
  errors,
  maxDisplayRows = 20,
}: DataPreviewTableProps) {
  const [showErrorsOnly, setShowErrorsOnly] = React.useState(false)
  const [selectedRows, setSelectedRows] = React.useState<Set<number>>(new Set())

  // エラー行番号セット
  const errorRowNumbers = React.useMemo(
    () => new Set(errors.map((e) => e.row)),
    [errors]
  )

  // 表示データのフィルタリング
  const displayData = React.useMemo(() => {
    const mappedData = data.map((item, index) => ({
      day_of_week: item.day_of_week,
      time_slot: item.time_slot,
      business_category: item.business_category,
      task: item.task,
      duration: item.duration,
      frequency: item.frequency,
      pain_points: item.pain_points,
      priority: item.priority,
      ai_solution: item.ai_solution,
      cost_reduction_estimate: item.cost_reduction_estimate,
      industry_id: item.industry_id,
      _rowNumber: index + 2, // ヘッダー行 + 1ベース
      _hasError: hasError(index + 2, errors),
      _errorMessage: getErrorMessage(index + 2, errors),
    })) as RowData[]

    const filteredData = showErrorsOnly
      ? mappedData.filter((row) => row._hasError)
      : mappedData

    return filteredData.slice(0, maxDisplayRows)
  }, [data, errors, showErrorsOnly, maxDisplayRows])

  // スクロールが必要かどうか
  const needsScroll = displayData.length >= maxDisplayRows

  // 全選択トグル
  const isAllSelected =
    displayData.length > 0 && selectedRows.size === displayData.length
  const isPartiallySelected =
    selectedRows.size > 0 && selectedRows.size < displayData.length

  // 全選択/解除
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(displayData.map((row) => row._rowNumber)))
    }
  }

  // 行選択トグル
  const toggleRow = (rowNumber: number) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(rowNumber)) {
      newSelected.delete(rowNumber)
    } else {
      newSelected.add(rowNumber)
    }
    setSelectedRows(newSelected)
  }

  // エラーのみ表示トグル
  const toggleShowErrorsOnly = () => {
    setShowErrorsOnly((prev) => !prev)
  }

  // 選択された行のエラーチェック
  const hasSelectedErrors = React.useMemo(() => {
    return Array.from(selectedRows).some((rowNum) => errorRowNumbers.has(rowNum))
  }, [selectedRows, errorRowNumbers])

  return (
    <div className="space-y-4">
      {/* コントロールバー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* 全選択チェックボックス */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(input) => {
                if (input) {
                  input.indeterminate = isPartiallySelected
                }
              }}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm">
              全選択 ({selectedRows.size}/{displayData.length})
            </span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          {/* エラーのみフィルター */}
          <Button
            type="button"
            variant={showErrorsOnly ? "default" : "outline"}
            size="sm"
            onClick={toggleShowErrorsOnly}
          >
            <Filter className="h-4 w-4 mr-2" />
            エラーのみ表示
            {errorRowNumbers.size > 0 && ` (${errorRowNumbers.size})`}
          </Button>

          {/* ステータス表示 */}
          <span className="text-sm text-muted-foreground">
            {data.length}件中{errors.length}件にエラーあり
          </span>
        </div>
      </div>

      {/* データテーブル */}
      <div
        className={`
          border rounded-lg overflow-hidden
          ${needsScroll ? "max-h-[400px] overflow-y-auto" : ""}
        `}
      >
        {/* テーブルヘッダー */}
        <div className="bg-muted sticky top-0 z-10 grid grid-cols-12 gap-px border-b bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground">
          <div className="col-span-1 flex items-center">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(input) => {
                if (input) {
                  input.indeterminate = isPartiallySelected
                }
              }}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          </div>
          {DISPLAY_HEADERS.map((header) => (
            <div key={header.key} className="col-span-2">
              {header.label}
            </div>
          ))}
          <div className="col-span-1 text-center">ステータス</div>
        </div>

        {/* テーブルボディ */}
        {displayData.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {showErrorsOnly
              ? "エラーのあるデータがありません"
              : "表示するデータがありません"}
          </div>
        ) : (
          <div className="divide-y">
            {displayData.map((row) => (
              <div
                key={row._rowNumber}
                className={`
                  grid grid-cols-12 gap-px px-4 py-2 text-sm
                  transition-colors
                  ${row._hasError ? "bg-destructive/10" : ""}
                  ${selectedRows.has(row._rowNumber) ? "bg-accent" : ""}
                  hover:bg-muted/50
                `}
              >
                {/* 選択チェックボックス */}
                <div className="col-span-1 flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(row._rowNumber)}
                    onChange={() => toggleRow(row._rowNumber)}
                    disabled={row._hasError}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                  />
                </div>

                {/* 曜日 */}
                <div className="col-span-2 truncate" title={row.day_of_week}>
                  {DAY_LABELS[row.day_of_week || ""]}
                </div>

                {/* 時間帯 */}
                <div className="col-span-2 truncate" title={row.time_slot}>
                  {row.time_slot || ""}
                </div>

                {/* 業務カテゴリ */}
                <div
                  className="col-span-2 truncate"
                  title={row.business_category}
                >
                  {row.business_category || ""}
                </div>

                {/* タスク */}
                <div className="col-span-2 truncate" title={row.task}>
                  {row.task || ""}
                </div>

                {/* 所要時間 */}
                <div className="col-span-2 truncate" title={row.duration}>
                  {row.duration || ""}
                </div>

                {/* ステータス */}
                <div className="col-span-1 flex items-center justify-center">
                  {row._hasError ? (
                    <div
                      className="group relative"
                      title={row._errorMessage || "エラーがあります"}
                    >
                      <XCircle className="h-5 w-5 text-destructive" />
                    </div>
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                </div>

                {/* エラーメッセージ（エラー行の場合） */}
                {row._hasError && row._errorMessage && (
                  <div className="col-span-12 text-xs text-destructive mt-1">
                    {row._errorMessage}
                  </div>
                )}
              </div>
            ))}

            {/* さらに表示がある場合のインジケーター */}
            {needsScroll && data.length > maxDisplayRows && (
              <div className="px-4 py-2 text-center text-xs text-muted-foreground bg-muted/50">
                最初の{maxDisplayRows}件を表示中
                {data.length - maxDisplayRows}件のデータがあります
              </div>
            )}
          </div>
        )}
      </div>

      {/* 選択された行にエラーがある場合の警告 */}
      {hasSelectedErrors && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            選択された行にエラーが含まれています。エラー行はインポートされません。
          </span>
        </div>
      )}
    </div>
  )
}
