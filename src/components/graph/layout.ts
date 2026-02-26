'use client'

import dagre from 'dagre'
import { Node, Edge } from 'reactflow'
import { TaskGraphNode, TaskGraphEdge, GraphType } from '@/lib/turso/graphs'

/**
 * Apply dagre layout algorithm to position nodes automatically
 */
export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  options: {
    direction?: 'TB' | 'LR' // Top to Bottom or Left to Right
    nodeWidth?: number
    nodeHeight?: number
    rankSep?: number
    nodeSep?: number
  } = {}
): { nodes: Node[]; edges: Edge[] } {
  const {
    direction = 'TB',
    nodeWidth = 200,
    nodeHeight = 100,
    rankSep = 100,
    nodeSep = 100,
  } = options

  // Create a new directed graph
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  // Set graph options
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: nodeSep,
    ranksep: rankSep,
    edgesep: 50,
  })

  // Add nodes to the graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight,
    })
  })

  // Add edges to the graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  // Calculate layout
  dagre.layout(dagreGraph)

  // Apply calculated positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    }
  })

  return {
    nodes: layoutedNodes,
    edges,
  }
}

/**
 * Convert TaskGraphNode to ReactFlow Node
 */
export function taskGraphNodeToFlowNode(
  taskNode: TaskGraphNode
): Node {
  return {
    id: taskNode.node_id,
    type: 'custom',
    position: {
      x: taskNode.x || 0,
      y: taskNode.y || 0,
    },
    data: {
      label: taskNode.label,
      description: taskNode.description,
      status: taskNode.properties.status,
      priority: taskNode.properties.priority,
      estimatedMinutes: taskNode.properties.estimated_minutes,
      tags: taskNode.properties.tags,
      icon: taskNode.properties.icon,
    },
  }
}

/**
 * Convert TaskGraphEdge to ReactFlow Edge
 */
export function taskGraphEdgeToFlowEdge(
  taskEdge: TaskGraphEdge
): Edge {
  return {
    id: taskEdge.id,
    source: taskEdge.from_node_id,
    target: taskEdge.to_node_id,
    type: 'custom',
    data: {
      label: taskEdge.label,
      edgeType: taskEdge.edge_type,
      condition: taskEdge.condition,
    },
  }
}

/**
 * Convert ReactFlow Node back to TaskGraphNode format
 */
export function flowNodeToTaskGraphNode(
  node: Node,
  graphId: string
): Partial<TaskGraphNode> {
  return {
    node_id: node.id,
    label: node.data.label,
    description: node.data.description,
    properties: {
      status: node.data.status || 'todo',
      priority: node.data.priority,
      estimated_minutes: node.data.estimatedMinutes,
      tags: node.data.tags,
      icon: node.data.icon,
    },
    x: node.position.x,
    y: node.position.y,
  }
}

/**
 * Convert ReactFlow Edge back to TaskGraphEdge format
 */
export function flowEdgeToTaskGraphEdge(
  edge: Edge,
  graphId: string
): Partial<TaskGraphEdge> {
  return {
    from_node_id: edge.source,
    to_node_id: edge.target,
    edge_type: edge.data?.edgeType || 'dependency',
    condition: edge.data?.condition,
    label: edge.data?.label,
  }
}

/**
 * Determine layout direction based on graph type
 */
export function getLayoutDirection(graphType: GraphType): 'TB' | 'LR' {
  switch (graphType) {
    case 'sequence':
    case 'hierarchy':
      return 'TB' // Top to Bottom for sequential flows
    case 'parallel':
      return 'LR' // Left to Right for parallel tasks
    case 'dag':
    case 'network':
    case 'conditional':
    default:
      return 'TB' // Default to Top to Bottom
  }
}

/**
 * Auto-layout based on graph type
 */
export function autoLayoutByGraphType(
  nodes: Node[],
  edges: Edge[],
  graphType: GraphType
): { nodes: Node[]; edges: Edge[] } {
  const direction = getLayoutDirection(graphType)

  // Adjust spacing based on graph type
  const spacingOptions = {
    sequence: { rankSep: 150, nodeSep: 50 },
    hierarchy: { rankSep: 120, nodeSep: 80 },
    parallel: { rankSep: 80, nodeSep: 150 },
    dag: { rankSep: 100, nodeSep: 100 },
    network: { rankSep: 100, nodeSep: 100 },
    conditional: { rankSep: 120, nodeSep: 100 },
  }

  const options = spacingOptions[graphType] || spacingOptions.dag

  return applyDagreLayout(nodes, edges, {
    direction,
    ...options,
  })
}
