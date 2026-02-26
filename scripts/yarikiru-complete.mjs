#!/usr/bin/env node
/**
 * /yarikiru <goalId> — ゴールを完了にするカスタムコマンド
 *
 * CLAUDE.md でスラッシュコマンドとして登録:
 *   /yarikiru <goalId> → node scripts/yarikiru-complete.mjs <goalId>
 *
 * Usage:
 *   node scripts/yarikiru-complete.mjs g_1234567890_abc
 *   node scripts/yarikiru-complete.mjs g_1234567890_abc "学んだこと"
 */
import { createClient } from '@libsql/client'

const goalId = process.argv[2]
const learning = process.argv[3] || null

if (!goalId) {
    console.error('Usage: node scripts/yarikiru-complete.mjs <goalId> [learning]')
    console.error('')
    console.error('Example:')
    console.error('  node scripts/yarikiru-complete.mjs g_1234567890_abc')
    console.error('  node scripts/yarikiru-complete.mjs g_1234567890_abc "TypeScriptの型推論を学んだ"')
    process.exit(1)
}

const url = process.env.TURSO_DATABASE_URL
const token = process.env.TURSO_AUTH_TOKEN

if (!url || !token) {
    console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set')
    process.exit(1)
}

const db = createClient({ url, authToken: token })

// ゴール情報を確認
const goalResult = await db.execute({
    sql: 'SELECT id, title, status FROM yarikiru_goals WHERE id = ?',
    args: [goalId],
})

if (goalResult.rows.length === 0) {
    console.error(`Error: Goal not found: ${goalId}`)
    process.exit(1)
}

const row = goalResult.rows[0]
const title = row[1]
const status = row[2]
console.log(`\n📋 Goal: ${title}`)
console.log(`   Status: ${status}`)

if (status === 'done') {
    console.log('⚠️  Already completed.')
    process.exit(0)
}

const completedAt = new Date().toISOString()

// アクティブな work_log を終了
await db.execute({
    sql: `UPDATE yarikiru_work_logs
        SET ended_at = ?,
            duration_minutes = CAST((julianday(?) - julianday(started_at)) * 24 * 60 AS INTEGER)
        WHERE goal_id = ? AND ended_at IS NULL`,
    args: [completedAt, completedAt, goalId],
})

// 実績時間を集計
const totalResult = await db.execute({
    sql: 'SELECT COALESCE(SUM(duration_minutes), 0) FROM yarikiru_work_logs WHERE goal_id = ?',
    args: [goalId],
})
const actualMinutes = Number(totalResult.rows[0]?.[0]) || 0

// ゴールを完了に更新
await db.execute({
    sql: `UPDATE yarikiru_goals
        SET status = 'done', completed_at = ?, learning = ?, actual_minutes = ?
        WHERE id = ?`,
    args: [completedAt, learning, actualMinutes > 0 ? actualMinutes : null, goalId],
})

// サブタスクも全完了
await db.execute({
    sql: `UPDATE yarikiru_sub_tasks SET is_done = 1, completed_at = ? WHERE goal_id = ?`,
    args: [completedAt, goalId],
})

console.log(`\n✅ Completed: ${title}`)
if (actualMinutes > 0) {
    console.log(`   実績時間: ${actualMinutes}分`)
}
if (learning) {
    console.log(`   学び: ${learning}`)
}
console.log()
