'use client'

import React from 'react'
import { ReactFlowProvider } from 'reactflow'
import GraphView from './GraphView'
import {
  TaskGraph,
  TaskGraphNode,
  TaskGraphEdge,
} from '@/lib/turso/graphs'

interface GraphViewWithProviderProps {
  goalId: string
  graph?: TaskGraph | null
  nodes: TaskGraphNode[]
  edges: TaskGraphEdge[]
  onSave?: (changes: {
    nodes: Partial<TaskGraphNode>[]
    edges: Partial<TaskGraphEdge>[]
  }) => Promise<void>
  onNodeClick?: (nodeId: string) => void
  onEdgeClick?: (edgeId: string) => void
  className?: string
  editable?: boolean
}

export default function GraphViewWithProvider(
  props: GraphViewWithProviderProps
) {
  return (
    <ReactFlowProvider>
      <GraphView {...props} />
    </ReactFlowProvider>
  )
}
