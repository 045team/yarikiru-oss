// ============================================
// Graph-Based Task Specification System
// YARIKIRU v4.0 - Graph機能 Phase 1
// ============================================

import { execute, executeOne, executeWithMVCC } from './client'

// ============================================
// Type Definitions
// ============================================

export type GraphType = 'dag' | 'sequence' | 'hierarchy' | 'network' | 'conditional' | 'parallel'

export type EdgeType = 'dependency' | 'sequence' | 'conditional' | 'blocking'

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked'

export interface TaskGraphNodeProperties {
  priority?: TaskPriority
  estimated_minutes?: number
  status: TaskStatus
  assigned_to?: string // user_id
  tags?: string[]
  color?: string // hex color
  icon?: string // emoji or icon name
}

export interface TaskGraphEdgeCondition {
  type: 'completion' | 'approval' | 'manual' | 'time_based' | 'custom'
  required_value?: any
  expression?: string
}

export interface TaskGraph {
  id: string
  goal_id: string
  title: string
  description?: string
  graph_type: GraphType
  is_primary: boolean // true = このGraphがSubTasksのマスター
  created_at: string
  updated_at: string
}

export interface TaskGraphInsert {
  goal_id: string
  title: string
  description?: string
  graph_type?: GraphType
  is_primary?: boolean
}

export interface TaskGraphNode {
  id: string
  graph_id: string
  node_id: string // グラフ内で一意な識別子
  label: string
  description?: string
  sort_order: number
  properties: TaskGraphNodeProperties
  x?: number
  y?: number
  started_at?: string
  completed_at?: string
  created_at: string
}

export interface TaskGraphNodeInsert {
  graph_id: string
  node_id: string
  label: string
  description?: string
  sort_order?: number
  properties: TaskGraphNodeProperties
  x?: number
  y?: number
}

export interface TaskGraphEdge {
  id: string
  graph_id: string
  from_node_id: string
  to_node_id: string
  edge_type: EdgeType
  condition: TaskGraphEdgeCondition
  label?: string
  created_at: string
}

export interface TaskGraphEdgeInsert {
  graph_id: string
  from_node_id: string
  to_node_id: string
  edge_type?: EdgeType
  condition?: TaskGraphEdgeCondition
  label?: string
}

// ============================================
// TaskGraphs CRUD
// ============================================

export async function createTaskGraph(data: TaskGraphInsert): Promise<TaskGraph> {
  const id = crypto.randomUUID()
  const sql = `
    INSERT INTO task_graphs (
      id, goal_id, title, description, graph_type, is_primary
    ) VALUES (?, ?, ?, ?, ?, ?)
    RETURNING *
  `
  const [result] = await executeWithMVCC<TaskGraph>(sql, [
    id,
    data.goal_id,
    data.title,
    data.description || null,
    data.graph_type || 'dag',
    data.is_primary ? 1 : 0,
  ])
  return result!
}

export async function getTaskGraphById(graphId: string): Promise<TaskGraph | null> {
  const sql = `SELECT * FROM task_graphs WHERE id = ?`
  const result = await executeOne<TaskGraph>(sql, [graphId])
  return result || null
}

export async function getTaskGraphsByGoalId(goalId: string): Promise<TaskGraph[]> {
  const sql = `
    SELECT * FROM task_graphs
    WHERE goal_id = ?
    ORDER BY created_at DESC
  `
  return await execute<TaskGraph>(sql, [goalId])
}

export async function getPrimaryTaskGraphByGoalId(goalId: string): Promise<TaskGraph | null> {
  const sql = `
    SELECT * FROM task_graphs
    WHERE goal_id = ? AND is_primary = 1
    LIMIT 1
  `
  const result = await executeOne<TaskGraph>(sql, [goalId])
  return result || null
}

export async function updateTaskGraph(
  graphId: string,
  data: Partial<Pick<TaskGraphInsert, 'title' | 'description' | 'graph_type' | 'is_primary'>>
): Promise<TaskGraph | null> {
  const fields: string[] = []
  const values: (string | number | boolean | null)[] = []

  if (data.title !== undefined) {
    fields.push('title = ?')
    values.push(data.title)
  }
  if (data.description !== undefined) {
    fields.push('description = ?')
    values.push(data.description)
  }
  if (data.graph_type !== undefined) {
    fields.push('graph_type = ?')
    values.push(data.graph_type)
  }
  if (data.is_primary !== undefined) {
    fields.push('is_primary = ?')
    values.push(data.is_primary ? 1 : 0)
  }

  if (fields.length === 0) return await getTaskGraphById(graphId)

  values.push(graphId)
  const sql = `
    UPDATE task_graphs
    SET ${fields.join(', ')}
    WHERE id = ?
    RETURNING *
  `
  const result = await executeOne<TaskGraph>(sql, values)
  return result || null
}

export async function deleteTaskGraph(graphId: string): Promise<boolean> {
  const sql = `DELETE FROM task_graphs WHERE id = ?`
  const result = await execute(sql, [graphId])
  return result.length > 0
}

// ============================================
// TaskGraphNodes CRUD
// ============================================

export async function createGraphNode(data: TaskGraphNodeInsert): Promise<TaskGraphNode> {
  const id = crypto.randomUUID()
  const sql = `
    INSERT INTO task_graph_nodes (
      id, graph_id, node_id, label, description, sort_order,
      properties, x, y
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `
  const [result] = await executeWithMVCC<TaskGraphNode>(sql, [
    id,
    data.graph_id,
    data.node_id,
    data.label,
    data.description || null,
    data.sort_order || 0,
    JSON.stringify(data.properties),
    data.x || null,
    data.y || null,
  ])
  return result!
}

export async function getGraphNodeById(nodeId: string): Promise<TaskGraphNode | null> {
  const sql = `SELECT * FROM task_graph_nodes WHERE id = ?`
  const result = await executeOne<TaskGraphNode>(sql, [nodeId])

  if (result && result.properties) {
    try {
      result.properties = JSON.parse(result.properties as any)
    } catch (e) {
      console.error('Failed to parse node properties:', e)
    }
  }

  return result || null
}

export async function getGraphNodesByGraphId(graphId: string): Promise<TaskGraphNode[]> {
  const sql = `
    SELECT * FROM task_graph_nodes
    WHERE graph_id = ?
    ORDER BY sort_order ASC
  `
  const results = await execute<TaskGraphNode>(sql, [graphId])

  return results.map((node) => {
    if (node.properties) {
      try {
        node.properties = JSON.parse(node.properties as any)
      } catch (e) {
        console.error('Failed to parse node properties:', e)
      }
    }
    return node
  })
}

export async function getGraphNodeByNodeId(graphId: string, nodeId: string): Promise<TaskGraphNode | null> {
  const sql = `
    SELECT * FROM task_graph_nodes
    WHERE graph_id = ? AND node_id = ?
    LIMIT 1
  `
  const result = await executeOne<TaskGraphNode>(sql, [graphId, nodeId])

  if (result && result.properties) {
    try {
      result.properties = JSON.parse(result.properties as any)
    } catch (e) {
      console.error('Failed to parse node properties:', e)
    }
  }

  return result || null
}

export async function updateGraphNode(
  nodeId: string,
  data: Partial<
    Pick<TaskGraphNodeInsert, 'label' | 'description' | 'sort_order' | 'properties' | 'x' | 'y'>
  >
): Promise<TaskGraphNode | null> {
  const fields: string[] = []
  const values: (string | number | boolean | null)[] = []

  if (data.label !== undefined) {
    fields.push('label = ?')
    values.push(data.label)
  }
  if (data.description !== undefined) {
    fields.push('description = ?')
    values.push(data.description)
  }
  if (data.sort_order !== undefined) {
    fields.push('sort_order = ?')
    values.push(data.sort_order)
  }
  if (data.properties !== undefined) {
    fields.push('properties = ?')
    values.push(JSON.stringify(data.properties))
  }
  if (data.x !== undefined) {
    fields.push('x = ?')
    values.push(data.x)
  }
  if (data.y !== undefined) {
    fields.push('y = ?')
    values.push(data.y)
  }

  if (fields.length === 0) return await getGraphNodeById(nodeId)

  values.push(nodeId)
  const sql = `
    UPDATE task_graph_nodes
    SET ${fields.join(', ')}
    WHERE id = ?
    RETURNING *
  `
  const result = await executeOne<TaskGraphNode>(sql, values)

  if (result && result.properties) {
    try {
      result.properties = JSON.parse(result.properties as any)
    } catch (e) {
      console.error('Failed to parse node properties:', e)
    }
  }

  return result || null
}

export async function updateNodeStatus(
  nodeId: string,
  status: TaskStatus,
  startedAt?: string,
  completedAt?: string
): Promise<TaskGraphNode | null> {
  const fields: string[] = ['properties = ?']
  const values: any[] = []

  // 既存のプロパティを取得
  const existing = await getGraphNodeById(nodeId)
  if (!existing) return null

  const updatedProperties = {
    ...existing.properties,
    status,
  }

  values.push(JSON.stringify(updatedProperties))

  if (startedAt !== undefined) {
    fields.push('started_at = ?')
    values.push(startedAt)
  }

  if (completedAt !== undefined) {
    fields.push('completed_at = ?')
    values.push(completedAt)
  }

  values.push(nodeId)
  const sql = `
    UPDATE task_graph_nodes
    SET ${fields.join(', ')}
    WHERE id = ?
    RETURNING *
  `
  const result = await executeOne<TaskGraphNode>(sql, values)

  if (result && result.properties) {
    try {
      result.properties = JSON.parse(result.properties as any)
    } catch (e) {
      console.error('Failed to parse node properties:', e)
    }
  }

  return result || null
}

export async function deleteGraphNode(nodeId: string): Promise<boolean> {
  // ノード削除時、関連するエッジもCASCADEで削除される
  const sql = `DELETE FROM task_graph_nodes WHERE id = ?`
  const result = await execute(sql, [nodeId])
  return result.length > 0
}

// ============================================
// TaskGraphEdges CRUD
// ============================================

export async function createGraphEdge(data: TaskGraphEdgeInsert): Promise<TaskGraphEdge> {
  const id = crypto.randomUUID()
  const sql = `
    INSERT INTO task_graph_edges (
      id, graph_id, from_node_id, to_node_id, edge_type, condition, label
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `
  const [result] = await executeWithMVCC<TaskGraphEdge>(sql, [
    id,
    data.graph_id,
    data.from_node_id,
    data.to_node_id,
    data.edge_type || 'dependency',
    JSON.stringify(data.condition || {}),
    data.label || null,
  ])
  return result!
}

export async function getGraphEdgeById(edgeId: string): Promise<TaskGraphEdge | null> {
  const sql = `SELECT * FROM task_graph_edges WHERE id = ?`
  const result = await executeOne<TaskGraphEdge>(sql, [edgeId])

  if (result && result.condition) {
    try {
      result.condition = JSON.parse(result.condition as any)
    } catch (e) {
      console.error('Failed to parse edge condition:', e)
    }
  }

  return result || null
}

export async function getGraphEdgesByGraphId(graphId: string): Promise<TaskGraphEdge[]> {
  const sql = `
    SELECT * FROM task_graph_edges
    WHERE graph_id = ?
    ORDER BY created_at ASC
  `
  const results = await execute<TaskGraphEdge>(sql, [graphId])

  return results.map((edge) => {
    if (edge.condition) {
      try {
        edge.condition = JSON.parse(edge.condition as any)
      } catch (e) {
        console.error('Failed to parse edge condition:', e)
      }
    }
    return edge
  })
}

export async function getEdgesByNodeId(graphId: string, nodeId: string): Promise<{
  incoming: TaskGraphEdge[]
  outgoing: TaskGraphEdge[]
}> {
  const incomingSql = `
    SELECT * FROM task_graph_edges
    WHERE graph_id = ? AND to_node_id = ?
  `
  const outgoingSql = `
    SELECT * FROM task_graph_edges
    WHERE graph_id = ? AND from_node_id = ?
  `

  const [incoming, outgoing] = await Promise.all([
    execute<TaskGraphEdge>(incomingSql, [graphId, nodeId]),
    execute<TaskGraphEdge>(outgoingSql, [graphId, nodeId]),
  ])

  return {
    incoming: incoming.map((edge) => {
      if (edge.condition) {
        try {
          edge.condition = JSON.parse(edge.condition as any)
        } catch (e) {
          console.error('Failed to parse edge condition:', e)
        }
      }
      return edge
    }),
    outgoing: outgoing.map((edge) => {
      if (edge.condition) {
        try {
          edge.condition = JSON.parse(edge.condition as any)
        } catch (e) {
          console.error('Failed to parse edge condition:', e)
        }
      }
      return edge
    }),
  }
}

export async function deleteGraphEdge(edgeId: string): Promise<boolean> {
  const sql = `DELETE FROM task_graph_edges WHERE id = ?`
  const result = await execute(sql, [edgeId])
  return result.length > 0
}

export async function deleteEdgesByNodeId(graphId: string, nodeId: string): Promise<number> {
  const sql = `
    DELETE FROM task_graph_edges
    WHERE graph_id = ? AND (from_node_id = ? OR to_node_id = ?)
  `
  const result = await execute(sql, [graphId, nodeId, nodeId])
  return result.length
}

// ============================================
// Utility Functions
// ============================================

/**
 * Graph全体を取得（ノードとエッジを含む）
 */
export async function getTaskGraphWithNodesAndEdges(
  graphId: string
): Promise<{
  graph: TaskGraph | null
  nodes: TaskGraphNode[]
  edges: TaskGraphEdge[]
}> {
  const [graph, nodes, edges] = await Promise.all([
    getTaskGraphById(graphId),
    getGraphNodesByGraphId(graphId),
    getGraphEdgesByGraphId(graphId),
  ])

  return { graph, nodes, edges }
}

/**
 * 孤立ノード（エッジがないノード）を検出
 */
export async function findOrphanNodes(graphId: string): Promise<TaskGraphNode[]> {
  const sql = `
    SELECT n.* FROM task_graph_nodes n
    LEFT JOIN task_graph_edges e_in ON e_in.graph_id = n.graph_id AND e_in.to_node_id = n.node_id
    LEFT JOIN task_graph_edges e_out ON e_out.graph_id = n.graph_id AND e_out.from_node_id = n.node_id
    WHERE n.graph_id = ? AND e_in.id IS NULL AND e_out.id IS NULL
  `
  const results = await execute<TaskGraphNode>(sql, [graphId])

  return results.map((node) => {
    if (node.properties) {
      try {
        node.properties = JSON.parse(node.properties as any)
      } catch (e) {
        console.error('Failed to parse node properties:', e)
      }
    }
    return node
  })
}

/**
 * Graphのノード数とエッジ数を取得
 */
export async function getTaskGraphStats(graphId: string): Promise<{
  nodeCount: number
  edgeCount: number
  orphanCount: number
}> {
  const [nodeResult, edgeResult] = await Promise.all([
    executeOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM task_graph_nodes WHERE graph_id = ?`,
      [graphId]
    ),
    executeOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM task_graph_edges WHERE graph_id = ?`,
      [graphId]
    ),
  ])

  const orphans = await findOrphanNodes(graphId)

  return {
    nodeCount: nodeResult?.count || 0,
    edgeCount: edgeResult?.count || 0,
    orphanCount: orphans.length,
  }
}

// ============================================
// SubTasks ↔ Graph 変換ユーティリティ
// ============================================

/**
 * SubTasksからGraphを作成
 * 既存の sub_tasks を昇格させてGraphを作成
 */
export async function createGraphFromSubTasks(
  goalId: string,
  graphTitle: string,
  subTasks: Array<{ id: string; label: string; sort_order: number }>
): Promise<TaskGraph> {
  // Graphを作成
  const graph = await createTaskGraph({
    goal_id: goalId,
    title: graphTitle,
    graph_type: 'sequence',
    is_primary: true,
  })

  // ノードを作成
  const nodes: TaskGraphNode[] = []
  for (const subTask of subTasks) {
    const node = await createGraphNode({
      graph_id: graph.id,
      node_id: `node_${subTask.id}`,
      label: subTask.label,
      sort_order: subTask.sort_order,
      properties: {
        status: 'todo',
        priority: 'medium',
      },
    })
    nodes.push(node)
  }

  // エッジを作成（直前のノードへの依存）
  for (let i = 1; i < nodes.length; i++) {
    await createGraphEdge({
      graph_id: graph.id,
      from_node_id: nodes[i - 1].node_id,
      to_node_id: nodes[i].node_id,
      edge_type: 'sequence',
    })
  }

  return graph
}

/**
 * GraphからSubTasks形式に変換（トポロジカルソート）
 */
export async function convertGraphToSubTasks(
  graphId: string
): Promise<Array<{ node_id: string; label: string; sort_order: number }>> {
  const { nodes, edges } = await getTaskGraphWithNodesAndEdges(graphId)

  // トポロジカルソート（Kahnのアルゴリズム）
  const inDegree = new Map<string, number>()
  const adjList = new Map<string, string[]>()

  // 初期化
  for (const node of nodes) {
    inDegree.set(node.node_id, 0)
    adjList.set(node.node_id, [])
  }

  // 依存関係を構築
  for (const edge of edges) {
    const list = adjList.get(edge.from_node_id) || []
    list.push(edge.to_node_id)
    adjList.set(edge.from_node_id, list)
    inDegree.set(edge.to_node_id, (inDegree.get(edge.to_node_id) || 0) + 1)
  }

  // 0入力のノードから開始
  const queue: string[] = []
  const inDegreeEntries = Array.from(inDegree.entries())
  for (const [nodeId, degree] of inDegreeEntries) {
    if (degree === 0) {
      queue.push(nodeId)
    }
  }

  const sorted: Array<{ node_id: string; label: string; sort_order: number }> = []
  let sortOrder = 0

  while (queue.length > 0) {
    const nodeId = queue.shift()!
    const node = nodes.find((n) => n.node_id === nodeId)
    if (node) {
      sorted.push({
        node_id: nodeId,
        label: node.label,
        sort_order: sortOrder++,
      })
    }

    const neighbors = adjList.get(nodeId) || []
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) {
        queue.push(neighbor)
      }
    }
  }

  // 循環がある場合は元のsort_orderを使用
  if (sorted.length !== nodes.length) {
    return nodes
      .map((node) => ({
        node_id: node.node_id,
        label: node.label,
        sort_order: node.sort_order,
      }))
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  return sorted
}
