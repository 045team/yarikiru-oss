'use client'

import React, { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { TaskGraphNode, TaskStatus } from '@/lib/turso/graphs'
import { cn } from '@/lib/utils'

// Status-based styling configuration
const statusStyles: Record<
  TaskStatus,
  { bg: string; border: string; text: string; icon: string }
> = {
  todo: {
    bg: 'bg-gray-50 dark:bg-gray-800',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-700 dark:text-gray-300',
    icon: '⏳',
  },
  in_progress: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-400 dark:border-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
    icon: '🔄',
  },
  done: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-400 dark:border-green-500',
    text: 'text-green-700 dark:text-green-300',
    icon: '✅',
  },
  blocked: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-400 dark:border-red-500',
    text: 'text-red-700 dark:text-red-300',
    icon: '🚫',
  },
}

// Priority-based styling
const priorityStyles = {
  critical: 'border-l-4 border-l-red-500',
  high: 'border-l-4 border-l-orange-500',
  medium: 'border-l-4 border-l-yellow-500',
  low: 'border-l-4 border-l-gray-400',
}

export interface GraphNodeData {
  label: string
  description?: string
  status: TaskStatus
  priority?: 'critical' | 'high' | 'medium' | 'low'
  estimatedMinutes?: number
  tags?: string[]
  icon?: string
}

const GraphNodeComponent = memo(
  ({ data, selected }: NodeProps<GraphNodeData>) => {
    const status = data.status || 'todo'
    const statusStyle = statusStyles[status]
    const priorityStyle = data.priority ? priorityStyles[data.priority] : ''

    return (
      <div
        className={cn(
          'min-w-[200px] max-w-[300px] rounded-lg border-2 px-4 py-3 shadow-md transition-all',
          statusStyle.bg,
          statusStyle.border,
          statusStyle.text,
          priorityStyle,
          selected && 'ring-2 ring-ring ring-offset-2'
        )}
      >
        {/* Input Handle */}
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-gray-400 dark:!bg-gray-600"
        />

        {/* Header with Icon and Label */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-lg" role="img" aria-label="status-icon">
            {data.icon || statusStyle.icon}
          </span>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{data.label}</h3>
          </div>
        </div>

        {/* Description */}
        {data.description && (
          <p className="mb-2 text-xs opacity-80 line-clamp-2">
            {data.description}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-2 text-xs opacity-70">
          {data.estimatedMinutes && (
            <span className="flex items-center gap-1">
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {data.estimatedMinutes}m
            </span>
          )}

          {data.tags && data.tags.length > 0 && (
            <div className="flex gap-1">
              {data.tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className="rounded bg-black/10 px-1.5 py-0.5 text-[10px]"
                >
                  {tag}
                </span>
              ))}
              {data.tags.length > 2 && (
                <span className="rounded bg-black/10 px-1.5 py-0.5 text-[10px]">
                  +{data.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Output Handle */}
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-gray-400 dark:!bg-gray-600"
        />
      </div>
    )
  }
)

GraphNodeComponent.displayName = 'GraphNode'

export default GraphNodeComponent
