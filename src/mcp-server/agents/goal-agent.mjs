#!/usr/bin/env node
/**
 * YARIKIRU Goal Agent (OSS版)
 *
 * Agent for creating and managing goals with interactive context gathering.
 * Uses local SQLite database instead of Turso.
 */

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })

import inquirer from 'inquirer'
import chalk from 'chalk'
import Database from 'better-sqlite3'
import { resolve } from 'path'

// SQLite connection (OSS版)
const dbPath = process.env.YARIKIRU_DB_PATH || resolve(process.cwd(), 'yarikiru.db')
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

/**
 * Interactive goal creation with context gathering
 */
async function createGoalInteractive() {
    console.log(chalk.cyan.bold('\n🎯 YARIKIRU - 新しい目標を作成\n'))

    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'title',
            message: '目標のタイトル:',
            validate: input => input.length > 0 || 'タイトルは必須です',
        },
        {
            type: 'editor',
            name: 'description',
            message: '詳細な説明 (Ctrl+D で完了):',
            default: '',
        },
        {
            type: 'confirm',
            name: 'hasDeadline',
            message: '期限を設定しますか?',
            default: false,
        },
        {
            type: 'input',
            name: 'deadline',
            message: '期限 (YYYY-MM-DD):',
            when: answers => answers.hasDeadline,
            validate: input => /^\d{4}-\d{2}-\d{2}$/.test(input) || 'YYYY-MM-DD 形式で入力してください',
        },
        {
            type: 'list',
            name: 'priority',
            message: '優先度:',
            choices: ['高', '中', '低'],
            default: '中',
        },
    ])

    const goalId = `goal_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    const userId = process.env.YARIKIRU_USER_ID || 'user_default'

    try {
        db.prepare(`
      INSERT INTO goals (id, user_id, title, description, deadline, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `).run(
            goalId,
            userId,
            answers.title,
            answers.description || null,
            answers.deadline || null,
        )

        console.log(chalk.green.bold('\n✅ 目標を作成しました!\n'))
        console.log(chalk.white(`ID: ${goalId}`))
        console.log(chalk.white(`タイトル: ${answers.title}`))
        console.log(chalk.white(`期限: ${answers.deadline || 'なし'}`))
        console.log(chalk.white(`優先度: ${answers.priority}`))

        const { decompose } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'decompose',
                message: 'この目標を15分タスクに分解しますか?',
                default: true,
            },
        ])

        if (decompose) {
            return { goalId, title: answers.title, description: answers.description }
        }

        return { goalId }
    } catch (error) {
        console.error(chalk.red('エラーが発生しました:'), error.message)
        process.exit(1)
    }
}

/**
 * Main execution
 */
async function main() {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        console.log(chalk.cyan.bold('YARIKIRU Goal Agent (OSS版)'))
        console.log('')
        console.log(chalk.white('使用方法:'))
        console.log(chalk.gray('  node goal-agent.mjs          インタラクティブに目標を作成'))
        console.log(chalk.gray('  node goal-agent.mjs --help   このヘルプを表示'))
        console.log('')
        console.log(chalk.white('環境変数:'))
        console.log(chalk.gray('  YARIKIRU_DB_PATH   SQLiteデータベースのパス (デフォルト: ./yarikiru.db)'))
        console.log(chalk.gray('  YARIKIRU_USER_ID   ユーザーID (デフォルト: user_default)'))
        process.exit(0)
    }

    const result = await createGoalInteractive()

    if (result.description !== undefined) {
        console.log(chalk.cyan('\n🤖 次は bunkai-agent.mjs を実行してタスク分解を行ってください\n'))
    }

    process.exit(0)
}

main().catch(error => {
    console.error(chalk.red('Fatal error:'), error)
    process.exit(1)
})
