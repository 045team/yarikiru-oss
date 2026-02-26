import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../../../lib/turso/client'
import type {
  TaskGraphInsert,
  TaskGraphNodeInsert,
  TaskGraphEdgeInsert,
  TaskGraphNode,
  TaskGraphEdge,
} from '@/lib/turso/graphs'
import { encryptForDb, decryptFromDb } from '@/lib/e2ee'

/**
 * GET /api/goals/[goalId]/graph
 * Goalに関連するGraphを取得（nodes/edgesを含む）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { goalId } = await params

  try {
    const db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })

    // Goalの所有権を確認
    const goalCheck = await db.execute({
      sql: `
        SELECT g.id FROM yarikiru_goals g
        JOIN yarikiru_projects p ON g.project_id = p.id
        WHERE g.id = ? AND p.user_id = ?
      `,
      args: [goalId, userId],
    })

    if (goalCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Goal not found or unauthorized' }, { status: 403 })
    }

    // Graphを取得（is_primaryがtrueのものを優先）
    const graphResult = await db.execute({
      sql: `
        SELECT * FROM task_graphs
        WHERE goal_id = ?
        ORDER BY is_primary DESC, created_at DESC
        LIMIT 1
      `,
      args: [goalId],
    })

    if (graphResult.rows.length === 0) {
      return NextResponse.json({ graph: null, nodes: [], edges: [] })
    }

    const graphRow = graphResult.rows[0]
    const graphId = String(graphRow[0])

    // Nodesを取得
    const nodesResult = await db.execute({
      sql: `
        SELECT * FROM task_graph_nodes
        WHERE graph_id = ?
        ORDER BY sort_order ASC
      `,
      args: [graphId],
    })

    // Edgesを取得
    const edgesResult = await db.execute({
      sql: `
        SELECT * FROM task_graph_edges
        WHERE graph_id = ?
        ORDER BY created_at ASC
      `,
      args: [graphId],
    })

    const graph = {
      id: String(graphRow[0]),
      goal_id: String(graphRow[1]),
      title: await decryptFromDb(String(graphRow[2])),
      description: graphRow[3] ? await decryptFromDb(String(graphRow[3])) : null,
      graph_type: String(graphRow[4]),
      is_primary: Number(graphRow[5]) === 1,
      created_at: String(graphRow[6]),
      updated_at: String(graphRow[7]),
    }

    const nodes = await Promise.all(nodesResult.rows.map(async (row) => {
      const node: TaskGraphNode = {
        id: String(row[0]),
        graph_id: String(row[1]),
        node_id: String(row[2]),
        label: await decryptFromDb(String(row[3])),
        description: row[4] ? await decryptFromDb(String(row[4])) : undefined,
        sort_order: Number(row[5]),
        properties: row[6] ? JSON.parse(String(row[6])) : { status: 'todo' },
        x: row[7] ? Number(row[7]) : undefined,
        y: row[8] ? Number(row[8]) : undefined,
        started_at: row[9] ? String(row[9]) : undefined,
        completed_at: row[10] ? String(row[10]) : undefined,
        created_at: String(row[11]),
      }
      return node
    }))

    const edges = edgesResult.rows.map((row) => {
      const edge: TaskGraphEdge = {
        id: String(row[0]),
        graph_id: String(row[1]),
        from_node_id: String(row[2]),
        to_node_id: String(row[3]),
        edge_type: String(row[4]) as any,
        condition: row[5] ? JSON.parse(String(row[5])) : {},
        label: row[6] ? String(row[6]) : undefined,
        created_at: String(row[7]),
      }
      return edge
    })

    return NextResponse.json({ graph, nodes, edges })
  } catch (error) {
    console.error('Error fetching graph:', error)
    return NextResponse.json(
      { error: 'Failed to fetch graph', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/goals/[goalId]/graph
 * Graphを作成または更新
 * Body: {
 *   graph?: { title, description?, graph_type?, is_primary? }
 *   nodes?: Array<{ node_id, label, description?, sort_order?, properties, x?, y? }>
 *   edges?: Array<{ from_node_id, to_node_id, edge_type?, condition?, label? }>
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { goalId } = await params

  try {
    const body = await request.json()
    const { graph, nodes, edges } = body as {
      graph?: Partial<TaskGraphInsert>
      nodes?: TaskGraphNodeInsert[]
      edges?: TaskGraphEdgeInsert[]
    }

    const db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })

    // Goalの所有権を確認
    const goalCheck = await db.execute({
      sql: `
        SELECT g.id FROM yarikiru_goals g
        JOIN yarikiru_projects p ON g.project_id = p.id
        WHERE g.id = ? AND p.user_id = ?
      `,
      args: [goalId, userId],
    })

    if (goalCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Goal not found or unauthorized' }, { status: 403 })
    }

    let graphId: string

    // 既存のGraphを確認
    const existingGraphResult = await db.execute({
      sql: `
        SELECT id FROM task_graphs
        WHERE goal_id = ?
        ORDER BY is_primary DESC, created_at DESC
        LIMIT 1
      `,
      args: [goalId],
    })

    if (existingGraphResult.rows.length > 0) {
      // 既存Graphを更新
      graphId = String(existingGraphResult.rows[0][0])

      if (graph) {
        const fields: string[] = []
        const values: any[] = []

        if (graph.title !== undefined) {
          fields.push('title = ?')
          values.push(graph.title)
        }
        if (graph.description !== undefined) {
          fields.push('description = ?')
          values.push(graph.description)
        }
        if (graph.graph_type !== undefined) {
          fields.push('graph_type = ?')
          values.push(graph.graph_type)
        }
        if (graph.is_primary !== undefined) {
          fields.push('is_primary = ?')
          values.push(graph.is_primary ? 1 : 0)
        }

        if (fields.length > 0) {
          values.push(graphId)
          await db.execute({
            sql: `UPDATE task_graphs SET ${fields.join(', ')} WHERE id = ?`,
            args: values,
          })
        }
      }

      // 既存のNodesとEdgesを削除（再構築）
      await db.execute({
        sql: `DELETE FROM task_graph_nodes WHERE graph_id = ?`,
        args: [graphId],
      })
      // EdgesはCASCADEで削除される
    } else {
      // 新規Graph作成
      graphId = `tg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
      const encTitle = graph?.title ? await encryptForDb(graph.title) : await encryptForDb('Task Graph')
      const encDesc = graph?.description ? await encryptForDb(graph.description) : null

      await db.execute({
        sql: `
          INSERT INTO task_graphs (id, goal_id, title, description, graph_type, is_primary)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        args: [
          graphId,
          goalId,
          encTitle,
          encDesc,
          graph?.graph_type || 'dag',
          graph?.is_primary ? 1 : 0,
        ],
      })
    }

    // Nodesを作成
    if (nodes && nodes.length > 0) {
      for (const node of nodes) {
        const nodeId = `tgn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
        const encLabel = await encryptForDb(node.label)
        const encDesc = node.description ? await encryptForDb(node.description) : null
        await db.execute({
          sql: `
            INSERT INTO task_graph_nodes (id, graph_id, node_id, label, description, sort_order, properties, x, y)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            nodeId,
            graphId,
            node.node_id,
            encLabel,
            encDesc,
            node.sort_order || 0,
            JSON.stringify(node.properties),
            node.x || null,
            node.y || null,
          ],
        })
      }
    }

    // Edgesを作成
    if (edges && edges.length > 0) {
      for (const edge of edges) {
        const edgeId = `tge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
        await db.execute({
          sql: `
            INSERT INTO task_graph_edges (id, graph_id, from_node_id, to_node_id, edge_type, condition, label)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            edgeId,
            graphId,
            edge.from_node_id,
            edge.to_node_id,
            edge.edge_type || 'dependency',
            JSON.stringify(edge.condition || {}),
            edge.label || null,
          ],
        })
      }
    }

    // 作成されたGraphを返却
    const [graphResult, nodesResult, edgesResult] = await Promise.all([
      db.execute({ sql: `SELECT * FROM task_graphs WHERE id = ?`, args: [graphId] }),
      db.execute({ sql: `SELECT * FROM task_graph_nodes WHERE graph_id = ? ORDER BY sort_order ASC`, args: [graphId] }),
      db.execute({ sql: `SELECT * FROM task_graph_edges WHERE graph_id = ? ORDER BY created_at ASC`, args: [graphId] }),
    ])

    const graphRow = graphResult.rows[0]
    const resultGraph = {
      id: String(graphRow[0]),
      goal_id: String(graphRow[1]),
      title: await decryptFromDb(String(graphRow[2])),
      description: graphRow[3] ? await decryptFromDb(String(graphRow[3])) : null,
      graph_type: String(graphRow[4]),
      is_primary: Number(graphRow[5]) === 1,
      created_at: String(graphRow[6]),
      updated_at: String(graphRow[7]),
    }

    const resultNodes = await Promise.all(nodesResult.rows.map(async (row) => ({
      id: String(row[0]),
      graph_id: String(row[1]),
      node_id: String(row[2]),
      label: await decryptFromDb(String(row[3])),
      description: row[4] ? await decryptFromDb(String(row[4])) : undefined,
      sort_order: Number(row[5]),
      properties: row[6] ? JSON.parse(String(row[6])) : { status: 'todo' },
      x: row[7] ? Number(row[7]) : undefined,
      y: row[8] ? Number(row[8]) : undefined,
      started_at: row[9] ? String(row[9]) : undefined,
      completed_at: row[10] ? String(row[10]) : undefined,
      created_at: String(row[11]),
    })))

    const resultEdges = edgesResult.rows.map((row) => ({
      id: String(row[0]),
      graph_id: String(row[1]),
      from_node_id: String(row[2]),
      to_node_id: String(row[3]),
      edge_type: String(row[4]),
      condition: row[5] ? JSON.parse(String(row[5])) : {},
      label: row[6] ? String(row[6]) : undefined,
      created_at: String(row[7]),
    }))

    return NextResponse.json({ graph: resultGraph, nodes: resultNodes, edges: resultEdges })
  } catch (error) {
    console.error('Error creating/updating graph:', error)
    return NextResponse.json(
      { error: 'Failed to create/update graph', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/goals/[goalId]/graph
 * Goalに関連するGraphを削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { goalId } = await params

  try {
    const db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })

    // Goalの所有権を確認
    const goalCheck = await db.execute({
      sql: `
        SELECT g.id FROM yarikiru_goals g
        JOIN yarikiru_projects p ON g.project_id = p.id
        WHERE g.id = ? AND p.user_id = ?
      `,
      args: [goalId, userId],
    })

    if (goalCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Goal not found or unauthorized' }, { status: 403 })
    }

    // Graphを削除（CASCADEでNodesとEdgesも削除）
    await db.execute({
      sql: `DELETE FROM task_graphs WHERE goal_id = ?`,
      args: [goalId],
    })

    return NextResponse.json({ success: true, message: 'Graph deleted successfully' })
  } catch (error) {
    console.error('Error deleting graph:', error)
    return NextResponse.json(
      { error: 'Failed to delete graph', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
