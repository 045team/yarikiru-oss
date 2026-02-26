import { execute, executeOne, executeWithMVCC } from './client'
import { MarketingAssetSchema } from '@/lib/validation/schemas'
import type { MarketingAsset, MarketingAssetInsert, MarketingAssetUpdate } from '@/types/turso'

// ============================================
// Marketing Assets
// ============================================

export async function getMarketingAssetsByUserId(userId: string): Promise<MarketingAsset[]> {
    const sql = `
    SELECT * FROM marketing_assets
    WHERE user_id = ?
    ORDER BY created_at DESC
  `
    return await execute<MarketingAsset>(sql, [userId])
}

export async function getMarketingAssetById(assetId: string): Promise<MarketingAsset | null> {
    const sql = `SELECT * FROM marketing_assets WHERE id = ?`
    return await executeOne<MarketingAsset>(sql, [assetId])
}

export async function getMarketingAssetsByIndustry(industryId: number): Promise<MarketingAsset[]> {
    const sql = `
    SELECT * FROM marketing_assets
    WHERE industry_id = ?
    ORDER BY created_at DESC
  `
    return await execute<MarketingAsset>(sql, [industryId])
}

export async function createMarketingAsset(data: MarketingAssetInsert): Promise<MarketingAsset> {
    const validated = MarketingAssetSchema.parse(data)
    const id = crypto.randomUUID()
    const sql = `
    INSERT INTO marketing_assets (
      id, user_id, industry_id, solution_id, asset_type, asset_name,
      email_subject, email_preview_text, email_body, email_cta_text, email_cta_url,
      lp_headline, lp_subheadline, lp_hero_text, lp_pain_points, lp_solution_text, lp_cta_text,
      ab_test_group, ab_test_variant, sent_count, opened_count, clicked_count, converted_count,
      open_rate, click_rate, conversion_rate, generated_by, generation_metadata, prompt_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `
    const [result] = await executeWithMVCC<MarketingAsset>(sql, [
        id,
        validated.user_id || null,
        validated.industry_id || null,
        validated.solution_id || null,
        validated.asset_type,
        validated.asset_name,
        validated.email_subject || null,
        validated.email_preview_text || null,
        validated.email_body || null,
        validated.email_cta_text || null,
        validated.email_cta_url || null,
        validated.lp_headline || null,
        validated.lp_subheadline || null,
        validated.lp_hero_text || null,
        validated.lp_pain_points ? JSON.stringify(validated.lp_pain_points) : null,
        validated.lp_solution_text || null,
        validated.lp_cta_text || null,
        validated.ab_test_group || null,
        validated.ab_test_variant || null,
        validated.sent_count || 0,
        validated.opened_count || 0,
        validated.clicked_count || 0,
        validated.converted_count || 0,
        validated.open_rate || null,
        validated.click_rate || null,
        validated.conversion_rate || null,
        validated.generated_by || 'gpt-4.1-turbo',
        validated.generation_metadata || null,
        validated.prompt_version || null,
    ])
    return result!
}

export async function updateMarketingAsset(
    assetId: string,
    data: MarketingAssetUpdate
): Promise<MarketingAsset | null> {
    const fields: string[] = []
    const values: (string | number | null)[] = []

    if (data.asset_name !== undefined) {
        fields.push('asset_name = ?')
        values.push(data.asset_name)
    }
    if (data.email_body !== undefined) {
        fields.push('email_body = ?')
        values.push(data.email_body)
    }
    if (data.email_subject !== undefined) {
        fields.push('email_subject = ?')
        values.push(data.email_subject)
    }
    if (data.lp_headline !== undefined) {
        fields.push('lp_headline = ?')
        values.push(data.lp_headline)
    }
    if (data.lp_hero_text !== undefined) {
        fields.push('lp_hero_text = ?')
        values.push(data.lp_hero_text)
    }
    if (data.lp_solution_text !== undefined) {
        fields.push('lp_solution_text = ?')
        values.push(data.lp_solution_text)
    }

    if (fields.length === 0) return await getMarketingAssetById(assetId)

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(assetId)

    const sql = `UPDATE marketing_assets SET ${fields.join(', ')} WHERE id = ? RETURNING *`
    return await executeOne<MarketingAsset>(sql, values)
}

export async function deleteMarketingAsset(assetId: string): Promise<boolean> {
    const sql = `DELETE FROM marketing_assets WHERE id = ?`
    const result = await execute(sql, [assetId])
    return result.length > 0
}

export async function getAssetsBySolutionId(solutionId: string | number): Promise<MarketingAsset[]> {
    const sql = `
    SELECT * FROM marketing_assets
    WHERE solution_id = ?
    ORDER BY created_at DESC
  `
    return await execute<MarketingAsset>(sql, [String(solutionId)])
}

export async function getAssetsByType(assetType: string): Promise<MarketingAsset[]> {
    const sql = `
    SELECT * FROM marketing_assets
    WHERE asset_type = ?
    ORDER BY created_at DESC
  `
    return await execute<MarketingAsset>(sql, [assetType])
}

export async function updateMarketingAssetMetrics(
    assetId: string,
    metrics: {
        sent_count?: number
        opened_count?: number
        clicked_count?: number
        converted_count?: number
    }
): Promise<MarketingAsset | null> {
    const fields: string[] = []
    const values: (string | number)[] = []

    if (metrics.sent_count !== undefined) {
        fields.push('sent_count = sent_count + ?')
        values.push(metrics.sent_count)
    }
    if (metrics.opened_count !== undefined) {
        fields.push('opened_count = opened_count + ?')
        values.push(metrics.opened_count)
    }
    if (metrics.clicked_count !== undefined) {
        fields.push('clicked_count = clicked_count + ?')
        values.push(metrics.clicked_count)
    }
    if (metrics.converted_count !== undefined) {
        fields.push('converted_count = converted_count + ?')
        values.push(metrics.converted_count)
    }

    if (metrics.opened_count !== undefined || metrics.sent_count !== undefined) {
        fields.push(`
      open_rate = CASE
        WHEN sent_count + ? > 0 THEN ((opened_count + ?) / NULLIF(sent_count + ?, 0)) * 100
        ELSE open_rate
      END
    `)
        values.push(metrics.sent_count || 0, metrics.opened_count || 0, metrics.sent_count || 0)
    }

    if (metrics.clicked_count !== undefined || metrics.opened_count !== undefined) {
        fields.push(`
      click_rate = CASE
        WHEN opened_count + ? > 0 THEN ((clicked_count + ?) / NULLIF(opened_count + ?, 0)) * 100
        ELSE click_rate
      END
    `)
        values.push(metrics.opened_count || 0, metrics.clicked_count || 0, metrics.opened_count || 0)
    }

    if (metrics.converted_count !== undefined || metrics.clicked_count !== undefined) {
        fields.push(`
      conversion_rate = CASE
        WHEN clicked_count + ? > 0 THEN ((converted_count + ?) / NULLIF(clicked_count + ?, 0)) * 100
        ELSE conversion_rate
      END
    `)
        values.push(metrics.clicked_count || 0, metrics.converted_count || 0, metrics.clicked_count || 0)
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(assetId)

    const sql = `UPDATE marketing_assets SET ${fields.join(', ')} WHERE id = ? RETURNING *`
    return await executeOne<MarketingAsset>(sql, values)
}
