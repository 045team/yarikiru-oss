"use client"

import * as React from "react"
import { useForm, type SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FieldError,
  ValidationMessages,
} from "@/components/form/validation-messages"
import { ScheduleSchema, type ScheduleInput } from "@/lib/validation/schemas"
import { ErrorBoundary } from "@/components/error-boundary"
import { useFormAutosave } from "@/hooks/use-form-autosave"

// ============================================
// Form Props
// ============================================

export interface ScheduleFormDialogProps {
  industryId?: number
  existingSchedules?: Array<{
    id?: number
    day_of_week: string
    time_slot: string
    duration: string
    business_category: string
    task: string
  }>
  onSubmit?: (data: ScheduleInput) => void | Promise<void>
  trigger?: React.ReactNode
  defaultOpen?: boolean
}

// ============================================
// Day of Week Options
// ============================================

const DAY_OPTIONS = [
  { value: "月", label: "月曜日" },
  { value: "火", label: "火曜日" },
  { value: "水", label: "水曜日" },
  { value: "木", label: "木曜日" },
  { value: "金", label: "金曜日" },
  { value: "土", label: "土曜日" },
  { value: "日", label: "日曜日" },
]

const PRIORITY_OPTIONS = [
  { value: "高", label: "高" },
  { value: "中", label: "中" },
  { value: "低", label: "低" },
]

// ============================================
// Main Component
// ============================================

export function ScheduleFormDialog({
  industryId,
  existingSchedules = [],
  onSubmit,
  trigger = <Button>スケジュール追加</Button>,
  defaultOpen = false,
}: ScheduleFormDialogProps) {
  const [open, setOpen] = React.useState(defaultOpen)
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [currentDayOfWeek, setCurrentDayOfWeek] = React.useState("月")

  // 自動保存フック
  const { timeAgo, clearDraft } = useFormAutosave({
    industryId,
    dayOfWeek: currentDayOfWeek,
    enabled: open, // ダイアログが開いている時のみ有効
    onRestoreDraft: (draft) => {
      // 下書きがあればフォームに復元
      Object.entries(draft).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          setValue(key as any, value as any)
        }
      })
      // 曜日も復元
      if (draft.day_of_week) {
        setCurrentDayOfWeek(draft.day_of_week)
      }
    },
  })

  const form = useForm<ScheduleInput>({
    resolver: zodResolver(ScheduleSchema),
    defaultValues: {
      industry_id: industryId,
      day_of_week: "月",
      time_slot: "",
      business_category: "",
      task: "",
      duration: "",
      frequency: "",
      pain_points: "",
      ai_solution: "",
      priority: "中",
      cost_reduction_estimate: "",
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
    trigger: formTrigger,
    setValue,
    watch,
  } = form

  // フォーム送信ハンドラー
  const handleFormSubmit: SubmitHandler<ScheduleInput> = async (data) => {
    try {
      setServerError(null)

      // Server Actionsが実装されるまでconsole.logでデバッグ
      console.log("Schedule form submitted:", data)

      // onSubmitが提供されていれば呼び出し
      if (onSubmit) {
        await onSubmit(data)
      }

      // 成功時は下書きをクリアしてダイアログを閉じる
      clearDraft()
      setOpen(false)
      reset()
      setCurrentDayOfWeek("月") // リセット
    } catch (error) {
      console.error("Form submission error:", error)
      setServerError(
        error instanceof Error ? error.message : "送信中にエラーが発生しました"
      )
    }
  }

  // フォームを閉じる際にリセット
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset()
      setServerError(null)
      clearDraft() // ダイアログ閉じる時に下書きクリア
      setCurrentDayOfWeek("月") // リセット
    }
    setOpen(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>スケジュール追加</DialogTitle>
              <DialogDescription>
                新しいスケジュールを追加します。すべての必須項目を入力してください。
              </DialogDescription>
            </div>
            {timeAgo && (
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {timeAgo}
              </div>
            )}
          </div>
        </DialogHeader>

        <ErrorBoundary>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            {/* サーバーエラー表示 */}
            {serverError && (
              <ValidationMessages errors={[serverError]} />
            )}

            {/* 曜日 */}
            <div className="space-y-2">
              <Label htmlFor="day_of_week">
                曜日 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watch("day_of_week")}
                onValueChange={(value) => {
                  setValue("day_of_week", value)
                  setCurrentDayOfWeek(value) // 自動保存用に追跡
                  formTrigger("day_of_week")
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="曜日を選択" />
                </SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError error={errors.day_of_week?.message} />
            </div>

            {/* 時間帯 */}
            <div className="space-y-2">
              <Label htmlFor="time_slot">
                時間帯 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="time_slot"
                type="time"
                {...register("time_slot", {
                  onBlur: () => formTrigger("time_slot"),
                })}
              />
              <FieldError error={errors.time_slot?.message} />
            </div>

            {/* 業務カテゴリ */}
            <div className="space-y-2">
              <Label htmlFor="business_category">
                業務カテゴリ <span className="text-destructive">*</span>
              </Label>
              <Input
                id="business_category"
                placeholder="例: 営業活動、会議、開発作業"
                {...register("business_category", {
                  onBlur: () => formTrigger("business_category"),
                })}
              />
              <FieldError error={errors.business_category?.message} />
            </div>

            {/* タスク */}
            <div className="space-y-2">
              <Label htmlFor="task">
                タスク <span className="text-destructive">*</span>
              </Label>
              <Input
                id="task"
                placeholder="例: 見積もり作成、コードレビュー"
                {...register("task", {
                  onBlur: () => formTrigger("task"),
                })}
              />
              <FieldError error={errors.task?.message} />
            </div>

            {/* 所要時間 */}
            <div className="space-y-2">
              <Label htmlFor="duration">
                所要時間 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="duration"
                placeholder="例: 30分、1時間、1.5時間"
                {...register("duration", {
                  onBlur: () => formTrigger("duration"),
                })}
              />
              <p className="text-xs text-muted-foreground">
                15分単位で指定してください（例: 30分、1時間、1.5時間）
              </p>
              <FieldError error={errors.duration?.message} />
            </div>

            {/* 頻度（オプション） */}
            <div className="space-y-2">
              <Label htmlFor="frequency">頻度（オプション）</Label>
              <Input
                id="frequency"
                placeholder="例: 毎週、隔週、月1回"
                {...register("frequency")}
              />
              <FieldError error={errors.frequency?.message} />
            </div>

            {/* 優先度 */}
            <div className="space-y-2">
              <Label htmlFor="priority">優先度</Label>
              <Select
                value={watch("priority") || "中"}
                onValueChange={(value) => {
                  setValue("priority", value as "高" | "中" | "低")
                  formTrigger("priority")
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="優先度を選択" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError error={errors.priority?.message} />
            </div>

            {/* 疼痛点（オプション） */}
            <div className="space-y-2">
              <Label htmlFor="pain_points">疼痛点（オプション）</Label>
              <Input
                id="pain_points"
                placeholder="例: 手作業で時間がかかる、ミスが発生しやすい"
                {...register("pain_points")}
              />
              <FieldError error={errors.pain_points?.message} />
            </div>

            {/* AIソリューション（オプション） */}
            <div className="space-y-2">
              <Label htmlFor="ai_solution">AIソリューション（オプション）</Label>
              <Input
                id="ai_solution"
                placeholder="例: 自動化ツールの導入、AIアシスタント活用"
                {...register("ai_solution")}
              />
              <FieldError error={errors.ai_solution?.message} />
            </div>

            {/* コスト削減見積もり（オプション） */}
            <div className="space-y-2">
              <Label htmlFor="cost_reduction_estimate">
                コスト削減見積もり（オプション）
              </Label>
              <Input
                id="cost_reduction_estimate"
                placeholder="例: 月10万円、年100時間"
                {...register("cost_reduction_estimate")}
              />
              <FieldError error={errors.cost_reduction_estimate?.message} />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting ? "送信中..." : "追加"}
              </Button>
            </DialogFooter>
          </form>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Form Field Component (for reusability)
// ============================================

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
  hint?: string
}

export function FormField({
  label,
  required,
  error,
  children,
  hint,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError error={error} />
    </div>
  )
}
