#!/usr/bin/env node
/**
 * YARIKIRU Work Agent (OSS版)
 *
 * Agent for executing tasks one by one in focused work mode.
 * Implements the "やりきる" philosophy - complete each task once started.
 * Uses local SQLite database instead of Turso.
 */

// Load environment variables
import { config } from 'dotenv'
config({ path: '.env.local' })

import inquirer from 'inquirer'
import chalk from 'chalk'
import ora from 'ora'
import Database from 'better-sqlite3'
import { resolve } from 'path'

// SQLite connection (OSS版)
const dbPath = process.env.YARIKIRU_DB_PATH || resolve(process.cwd(), 'yarikiru.db')
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

/**
 * Fetch goals with their tasks
 */
function getGoalsWithTasks() {
    const userId = process.env.YARIKIRU_USER_ID || 'user_default'

    const goalRows = db.prepare(`
    SELECT id, title, status
    FROM goals
    WHERE user_id = ? AND status = 'active'
    ORDER BY created_at DESC
  `).all(userId)

    const goals = []

    for (const row of goalRows) {
        const goalId = row.id
        const taskRows = db.prepare(`
      SELECT id, title, estimated_minutes, priority, is_completed
      FROM generated_tasks
      WHERE goal_id = ?
      ORDER BY created_at ASC
    `).all(goalId)

        const tasks = taskRows.map(t => ({
            id: t.id,
            title: t.title,
            estimatedMinutes: t.estimated_minutes,
            priority: t.priority,
            isCompleted: t.is_completed === 1,
        }))

        const completedCount = tasks.filter(t => t.isCompleted).length

        goals.push({
            id: goalId,
            title: row.title,
            tasks,
            completedCount,
            totalCount: tasks.length,
        })
    }

    return goals
}

/**
 * Find next incomplete task
 */
function findNextTask(tasks) {
    return tasks.find(t => !t.isCompleted)
}

/**
 * Format task display
 */
function formatTask(task, index) {
    const statusIcon = task.isCompleted ? '✅' : '⏳'
    const priorityColor = {
        high: 'red',
        medium: 'yellow',
        low: 'blue',
    }[task.priority] || 'white'

    return `${statusIcon} [${index + 1}] ${chalk[task.isCompleted ? 'gray' : 'white'].bold(task.title)}
       ${chalk.gray(`⏱️  ${task.estimatedMinutes}分 | 🔰 優先度: `)}${chalk[priorityColor](task.priority)}`
}

/**
 * Main work mode loop
 */
async function workMode(goal) {
    console.log(chalk.cyan.bold('\n🔄 YARIKIRU WORK MODE\n'))
    console.log(chalk.white.bold(`目標: ${goal.title}`))
    console.log(chalk.gray(`進捗: ${goal.completedCount}/${goal.totalCount} タスク完了\n`))

    let nextTask = findNextTask(goal.tasks)

    while (nextTask) {
        console.log(chalk.cyan('📋 タスクリスト:\n'))
        goal.tasks.forEach((task, i) => {
            console.log(formatTask(task, i))
        })
        console.log()

        console.log(chalk.white.bold('📦 現在のタスク:'))
        console.log(chalk.white.bold(`   ${nextTask.title}`))
        console.log(chalk.gray(`   ⏱️  見積もり: ${nextTask.estimatedMinutes}分`))
        console.log(chalk.gray(`   🔰 優先度: ${nextTask.priority}`))
        console.log()

        const spinner = ora({
            text: '🎯 作業中... (完了したら Enter を押してください)',
            color: 'cyan',
        }).start()

        await inquirer.prompt([
            {
                type: 'input',
                name: 'complete',
                message: '完了したら Enter キーを押してください...',
            },
        ])

        spinner.succeed('✅ タスクを完了しました!')

        // Update task status in SQLite
        db.prepare(`
      UPDATE generated_tasks
      SET is_completed = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nextTask.id)

        // Update local state
        const taskIndex = goal.tasks.findIndex(t => t.id === nextTask.id)
        goal.tasks[taskIndex].isCompleted = true
        goal.completedCount++

        nextTask = findNextTask(goal.tasks)

        if (nextTask) {
            console.log(chalk.cyan('\n🎉 素晴らしい! 次のタスクに進みましょう。\n'))
        } else {
            console.log(chalk.green.bold('\n🎉🎉🎉 すべてのタスクが完了しました! 🎉🎉🎉\n'))
            console.log(chalk.white(`目標「${goal.title}」をやりきりました!`))
        }
    }
}

/**
 * Main execution
 */
async function main() {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        console.log(chalk.cyan.bold('YARIKIRU Work Agent (OSS版)'))
        console.log('')
        console.log(chalk.white('使用方法:'))
        console.log(chalk.gray('  node work-agent.mjs          インタラクティブにタスクを実行'))
        console.log(chalk.gray('  node work-agent.mjs --help   このヘルプを表示'))
        console.log('')
        console.log(chalk.white('環境変数:'))
        console.log(chalk.gray('  YARIKIRU_DB_PATH   SQLiteデータベースのパス (デフォルト: ./yarikiru.db)'))
        console.log(chalk.gray('  YARIKIRU_USER_ID   ユーザーID (デフォルト: user_default)'))
        process.exit(0)
    }

    const goals = getGoalsWithTasks()
    const goalsWithTasks = goals.filter(g => g.totalCount > 0)

    if (goalsWithTasks.length === 0) {
        console.log(chalk.yellow('タスクがある目標がありません。\n'))
        console.log(chalk.gray('ヒント: bunkai-agent.mjs でタスクを作成してください。\n'))
        process.exit(0)
    }

    const { selectedGoalId } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedGoalId',
            message: '作業する目標を選択してください:',
            choices: goalsWithTasks.map(g => ({
                name: `${g.title} (${g.completedCount}/${g.totalCount} 完了)`,
                value: g.id,
            })),
        },
    ])

    const selectedGoal = goalsWithTasks.find(g => g.id === selectedGoalId)

    const nextTask = findNextTask(selectedGoal.tasks)
    if (!nextTask) {
        console.log(chalk.cyan(`\n🎉 すべてのタスクが完了しています!\n`))
        console.log(chalk.gray(`完了した目標をアーカイブするには goal-agent.mjs を使用してください\n`))
        process.exit(0)
    }

    await workMode(selectedGoal)
    process.exit(0)
}

main().catch(error => {
    console.error(chalk.red('Fatal error:'), error)
    process.exit(1)
})
