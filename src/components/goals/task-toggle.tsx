'use client'

import { useState, useTransition } from 'react'

interface TaskToggleProps {
  taskId: string
  initialCompleted: boolean
  onToggle?: (taskId: string, isCompleted: boolean) => void
  size?: 'sm' | 'md'
}

/**
 * Task Toggle Checkbox Component
 *
 * Allows users to mark tasks as completed/incomplete
 */
export function TaskToggle({ taskId, initialCompleted, onToggle, size = 'md' }: TaskToggleProps) {
  const [isCompleted, setIsCompleted] = useState(initialCompleted)
  const [isPending, startTransition] = useTransition()

  const handleToggle = async () => {
    const newValue = !isCompleted
    setIsCompleted(newValue)

    startTransition(async () => {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isCompleted: newValue }),
        })

        if (!response.ok) {
          throw new Error('Failed to update task')
        }

        onToggle?.(taskId, newValue)
      } catch (error) {
        console.error('Failed to toggle task:', error)
        // Revert on error
        setIsCompleted(!newValue)
      }
    })
  }

  const sizeClasses = size === 'sm'
    ? 'h-5 w-5'
    : 'h-6 w-6'

  const iconSize = size === 'sm'
    ? 'w-3 h-3'
    : 'w-4 h-4'

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`mt-0.5 flex flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ${sizeClasses} ${
        isCompleted
          ? 'border-primary bg-primary hover:opacity-90'
          : 'border-muted-foreground/40 hover:border-primary'
      } ${isPending ? 'cursor-wait opacity-50' : 'cursor-pointer'} focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
      aria-label={isCompleted ? '未完了にする' : '完了にする'}
    >
      {isCompleted && (
        <svg className={`${iconSize} text-white`} fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  )
}
