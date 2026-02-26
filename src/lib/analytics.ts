// ============================================
// Analytics & Dashboard Logic
// ダッシュボード集計ロジック
// ============================================

import type { KPI, KPIStatus } from '@/types/turso'
import type { Project, ProjectTask, Milestone } from '@/types/turso'

// ============================================
// Types
// ============================================

export interface DashboardData {
  kpiSummary: {
    total: number
    onTrack: number
    atRisk: number
    behind: number
    completed: number
    avgAchievementRate: number
  }
  projectSummary: {
    total: number
    planning: number
    active: number
    completed: number
    onHold: number
  }
  taskSummary: {
    total: number
    todo: number
    inProgress: number
    done: number
    blocked: number
    completionRate: number
  }
  milestoneSummary: {
    total: number
    completed: number
    pending: number
    delayed: number
    overdueCount: number
  }
}

// ============================================
// KPI Status Calculation
// ============================================

/**
 * KPIの現在ステータスを計算
 * 期間経過と目標達成率に基づいて判定
 *
 * @param kpi - 評価対象のKPI
 * @returns KPIステータス
 */
export function calculateKPIStatus(kpi: KPI): KPIStatus {
  const now = new Date()
  const start = new Date(kpi.start_date)
  const end = new Date(kpi.end_date)

  // 期間開始前
  if (now < start) return 'NOT_STARTED'

  // 期間終了後
  if (now > end) {
    return kpi.current_value >= kpi.target_value ? 'COMPLETED' : 'BEHIND'
  }

  // 期間中の進捗判定
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const elapsedDays = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  // 期待値（現時点での目標値に対する期待される進捗）
  const expectedValue = (kpi.target_value * elapsedDays) / totalDays

  // 進捗に基づくステータス判定
  if (kpi.current_value >= expectedValue * 0.9) return 'ON_TRACK'
  if (kpi.current_value >= expectedValue * 0.7) return 'AT_RISK'
  return 'BEHIND'
}

// ============================================
// Dashboard Data Generation
// ============================================

/**
 * ダッシュボード用の集計データを生成
 * KPI・プロジェクト・タスク・マイルストーンのサマリーを計算
 *
 * @param params - 集計対象データ
 * @returns ダッシュボードデータ
 */
export async function generateDashboardData(params: {
  kpis: KPI[]
  projects: Project[]
  tasks: ProjectTask[]
  milestones: Milestone[]
}): Promise<DashboardData> {
  const { kpis, projects, tasks, milestones } = params

  // KPIサマリー計算
  const kpiStatuses = kpis.map(calculateKPIStatus)
  const kpiSummary = {
    total: kpis.length,
    onTrack: kpiStatuses.filter(s => s === 'ON_TRACK').length,
    atRisk: kpiStatuses.filter(s => s === 'AT_RISK').length,
    behind: kpiStatuses.filter(s => s === 'BEHIND').length,
    completed: kpiStatuses.filter(s => s === 'COMPLETED').length,
    avgAchievementRate: kpis.length > 0
      ? kpis.reduce((sum, kpi) => sum + (kpi.current_value / kpi.target_value * 100), 0) / kpis.length
      : 0,
  }

  // プロジェクトサマリー計算
  const projectSummary = {
    total: projects.length,
    planning: projects.filter(p => p.status === 'planning').length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    onHold: projects.filter(p => p.status === 'on_hold').length,
  }

  // タスクサマリー計算
  const taskSummary = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    completionRate: tasks.length > 0
      ? (tasks.filter(t => t.status === 'done').length / tasks.length) * 100
      : 0,
  }

  // マイルストーンサマリー計算
  const now = new Date()
  const milestoneSummary = {
    total: milestones.length,
    completed: milestones.filter(m => m.status === 'completed').length,
    pending: milestones.filter(m => m.status === 'pending').length,
    delayed: milestones.filter(m => m.status === 'delayed').length,
    overdueCount: milestones.filter(m => new Date(m.target_date) < now && m.status !== 'completed').length,
  }

  return {
    kpiSummary,
    projectSummary,
    taskSummary,
    milestoneSummary,
  }
}
