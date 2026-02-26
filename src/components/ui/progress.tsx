import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  size?: 'default' | 'sm' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'danger'
  showLabel?: boolean
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, size = 'default', variant = 'default', showLabel = false, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    const variantStyles = {
      default: 'bg-primary',
      success: 'bg-teal-500',
      warning: 'bg-accent',
      danger: 'bg-destructive',
    }

    const sizeStyles = {
      default: 'h-2',
      sm: 'h-1',
      lg: 'h-4',
    }

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        <div className="mb-1 flex items-center justify-between">
          {showLabel && (
            <span className="text-sm font-medium text-muted-foreground">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
        <div className={cn('w-full overflow-hidden rounded-full bg-muted', sizeStyles[size])}>
          <div
            className={cn('h-full transition-all duration-500 ease-out', variantStyles[variant])}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    )
  }
)
Progress.displayName = 'Progress'

export { Progress }
