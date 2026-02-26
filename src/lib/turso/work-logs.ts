import { execute, executeOne } from './client'
import crypto from 'crypto'

// ============================================
// Work Logs & Time Prediction Analytics (v4.0)
// ============================================

export async function getWorkLogsAggregation(userId: string): Promise<{
    byGoal: Array<{
        goalId: string
        goalTitle: string
        totalMinutes: number
        sessionCount: number
        avgMinutesPerSession: number
        avgEffectiveness: number | null
        loopCount: number
    }>
    overallStats: {
        totalSessions: number
        totalMinutes: number
        avgMinutesPerSession: number
        avgEffectiveness: number | null
        totalLoops: number
    }
    recentSessions: Array<{
        logId: string
        goalId: string
        goalTitle: string
        startedAt: string
        durationMinutes: number
        effectiveness: number | null
        loopDetected: boolean
    }>
}> {
    const byGoalSql = `
    SELECT
      wl.goal_id,
      g.title as goal_title,
      COALESCE(SUM(wl.duration_minutes), 0) as total_minutes,
      COUNT(*) as session_count,
      AVG(wl.effectiveness) as avg_effectiveness,
      SUM(CASE WHEN wl.loop_detected = 1 THEN 1 ELSE 0 END) as loop_count
    FROM yarikiru_work_logs wl
    JOIN yarikiru_goals g ON wl.goal_id = g.id
    JOIN yarikiru_projects p ON g.project_id = p.id
    WHERE wl.user_id = ?
      AND wl.ended_at IS NOT NULL
      AND wl.duration_minutes IS NOT NULL
      AND wl.duration_minutes > 0
    GROUP BY wl.goal_id, g.title
    ORDER BY total_minutes DESC
  `
    const byGoalResult = await execute<{
        goal_id: string
        goal_title: string
        total_minutes: number
        session_count: number
        avg_effectiveness: number | null
        loop_count: number
    }>(byGoalSql, [userId])

    const byGoal = byGoalResult.map(row => ({
        goalId: row.goal_id,
        goalTitle: row.goal_title,
        totalMinutes: row.total_minutes,
        sessionCount: row.session_count,
        avgMinutesPerSession: row.session_count > 0 ? Math.round(row.total_minutes / row.session_count) : 0,
        avgEffectiveness: row.avg_effectiveness ? Math.round(row.avg_effectiveness * 10) / 10 : null,
        loopCount: row.loop_count,
    }))

    const overallSql = `
    SELECT
      COUNT(*) as total_sessions,
      COALESCE(SUM(wl.duration_minutes), 0) as total_minutes,
      AVG(wl.effectiveness) as avg_effectiveness,
      SUM(CASE WHEN wl.loop_detected = 1 THEN 1 ELSE 0 END) as total_loops
    FROM yarikiru_work_logs wl
    WHERE wl.user_id = ?
      AND wl.ended_at IS NOT NULL
      AND wl.duration_minutes IS NOT NULL
      AND wl.duration_minutes > 0
  `
    const overallResult = await executeOne<{
        total_sessions: number
        total_minutes: number
        avg_effectiveness: number | null
        total_loops: number
    }>(overallSql, [userId])

    const overallStats = overallResult ? {
        totalSessions: overallResult.total_sessions,
        totalMinutes: overallResult.total_minutes,
        avgMinutesPerSession: overallResult.total_sessions > 0
            ? Math.round(overallResult.total_minutes / overallResult.total_sessions)
            : 0,
        avgEffectiveness: overallResult.avg_effectiveness
            ? Math.round(overallResult.avg_effectiveness * 10) / 10
            : null,
        totalLoops: overallResult.total_loops,
    } : {
        totalSessions: 0,
        totalMinutes: 0,
        avgMinutesPerSession: 0,
        avgEffectiveness: null,
        totalLoops: 0,
    }

    const recentSql = `
    SELECT
      wl.id,
      wl.goal_id,
      g.title as goal_title,
      wl.started_at,
      wl.duration_minutes,
      wl.effectiveness,
      wl.loop_detected
    FROM yarikiru_work_logs wl
    JOIN yarikiru_goals g ON wl.goal_id = g.id
    WHERE wl.user_id = ?
      AND wl.ended_at IS NOT NULL
      AND wl.duration_minutes IS NOT NULL
      AND wl.duration_minutes > 0
    ORDER BY wl.started_at DESC
    LIMIT 20
  `
    const recentResult = await execute<{
        id: string
        goal_id: string
        goal_title: string
        started_at: string
        duration_minutes: number
        effectiveness: number | null
        loop_detected: number
    }>(recentSql, [userId])

    const recentSessions = recentResult.map(row => ({
        logId: row.id,
        goalId: row.goal_id,
        goalTitle: row.goal_title,
        startedAt: row.started_at,
        durationMinutes: row.duration_minutes,
        effectiveness: row.effectiveness,
        loopDetected: row.loop_detected === 1,
    }))

    return { byGoal, overallStats, recentSessions }
}

export async function getTimeStatsByPattern(
    userId: string,
    keyword: string
): Promise<{
    pattern: string
    matchCount: number
    avgMinutes: number
    medianMinutes: number
    minMinutes: number
    maxMinutes: number
    stdDevMinutes: number
} | null> {
    const sql = `
    SELECT g.actual_minutes
    FROM yarikiru_goals g
    JOIN yarikiru_projects p ON g.project_id = p.id
    WHERE p.user_id = ?
      AND g.status = 'done'
      AND g.actual_minutes IS NOT NULL
      AND g.actual_minutes > 0
      AND g.title LIKE ?
    ORDER BY g.completed_at DESC
    LIMIT 50
  `
    const results = await execute<{ actual_minutes: number }>(sql, [userId, `%${keyword}%`])

    if (results.length === 0) return null

    const minutes = results.map(r => r.actual_minutes)
    const sum = minutes.reduce((a, b) => a + b, 0)
    const avg = Math.round(sum / minutes.length)
    const min = Math.min(...minutes)
    const max = Math.max(...minutes)

    const sorted = [...minutes].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 !== 0
        ? sorted[mid]
        : Math.round((sorted[mid - 1] + sorted[mid]) / 2)

    const variance = minutes.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / minutes.length
    const stdDev = Math.round(Math.sqrt(variance))

    return {
        pattern: keyword,
        matchCount: minutes.length,
        avgMinutes: avg,
        medianMinutes: median,
        minMinutes: min,
        maxMinutes: max,
        stdDevMinutes: stdDev,
    }
}

export async function getCompletedGoalsForTraining(
    userId: string,
    options?: {
        limit?: number
        removeOutliers?: boolean
    }
): Promise<Array<{
    goalId: string
    title: string
    description: string | null
    estimatedMinutes: number
    actualMinutes: number
    completedAt: string
    projectId: string
}>> {
    const limit = options?.limit || 100
    const sql = `
    SELECT
      g.id, g.title, g.description, g.estimated_minutes,
      g.actual_minutes, g.completed_at, g.project_id
    FROM yarikiru_goals g
    JOIN yarikiru_projects p ON g.project_id = p.id
    WHERE p.user_id = ?
      AND g.status = 'done'
      AND g.actual_minutes IS NOT NULL
      AND g.actual_minutes > 0
    ORDER BY g.completed_at DESC
    LIMIT ?
  `
    const results = await execute<{
        id: string
        title: string
        description: string | null
        estimated_minutes: number
        actual_minutes: number
        completed_at: string
        project_id: string
    }>(sql, [userId, limit * 2])

    let data = results.map(row => ({
        goalId: row.id,
        title: row.title,
        description: row.description,
        estimatedMinutes: row.estimated_minutes,
        actualMinutes: row.actual_minutes,
        completedAt: row.completed_at,
        projectId: row.project_id,
    }))

    if (options?.removeOutliers && data.length > 4) {
        const minutes = data.map(d => d.actualMinutes).sort((a, b) => a - b)
        const q1 = minutes[Math.floor(minutes.length * 0.25)]
        const q3 = minutes[Math.floor(minutes.length * 0.75)]
        const iqr = q3 - q1
        const lowerBound = q1 - 1.5 * iqr
        const upperBound = q3 + 1.5 * iqr

        data = data.filter(d => d.actualMinutes >= lowerBound && d.actualMinutes <= upperBound)
    }

    return data.slice(0, limit)
}

export async function getPredictionAccuracy(userId: string): Promise<{
    totalGoals: number
    avgEstimateError: number
    avgEstimateErrorPercent: number
    medianEstimateError: number
    overestimateCount: number
    underestimateCount: number
    accurateEstimateCount: number
} | null> {
    const sql = `
    SELECT g.estimated_minutes, g.actual_minutes
    FROM yarikiru_goals g
    JOIN yarikiru_projects p ON g.project_id = p.id
    WHERE p.user_id = ?
      AND g.status = 'done'
      AND g.estimated_minutes IS NOT NULL
      AND g.estimated_minutes > 0
      AND g.actual_minutes IS NOT NULL
      AND g.actual_minutes > 0
  `
    const results = await execute<{
        estimated_minutes: number
        actual_minutes: number
    }>(sql, [userId])

    if (results.length === 0) return null

    const errors = results.map(r => ({
        error: r.actual_minutes - r.estimated_minutes,
        errorPercent: ((r.actual_minutes - r.estimated_minutes) / r.estimated_minutes) * 100,
    }))

    const avgEstimateError = Math.round(
        errors.reduce((sum, e) => sum + Math.abs(e.error), 0) / errors.length
    )
    const avgEstimateErrorPercent = Math.round(
        errors.reduce((sum, e) => sum + Math.abs(e.errorPercent), 0) / errors.length
    )

    const sortedErrors = errors.map(e => e.error).sort((a, b) => Math.abs(a) - Math.abs(b))
    const medianEstimateError = sortedErrors[Math.floor(sortedErrors.length / 2)]

    const overestimateCount = errors.filter(e => e.error < 0).length
    const underestimateCount = errors.filter(e => e.error > 0).length
    const accurateEstimateCount = errors.filter(e => Math.abs(e.errorPercent) <= 20).length

    return {
        totalGoals: results.length,
        avgEstimateError,
        avgEstimateErrorPercent,
        medianEstimateError,
        overestimateCount,
        underestimateCount,
        accurateEstimateCount,
    }
}

export async function getHistoricalGoalsForPrediction(
    userId: string,
    options?: {
        limit?: number
        categoryId?: string
        daysAgo?: number
    }
): Promise<Array<{
    goalId: string
    title: string
    description: string | null
    estimatedMinutes: number | null
    actualMinutes: number
    completedAt: string
    projectId: string
}>> {
    const limit = options?.limit || 100
    const daysAgo = options?.daysAgo

    let sql = `
    SELECT
      g.id, g.title, g.description, g.estimated_minutes,
      g.actual_minutes, g.completed_at, g.project_id
    FROM yarikiru_goals g
    JOIN yarikiru_projects p ON g.project_id = p.id
    WHERE p.user_id = ?
      AND g.status = 'done'
      AND g.actual_minutes IS NOT NULL
      AND g.actual_minutes > 0
  `
    const params: (string | number)[] = [userId]

    if (daysAgo) {
        sql += ` AND DATE(g.completed_at) >= DATE('now', '-' || ? || ' days')`
        params.push(daysAgo)
    }

    sql += ` ORDER BY g.completed_at DESC LIMIT ?`
    params.push(limit)

    const results = await execute<{
        id: string
        title: string
        description: string | null
        estimated_minutes: number | null
        actual_minutes: number
        completed_at: string
        project_id: string
    }>(sql, params)

    return results.map(row => ({
        goalId: row.id,
        title: row.title,
        description: row.description,
        estimatedMinutes: row.estimated_minutes,
        actualMinutes: row.actual_minutes,
        completedAt: row.completed_at,
        projectId: row.project_id,
    }))
}

export async function getTimeStatsByCategory(
    userId: string,
    keywords: string[]
): Promise<{
    matchCount: number
    avgMinutes: number
    medianMinutes: number
    minMinutes: number
    maxMinutes: number
    sampleData: Array<{
        goalId: string
        title: string
        actualMinutes: number
        completedAt: string
    }>
} | null> {
    if (keywords.length === 0) return null

    const likeConditions = keywords.map(() => 'g.title LIKE ?').join(' OR ')
    const likeParams = keywords.map(k => `%${k}%`)

    const sql = `
    SELECT g.id, g.title, g.actual_minutes, g.completed_at
    FROM yarikiru_goals g
    JOIN yarikiru_projects p ON g.project_id = p.id
    WHERE p.user_id = ?
      AND g.status = 'done'
      AND g.actual_minutes IS NOT NULL
      AND g.actual_minutes > 0
      AND (${likeConditions})
    ORDER BY g.completed_at DESC
    LIMIT 50
  `
    const results = await execute<{
        id: string
        title: string
        actual_minutes: number
        completed_at: string
    }>(sql, [userId, ...likeParams])

    if (results.length === 0) return null

    const minutes = results.map(r => r.actual_minutes)
    const sum = minutes.reduce((a, b) => a + b, 0)
    const avg = Math.round(sum / minutes.length)
    const min = Math.min(...minutes)
    const max = Math.max(...minutes)

    const sorted = [...minutes].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 !== 0
        ? sorted[mid]
        : Math.round((sorted[mid - 1] + sorted[mid]) / 2)

    return {
        matchCount: minutes.length,
        avgMinutes: avg,
        medianMinutes: median,
        minMinutes: min,
        maxMinutes: max,
        sampleData: results.map(r => ({
            goalId: r.id,
            title: r.title,
            actualMinutes: r.actual_minutes,
            completedAt: r.completed_at,
        })),
    }
}

export async function startGoalWork(
    goalId: string,
    userId: string
) {
    await execute('UPDATE yarikiru_goals SET status = ? WHERE id = ?', ['in_progress', goalId])
    const logId = 'log_' + crypto.randomUUID().replace(/-/g, '')
    await execute(
        'INSERT INTO yarikiru_work_logs (id, goal_id, user_id, started_at) VALUES (?, ?, ?, datetime("now"))',
        [logId, goalId, userId]
    )
}

export async function completeGoalWork(
    goalId: string,
    userId: string,
    learning: string,
    durationMinutes: number = 60
) {
    await execute(
        'UPDATE yarikiru_goals SET status = ?, completed_at = datetime("now"), learning = ? WHERE id = ?',
        ['done', learning, goalId]
    )

    const logId = 'log_' + crypto.randomUUID().replace(/-/g, '')
    const startedAt = new Date(Date.now() - durationMinutes * 60 * 1000).toISOString()
    await execute(
        'INSERT INTO yarikiru_work_logs (id, goal_id, user_id, started_at, ended_at, duration_minutes, notes) VALUES (?, ?, ?, ?, datetime("now"), ?, ?)',
        [logId, goalId, userId, startedAt, durationMinutes, learning]
    )
}
