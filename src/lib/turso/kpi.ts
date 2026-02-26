import { execute, executeOne, executeWithMVCC } from './client'
import { KPISchema } from '@/lib/validation/schemas'
import type { KPI, KPIInsert, KPIUpdate, KPISnapshot } from '@/types/turso'

// ============================================
// KPIs
// ============================================

export async function getKPIsByUserId(userId: string): Promise<KPI[]> {
    const sql = `
    SELECT * FROM kpis
    WHERE user_id = ?
    ORDER BY created_at DESC
  `
    return await execute<KPI>(sql, [userId])
}

export async function getKPIById(kpiId: string): Promise<KPI | null> {
    const sql = `SELECT * FROM kpis WHERE id = ?`
    return await executeOne<KPI>(sql, [kpiId])
}

export async function createKPI(data: KPIInsert): Promise<KPI> {
    const validated = KPISchema.parse(data)
    const id = crypto.randomUUID()
    const sql = `
    INSERT INTO kpis (
      id, user_id, project_id, name, description, category,
      target_value, current_value, unit, period_type, start_date, end_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `
    const [result] = await executeWithMVCC<KPI>(sql, [
        id,
        validated.user_id,
        validated.project_id || null,
        validated.name,
        validated.description || null,
        validated.category,
        validated.target_value,
        validated.current_value,
        validated.unit,
        validated.period_type,
        validated.start_date,
        validated.end_date,
    ])
    return result!
}

export async function updateKPI(kpiId: string, data: KPIUpdate): Promise<KPI | null> {
    const fields: string[] = []
    const values: (string | number | null)[] = []

    if (data.name !== undefined) {
        fields.push('name = ?')
        values.push(data.name)
    }
    if (data.description !== undefined) {
        fields.push('description = ?')
        values.push(data.description)
    }
    if (data.category !== undefined) {
        fields.push('category = ?')
        values.push(data.category)
    }
    if (data.target_value !== undefined) {
        fields.push('target_value = ?')
        values.push(data.target_value)
    }
    if (data.current_value !== undefined) {
        fields.push('current_value = ?')
        values.push(data.current_value)
    }
    if (data.unit !== undefined) {
        fields.push('unit = ?')
        values.push(data.unit)
    }
    if (data.period_type !== undefined) {
        fields.push('period_type = ?')
        values.push(data.period_type)
    }
    if (data.start_date !== undefined) {
        fields.push('start_date = ?')
        values.push(data.start_date)
    }
    if (data.end_date !== undefined) {
        fields.push('end_date = ?')
        values.push(data.end_date)
    }

    if (fields.length === 0) return await getKPIById(kpiId)

    values.push(kpiId)
    const sql = `UPDATE kpis SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *`
    return await executeOne<KPI>(sql, values)
}

export async function deleteKPI(kpiId: string): Promise<boolean> {
    const sql = `DELETE FROM kpis WHERE id = ?`
    const result = await execute(sql, [kpiId])
    return result.length > 0 // SQLite/libsql driver behavior workaround, may need adjustments if it returns rowsAffected instead
}

// ============================================
// KPI Snapshots
// ============================================

export async function getKPISnapshots(kpiId: string, limit = 100): Promise<KPISnapshot[]> {
    const sql = `
    SELECT * FROM kpi_snapshots
    WHERE kpi_id = ?
    ORDER BY recorded_at DESC
    LIMIT ?
  `
    return await execute<KPISnapshot>(sql, [kpiId, limit])
}

export async function recordKPISnapshot(kpiId: string, value: number): Promise<KPISnapshot> {
    const id = crypto.randomUUID()
    const sql = `
    INSERT INTO kpi_snapshots (id, kpi_id, value)
    VALUES (?, ?, ?)
    RETURNING *
  `
    const [result] = await executeWithMVCC<KPISnapshot>(sql, [id, kpiId, value])
    return result!
}
