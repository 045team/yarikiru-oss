#!/usr/bin/env node
/**
 * YARIKIRU Bunkai Agent (OSS版)
 *
 * Agent for breaking down goals into 15-minute actionable tasks.
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
 * Fetch active goals for selection
 */
function listActiveGoals() {
    const userId = process.env.YARIKIRU_USER_ID || 'user_default'

    const rows = db.prepare(`
    SELECT id, title, description, deadline
    FROM goals
    WHERE user_id = ? AND status = 'active'
    ORDER BY created_at DESC
  `).all(userId)

    return rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        deadline: row.deadline,
    }))
}

/**
 * Generate XML-formatted decomposition prompt
 */
function generateDecompositionPrompt(goal, availableHours = 2) {
    return `<yarikiru_decomposition_request>
  <goal>
    <title>${goal.title}</title>
    ${goal.description ? `<description>${goal.description}</description>` : ''}
    ${goal.deadline ? `<deadline>${goal.deadline}</deadline>` : ''}
  </goal>
  <constraints>
    <chunk_size>15 minutes</chunk_size>
    <available_hours_per_day>${availableHours}</available_hours_per_day>
    <philosophy>やりきる - start and complete each task</philosophy>
  </constraints>
  <requirements>
    1. Break down into 15-minute actionable chunks
    2. Each task must be specific and verifiable
    3. Consider dependencies between tasks
    4. Prioritize by importance (high/medium/low)
    5. Each task should be independently completable
  </requirements>
  <output_format>
    Return a JSON array of tasks:
    [
      {
        "title": "Specific actionable task name",
        "estimatedMinutes": 15,
        "priority": "high|medium|low"
      }
    ]
  </output_format>
</yarikiru_decomposition_request>`
}

/**
 * Main decomposition workflow
 */
async function main() {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        console.log(chalk.cyan.bold('YARIKIRU Bunkai Agent (OSS版)'))
        console.log('')
        console.log(chalk.white('使用方法:'))
        console.log(chalk.gray('  node bunkai-agent.mjs          インタラクティブにタスクを分解'))
        console.log(chalk.gray('  node bunkai-agent.mjs --help   このヘルプを表示'))
        console.log('')
        console.log(chalk.white('環境変数:'))
        console.log(chalk.gray('  YARIKIRU_DB_PATH   SQLiteデータベースのパス (デフォルト: ./yarikiru.db)'))
        console.log(chalk.gray('  YARIKIRU_USER_ID   ユーザーID (デフォルト: user_default)'))
        process.exit(0)
    }

    console.log(chalk.cyan.bold('\n🔧 YARIKIRU - 目標を15分タスクに分割（bunkai）\n'))

    const goals = listActiveGoals()

    if (goals.length === 0) {
        console.log(chalk.yellow('アクティブな目標がありません。まず goal-agent.mjs で目標を作成してください。\n'))
        process.exit(0)
    }

    const { selectedGoalId } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedGoalId',
            message: '分解する目標を選択してください:',
            choices: goals.map(g => ({ name: g.title, value: g.id })),
        },
    ])

    const selectedGoal = goals.find(g => g.id === selectedGoalId)

    const { availableHours } = await inquirer.prompt([
        {
            type: 'number',
            name: 'availableHours',
            message: '1日あたりの作業時間 (時間):',
            default: 2,
        },
    ])

    const prompt = generateDecompositionPrompt(selectedGoal, availableHours)

    console.log(chalk.cyan('\n📋 以下のプロンプトでタスク分割（bunkai）を行います:\n'))
    console.log(chalk.white(prompt))
    console.log(chalk.cyan('\n\n💡 このプロンプトをClaudeに送信して、タスク分解を実行してください。\n'))
    console.log(chalk.white('分解が完了したら、以下のコマンドでタスクを保存します:'))
    console.log(chalk.gray(`   mcp__yarikiru__create_tasks(goalId="${selectedGoalId}", tasks=[...])\n`))

    process.exit(0)
}

main().catch(error => {
    console.error(chalk.red('Fatal error:'), error)
    process.exit(1)
})
