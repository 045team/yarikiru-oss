import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../../lib/turso/client'
import { AppNav } from '@/components/layout/app-nav'
import { WorkflowVisualizationClient } from './workflow-client'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface SubTask {
  id: string
  goal_id: string
  label: string
  sort_order: number
  is_done: number
  started_at?: string
  completed_at?: string
}

interface Goal {
  id: string
  title: string
  description: string | null
  status: string
  estimatedMinutes: number | null
  actualMinutes: number | null
}

interface Project {
  id: string
  name: string
  description: string | null
}

async function getProjectWithGoals(
  projectId: string
): Promise<{ project: Project | null; goals: Goal[]; subTasks: SubTask[] }> {
  try {
    const url = process.env.TURSO_DATABASE_URL
    const token = process.env.TURSO_AUTH_TOKEN
    if (!url || !token) {
      console.error('[workflow] TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set')
      return { project: null, goals: [], subTasks: [] }
    }
    const db = createClient({ url, authToken: token })

    // Get project
    const projectResult = await db.execute({
      sql: 'SELECT id, title, description FROM yarikiru_projects WHERE id = ?',
      args: [projectId],
    })

    if (projectResult.rows.length === 0) {
      return { project: null, goals: [], subTasks: [] }
    }

    const prow = projectResult.rows[0] as Record<string, unknown>
    const project: Project = {
      id: String(prow['id'] ?? ''),
      name: String(prow['title'] ?? ''),
      description: (prow['description'] ?? null) as string | null,
    }

    // Get goals
    const goalsResult = await db.execute({
      sql: `SELECT id, title, description, status, estimated_minutes, actual_minutes
             FROM yarikiru_goals
             WHERE project_id = ?
             ORDER BY created_at ASC`,
      args: [projectId],
    })

    const goals: Goal[] = goalsResult.rows.map((row: unknown) => {
      const r = row as Record<string, unknown>
      return {
        id: String(r['id'] ?? ''),
        title: String(r['title'] ?? ''),
        description: (r['description'] ?? null) as string | null,
        status: String(r['status'] ?? ''),
        estimatedMinutes: (r['estimated_minutes'] ?? null) as number | null,
        actualMinutes: (r['actual_minutes'] ?? null) as number | null,
        deadline: (r['deadline'] ?? null) as string | null,
      }
    })

    // Get all subtasks for this project's goals
    const goalIds = goals.map(g => g.id)
    let subTasks: SubTask[] = []

    if (goalIds.length > 0) {
      const placeholders = goalIds.map(() => '?').join(',')
      const subTasksResult = await db.execute({
        sql: `SELECT id, goal_id, label, is_done, sort_order, started_at, completed_at
               FROM yarikiru_sub_tasks
               WHERE goal_id IN (${placeholders})
               ORDER BY sort_order ASC`,
        args: goalIds,
      })

      subTasks = subTasksResult.rows.map((row: unknown) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r['id'] ?? ''),
          goal_id: String(r['goal_id'] ?? ''),
          label: String(r['label'] ?? ''),
          sort_order: Number(r['sort_order'] ?? 0),
          is_done: Number(r['is_done'] ?? 0),
          started_at: (r['started_at'] ?? null) as string | undefined,
          completed_at: (r['completed_at'] ?? null) as string | undefined,
        }
      })
    }

    return { project, goals, subTasks }
  } catch (error) {
    console.error('Failed to fetch project:', error)
    return { project: null, goals: [], subTasks: [] }
  }
}

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { userId } = await auth()
  const { id: projectId } = await params

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">サインインしてワークフローを表示してください</p>
      </div>
    )
  }

  const { project, goals, subTasks } = await getProjectWithGoals(projectId)

  if (!project) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-primary transition-colors duration-200 hover:opacity-80"
          >
            ← ダッシュボードに戻る
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
          {project.description && (
            <p className="mt-2 text-muted-foreground">{project.description}</p>
          )}
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">中目標</p>
            <p className="text-2xl font-bold text-foreground">{goals.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">サブタスク</p>
            <p className="text-2xl font-bold text-foreground">{subTasks.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">完了済み</p>
            <p className="text-2xl font-bold text-foreground">
              {subTasks.filter(t => t.is_done === 1).length}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">進捗率</p>
            <p className="text-2xl font-bold text-foreground">
              {subTasks.length > 0
                ? Math.round((subTasks.filter(t => t.is_done === 1).length / subTasks.length) * 100)
                : 0}%
            </p>
          </div>
        </div>

        {/* Workflow Visualization */}
        <WorkflowVisualizationClient
          projectId={projectId}
          project={project}
          goals={goals}
          subTasks={subTasks}
        />
      </main>
    </div>
  )
}
