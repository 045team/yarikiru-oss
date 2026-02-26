"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle } from "lucide-react"

export interface ValidationMessagesProps {
  errors?: string[]
  className?: string
}

/**
 * バリデーションエラーメッセージ表示コンポーネント
 */
export function ValidationMessages({
  errors = [],
  className,
}: ValidationMessagesProps) {
  if (errors.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        "rounded-md border border-destructive/50 bg-destructive/10 p-3",
        "animate-in fade-in-50 slide-in-from-top-2 duration-300",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          {errors.map((error, index) => (
            <p key={index} className="text-sm text-destructive">
              {error}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

export interface FieldErrorProps {
  error?: string
  className?: string
}

/**
 * フィールド単体のエラーメッセージ表示
 */
export function FieldError({ error, className }: FieldErrorProps) {
  if (!error) {
    return null
  }

  return (
    <p
      className={cn(
        "text-sm text-destructive mt-1",
        "animate-in fade-in-50 duration-200",
        className
      )}
      role="alert"
    >
      {error}
    </p>
  )
}
