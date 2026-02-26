/**
 * Server-side dashboard data fetching
 *
 * Used by server components to fetch goals and stats directly from the database.
 * Avoids server-to-self fetch which fails to pass auth cookies.
 */
import { getTursoClient as createClient } from './turso/client'

export interface DashboardGoal {
  id: string
  title: string
  description: string | null
  deadline: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export interface DashboardStats {
  activeGoals: number
  totalTasks: number
  completedTasks: number
  completionRate: number
}

export async function getGoalsForUser(userId: string): Promise<DashboardGoal[]> {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })

  const result = await db.execute({
    sql: `SELECT id, title, description, deadline, status, created_at, updated_at
           FROM goals WHERE user_id = ? AND status != 'archived'
           ORDER BY created_at DESC`,
    args: [userId],
  })

  return result.rows.map((row) => ({
    id: row[0] as string,
    title: row[1] as string,
    description: row[2] as string | null,
    deadline: row[3] as string | null,
    status: row[4] as string,
    createdAt: String(row[5] ?? ''),
    updatedAt: String(row[6] ?? ''),
  }))
}

export async function getStatsForUser(userId: string): Promise<DashboardStats> {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  })

  const goalsResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM goals WHERE user_id = ? AND status = 'active'`,
    args: [userId],
  })

  const tasksResult = await db.execute({
    sql: `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN gt.is_completed = 1 THEN 1 ELSE 0 END) as completed
      FROM generated_tasks gt
      JOIN goals g ON gt.goal_id = g.id
      WHERE g.user_id = ?
    `,
    args: [userId],
  })

  const activeGoals = (goalsResult.rows[0]?.[0] as number) ?? 0
  const totalTasks = (tasksResult.rows[0]?.[0] as number) ?? 0
  const completedTasks = (tasksResult.rows[0]?.[1] as number) ?? 0
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return {
    activeGoals,
    totalTasks,
    completedTasks,
    completionRate,
  }
}
