import { execute, executeOne, executeWithMVCC } from './client'
import {
    IndustrySchema,
    TaskSchema,
    ScheduleSchema,
    PainPointSchema,
    AISolutionSchema,
} from '@/lib/validation/schemas'
import type {
    Industry,
    IndustryInsert,
    Task,
    TaskInsert,
    Schedule,
    ScheduleInsert,
    PainPoint,
    PainPointInsert,
    AISolution,
    AISolutionInsert,
} from '@/types/turso'

// ============================================
// Industries
// ============================================

export async function getIndustries(): Promise<Industry[]> {
    const sql = `
    SELECT * FROM industries
    ORDER BY category ASC
  `
    return await execute<Industry>(sql)
}

export async function getIndustryById(id: number): Promise<Industry | null> {
    const sql = `SELECT * FROM industries WHERE id = ?`
    return await executeOne<Industry>(sql, [id])
}

export async function getIndustryByName(industry: string): Promise<Industry | null> {
    const sql = `SELECT * FROM industries WHERE industry = ?`
    return await executeOne<Industry>(sql, [industry])
}

export async function createIndustry(data: IndustryInsert): Promise<Industry> {
    const validated = IndustrySchema.parse(data)
    const sql = `
    INSERT INTO industries (
      category, industry, stakeholders, business_layer, it_layer, ai_layer
    ) VALUES (?, ?, ?, ?, ?, ?)
    RETURNING *
  `
    const [result] = await executeWithMVCC<Industry>(sql, [
        validated.category,
        validated.industry,
        validated.stakeholders || null,
        validated.business_layer || null,
        validated.it_layer || null,
        validated.ai_layer || null,
    ])
    return result!
}

export async function bulkCreateIndustries(data: IndustryInsert[]): Promise<Industry[]> {
    const results: Industry[] = []
    for (const item of data) {
        const result = await createIndustry(item)
        results.push(result)
    }
    return results
}

// ============================================
// Tasks
// ============================================

export async function getTasksByIndustry(industryId: number): Promise<Task[]> {
    const sql = `
    SELECT * FROM tasks
    WHERE industry_id = ?
    ORDER BY
      CASE priority
        WHEN '高' THEN 1
        WHEN '中' THEN 2
        WHEN '低' THEN 3
        ELSE 4
      END ASC
  `
    return await execute<Task>(sql, [industryId])
}

export async function createTaskLegacy(data: TaskInsert): Promise<Task> {
    const validated = TaskSchema.parse(data)
    const sql = `
    INSERT INTO tasks (
      industry_id, task_category, task_detail, frequency, duration,
      urgency, importance, pain_points, current_process, ai_solution,
      implementation_difficulty, effect, cost_reduction, priority
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `
    const [result] = await executeWithMVCC<Task>(sql, [
        validated.industry_id || null,
        validated.task_category,
        validated.task_detail,
        validated.frequency || null,
        validated.duration || null,
        validated.urgency || null,
        validated.importance || null,
        validated.pain_points || null,
        validated.current_process || null,
        validated.ai_solution || null,
        validated.implementation_difficulty || null,
        validated.effect || null,
        validated.cost_reduction || null,
        validated.priority || null,
    ])
    return result!
}

export async function bulkCreateTasks(data: TaskInsert[]): Promise<Task[]> {
    const results: Task[] = []
    for (const item of data) {
        const result = await createTaskLegacy(item)
        results.push(result)
    }
    return results
}

// ============================================
// Schedules
// ============================================

export async function getSchedulesByIndustry(industryId: number): Promise<Schedule[]> {
    const sql = `
    SELECT * FROM schedules
    WHERE industry_id = ?
    ORDER BY
      CASE day_of_week
        WHEN '月曜' THEN 1
        WHEN '火曜' THEN 2
        WHEN '水曜' THEN 3
        WHEN '木曜' THEN 4
        WHEN '金曜' THEN 5
        WHEN '土曜' THEN 6
        WHEN '日曜' THEN 7
        ELSE 8
      END ASC,
      time_slot ASC
  `
    return await execute<Schedule>(sql, [industryId])
}

export async function createSchedule(data: ScheduleInsert): Promise<Schedule> {
    const validated = ScheduleSchema.parse(data)
    const sql = `
    INSERT INTO schedules (
      industry_id, day_of_week, time_slot, business_category, task,
      duration, frequency, pain_points, ai_solution, priority, cost_reduction_estimate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `
    const [result] = await executeWithMVCC<Schedule>(sql, [
        validated.industry_id || null,
        validated.day_of_week,
        validated.time_slot,
        validated.business_category,
        validated.task,
        validated.duration,
        validated.frequency || null,
        validated.pain_points || null,
        validated.ai_solution || null,
        validated.priority || null,
        validated.cost_reduction_estimate || null,
    ])
    return result!
}

export async function bulkCreateSchedules(data: ScheduleInsert[]): Promise<Schedule[]> {
    const results: Schedule[] = []
    for (const item of data) {
        const result = await createSchedule(item)
        results.push(result)
    }
    return results
}

// ============================================
// Pain Points
// ============================================

export async function getPainPointsByIndustry(industryId: number): Promise<PainPoint[]> {
    const sql = `
    SELECT * FROM pain_points
    WHERE industry_id = ?
    ORDER BY priority_rank ASC NULLS LAST, priority_score DESC NULLS LAST
  `
    return await execute<PainPoint>(sql, [industryId])
}

export async function getPainPointsByCategory(category: string): Promise<PainPoint[]> {
    const sql = `
    SELECT * FROM pain_points
    WHERE pain_point_category = ?
    ORDER BY priority_score DESC NULLS LAST
  `
    return await execute<PainPoint>(sql, [category])
}

export async function createPainPoint(data: PainPointInsert): Promise<PainPoint> {
    const validated = PainPointSchema.parse(data)
    const sql = `
    INSERT INTO pain_points (
      task_id, schedule_id, industry_id, pain_point_category, pain_point_description,
      affected_tasks, weekly_time_spent, monthly_time_spent, hourly_cost,
      frequency_score, urgency_score, impact_score,
      priority_score, priority_rank, analyzed_by, confidence_score, analysis_metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `
    const [result] = await executeWithMVCC<PainPoint>(sql, [
        validated.task_id || null,
        validated.schedule_id || null,
        validated.industry_id || null,
        validated.pain_point_category,
        validated.pain_point_description,
        validated.affected_tasks || null,
        validated.weekly_time_spent || null,
        validated.monthly_time_spent || null,
        validated.hourly_cost || null,
        validated.frequency_score || null,
        validated.urgency_score || null,
        validated.impact_score || null,
        validated.priority_score || null,
        validated.priority_rank || null,
        validated.analyzed_by || 'GPT-4o',
        validated.confidence_score || null,
        validated.analysis_metadata || null,
    ])
    return result!
}

export async function getPainPointById(painPointId: string | number): Promise<PainPoint | null> {
    const sql = `SELECT * FROM pain_points WHERE id = ?`
    return await executeOne<PainPoint>(sql, [String(painPointId)])
}

// ============================================
// AI Solutions
// ============================================

export async function getAISolutionById(solutionId: string | number): Promise<AISolution | null> {
    const sql = `SELECT * FROM ai_solutions WHERE id = ?`
    return await executeOne<AISolution>(sql, [String(solutionId)])
}

export async function getAISolutionsByPainPoint(painPointId: number): Promise<AISolution[]> {
    const sql = `
    SELECT * FROM ai_solutions
    WHERE pain_point_id = ?
    ORDER BY roi_months ASC NULLS LAST
  `
    return await execute<AISolution>(sql, [painPointId])
}

export async function getAISolutionsByIndustry(industryId: number): Promise<AISolution[]> {
    const sql = `
    SELECT * FROM ai_solutions
    WHERE industry_id = ?
    ORDER BY cost_savings_monthly DESC NULLS LAST
  `
    return await execute<AISolution>(sql, [industryId])
}

export async function createAISolution(data: AISolutionInsert): Promise<AISolution> {
    const validated = AISolutionSchema.parse(data)
    const sql = `
    INSERT INTO ai_solutions (
      pain_point_id, industry_id, solution_name, solution_type, solution_description,
      ai_models, tech_stack, data_requirements,
      time_reduction_percent, time_reduction_minutes_weekly, cost_savings_monthly,
      roi_months, payback_period,
      implementation_difficulty, development_weeks,
      tech_complexity_score, data_availability_score, user_adoption_score,
      pricing_model, pricing_amount, target_users,
      status, launch_date, generated_by, confidence_score, generation_metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `
    const [result] = await executeWithMVCC<AISolution>(sql, [
        validated.pain_point_id || null,
        validated.industry_id || null,
        validated.solution_name,
        validated.solution_type,
        validated.solution_description,
        validated.ai_models || null,
        validated.tech_stack || null,
        validated.data_requirements || null,
        validated.time_reduction_percent || null,
        validated.time_reduction_minutes_weekly || null,
        validated.cost_savings_monthly || null,
        validated.roi_months || null,
        validated.payback_period || null,
        validated.implementation_difficulty || '中',
        validated.development_weeks || null,
        validated.tech_complexity_score || null,
        validated.data_availability_score || null,
        validated.user_adoption_score || null,
        validated.pricing_model || null,
        validated.pricing_amount || null,
        validated.target_users || null,
        validated.status || 'proposed',
        validated.launch_date || null,
        validated.generated_by || 'GPT-4o',
        validated.confidence_score || null,
        validated.generation_metadata || null,
    ])
    return result!
}

export async function getIndustryPainPointSummary(industryId: number) {
    const sql = `
    SELECT
      pp.pain_point_category,
      COUNT(*) as pain_point_count,
      SUM(pp.weekly_time_spent) as total_weekly_time,
      AVG(pp.priority_score) as avg_priority_score,
      AVG(pp.urgency_score) as avg_urgency_score
    FROM pain_points pp
    WHERE pp.industry_id = ?
    GROUP BY pp.pain_point_category
    ORDER BY avg_priority_score DESC
  `
    return await execute(sql, [industryId])
}

export async function getSolutionROISummary(industryId: number) {
    const sql = `
    SELECT
      ais.solution_type,
      COUNT(*) as solution_count,
      SUM(ais.cost_savings_monthly) as total_monthly_savings,
      AVG(ais.roi_months) as avg_roi_months,
      AVG(ais.time_reduction_percent) as avg_time_reduction
    FROM ai_solutions ais
    WHERE ais.industry_id = ?
    GROUP BY ais.solution_type
    ORDER BY total_monthly_savings DESC
  `
    return await execute(sql, [industryId])
}
