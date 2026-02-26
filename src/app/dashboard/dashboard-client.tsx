'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SignOutButton } from '@/lib/auth-stub'
import {
  Target,
  Calendar,
  BookOpen,
  Users,
  LogOut,
  BarChart2,
  Settings,
  Menu,
  X,
} from 'lucide-react'
// layout & tabs
import { ActiveTab, Project, Learning, Goal } from '@/types/dashboard'
import { GoalsContent } from '@/components/dashboard/goals-content'
import { LearningContent } from '@/components/dashboard/learning-content'
import { FocusMode } from '@/components/dashboard/focus-mode'
import { LearningModal } from '@/components/dashboard/learning-modal'
import { PlanModal } from '@/components/dashboard/plan-modal'
import { OnboardingWrapper } from '@/components/onboarding/onboarding-wrapper'
import { fireProjectEffect } from '@/lib/utils/completion-effects'
import { useGlossary } from '@/contexts/display-context'
import { ProjectSwipeCarousel } from '@/components/mobile/project-swipe-carousel'
import { QuickCaptureFab } from '@/components/mobile/quick-capture-fab'

// --- ナビゲーションアイテム ---
function NavItem({
  icon,
  label,
  isActive,
  onClick,
  glossaryLabel,
}: {
  icon: React.ReactNode
  label: string
  isActive: boolean
  onClick: () => void
  glossaryLabel?: string
}) {
  const { getDisplayTerm } = useGlossary()
  const displayLabel = glossaryLabel ? getDisplayTerm(label, glossaryLabel) : label

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center px-6 py-4 text-sm outline-none transition-all duration-300 ease-out min-h-[44px] ${isActive
        ? 'rounded-r-2xl border-l-2 border-[#d97756] bg-white/60 text-gray-900 shadow-[0_1px_4px_rgba(0,0,0,0.02)]'
        : 'border-l-2 border-transparent text-gray-500 hover:bg-gray-50/50 hover:text-gray-800'
        }`}
    >
      <span className={`mr-4 ${isActive ? 'text-[#d97756] opacity-100' : 'opacity-60'}`}>
        {icon}
      </span>
      <span className="tracking-wide font-light">{displayLabel}</span>
    </button>
  )
}

// --- メイン ---
export function DashboardClient() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ActiveTab>('goals')
  const [focusTask, setFocusTask] = useState<Goal | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [learnings, setLearnings] = useState<Learning[]>([])
  const [googleConnected, setGoogleConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  // 学び入力モーダル状態
  const [learningModal, setLearningModal] = useState<{ goalId: string; goalTitle: string } | null>(null)
  // 計画モーダル状態
  const [planModalOpen, setPlanModalOpen] = useState(false)
  // オンボーディング状態
  const [showOnboarding, setShowOnboarding] = useState(false)
  // サイドバー開閉状態（モバイル用）
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const refreshProjects = async () => {
    try {
      const res = await fetch('/api/projects', { credentials: 'same-origin' })
      if (!res.ok) {
        const text = await res.text()
        console.error('Projects API Error:', res.status, text)
        throw new Error(`サーバーエラーが発生しました (${res.status})`)
      }
      const data = await res.json()
      if (data.projects) {
        const loadedProjects: Project[] = data.projects

        // プロジェクト完了を検知してエフェクト発火
        if (projects.length > 0) {
          loadedProjects.forEach(newProj => {
            const oldProj = projects.find(p => p.id === newProj.id)
            if (oldProj) {
              const wasCompleted = oldProj.goals && oldProj.goals.length > 0 && oldProj.goals.every((g: Goal) => g.status === 'done')
              const isCompleted = newProj.goals && newProj.goals.length > 0 && newProj.goals.every((g: Goal) => g.status === 'done')
              if (!wasCompleted && isCompleted) {
                fireProjectEffect()
              }
            }
          })
        }

        setProjects(loadedProjects)
        // Current Focus ゴール（先頭プロジェクトの先頭未完了ゴール）の AI 予測を自動取得
        const focusGoal = loadedProjects[0]?.goals?.find(g => g.status !== 'done')
        if (focusGoal && focusGoal.aiPredictedMinutes == null) {
          fetch(`/api/goals/${focusGoal.id}/time-prediction`, { credentials: 'same-origin' })
            .then(r => r.ok ? r.json() : null)
            .then(pred => {
              if (pred?.predictedMinutes != null) {
                setProjects(prev => prev.map((p, pi) =>
                  pi !== 0 ? p : {
                    ...p,
                    goals: p.goals.map(g =>
                      g.id === focusGoal.id ? { ...g, aiPredictedMinutes: pred.predictedMinutes } : g
                    ),
                  }
                ))
              }
            })
            .catch(() => { })
        }
      }
    } catch (e) {
      console.error('Failed to fetch projects:', e)
    }
  }

  const refreshLearnings = async () => {
    try {
      const res = await fetch('/api/learnings', { credentials: 'same-origin' })
      const data = await res.json()
      if (data.learnings) setLearnings(data.learnings)
    } catch (e) {
      console.error('Failed to fetch learnings:', e)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [pRes, lRes, iRes] = await Promise.all([
          fetch('/api/projects', { credentials: 'same-origin' }),
          fetch('/api/learnings', { credentials: 'same-origin' }),
          fetch('/api/calendar/integration', { credentials: 'same-origin' }),
        ])
        const pData = await pRes.json()
        const lData = await lRes.json()
        const iData = await iRes.json()
        if (!cancelled) {
          if (pData.projects) {
            const loadedProjects: Project[] = pData.projects
            setProjects(loadedProjects)

            // オンボーディング表示判定
            const onboardingCompleted = localStorage.getItem('yarikiru_onboarding_completed')
            const totalGoals = loadedProjects.reduce((sum, p) => sum + (p.goals?.length || 0), 0)
            if (!onboardingCompleted && totalGoals === 0) {
              setShowOnboarding(true)
            }
            // Current Focus ゴールの AI 予測を自動取得
            const focusGoal = loadedProjects[0]?.goals?.find((g: Goal) => g.status !== 'done')
            if (focusGoal && focusGoal.aiPredictedMinutes == null) {
              fetch(`/api/goals/${focusGoal.id}/time-prediction`, { credentials: 'same-origin' })
                .then(r => r.ok ? r.json() : null)
                .then(pred => {
                  if (pred?.predictedMinutes != null && !cancelled) {
                    setProjects(prev => prev.map((p, pi) =>
                      pi !== 0 ? p : {
                        ...p,
                        goals: p.goals.map((g: Goal) =>
                          g.id === focusGoal.id ? { ...g, aiPredictedMinutes: pred.predictedMinutes } : g
                        ),
                      }
                    ))
                  }
                })
                .catch(() => { })
            }
            // YARIKIRU プロジェクトがあればタスクを最新化
            const hasYarikiru = pData.projects.some(
              (p: Project) => p.title?.includes('YARIKIRU') && p.goals?.some((g: Goal) => g.title === 'カレンダーの実装')
            )
            if (hasYarikiru) {
              fetch('/api/seed/yarikiru-project/sync-tasks', {
                method: 'POST',
                credentials: 'same-origin',
              })
                .then((r) => r.json())
                .then((sync) => {
                  if (sync?.success && !cancelled) refreshProjects()
                })
                .catch(() => { })
            }
            // プロジェクトが空なら YARIKIRU をやり切る を初期追加
            if (pData.projects.length === 0) {
              const seedRes = await fetch('/api/seed/yarikiru-project', {
                method: 'POST',
                credentials: 'same-origin',
              })
              if (seedRes.ok) {
                const seedData = await seedRes.json()
                if (seedData.project) {
                  setProjects([seedData.project])
                } else {
                  const refetchRes = await fetch('/api/projects', { credentials: 'same-origin' })
                  const refetchData = await refetchRes.json()
                  if (!cancelled && refetchData.projects?.length) setProjects(refetchData.projects)
                }
              }
            }
          }
          if (lData.learnings) setLearnings(lData.learnings)
          if (iData.connected) setGoogleConnected(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    const interval = setInterval(() => {
      refreshProjects()
      refreshLearnings()
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const handleCreateGoalFromPlan = async (plan: {
    title: string
    projectId: string
    description?: string
    estimatedMinutes: number
    subTasks: Array<{ label: string; estimatedMinutes: number }>
  }) => {
    const res = await fetch('/api/goals/create-from-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(plan),
    })

    if (!res.ok) {
      if (res.status === 403) {
        const err = await res.json().catch(() => ({}))
        if (err.needsUpgrade) {
          alert('【アップグレードのお知らせ】\n無料プランでの目標作成上限（3件）に達しました。\n目標を無制限に作成するには、Yarikiru Proへのアップグレードをお願いします！')
          router.push('/settings/billing')
          return
        }
      }
      throw new Error('Failed to create goal')
    }

    await refreshProjects()
  }

  const handleSubTaskToggle = async (id: string, isDone: boolean) => {
    const res = await fetch(`/api/sub-tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ isDone }),
    })
    if (!res.ok) return
    setProjects((prev) =>
      prev.map((p) => ({
        ...p,
        goals: p.goals.map((g) => ({
          ...g,
          subTasks: g.subTasks.map((s) =>
            s.id === id ? { ...s, isDone } : s
          ),
        })),
      }))
    )
    router.refresh()
  }

  const handleUndoGoal = async (goalId: string) => {
    try {
      const res = await fetch(`/api/goals/${goalId}/undo`, {
        method: 'POST',
        credentials: 'same-origin',
      })
      if (!res.ok) throw new Error('Failed to undo goal')
      await refreshProjects()
    } catch (e) {
      console.error(e)
    }
  }

  const handleArchiveProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/archive`, {
        method: 'POST',
        credentials: 'same-origin',
      })
      if (!res.ok) throw new Error('Failed to archive project')
      await refreshProjects()
    } catch (e) {
      console.error(e)
    }
  }

  const handleScheduleTomorrow = async () => {
    const res = await fetch('/api/calendar/events/schedule-tasks', {
      method: 'POST',
      credentials: 'same-origin',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error || 'Failed to schedule')
    }
  }

  const handleAddToCalendar = async (title: string, durationMinutes = 45) => {
    const res = await fetch('/api/calendar/events/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ title, durationMinutes }),
    })
    if (!res.ok) throw new Error('Failed to add to calendar')
  }

  const handleAddLearning = async (url: string) => {
    const res = await fetch('/api/learnings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ url }),
    })
    if (!res.ok) throw new Error('Failed to create learnings')
    const data = await res.json()
    if (data.learning) {
      setLearnings((prev) => [data.learning, ...(prev || [])])
    }
  }

  const handleMarkGoalComplete = async (goalId: string, learning?: string) => {
    try {
      const res = await fetch(`/api/goals/${goalId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ learning }),
      })
      if (!res.ok) {
        const errHtml = await res.text()
        console.error('Complete Goal API Error:', res.status, errHtml)
        alert('エラー: 目標の完了に失敗しました。詳細をConsoleで確認してください。')
        return
      }
      await refreshProjects()
    } catch (e) {
      console.error('Failed to mark goal complete network error:', e)
    }
  }

  const handleCompleteGoalRequest = (goalId: string, goalTitle: string) => {
    setLearningModal({ goalId, goalTitle })
  }

  const handleLearningConfirm = async (learning: string) => {
    if (!learningModal) return
    const { goalId } = learningModal
    setLearningModal(null)
    setFocusTask(null)
    await handleMarkGoalComplete(goalId, learning || undefined)
  }

  const handleStartUrgentNow = async (goal: Goal) => {
    const durationMinutes = goal.time || 60
    const res = await fetch('/api/calendar/events/insert-urgent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        title: goal.title,
        start: new Date().toISOString(),
        durationMinutes,
        description: `緊急タスク: ${goal.title}`,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error || 'Failed to insert urgent event')
    }
    setFocusTask(null)
    setActiveTab('calendar')
  }

  const handleOpenPlanModal = () => {
    setShowOnboarding(false)
    setPlanModalOpen(true)
  }

  // 思いつきキャプチャーハンドラー
  const handleQuickCapture = async (text: string) => {
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ title: text.slice(0, 50), description: text }),
      })

      if (!res.ok) throw new Error('Failed to save idea')

      // 成功したらideasページへ誘導
      if (confirm('思いつきを保存しました！\nアイデア一覧ページを開きますか？')) {
        router.push('/ideas')
      }
    } catch (error) {
      console.error('Failed to capture idea:', error)
      alert('保存に失敗しました')
    }
  }

  // プロジェクト切り替えハンドラー
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0)
  const handleProjectChange = (project: Project) => {
    const index = projects.findIndex(p => p.id === project.id)
    if (index !== -1) {
      setCurrentProjectIndex(index)
    }
  }

  if (focusTask) {
    return (
      <>
        <FocusMode
          task={focusTask}
          onExit={() => setFocusTask(null)}
          onSubTaskToggle={handleSubTaskToggle}
          onMarkComplete={async (goalId) => { handleCompleteGoalRequest(goalId, focusTask.title) }}
          onStartUrgentNow={handleStartUrgentNow}
        />
        {learningModal && (
          <LearningModal
            goalTitle={learningModal.goalTitle}
            onConfirm={handleLearningConfirm}
            onSkip={() => handleLearningConfirm('')}
            onCancel={() => setLearningModal(null)}
          />
        )}
      </>
    )
  }

  // オンボーディング表示
  if (showOnboarding) {
    return (
      <OnboardingWrapper
        onComplete={() => {
          setShowOnboarding(false)
          refreshProjects()
        }}
        onSkip={() => {
          setShowOnboarding(false)
        }}
        onCreateGoal={async (plan) => {
          await handleCreateGoalFromPlan(plan)
          refreshProjects()
        }}
        onCreateAnother={handleOpenPlanModal}
        existingGoalsCount={projects.reduce((sum, p) => sum + (p.goals?.length || 0), 0)}
      />
    )
  }

  return (
    <div className="relative flex h-screen max-w-[100vw] mx-auto overflow-hidden md:max-w-[1400px]">
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.3]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #e8e6e1 1px, transparent 1px), linear-gradient(to bottom, #e8e6e1 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* モバイル用プロジェクトスワイプカルーセル */}
      {projects.length > 0 && (
        <ProjectSwipeCarousel
          projects={projects}
          onProjectChange={handleProjectChange}
          onCreateProject={handleOpenPlanModal}
        />
      )}

      {/* モバイル用クイックキャプチャーFAB */}
      <QuickCaptureFab onCapture={handleQuickCapture} />

      <div className="relative z-10 flex h-screen w-full">
        {/* モバイルヘッダー */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-[#faf9f5]/95 backdrop-blur-sm px-4 py-3 border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="メニューを開く"
          >
            <Menu size={24} strokeWidth={1.5} />
          </button>
          <img
            src="/logo.png"
            alt="YARIKIRU"
            className="h-8 w-auto"
          />
          <div className="w-10" /> {/* スペーサー */}
        </div>

        {/* オーバーレイ（モバイル用） */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* サイドバー */}
        <nav className={`
          fixed md:relative z-50 md:z-auto
          flex h-screen w-[80vw] max-w-[280px] md:w-64
          flex-shrink-0 flex-col bg-[#faf9f5]/95 md:bg-[#faf9f5]/80
          py-16 md:py-16 pr-6 backdrop-blur-sm
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          {/* 閉じるボタン（モバイルのみ） */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="メニューを閉じる"
          >
            <X size={24} strokeWidth={1.5} />
          </button>
          <div className="mb-16 px-6">
            <img
              src="/logo.png"
              alt="YARIKIRU Logo"
              className="h-auto w-full max-w-full"
            />
          </div>

          <div className="flex flex-col space-y-1">
            <NavItem
              icon={<Target size={16} strokeWidth={1.5} aria-hidden />}
              label="目標"
              glossaryLabel="Goal"
              isActive={activeTab === 'goals'}
              onClick={() => setActiveTab('goals')}
            />
            <NavItem
              icon={<BookOpen size={16} strokeWidth={1.5} aria-hidden />}
              label="メモ＆学習"
              isActive={activeTab === 'learning'}
              onClick={() => setActiveTab('learning')}
            />
          </div>

          <div className="mt-auto px-6">
            <div className="text-xs text-gray-400 font-light tracking-widest uppercase mb-2 ml-1">
              YARIKIRU OSS v5.0
            </div>
            <div className="text-[10px] text-gray-400/60 ml-1">
              Local-First GSD Tool
            </div>
          </div>
        </nav>

        {/* メインコンテンツ */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pt-16 md:pt-0">
          <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-6 md:px-12 md:py-24">
            {activeTab === 'goals' && (
              <>
                <GoalsContent
                  projects={projects}
                  isLoading={loading}
                  googleConnected={googleConnected}
                  onStartFocus={setFocusTask}
                  onSubTaskToggle={handleSubTaskToggle}
                  onAddToCalendar={handleAddToCalendar}
                  onScheduleTomorrow={handleScheduleTomorrow}
                  onRefresh={refreshProjects}
                  onCompleteGoal={handleCompleteGoalRequest}
                  onUndoGoal={handleUndoGoal}
                  onOpenPlanModal={() => setPlanModalOpen(true)}
                  onArchiveProject={handleArchiveProject}
                />
                {learningModal && (
                  <LearningModal
                    goalTitle={learningModal.goalTitle}
                    onConfirm={handleLearningConfirm}
                    onSkip={() => handleLearningConfirm('')}
                    onCancel={() => setLearningModal(null)}
                  />
                )}
                <PlanModal
                  isOpen={planModalOpen}
                  onClose={() => setPlanModalOpen(false)}
                  onCreateGoal={handleCreateGoalFromPlan}
                />
              </>
            )}
            {activeTab === 'learning' && (
              <LearningContent
                learnings={learnings}
                onAddUrl={handleAddLearning}
                onRefresh={refreshLearnings}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
