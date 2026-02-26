"use client"

import * as React from "react"
import { Upload, Download, FileText, AlertCircle, CheckCircle2 } from "lucide-react"

import { Button } from "../ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog"
import {
  ValidationMessages,
  FieldError,
} from "./validation-messages"
import { DataPreviewTable } from "./data-preview-table"
import {
  parseScheduleCSV,
  validateCSVHeaders,
  generateCSVTemplate,
} from "../../lib/csv/papaparse-wrapper"
import { ErrorBoundary } from "../error-boundary"
import { type ScheduleInput } from "../../lib/validation/schemas"

// ============================================
// Types
// ============================================

export interface CSVUploadDialogProps {
  industryId?: number
  onImport?: (schedules: ScheduleInput[]) => void | Promise<void>
  trigger?: React.ReactNode
  defaultOpen?: boolean
}

interface UploadState {
  file: File | null
  parsedData: ScheduleInput[]
  errors: Array<{ row: number; message: string }>
  isUploading: boolean
  isParsing: boolean
  headerValidation: {
    valid: boolean
    missing: string[]
    extra: string[]
  } | null
}

// ============================================
// Helper Functions
// ============================================

/**
 * CSVファイルをダウンロード
 */
function downloadCSVTemplate() {
  const csvContent = generateCSVTemplate()
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "schedule_import_template.csv"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * ファイルサイズを人間が読みやすい形式に変換
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

// ============================================
// Main Component
// ============================================

export function CSVUploadDialog({
  industryId,
  onImport,
  trigger = <Button>CSVインポート</Button>,
  defaultOpen = false,
}: CSVUploadDialogProps) {
  const [open, setOpen] = React.useState(defaultOpen)
  const [state, setState] = React.useState<UploadState>({
    file: null,
    parsedData: [],
    errors: [],
    isUploading: false,
    isParsing: false,
    headerValidation: null,
  })
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const dragCounterRef = React.useRef(0)

  // ファイル選択ハンドラー
  const handleFileSelect = async (selectedFile: File) => {
    setState((prev) => ({
      ...prev,
      file: selectedFile,
      isParsing: true,
      errors: [],
      parsedData: [],
      headerValidation: null,
    }))

    // ヘッダーバリデーション
    const headerResult = await validateCSVHeaders(selectedFile)

    if (!headerResult.valid) {
      setState((prev) => ({
        ...prev,
        headerValidation: headerResult,
        isParsing: false,
      }))
      return
    }

    // CSVパース
    const result = await parseScheduleCSV(selectedFile)

    setState((prev) => ({
      ...prev,
      parsedData: result.data,
      errors: result.errors,
      isParsing: false,
      headerValidation: headerResult,
    }))
  }

  // ドラッグ&ドロップイベント
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0

    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        await handleFileSelect(file)
      } else {
        setState((prev) => ({
          ...prev,
          errors: [{ row: 0, message: "CSVファイルのみアップロード可能です" }],
        }))
      }
    }
  }

  // ファイル入力変更ハンドラー
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await handleFileSelect(files[0])
    }
  }

  // インポート実行
  const handleImport = async () => {
    if (!onImport || state.parsedData.length === 0) return

    setState((prev) => ({ ...prev, isUploading: true }))

    try {
      // industryIdを各レコードに追加
      const dataWithIndustryId = state.parsedData.map((item) => ({
        ...item,
        industry_id: industryId,
      }))

      await onImport(dataWithIndustryId)

      // 成功時はダイアログを閉じてリセット
      setOpen(false)
      resetState()
    } catch (error) {
      console.error("Import error:", error)
      setState((prev) => ({
        ...prev,
        isUploading: false,
        errors: [
          ...prev.errors,
          {
            row: 0,
            message:
              error instanceof Error
                ? error.message
                : "インポート中にエラーが発生しました",
          },
        ],
      }))
    }
  }

  // ステートリセット
  const resetState = () => {
    setState({
      file: null,
      parsedData: [],
      errors: [],
      isUploading: false,
      isParsing: false,
      headerValidation: null,
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // ダイアログクローズ時
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState()
    }
    setOpen(newOpen)
  }

  // インポート可能かチェック
  const canImport =
    state.parsedData.length > 0 &&
    state.errors.length === 0 &&
    !state.isParsing &&
    !state.isUploading

  // 有効なデータ数
  const validDataCount = state.parsedData.length
  const errorDataCount = state.errors.length

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>CSVインポート</DialogTitle>
          <DialogDescription>
            CSVファイルからスケジュールを一括インポートします
          </DialogDescription>
        </DialogHeader>

        <ErrorBoundary>
          <div className="flex-1 overflow-y-auto space-y-4 px-6">
            {/* ドラッグ&ドロップエリア */}
            {!state.file ? (
              <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors
                  hover:border-primary hover:bg-accent/50
                  ${state.isParsing ? "opacity-50 pointer-events-none" : ""}
                `}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-2">
                  CSVファイルをドラッグ&ドロップ
                </p>
                <p className="text-xs text-muted-foreground mb-4">または</p>
                <Button type="button" variant="outline" size="sm">
                  ファイルを選択
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  最大5MBまでのCSVファイルがアップロード可能です
                </p>
              </div>
            ) : (
              /* ファイル選択後のプレビュー */
              <div className="space-y-4">
                {/* ファイル情報 */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{state.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(state.file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetState}
                  >
                    クリア
                  </Button>
                </div>

                {/* バリデーションサマリー */}
                {state.headerValidation && !state.headerValidation.valid && (
                  <ValidationMessages
                    errors={[
                      `必須ヘッダーが不足しています: ${state.headerValidation.missing.join(
                        ", "
                      )}`,
                    ]}
                  />
                )}

                {state.isParsing && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    CSVを解析中...
                  </div>
                )}

                {!state.isParsing && state.parsedData.length > 0 && (
                  <div className="space-y-2">
                    {/* ステータスサマリー */}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-green-600 font-medium">
                          {validDataCount}件の有効データ
                        </span>
                      </div>
                      {errorDataCount > 0 && (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <span className="text-destructive font-medium">
                            {errorDataCount}件のエラー
                          </span>
                        </div>
                      )}
                    </div>

                    {/* プレビューテーブル */}
                    <DataPreviewTable
                      data={state.parsedData}
                      errors={state.errors}
                    />
                  </div>
                )}

                {!state.isParsing && state.parsedData.length === 0 && state.errors.length > 0 && (
                  <ValidationMessages errors={state.errors.map((e) => e.message)} />
                )}
              </div>
            )}
          </div>
        </ErrorBoundary>

        <DialogFooter className="border-t px-6 py-4 gap-2">
          {/* テンプレートダウンロード */}
          <Button
            type="button"
            variant="outline"
            onClick={downloadCSVTemplate}
            disabled={state.isUploading}
          >
            <Download className="h-4 w-4 mr-2" />
            テンプレート
          </Button>

          <div className="flex-1" />

          {/* キャンセル */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={state.isUploading}
          >
            キャンセル
          </Button>

          {/* インポートボタン */}
          <Button
            type="button"
            onClick={handleImport}
            disabled={!canImport || state.isUploading}
          >
            {state.isUploading ? "インポート中..." : `インポート (${validDataCount}件)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
