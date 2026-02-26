'use client'

import React, { useCallback, useEffect, useState, useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  NodeTypes,
  EdgeTypes,
  Panel,
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'

import GraphNodeComponent, { GraphNodeData } from './GraphNode'
import GraphEdgeComponent, { GraphEdgeData } from './GraphEdge'
import {
  applyDagreLayout,
  autoLayoutByGraphType,
  taskGraphNodeToFlowNode,
  taskGraphEdgeToFlowEdge,
  flowNodeToTaskGraphNode,
  flowEdgeToTaskGraphEdge,
} from './layout'
import { TaskGraphNode, TaskGraphEdge, TaskGraph, GraphType } from '@/lib/turso/graphs'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Save, Layout, Plus, Trash2 } from 'lucide-react'

interface GraphViewProps {
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

const nodeTypes: NodeTypes = {
  custom: GraphNodeComponent,
}

const edgeTypes: EdgeTypes = {
  custom: GraphEdgeComponent,
}

export default function GraphView({
  goalId,
  graph,
  nodes: initialNodes,
  edges: initialEdges,
  onSave,
  onNodeClick,
  onEdgeClick,
  className,
  editable = true,
}: GraphViewProps) {
  // Convert TaskGraphNodes/Edges to ReactFlow format
  const initialFlowNodes = useMemo(
    () => initialNodes.map(taskGraphNodeToFlowNode),
    [initialNodes]
  )
  const initialFlowEdges = useMemo(
    () => initialEdges.map(taskGraphEdgeToFlowEdge),
    [initialEdges]
  )

  // Apply auto-layout if nodes don't have positions
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialFlowNodes.some((n) => n.position.x === 0 && n.position.y === 0)
      ? autoLayoutByGraphType(
          initialFlowNodes,
          initialFlowEdges,
          graph?.graph_type || 'dag'
        ).nodes
      : initialFlowNodes
  )

  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlowEdges)

  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 })

  // Track changes
  useEffect(() => {
    setHasChanges(true)
  }, [nodes, edges])

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!editable) return

      const newEdge: Edge<GraphEdgeData> = {
        ...connection,
        id: `e_${connection.source}_${connection.target}_${Date.now()}`,
        type: 'custom',
        data: {
          edgeType: 'dependency',
        },
      }
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [editable, setEdges]
  )

  // Handle node deletion
  const deleteNode = useCallback(
    (nodeId: string) => {
      if (!editable) return
      setNodes((nds) => nds.filter((n) => n.id !== nodeId))
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
      )
    },
    [editable, setNodes, setEdges]
  )

  // Handle edge deletion
  const deleteEdge = useCallback(
    (edgeId: string) => {
      if (!editable) return
      setEdges((eds) => eds.filter((e) => e.id !== edgeId))
    },
    [editable, setEdges]
  )

  // Add new node
  const addNode = useCallback(() => {
    if (!editable) return

    const newNode: Node<GraphNodeData> = {
      id: `node_${Date.now()}`,
      type: 'custom',
      position: {
        x: Math.random() * 500,
        y: Math.random() * 500,
      },
      data: {
        label: 'New Task',
        status: 'todo',
        priority: 'medium',
      },
    }

    setNodes((nds) => [...nds, newNode])
  }, [editable, setNodes])

  // Apply auto-layout
  const applyLayout = useCallback(() => {
    const graphType = graph?.graph_type || 'dag'
    const { nodes: layoutedNodes } = autoLayoutByGraphType(
      nodes,
      edges,
      graphType
    )
    setNodes(layoutedNodes)
  }, [nodes, edges, graph?.graph_type, setNodes])

  // Save changes
  const handleSave = useCallback(async () => {
    if (!onSave || !hasChanges || isSaving) return

    setIsSaving(true)
    try {
      const nodeChanges = nodes.map((node) =>
        flowNodeToTaskGraphNode(node, graph?.id || '')
      )
      const edgeChanges = edges.map((edge) =>
        flowEdgeToTaskGraphEdge(edge, graph?.id || '')
      )

      await onSave({
        nodes: nodeChanges,
        edges: edgeChanges,
      })

      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save graph:', error)
    } finally {
      setIsSaving(false)
    }
  }, [nodes, edges, graph, onSave, hasChanges, isSaving])

  // Handle node click
  const onNodeClickHandler = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id)
    },
    [onNodeClick]
  )

  // Handle edge click
  const onEdgeClickHandler = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      onEdgeClick?.(edge.id)
    },
    [onEdgeClick]
  )

  return (
    <div className={cn('h-full w-full', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={editable ? onNodesChange : undefined}
        onEdgesChange={editable ? onEdgesChange : undefined}
        onConnect={onConnect}
        onNodeClick={onNodeClickHandler}
        onEdgeClick={onEdgeClickHandler}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        nodesDraggable={editable}
        nodesConnectable={editable}
        elementsSelectable={editable}
        selectNodesOnDrag={false}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />

        <MiniMap
          nodeColor={(node) => {
            const data = node.data as GraphNodeData
            const statusColors: Record<string, string> = {
              todo: '#f3f4f6',
              in_progress: '#dbeafe',
              done: '#dcfce7',
              blocked: '#fee2e2',
            }
            return statusColors[data.status] || '#f3f4f6'
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />

        {editable && (
          <Panel position="top-right" className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={addNode}
              title="Add new node"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={applyLayout}
              title="Auto-layout"
            >
              <Layout className="h-4 w-4" />
            </Button>
            {hasChanges && (
              <Button
                size="sm"
                variant="default"
                onClick={handleSave}
                disabled={isSaving}
                title="Save changes"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}
          </Panel>
        )}

        {graph && (
          <Panel position="top-left" className="bg-background/95 p-2 rounded-lg shadow-md">
            <div className="text-sm font-semibold">{graph.title}</div>
            <div className="text-xs text-muted-foreground">
              {nodes.length} nodes • {edges.length} edges
            </div>
            <div className="text-xs text-muted-foreground">
              Type: {graph.graph_type}
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Selection info panel */}
      {editable && (nodes.length > 0 || edges.length > 0) && (
        <Panel position="bottom-left" className="bg-background/95 p-2 rounded-lg shadow-md text-xs">
          <div className="font-semibold mb-1">Controls</div>
          <div className="text-muted-foreground">
            • Drag to move nodes
            <br />
            • Shift+Drag to select multiple
            <br />
            • Del to delete selected
            <br />
            • Drag from node handle to connect
          </div>
        </Panel>
      )}
    </div>
  )
}
