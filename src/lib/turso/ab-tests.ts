import { execute, executeOne, executeWithMVCC } from './client'

// ============================================
// A/B Tests
// ============================================

export async function getABTestsByUserId(userId: string): Promise<any[]> {
    const sql = `
    SELECT t.*, va.asset_name as variant_a_name, vb.asset_name as variant_b_name
    FROM ab_tests t
    LEFT JOIN marketing_assets va ON t.variant_a_id = va.id
    LEFT JOIN marketing_assets vb ON t.variant_b_id = vb.id
    WHERE t.user_id = ?
    ORDER BY t.created_at DESC
  `
    return await execute(sql, [userId])
}

export async function getABTestById(testId: string): Promise<any | null> {
    const sql = `SELECT * FROM ab_tests WHERE id = ?`
    return await executeOne(sql, [testId])
}

export async function createABTest(data: any): Promise<any> {
    const id = crypto.randomUUID()
    const sql = `
    INSERT INTO ab_tests (
      id, user_id, name, description, status, asset_type, variant_a_id, variant_b_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `
    const [result] = await executeWithMVCC(sql, [
        id,
        data.user_id,
        data.name,
        data.description || null,
        data.status || 'draft',
        data.asset_type,
        data.variant_a_id,
        data.variant_b_id,
    ])
    return result!
}

export async function updateABTest(testId: string, data: any): Promise<any | null> {
    const fields: string[] = []
    const values: (string | number | null)[] = []

    if (data.status !== undefined) {
        fields.push('status = ?')
        values.push(data.status)
    }
    if (data.start_date !== undefined) {
        fields.push('start_date = ?')
        values.push(data.start_date)
    }
    if (data.end_date !== undefined) {
        fields.push('end_date = ?')
        values.push(data.end_date)
    }
    if (data.winner !== undefined) {
        fields.push('winner = ?')
        values.push(data.winner)
    }
    if (data.confidence_level !== undefined) {
        fields.push('confidence_level = ?')
        values.push(data.confidence_level)
    }

    if (fields.length === 0) return await getABTestById(testId)

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(testId)

    const sql = `UPDATE ab_tests SET ${fields.join(', ')} WHERE id = ? RETURNING *`
    return await executeOne(sql, values)
}

export async function deleteABTest(testId: string): Promise<boolean> {
    const sql = `DELETE FROM ab_tests WHERE id = ?`
    const result = await execute(sql, [testId])
    return result.length > 0
}

// ============================================
// AB Test Impressions
// ============================================

export async function recordImpression(data: any): Promise<any> {
    const id = crypto.randomUUID()
    const sql = `
    INSERT INTO ab_test_impressions (
      id, ab_test_id, variant_id, user_id, session_id, impression_type, ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `
    const [result] = await executeWithMVCC(sql, [
        id,
        data.ab_test_id,
        data.variant_id,
        data.user_id || null,
        data.session_id || null,
        data.impression_type,
        data.ip_address || null,
        data.user_agent || null,
    ])
    return result!
}

export async function getImpressionsByABTest(testId: string): Promise<any[]> {
    const sql = `
    SELECT * FROM ab_test_impressions
    WHERE ab_test_id = ?
    ORDER BY created_at DESC
  `
    return await execute(sql, [testId])
}
