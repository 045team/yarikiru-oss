export type ActiveTab = 'goals' | 'calendar' | 'learning' | 'report'

export interface SubTask {
    id: string
    label: string
    isDone: boolean
}

export interface Goal {
    id: string
    title: string
    time: number
    status?: string          // 'todo' | 'in_progress' | 'done' | 'blocked'
    learning?: string | null
    actualMinutes?: number | null
    aiPredictedMinutes?: number | null   // AI時間予測（v4.0）
    priority?: number
    subTasks: SubTask[]
    isUrgent?: boolean
}

/** Phase ごとの PLAN/SUMMARY/VERIFICATION（Import 時の .planning から取得） */
export interface PhaseContent {
  plan?: string
  summary?: string
  verification?: string
}

export interface Project {
    id: string
    title: string
    goals: Goal[]
    systemStateMd?: string | null
    planningPath?: string | null
    phaseContents?: Record<string, PhaseContent> | null
    progress?: { total: number; done: number; percentage: number }
}

export interface Learning {
    id: string
    url: string
    title?: string
    what?: string
    how?: string
    impact?: string
    status: string
    isRecommendation?: boolean
}

export interface CalendarBlock {
    id: string
    time: string
    title: string
    type: string
    isCurrent: boolean
}

export interface DailyReport {
    date: string
    summary: { totalMinutes: number; goalsCompleted: number; goalsWorked: number; learningsCount: number }
    completedGoals: Array<{ id: string; title: string; actualMinutes: number | null; learning: string | null }>
    inProgressGoals: Array<{ id: string; title: string; status: string }>
    learnings: Array<{ goalTitle: string; learning: string }>
}

export interface WeeklyReport {
    summary: { totalMinutes: number; goalsCompleted: number; loopingGoalsCount: number; learningsCount: number }
    completedGoals: Array<{ id: string; title: string; actualMinutes: number | null; learning: string | null }>
    loopingGoals: Array<{ id: string; title: string; sessions: number }>
    dailyMinutes: Array<{ date: string; minutes: number }>
    learnings: Array<{ goalTitle: string; learning: string; completedAt: string }>
    recommendedLearnings?: Learning[]
}
