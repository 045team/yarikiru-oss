#!/usr/bin/env node
/**
 * YARIKIRU CLI - MCPと同じロジックでDBを直接操作
 *
 * 使い方:
 *   node scripts/yarikiru-cli.mjs list-goals --userId user_demo
 *   node scripts/yarikiru-cli.mjs create-goal --userId user_demo --title "新しい目標"
 *   node scripts/yarikiru-cli.mjs create-tasks --goalId goal_xxx --tasks '[{"title":"タスク1","estimatedMinutes":15}]'
 *   node scripts/yarikiru-cli.mjs get-goal --goalId goal_xxx
 *
 * 環境変数: .env.local の TURSO_DATABASE_URL, TURSO_AUTH_TOKEN を使用
 */

import { createClient } from '@libsql/client'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

// Load .env.local
function loadEnv() {
  const envPath = resolve(rootDir, '.env.local')
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const firstEq = trimmed.indexOf('=')
        const key = trimmed.slice(0, firstEq).trim()
        let value = trimmed.slice(firstEq + 1).trim()
        // Remove surrounding quotes if present (both " and ')
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        if (!process.env[key]) process.env[key] = value
      }
    }
  }
}
loadEnv()

function getDb() {
  const url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN
  if (!url || !token) {
    console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set (in .env.local)')
    process.exit(1)
  }
  return createClient({ url, authToken: token })
}

// --- Commands ---

async function listGoals(userId) {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT id, title, description, deadline, status FROM goals
          WHERE user_id = ? AND status != 'archived'
          ORDER BY created_at DESC`,
    args: [userId],
  })
  if (result.rows.length === 0) {
    console.log('目標がありません。')
    return
  }
  console.log(`\n目標一覧 (userId: ${userId}):`)
  console.log('─'.repeat(60))
  for (const row of result.rows) {
    const { id, title, description: desc, deadline, status } = row
    console.log(`  ${id}`)
    console.log(`    タイトル: ${title}`)
    if (desc) console.log(`    説明: ${String(desc).slice(0, 50)}...`)
    if (deadline) console.log(`    期限: ${deadline}`)
    console.log(`    状態: ${status}`)
    console.log('')
  }
}

async function createGoal(userId, title, description, deadline) {
  const db = getDb()
  const goalId = `goal_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  await db.execute({
    sql: `INSERT INTO goals (id, user_id, title, description, deadline, status)
          VALUES (?, ?, ?, ?, ?, 'active')`,
    args: [goalId, userId, title, description || null, deadline || null],
  })
  console.log(`目標を作成しました: ${goalId}`)
  return goalId
}

async function createTasks(goalId, tasksJson) {
  const db = getDb()
  let tasks
  try {
    tasks = typeof tasksJson === 'string' ? JSON.parse(tasksJson) : tasksJson
  } catch (e) {
    console.error('tasks は JSON 配列である必要があります:', e.message)
    process.exit(1)
  }
  if (!Array.isArray(tasks)) {
    console.error('tasks は配列である必要があります')
    process.exit(1)
  }

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]
    const taskId = `task_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 9)}`
    await db.execute({
      sql: `INSERT INTO generated_tasks (id, goal_id, title, estimated_minutes, priority, is_completed)
            VALUES (?, ?, ?, ?, ?, 0)`,
      args: [
        taskId,
        goalId,
        t.title,
        t.estimatedMinutes ?? 15,
        t.priority ?? 'medium',
      ],
    })
    console.log(`  追加: ${t.title}`)
  }
  console.log(`\n${tasks.length} 件のタスクを goal ${goalId} に追加しました。`)
}

async function getGoal(goalId) {
  const db = getDb()
  const goalResult = await db.execute({
    sql: `SELECT id, title, description, deadline, status, user_id FROM goals WHERE id = ?`,
    args: [goalId],
  })
  if (goalResult.rows.length === 0) {
    console.error(`目標が見つかりません: ${goalId}`)
    process.exit(1)
  }
  const { id, title, description: desc, deadline, status, user_id: userId } = goalResult.rows[0]
  console.log(`\n目標: ${id}`)
  console.log(`  タイトル: ${title}`)
  console.log(`  user_id: ${userId}`)
  console.log(`  状態: ${status}`)
  if (deadline) console.log(`  期限: ${deadline}`)
  if (desc) console.log(`  説明: ${desc}`)

  const tasksResult = await db.execute({
    sql: `SELECT id, title, estimated_minutes, priority, is_completed
          FROM generated_tasks WHERE goal_id = ? ORDER BY created_at ASC`,
    args: [goalId],
  })
  console.log(`\nタスク (${tasksResult.rows.length} 件):`)
  console.log('─'.repeat(50))
  for (const row of tasksResult.rows) {
    const { id: tid, title: ttitle, estimated_minutes: mins, priority: pri, is_completed: done } = row
    console.log(`  ${done ? '✓' : '○'} ${ttitle} (${mins}分, ${pri}) [${tid}]`)
  }
}

async function getStats(userId) {
  const db = getDb()
  const goalsResult = await db.execute({
    sql: `SELECT COUNT(*) FROM goals WHERE user_id = ? AND status = 'active'`,
    args: [userId],
  })
  const tasksResult = await db.execute({
    sql: `SELECT COUNT(*) as total,
                 SUM(CASE WHEN gt.is_completed = 1 THEN 1 ELSE 0 END) as completed
          FROM generated_tasks gt
          JOIN goals g ON gt.goal_id = g.id
          WHERE g.user_id = ?`,
    args: [userId],
  })
  const activeGoals = Number(goalsResult.rows[0]?.count ?? goalsResult.rows[0]?.[0] ?? 0)
  const total = Number(tasksResult.rows[0]?.total ?? tasksResult.rows[0]?.[0] ?? 0)
  const completed = Number(tasksResult.rows[0]?.completed ?? tasksResult.rows[0]?.[1] ?? 0)
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0
  console.log(`\n統計 (userId: ${userId})`)
  console.log('─'.repeat(40))
  console.log(`  アクティブ目標: ${activeGoals}`)
  console.log(`  総タスク: ${total}`)
  console.log(`  完了タスク: ${completed}`)
  console.log(`  完了率: ${rate}%`)
}

async function listUrgentTasks(userId) {
  const db = getDb()
  const result = await db.execute({
    sql: `
      SELECT
        gt.id as task_id,
        gt.title as task_title,
        gt.estimated_minutes,
        gt.priority,
        g.id as goal_id,
        g.title as goal_title
      FROM generated_tasks gt
      JOIN goals g ON gt.goal_id = g.id
      WHERE g.user_id = ?
        AND gt.is_urgent = 1
        AND gt.is_completed = 0
      ORDER BY gt.priority DESC, gt.created_at ASC
    `,
    args: [userId],
  })

  if (result.rows.length === 0) {
    console.log('\n🔥 Urgent Tasks (0件)')
    console.log('─'.repeat(60))
    console.log('  緊急タスクはありません')
    return
  }

  console.log(`\n🔥 Urgent Tasks (${result.rows.length}件)`)
  console.log('─'.repeat(60))
  for (const row of result.rows) {
    console.log(`  ${row[0]}`)
    console.log(`    タスク: ${row[1]} (${row[2]}分)`)
    console.log(`    目標: ${row[5]}`)
    console.log('')
  }
}

async function toggleTaskUrgent(taskId, isUrgent) {
  const db = getDb()
  await db.execute({
    sql: `UPDATE generated_tasks SET is_urgent = ? WHERE id = ?`,
    args: [isUrgent ? 1 : 0, taskId],
  })
  console.log(`${isUrgent ? '🔥' : '○'} タスク ${taskId} を${isUrgent ? '緊急' : '通常'}に変更しました`)
}

async function insertUrgentToCalendar(userId) {
  const db = getDb()
  const result = await db.execute({
    sql: `
      SELECT
        gt.id as task_id,
        gt.title as task_title,
        gt.estimated_minutes,
        g.id as goal_id
      FROM generated_tasks gt
      JOIN goals g ON gt.goal_id = g.id
      WHERE g.user_id = ?
        AND gt.is_urgent = 1
        AND gt.is_completed = 0
      ORDER BY gt.priority DESC
    `,
    args: [userId],
  })

  if (result.rows.length === 0) {
    console.log('緊急タスクがありません')
    return
  }

  console.log(`\n${result.rows.length}件の緊急タスクをカレンダーに追加します...`)
  // Google Calendar 連携は別途実装が必要
  console.log('(Google Calendar 連携は未実装です)')
}

function usage() {
  console.log(`
YARIKIRU CLI - DB直接操作

使い方:
  node scripts/yarikiru-cli.mjs <command> [options]

コマンド:
  list-goals --userId <userId>       目標一覧
  create-goal --userId <userId> --title <title> [--description <desc>] [--deadline <date>]
  create-tasks --goalId <goalId> --tasks <JSON>
  get-goal --goalId <goalId>         目標とタスク詳細
  get-stats --userId <userId>       統計
  list-urgent --userId <userId>     緊急タスク一覧
  toggle-urgent --taskId <taskId> --urgent <1|0>  緊急フラグ切り替え

例:
  node scripts/yarikiru-cli.mjs list-goals --userId user_demo
  node scripts/yarikiru-cli.mjs create-tasks --goalId goal_demo_001 --tasks '[{"title":"新タスク","estimatedMinutes":15,"priority":"high"}]'
  node scripts/yarikiru-cli.mjs get-goal --goalId goal_demo_001
  node scripts/yarikiru-cli.mjs list-urgent --userId user_demo
  node scripts/yarikiru-cli.mjs toggle-urgent --taskId task_xxx --urgent 1

注意: .env.local に TURSO_DATABASE_URL, TURSO_AUTH_TOKEN を設定してください。
`)
}

function parseArgs() {
  const args = process.argv.slice(2)
  const cmd = args[0]
  const opts = {}
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      const val = args[i + 1]
      opts[key] = val
      i++
    }
  }
  return { cmd, opts }
}

async function main() {
  const { cmd, opts } = parseArgs()

  switch (cmd) {
    case 'list-goals': {
      const userId = opts.userId
      if (!userId) {
        console.error('--userId が必要です')
        process.exit(1)
      }
      await listGoals(userId)
      break
    }
    case 'create-goal': {
      const userId = opts.userId
      const title = opts.title
      if (!userId || !title) {
        console.error('--userId と --title が必要です')
        process.exit(1)
      }
      await createGoal(userId, title, opts.description, opts.deadline)
      break
    }
    case 'create-tasks': {
      const goalId = opts.goalId
      const tasks = opts.tasks
      if (!goalId || !tasks) {
        console.error('--goalId と --tasks が必要です')
        process.exit(1)
      }
      await createTasks(goalId, tasks)
      break
    }
    case 'get-goal': {
      const goalId = opts.goalId
      if (!goalId) {
        console.error('--goalId が必要です')
        process.exit(1)
      }
      await getGoal(goalId)
      break
    }
    case 'get-stats': {
      const userId = opts.userId
      if (!userId) {
        console.error('--userId が必要です')
        process.exit(1)
      }
      await getStats(userId)
      break
    }
    case 'list-urgent': {
      const userId = opts.userId
      if (!userId) {
        console.error('--userId が必要です')
        process.exit(1)
      }
      await listUrgentTasks(userId)
      break
    }
    case 'toggle-urgent': {
      const taskId = opts.taskId
      const urgent = opts.urgent
      if (!taskId || urgent === undefined) {
        console.error('--taskId と --urgent が必要です')
        process.exit(1)
      }
      await toggleTaskUrgent(taskId, urgent === '1' || urgent === true)
      break
    }
    default:
      usage()
      process.exit(cmd ? 1 : 0)
  }
}

main().catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
})
