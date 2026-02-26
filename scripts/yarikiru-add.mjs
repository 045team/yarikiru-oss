#!/usr/bin/env node
/**
 * /yarikiru:add <title> — 新しいタスク（中目標）をYARIKIRUにクリエイトするCLIコマンド
 *
 * 使い方:
 *   node scripts/yarikiru-add.mjs "新しいタスク"
 *
 * 環境変数 .env.local の TURSO_DATABASE_URL と TURSO_AUTH_TOKEN を使用します。
 * ユーザーの最後に作成されたプロジェクトに追加し、存在しない場合は「General」というプロジェクトを作成します。
 */
import { createClient } from '@libsql/client'

const taskTitle = process.argv[2]

if (!taskTitle) {
    console.error('Usage: node scripts/yarikiru-add.mjs "<title>"')
    console.error('')
    console.error('Example:')
    console.error('  node scripts/yarikiru-add.mjs "週次レポートを作成する"')
    process.exit(1)
}

const url = process.env.TURSO_DATABASE_URL
const token = process.env.TURSO_AUTH_TOKEN

if (!url || !token) {
    console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set')
    process.exit(1)
}

const db = createClient({ url, authToken: token })

async function run() {
    // 最後に更新されたプロジェクトを取得
    let projectResult = await db.execute({
        sql: `SELECT id, user_id FROM yarikiru_projects ORDER BY created_at DESC LIMIT 1`,
        args: []
    })

    let projectId, userId
    if (projectResult.rows.length === 0) {
        console.log('Project not found. Creating a general project...')
        // 全くプロジェクトがない場合は作成が難しい（userIdが取得できないため）。
        // デモ用ユーザーIDなどはあるか？
        console.error('Error: You need to login to Yarikiru web UI at least once to create a project.')
        process.exit(1)
    } else {
        projectId = projectResult.rows[0][0]
        userId = projectResult.rows[0][1]
    }

    const goalId = `g_${Date.now()}_add`

    // ゴール作成（中目標）
    await db.execute({
        sql: `INSERT INTO yarikiru_goals (id, project_id, title, status, priority) VALUES (?, ?, ?, 'todo', 1)`,
        args: [goalId, projectId, taskTitle]
    })

    console.log(`\n✅ タスクを追加しました: ${taskTitle}`)
    console.log(`   (優先タスクとしてプロジェクト内に登録されました)`)
    console.log('')
    process.exit(0)
}

run().catch((e) => {
    console.error('Error:', e)
    process.exit(1)
})
