import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../lib/turso/client'
import { Card } from '@/components/ui/card'
import { GoalDetailClient } from './goal-detail-client'
import { AppNav } from '@/components/layout/app-nav'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * Goal Detail Page (Server Component)
 *
 * Displays detailed information about a specific goal
 * including associated tasks with completion tracking.
 */
interface Task {
  id: string
  title: string
  estimatedMinutes: number
  priority: string
  isCompleted: boolean
  isUrgent: boolean
  scheduledDate: string | null
}

interface Goal {
  id: string
  title: string
  description: string | null
  deadline: string | null
  status: string
  createdAt: string
  updatedAt: string
}

async function getGoalWithTasks(goalId: string): Promise<{ goal: Goal | null; tasks: Task[] }> {
  try {
    const url = process.env.TURSO_DATABASE_URL
    const token = process.env.TURSO_AUTH_TOKEN
    if (!url || !token) {
      console.error('[goals/[id]] TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set')
      return { goal: null, tasks: [] }
    }
    const db = createClient({ url, authToken: token })

    // Get goal
    const goalResult = await db.execute({
      sql: 'SELECT id, title, description, deadline, status, created_at, updated_at FROM goals WHERE id = ?',
      args: [goalId],
    })

    if (goalResult.rows.length === 0) {
      return { goal: null, tasks: [] }
    }

    // libsql は列名でオブジェクトを返す
    const row = goalResult.rows[0] as Record<string, unknown>
    const g = (k: string, i: number) => row[k] ?? (Array.isArray(row) ? row[i] : null)
    const goal: Goal = {
      id: String(g('id', 0)),
      title: String(g('title', 1)),
      description: (g('description', 2) ?? null) as string | null,
      deadline: (g('deadline', 3) ?? null) as string | null,
      status: String(g('status', 4)),
      createdAt: String(g('created_at', 5) ?? ''),
      updatedAt: String(g('updated_at', 6) ?? ''),
    }

    // Get tasks
    const tasksResult = await db.execute({
      sql: 'SELECT id, title, estimated_minutes, priority, is_completed, is_urgent, scheduled_date FROM generated_tasks WHERE goal_id = ? ORDER BY created_at ASC',
      args: [goalId],
    })

    const tasks: Task[] = tasksResult.rows.map((taskRow: unknown) => {
      const r = taskRow as Record<string, unknown>
      const v = (k: string, i: number) => r[k] ?? (Array.isArray(r) ? r[i] : null)
      return {
        id: String(v('id', 0)),
        title: String(v('title', 1)),
        estimatedMinutes: Number(v('estimated_minutes', 2) ?? 15),
        priority: String(v('priority', 3) ?? 'medium'),
        isCompleted: v('is_completed', 4) === 1,
        isUrgent: v('is_urgent', 5) === 1,
        scheduledDate: (v('scheduled_date', 6) ?? null) as string | null,
      }
    })

    return { goal, tasks }
  } catch (error) {
    console.error('Failed to fetch goal:', error)
    return { goal: null, tasks: [] }
  }
}

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { userId } = await auth()
  const { id: goalId } = await params

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">サインインして目標の詳細を表示してください</p>
      </div>
    )
  }

  const { goal, tasks } = await getGoalWithTasks(goalId)

  if (!goal) {
    notFound()
  }

  const completedCount = tasks.filter(t => t.isCompleted).length
  const totalCount = tasks.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-primary/15 text-primary'
      case 'planning':
        return 'bg-teal-100 text-teal-800'
      case 'completed':
        return 'bg-muted text-muted-foreground'
      case 'on_hold':
        return 'bg-accent/15 text-accent'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/goals"
            className="text-sm text-primary transition-colors duration-200 hover:opacity-80"
          >
            ← 目標一覧に戻る
          </Link>
        </div>

        {/* Goal Details */}
        <Card className="mb-6 p-8">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-3">
                <h2 className="text-3xl font-bold text-foreground">{goal.title}</h2>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(goal.status)}`}>
                  {goal.status === 'active' ? '進行中' : goal.status === 'planning' ? '計画中' : goal.status === 'completed' ? '完了' : goal.status}
                </span>
              </div>
              {goal.description && (
                <p className="mt-2 text-muted-foreground">{goal.description}</p>
              )}
            </div>
          </div>

          {totalCount > 0 && (
            <div className="mb-6">
              <div className="mb-2 flex justify-between text-sm text-muted-foreground">
                <span>進捗</span>
                <span>{completedCount} / {totalCount} タスク完了 ({progressPercent}%)</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 border-t border-border pt-6 md:grid-cols-3">
            {goal.deadline && (
              <div>
                <p className="mb-1 text-sm font-medium text-muted-foreground">期限</p>
                <p className="text-foreground">
                  {new Date(goal.deadline).toLocaleDateString('ja-JP')}
                </p>
              </div>
            )}
            <div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">総推定時間</p>
              <p className="text-foreground">
                {tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)} 分
                （約 {Math.round(tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0) / 15 * 10) / 10} 時間）
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">完了タスク</p>
              <p className="text-foreground">
                {completedCount} / {totalCount}
              </p>
            </div>
          </div>
        </Card>

        {/* Tasks Section - Client Component */}
        <GoalDetailClient goalId={goal.id} goalTitle={goal.title} tasks={tasks} />
      </main>
    </div>
  )
}
