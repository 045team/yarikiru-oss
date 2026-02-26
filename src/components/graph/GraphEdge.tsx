'use client'

import React, { memo } from 'react'
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from 'reactflow'
import { EdgeType } from '@/lib/turso/graphs'
import { cn } from '@/lib/utils'

export interface GraphEdgeData {
  label?: string
  edgeType: EdgeType
  condition?: {
    type: 'completion' | 'approval' | 'manual' | 'time_based' | 'custom'
    required_value?: any
  }
}

// Edge type styling configuration
const edgeTypeStyles = {
  dependency: {
    stroke: '#94a3b8', // slate-400
    strokeWidth: 2,
    animated: false,
    labelBg: 'bg-gray-100 dark:bg-gray-800',
    labelText: 'text-gray-700 dark:text-gray-300',
  },
  sequence: {
    stroke: '#3b82f6', // blue-500
    strokeWidth: 2,
    animated: false,
    labelBg: 'bg-blue-100 dark:bg-blue-900/30',
    labelText: 'text-blue-700 dark:text-blue-300',
  },
  conditional: {
    stroke: '#f59e0b', // amber-500
    strokeWidth: 2,
    animated: false,
    labelBg: 'bg-amber-100 dark:bg-amber-900/30',
    labelText: 'text-amber-700 dark:text-amber-300',
  },
  blocking: {
    stroke: '#ef4444', // red-500
    strokeWidth: 3,
    animated: true,
    labelBg: 'bg-red-100 dark:bg-red-900/30',
    labelText: 'text-red-700 dark:text-red-300',
  },
}

const GraphEdgeComponent = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
  }: EdgeProps<GraphEdgeData>) => {
    const edgeType = data?.edgeType || 'dependency'
    const style = edgeTypeStyles[edgeType]

    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    })

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            stroke: style.stroke,
            strokeWidth: style.strokeWidth,
            strokeDasharray: edgeType === 'conditional' ? '5,5' : undefined,
          }}
        />

        {/* Edge Label */}
        {data?.label && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                pointerEvents: 'all',
              }}
              className={cn(
                'nodrag nopan rounded-full px-2 py-1 text-xs font-medium shadow-sm',
                style.labelBg,
                style.labelText
              )}
            >
              {data.label}
            </div>
          </EdgeLabelRenderer>
        )}

        {/* Condition indicator for conditional edges */}
        {edgeType === 'conditional' && data?.condition && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 15}px)`,
                pointerEvents: 'none',
              }}
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px]',
                style.labelBg,
                style.labelText
              )}
            >
              if {data.condition.type}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    )
  }
)

GraphEdgeComponent.displayName = 'GraphEdge'

export default GraphEdgeComponent
