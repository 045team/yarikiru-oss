import { auth } from '@/lib/auth-stub'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getTursoClient as createClient } from '../../lib/turso/client'
import { AppNav } from '@/components/layout/app-nav'
import { Sparkles, Clock, Target, ArrowRight } from 'lucide-react'

/**
 * Goals List Page (Server Component)
 *
 * Displays all user goals/projects from Turso database with AI time predictions.
 */
export default async function GoalsListPage() {
  const { userId } = await auth()

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">サインインしてください</p>
      </div>
    )
  }

  // Fetch projects and goals directly from Turso (server-side)
  let projects: Array<{
    id: string
    title: string
    description: string | null
    status: string
    createdAt: string
    goals: Array<{
      id: string
      title: string
      description: string | null
      status: string
      time: number
      actualMinutes: number | null
      aiPredictedMinutes: number | null
      priority: number
      subTasks: Array<{ id: string; label: string; isDone: boolean }>
      totalTasks: number
      completedTasks: number
    }>
    progress: { total: number; done: number; percentage: number }
  }> = []

  try {
    const db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })

    // プロジェクト一覧を取得
    const projectsResult = await db.execute({
      sql: `
        SELECT id, title, description, status, created_at
        FROM yarikiru_projects
        WHERE user_id = ? AND (status IS NULL OR status != 'archived')
        ORDER BY created_at DESC
      `,
      args: [userId],
    })

    for (const row of projectsResult.rows) {
      const projectId = row[0] as string
      const goalsResult = await db.execute({
        sql: `
          SELECT id, title, description, status, estimated_minutes, actual_minutes, ai_predicted_minutes, priority
          FROM yarikiru_goals
          WHERE project_id = ?
          ORDER BY CASE WHEN status = 'done' THEN 1 ELSE 0 END ASC, priority DESC, sort_order ASC, created_at ASC
        `,
        args: [projectId],
      })

      let totalGoals = goalsResult.rows.length
      let doneGoals = 0

      const goals = await Promise.all(
        goalsResult.rows.map(async (gRow) => {
          const goalId = gRow[0] as string
          const subResult = await db.execute({
            sql: `
              SELECT id, label, is_done
              FROM yarikiru_sub_tasks
              WHERE goal_id = ?
              ORDER BY sort_order ASC, created_at ASC
            `,
            args: [goalId],
          })
          const subTasks = subResult.rows.map((s) => ({
            id: String(s[0] ?? ''),
            label: String(s[1] ?? ''),
            isDone: (s[2] as number) === 1,
          }))
          const status = String(gRow[3] ?? 'todo')
          if (status === 'done') doneGoals++

          return {
            id: String(goalId),
            title: String(gRow[1] ?? ''),
            description: gRow[2] ? String(gRow[2]) : null,
            status: String(gRow[3] ?? 'todo'),
            time: Number(gRow[4]) || 30,
            actualMinutes: gRow[5] ? Number(gRow[5]) : null,
            aiPredictedMinutes: gRow[6] ? Number(gRow[6]) : null,
            priority: Number(gRow[7]) || 0,
            subTasks,
            totalTasks: subTasks.length,
            completedTasks: subTasks.filter(s => s.isDone).length,
          }
        })
      )

      projects.push({
        id: projectId,
        title: row[1] as string,
        description: row[2] ? String(row[2]) : null,
        status: String(row[3] ?? 'active'),
        createdAt: row[4] as string,
        goals,
        progress: {
          total: totalGoals,
          done: doneGoals,
          percentage: totalGoals > 0 ? Math.round((doneGoals / totalGoals) * 100) : 0,
        },
      })
    }
  } catch (error) {
    console.error('Failed to fetch projects:', error)
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '進行中'
      case 'todo': return '未着手'
      case 'in_progress': return '進行中'
      case 'done': return '完了'
      case 'blocked': return 'ブロック中'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'in_progress': return 'bg-primary/15 text-primary'
      case 'done': return 'bg-green-100 text-green-800'
      case 'blocked': return 'bg-red-100 text-red-800'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  // 時間フォーマット関数
  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}分`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) {
      return `${hours}時間`
    }
    return `${hours}時間${mins}分`
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">目標一覧</h2>
            <p className="mt-1 text-muted-foreground">
              ビジネス目標を管理し、進捗を追跡します
            </p>
          </div>
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h2l2 6h10l2-6h2M3 12l2-6m14 6l2-6M9 5h6M9 5v6m0-6h6" />
              </svg>
              ダッシュボードへ
            </Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <Card className="p-8 text-center sm:p-12">
            <div className="mx-auto max-w-md">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">
                まだプロジェクトがありません
              </h3>
              <p className="mb-6 text-muted-foreground">
                ダッシュボードから新しいプロジェクトを作成しましょう
              </p>
              <Link href="/dashboard">
                <Button variant="cta">
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  ダッシュボードを開く
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-8">
            {projects.map((project) => (
              <div key={project.id} className="rounded-xl border border-border bg-card p-6">
                {/* プロジェクトヘッダー */}
                <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{project.title}</h3>
                    {project.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
                    )}
                  </div>
                  {project.progress.total > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${project.progress.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {project.progress.done} / {project.progress.total}
                      </span>
                    </div>
                  )}
                </div>

                {/* ゴール一覧 */}
                <div className="space-y-4">
                  {project.goals.map((goal) => {
                    const progressPercent = goal.totalTasks > 0
                      ? Math.round((goal.completedTasks / goal.totalTasks) * 100)
                      : 0

                    return (
                      <Card
                        key={goal.id}
                        className={`p-4 transition-colors duration-200 hover:border-primary/40 ${
                          goal.status === 'done' ? 'opacity-60' : ''
                        }`}
                      >
                        <Link href={`/dashboard?focus=${goal.id}`} className="block">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <h4 className={`text-base font-semibold text-foreground ${
                                  goal.status === 'done' ? 'line-through' : ''
                                }`}>
                                  {goal.title}
                                </h4>
                                <span className={`flex-shrink-0 rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(goal.status)}`}>
                                  {getStatusLabel(goal.status)}
                                </span>
                              </div>

                              {goal.description && (
                                <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{goal.description}</p>
                              )}

                              {/* サブタスク進捗 */}
                              {goal.totalTasks > 0 && (
                                <div className="mb-3">
                                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                                    <span>進捗</span>
                                    <span>{goal.completedTasks} / {goal.totalTasks} ({progressPercent}%)</span>
                                  </div>
                                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                      className="h-full rounded-full bg-primary transition-all duration-300"
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* メタ情報 */}
                              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>見積: {formatMinutes(goal.time)}</span>
                                </div>

                                {/* AI推定バッジ */}
                                {goal.aiPredictedMinutes !== null && goal.aiPredictedMinutes > 0 && (
                                  <div
                                    className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                                      Math.abs(goal.aiPredictedMinutes - goal.time) > goal.time * 0.3
                                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                                        : 'border-primary/20 bg-primary/5 text-primary'
                                    }`}
                                    title="過去の実績からAIが予測した時間"
                                  >
                                    <Sparkles className="h-3 w-3" />
                                    <span>AI推定: {formatMinutes(goal.aiPredictedMinutes)}</span>
                                  </div>
                                )}

                                {goal.actualMinutes && (
                                  <span className="flex items-center gap-1">
                                    <span>実績: {formatMinutes(goal.actualMinutes)}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex-shrink-0">
                              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                詳細
                                <ArrowRight className="ml-1 h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Link>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
