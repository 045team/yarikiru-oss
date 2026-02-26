import { execute, executeOne, executeWithMVCC } from './client'
import { UserSchema, UserActivitySchema } from '@/lib/validation/schemas'
import type { User, UserInsert, UserUpdate, UserActivity, UserActivityInsert } from '@/types/turso'

// ============================================
// Users
// ============================================

export async function getUserById(userId: string): Promise<User | null> {
    const sql = `SELECT * FROM users WHERE id = ?`
    return await executeOne<User>(sql, [userId])
}

export async function getUserByEmail(email: string): Promise<User | null> {
    const sql = `SELECT * FROM users WHERE email = ?`
    return await executeOne<User>(sql, [email])
}

export async function createUser(data: UserInsert): Promise<User> {
    const validated = UserSchema.parse(data)
    const id = validated.id || crypto.randomUUID()
    const sql = `
    INSERT INTO users (
      id, email, full_name, industry_id, role, company_name,
      subscription_plan, subscription_status, subscription_start_date, subscription_end_date,
      tools_used, weekly_reports_count, photos_classified, last_sign_in_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `
    const [result] = await executeWithMVCC<User>(sql, [
        id,
        validated.email,
        validated.full_name || null,
        validated.industry_id || null,
        validated.role || null,
        validated.company_name || null,
        validated.subscription_plan || 'free',
        validated.subscription_status || 'active',
        validated.subscription_start_date || null,
        validated.subscription_end_date || null,
        validated.tools_used || null,
        validated.weekly_reports_count || 0,
        validated.photos_classified || 0,
        validated.last_sign_in_at || null,
    ])
    return result!
}

export async function updateUser(userId: string, data: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>): Promise<User | null> {
    const fields: string[] = []
    const values: (string | number | null)[] = []

    if (data.email !== undefined) {
        fields.push('email = ?')
        values.push(data.email)
    }
    if (data.full_name !== undefined) {
        fields.push('full_name = ?')
        values.push(data.full_name)
    }
    if (data.industry_id !== undefined) {
        fields.push('industry_id = ?')
        values.push(data.industry_id)
    }
    if (data.role !== undefined) {
        fields.push('role = ?')
        values.push(data.role)
    }
    if (data.company_name !== undefined) {
        fields.push('company_name = ?')
        values.push(data.company_name)
    }
    if (data.subscription_plan !== undefined) {
        fields.push('subscription_plan = ?')
        values.push(data.subscription_plan)
    }
    if (data.subscription_status !== undefined) {
        fields.push('subscription_status = ?')
        values.push(data.subscription_status)
    }
    if (data.subscription_start_date !== undefined) {
        fields.push('subscription_start_date = ?')
        values.push(data.subscription_start_date)
    }
    if (data.subscription_end_date !== undefined) {
        fields.push('subscription_end_date = ?')
        values.push(data.subscription_end_date)
    }
    if (data.tools_used !== undefined) {
        fields.push('tools_used = ?')
        values.push(data.tools_used)
    }
    if (data.weekly_reports_count !== undefined) {
        fields.push('weekly_reports_count = ?')
        values.push(data.weekly_reports_count)
    }
    if (data.photos_classified !== undefined) {
        fields.push('photos_classified = ?')
        values.push(data.photos_classified)
    }
    if (data.last_sign_in_at !== undefined) {
        fields.push('last_sign_in_at = ?')
        values.push(data.last_sign_in_at)
    }

    if (fields.length === 0) return await getUserById(userId)

    values.push(userId) // WHERE id = ?

    const sql = `
    UPDATE users
    SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    RETURNING *
  `
    return await executeOne<User>(sql, values)
}

// ============================================
// User Activities
// ============================================

export async function createUserActivity(data: UserActivityInsert): Promise<UserActivity> {
    const validated = UserActivitySchema.parse(data)
    const sql = `
    INSERT INTO user_activities (
      user_id, industry_id, activity_type, activity_data,
      marketing_asset_id, ab_test_group, ab_test_variant,
      ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `
    const [result] = await executeWithMVCC<UserActivity>(sql, [
        validated.user_id,
        validated.industry_id || null,
        validated.activity_type,
        validated.activity_data || null,
        validated.marketing_asset_id || null,
        validated.ab_test_group || null,
        validated.ab_test_variant || null,
        validated.ip_address || null,
        validated.user_agent || null,
    ])
    return result!
}

export async function getUserActivities(userId: string, limit = 50): Promise<UserActivity[]> {
    const sql = `
    SELECT * FROM user_activities
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `
    return await execute<UserActivity>(sql, [userId, limit])
}
