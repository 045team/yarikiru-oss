#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import fs from 'fs'
import path from 'path'
import os from 'os'
import inquirer from 'inquirer'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

// Ensure we are running via tsx to support TypeScript and paths like @/lib
const isTsx = process.argv[1]?.includes('tsx') || process.execArgv.some(arg => arg.includes('tsx'))
if (!isTsx) {
    const __filename = fileURLToPath(import.meta.url)
    const result = spawnSync('npx', ['tsx', __filename, ...process.argv.slice(2)], {
        stdio: 'inherit'
    })
    process.exit(result.status ?? 1)
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const program = new Command()
const CONFIG_DIR = path.join(os.homedir(), '.yarikiru')
const CONFIG_FILE = path.join(CONFIG_DIR, 'credentials.json')

// Attempt to load .env.local if running inside the repository
try {
    const envPath = path.join(process.cwd(), '.env.local')
    if (fs.existsSync(envPath)) {
        const dotenv = await import('dotenv')
        const envConfig = dotenv.config({ path: envPath })

        // Prevent Developer's .env.local from accidentally forcing HTTP "Cloud Mode"
        // so the CLI uses the natively stable Drizzle ORM / Turso direct connection.
        if (envConfig.parsed?.YARIKIRU_API_KEY) delete process.env.YARIKIRU_API_KEY;
        if (envConfig.parsed?.YARIKIRU_API_URL) delete process.env.YARIKIRU_API_URL;
    }
} catch (err) {
    // Ignore dotenv errors
}

function getConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
    }
    return {}
}

function saveConfig(config) {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

function getApiUrl() {
    const config = getConfig()
    return process.env.YARIKIRU_API_URL || config.apiUrl || 'https://yarikiru.com/api/mcp'
}

function getApiKey() {
    if (process.env.YARIKIRU_API_KEY) return process.env.YARIKIRU_API_KEY
    const config = getConfig()
    if (config.apiKey) return config.apiKey
    return null
}

let localDb = null;
async function getLocalDb() {
    if (!localDb) {
        const { createClient } = await import('@libsql/client')

        // If developer is inside the repo, use the repo's DB directly
        if (process.env.TURSO_DATABASE_URL) {
            localDb = createClient({
                url: process.env.TURSO_DATABASE_URL,
                authToken: process.env.TURSO_AUTH_TOKEN
            })
            // Skip migrations here as the web app handles repo migrations
        } else {
            // General external user fallback
            if (!fs.existsSync(CONFIG_DIR)) {
                fs.mkdirSync(CONFIG_DIR, { recursive: true })
            }
            const dbPath = path.join(CONFIG_DIR, 'local.db')
            localDb = createClient({ url: `file:${dbPath}` })

            // Auto-apply schema migrations on first connection
            const { ensureLocalDbSchema } = await import('../src/lib/mcp/local-db-init.ts')
            await ensureLocalDbSchema(localDb)
        }
    }
    return localDb;
}

async function executeOperation(operation, args = {}) {
    try {
        const db = await getLocalDb();
        // Start local Next.js standalone server if not running, or just run db ops natively...
        // Actually this CLI is the OSS version, so ALL operations are Local.
        let ops;
        try {
            ops = await import('../src/lib/mcp/core-operations.ts');
        } catch (e) {
            ops = await import('../src/lib/mcp/core-operations.js').catch(err => {
                throw new Error("Could not import core operations.")
            })
        }

        const fnName = 'mcp' + operation.charAt(0).toUpperCase() + operation.slice(1);
        if (typeof ops[fnName] !== 'function') throw new Error(`Unsupported local operation: ${operation}`);

        return await ops[fnName](db, args, 'local-oss-user');
    } catch (error) {
        throw new Error(`Local Operation Failed: ${error.message}`);
    }
}

program
    .name('yarikiru')
    .description('YARIKIRU ターミナル CLI ツール')
    .version('1.0.0')

program
    .command('init')
    .description('YARIKIRU OSS の初期セットアップ')
    .action(async () => {
        console.log(chalk.bold.blue('\n--- YARIKIRU OSS 初期セットアップ ---'))
        console.log('ローカルディレクトリにデータベースを構築します。\n')

        // DB初期化チェック
        await getLocalDb();
        console.log(chalk.green('\n✓ 準備が完了しました！'))
        console.log(chalk.dim(`データベースパス: ${path.join(CONFIG_DIR, 'local.db')}`))

        console.log(chalk.bold('\nセットアップ完了🎉'))
        console.log('まずはUIを立ち上げてダッシュボードを確認しましょう:')
        console.log(chalk.cyan('  $ npx yarikiru-oss ui'))
        console.log('')
    })

program
    .command('ui')
    .description('ローカルダッシュボードUIを起動します')
    .action(() => {
        // __dirname = cli/, package root = ..
        const pkgRoot = path.resolve(__dirname, '..');
        const nextDir = path.join(pkgRoot, '.next');
        const serverDir = path.join(nextDir, 'server');

        if (!fs.existsSync(serverDir)) {
            console.error(chalk.red('✗ ビルドが見つかりません。先にビルドを実行してください:'));
            console.error(chalk.cyan('  $ cd ' + pkgRoot));
            console.error(chalk.cyan('  $ npm run build'));
            console.error(chalk.dim('\nまたは npx で実行:'));
            console.error(chalk.cyan('  $ npx yarikiru-oss init  # 初期セットアップ後'));
            console.error(chalk.cyan('  $ npx yarikiru-oss ui'));
            process.exit(1);
        }

        console.log(chalk.green('✓ YARIKIRU OSS ダッシュボードを起動中... (http://localhost:3000)'));
        const serverProcess = spawnSync('npx', ['next', 'start'], { stdio: 'inherit', cwd: pkgRoot });
        process.exit(serverProcess.status ?? 0);
    });

program
    .command('logout')
    .description('Free Tier: 設定されたAPIキーを削除し、Local-Firstモードに戻ります')
    .action(() => {
        const config = getConfig()
        delete config.apiKey
        saveConfig(config)
        console.log(chalk.yellow('設定されたAPIキーを削除しました。今後は Local-Firstモード(SQLite)で動作します。'))
    })

program
    .command('mode')
    .description('現在の動作モード（Cloud-Sync または Local-First）を表示します')
    .action(() => {
        const key = getApiKey()
        if (key) {
            console.log(chalk.bold.blue('現在のモード: Cloud-Sync (Pro Tier)'))
            console.log(`接続先: ${getApiUrl()}`)
        } else {
            console.log(chalk.bold.green('現在のモード: Local-First (OSS/Free Tier)'))
            console.log(`データベース: ${path.join(CONFIG_DIR, 'local.db')}`)

            // Check for Local LLM configuration
            const localLlmUrl = process.env.OPENAI_BASE_URL
            if (localLlmUrl) {
                console.log(chalk.cyan(`Local LLM API (AI分解用): ${localLlmUrl}`))
            } else {
                console.log(chalk.dim('\n💡 AI タスク分解 (Ollama等) をローカルで利用するには:'))
                console.log(chalk.dim('   export OPENAI_BASE_URL="http://localhost:11434/v1"'))
                console.log(chalk.dim('   export OPENAI_API_KEY="ollama" (必要に応じて)'))
            }
        }
    })

program
    .command('status')
    .description('今日の振り返りと現状のアクティブな状態を表示します')
    .action(async () => {
        const spinner = ora('状態を取得中...').start()
        try {
            const stats = await executeOperation('getStats')
            spinner.succeed('状態を取得しました')

            console.log('\n' + chalk.bold.blue('--- YARIKIRU ステータス ---'))
            console.log(`進行中プロジェクト/目標 : ${chalk.yellow(stats.activeGoals)} 件`)
            console.log(`総タスク数             : ${stats.totalTasks} 件`)
            console.log(`完了タスク             : ${chalk.green(stats.completedTasks)} 件`)
            console.log(`完了率                 : ${stats.completionRate}%\n`)

            // Detect loops on active goals
            try {
                const projectsData = await executeOperation('listProjects')
                for (const p of projectsData.projects || []) {
                    const activeGoals = p.goals.filter(g => g.status === 'in_progress')
                    for (const g of activeGoals) {
                        const loopCheck = await executeOperation('detectLoops', { goalId: g.id })
                        if (loopCheck && loopCheck.isLooping) {
                            console.log(chalk.bgRed.whiteBright.bold(` [WARNING] ループ検知 `) + chalk.red(` Goal: ${g.title}`))
                            console.log(chalk.red(`   ${loopCheck.message} (現在 ${loopCheck.count}回目)`))
                        }
                    }
                }
            } catch (e) {
                // Ignore loop detection errors on status command
            }

        } catch (err) {
            spinner.fail('取得に失敗しました')
            console.error(chalk.red(err.message))
        }
    })

program
    .command('list')
    .description('現在アクティブなプロジェクトと目標 (タスク) の一覧を表示します')
    .action(async () => {
        const spinner = ora('プロジェクト一覧を取得中...').start()
        try {
            const data = await executeOperation('listProjects')
            const projects = data.projects || []
            spinner.stop()

            if (projects.length === 0) {
                console.log(chalk.yellow('\nアクティブなプロジェクトがありません。'))
                return
            }

            console.log('\n' + chalk.bold('🎯 プロジェクト一覧'))
            for (const p of projects) {
                console.log(`\n■ ${chalk.blueBright.bold(p.title)} (${p.status})`)

                const activeGoals = p.goals.filter(g => g.status !== 'done')
                if (activeGoals.length === 0) {
                    console.log('  ' + chalk.dim('アクティブな目標はありません。'))
                    continue
                }

                for (const g of activeGoals) {
                    const statusIcon = g.status === 'in_progress' ? chalk.yellow('▶') : chalk.gray('○')
                    console.log(`  ${statusIcon} ${chalk.white.bold(g.title)} ${chalk.dim(`[ID: ${g.id}]`)}`)
                    console.log(`      予定: ${g.estimatedMinutes}m`)

                    if (g.subTasks && g.subTasks.length > 0) {
                        for (const sub of g.subTasks) {
                            const subIcon = sub.isDone ? chalk.green('✓') : chalk.gray('-')
                            console.log(`      ${subIcon} ${sub.label} ${chalk.dim(`[ID: ${sub.id}]`)}`)
                        }
                    }
                }
            }
            console.log('')
        } catch (err) {
            spinner.fail('取得に失敗しました')
            console.error(chalk.red(err.message))
        }
    })

program
    .command('info [goalId]')
    .description('指定した目標の詳細とサブタスクの状況を表示します（ID省略時は一覧から選択）')
    .action(async (goalId) => {
        if (!goalId) {
            const spinner = ora('目標一覧を取得中...').start()
            try {
                const data = await executeOperation('listProjects')
                spinner.stop()
                const choices = []
                for (const p of data.projects || []) {
                    const activeGoals = p.goals.filter(g => g.status !== 'archived')
                    for (const g of activeGoals) {
                        choices.push({
                            name: `[${p.title}] ${g.title}`,
                            value: g.id
                        })
                    }
                }
                if (choices.length === 0) {
                    console.log(chalk.yellow('\n詳細を見たい目標がありません。'))
                    return
                }
                const answers = await inquirer.prompt([{
                    type: 'list', name: 'selectedGoalId', message: '詳細を見たい目標を選択してください:', choices
                }])
                goalId = answers.selectedGoalId
            } catch (err) {
                spinner.fail('一覧の取得に失敗しました')
                console.error(chalk.red(err.message))
                return
            }
        }

        const spinner = ora('詳細情報を取得中...').start()
        try {
            const data = await executeOperation('getGoal', { goalId })
            spinner.stop()
            const { goal, tasks } = data

            console.log('\n' + chalk.bold.blue('--- 目標詳細 ---'))
            console.log(`${chalk.bold('タイトル')}: ${goal.title}`)
            console.log(`${chalk.bold('ID')}: ${chalk.yellow(goal.id)}`)
            console.log(`${chalk.bold('ステータス')}: ${goal.status}`)
            if (goal.description) console.log(`\n${chalk.bold('説明')}:\n${goal.description}`)

            console.log('\n' + chalk.bold('サブタスク一覧:'))
            if (tasks && tasks.length > 0) {
                for (const t of tasks) {
                    const icon = t.isCompleted ? chalk.green('✓') : chalk.gray('-')
                    console.log(`  ${icon} ${t.title} ${chalk.dim(`[ID: ${t.id}]`)}`)
                }
            } else {
                console.log('  ' + chalk.dim('サブタスクはありません。'))
            }
            console.log('')
        } catch (err) {
            spinner.fail('取得に失敗しました')
            console.error(chalk.red(err.message))
        }
    })

program
    .command('start [goalId]')
    .description('指定したゴールの作業タイマーを開始します（ID省略時は一覧から選択）')
    .action(async (goalId) => {
        if (!goalId) {
            const spinner = ora('目標一覧を取得中...').start()
            try {
                const data = await executeOperation('listProjects')
                spinner.stop()
                const choices = []
                for (const p of data.projects || []) {
                    const activeGoals = p.goals.filter(g => g.status !== 'done')
                    for (const g of activeGoals) {
                        choices.push({
                            name: `[${p.title}] ${g.title}`,
                            value: g.id
                        })
                    }
                }

                if (choices.length === 0) {
                    console.log(chalk.yellow('アクティブな目標がありません。'))
                    return
                }

                const answers = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'selectedGoalId',
                        message: '📝 どのゴールの作業を開始しますか？',
                        choices
                    }
                ])
                goalId = answers.selectedGoalId
            } catch (err) {
                spinner.fail('取得に失敗しました')
                console.error(chalk.red(err.message))
                return
            }
        }

        const spinner = ora('ログを開始中...').start()
        try {
            const res = await executeOperation('startGoalWork', { goalId })
            spinner.succeed(chalk.green(`タイマーを開始しました！`))
            console.log(chalk.bold.yellow(`\n📝 ゴール: ${res.goalTitle}`))
            console.log(`開始時間: ${new Date(res.startedAt).toLocaleString()}`)
            console.log(chalk.dim(`Log ID: ${res.logId} \n`))

            // Check for loop warning
            try {
                const loopCheck = await executeOperation('detectLoops', { goalId })
                if (loopCheck && loopCheck.isLooping) {
                    console.log(chalk.bgRed.whiteBright.bold(` [WARNING] ループ検知 `) + chalk.yellow(` (${loopCheck.count}回目の再開)`))
                    console.log(chalk.red(loopCheck.message + '\n'))
                }
            } catch (e) {
                // Ignore loop detection errors
            }

        } catch (err) {
            spinner.fail('開始に失敗しました')
            console.error(chalk.red(err.message))
        }
    })

program
    .command('done [goalId]')
    .description('作業タイマーを終了し、ゴールを完了状態にします（ID省略時は一覧から選択）')
    .option('-l, --learning <text>', '学びの内容をテキストで記録')
    .action(async (goalId, options) => {
        if (!goalId) {
            const spinner = ora('進行中の目標を取得中...').start()
            try {
                const data = await executeOperation('listProjects')
                spinner.stop()
                const choices = []
                for (const p of data.projects || []) {
                    // done コマンドの場合は in_progress や todo のものを全取得
                    const activeGoals = p.goals.filter(g => g.status !== 'done')
                    for (const g of activeGoals) {
                        choices.push({
                            name: `[${p.title}] ${g.title} (${g.status})`,
                            value: g.id
                        })
                    }
                }

                if (choices.length === 0) {
                    console.log(chalk.yellow('完了可能な目標がありません。'))
                    return
                }

                const answers = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'selectedGoalId',
                        message: '✅ どのゴールを完了しますか？',
                        choices
                    }
                ])
                goalId = answers.selectedGoalId
            } catch (err) {
                spinner.fail('取得に失敗しました')
                console.error(chalk.red(err.message))
                return
            }
        }

        const spinner = ora('完了処理中...').start()
        try {
            const res = await executeOperation('completeGoalWork', {
                goalId,
                learning: options.learning
            })
            spinner.succeed(chalk.green(`✓ ゴールを完了しました！`))
            console.log(`実績時間: ${chalk.yellow(res.actualMinutes)}分`)
            if (res.learning) {
                console.log(`学び: ${res.learning}`)
            }
        } catch (err) {
            spinner.fail('完了処理に失敗しました')
            console.error(chalk.red(err.message))
        }
    })

program
    .command('learn <url>')
    .description('新しい学習リソース (URL) を追加します')
    .option('-t, --title <title>', 'タイトル(省略時は自動取得をUI側で試みます)')
    .action(async (url, options) => {
        const spinner = ora('学習リストに追加中...').start()
        try {
            const res = await executeOperation('addLearningUrl', {
                url,
                title: options.title
            })
            spinner.succeed(chalk.green(`学習リストに追加しました！ => ${res.id}`))
        } catch (err) {
            spinner.fail('追加に失敗しました')
            console.error(chalk.red(err.message))
        }
    })

program
    .command('report')
    .description('最近の完了済みゴールと蓄積された学習リソースのサマリを表示します')
    .option('-w, --weekly', '直近1週間の詳細な振り返りレポートを出力します')
    .action(async (options) => {
        if (options.weekly) {
            const spinner = ora('週次振り返りレポートを生成中...').start()
            try {
                const data = await executeOperation('generateWeeklyReport', {})
                spinner.succeed('週次レポートを取得しました！\n')

                const { totalMinutes, sessionsCount, completedGoals } = data.report || {}

                console.log(chalk.bold.blue('=== 📅 YARIKIRU 週次振り返りレポート ==='))
                console.log(chalk.dim('過去7日間の作業実績と学びのサマリ\n'))

                console.log(chalk.bold('📈 作業ハイライト'))
                console.log(`⏱️  総作業時間   : ${chalk.yellow(totalMinutes)}分 (${Math.round(totalMinutes / 60)}時間)`)
                console.log(`🔁 作業セッション: ${chalk.cyan(sessionsCount)}回`)
                console.log(`✅ 完了したゴール: ${chalk.green(completedGoals ? completedGoals.length : 0)}件\n`)

                if (completedGoals && completedGoals.length > 0) {
                    console.log(chalk.bold.green('🎉 完了した主なミッションと学び:'))
                    for (const g of completedGoals) {
                        const date = new Date(g.completedAt).toLocaleDateString()
                        console.log(`\n  ■ ${chalk.white.bold(g.title)} ${chalk.dim(`[${g.projectTitle}] (${date})`)}`)
                        console.log(`    時間: ${chalk.yellow(g.actualMinutes)}分`)
                        if (g.learning) {
                            console.log(`    💡 学び: ${chalk.cyan(g.learning)}`)
                        }
                    }
                } else {
                    console.log(chalk.dim('完了した目標はありませんでした。来週も頑張りましょう！'))
                }

                console.log('\n==========================================\n')
                return
            } catch (err) {
                spinner.fail('レポート生成に失敗しました')
                console.error(chalk.red(err.message))
                return
            }
        }

        const spinner = ora('学習結果のサマリを取得中...').start()
        try {
            const projectsData = await executeOperation('listProjects')
            let completedGoals = []

            for (const p of projectsData.projects || []) {
                const doneGoals = p.goals.filter(g => g.status === 'done' && g.learning)
                if (doneGoals.length > 0) {
                    completedGoals.push(...doneGoals.map(g => ({ ...g, projectName: p.title })))
                }
            }

            // 学習リソース (URL) の取得
            let learnings = []
            try {
                const learnData = await executeOperation('generateArticleFromLearnings', {})
                if (learnData && learnData.learnings) {
                    learnings = learnData.learnings
                }
            } catch (e) {
                // If it fails, just ignore
            }

            spinner.succeed('サマリを取得しました！\n')

            console.log(chalk.bold.blue('--- YARIKIRU 完了サマリ＆学習レポート ---'))

            if (completedGoals.length > 0) {
                console.log(chalk.bold.green('\n🎉 最近完了したゴールと学び:'))
                for (const g of completedGoals) {
                    console.log(`\n  ■ ${chalk.white.bold(g.title)} ${chalk.dim(`[${g.projectName}]`)}`)
                    console.log(`    時間: ${chalk.yellow(g.actualMinutes)}分`)
                    console.log(`    💡 学び: ${chalk.cyan(g.learning)}`)
                }
            } else {
                console.log(chalk.dim('\n最近完了して学びが記録されたゴールはありません。'))
            }

            if (learnings.length > 0) {
                console.log(chalk.bold.magenta('\n📚 蓄積された学習リソース (未消化):'))
                const unread = learnings.filter(l => l.status === 'unread')
                for (const l of unread) {
                    console.log(`\n  - ${chalk.white.bold(l.title || l.url)}`)
                    if (l.title && l.title !== l.url) {
                        console.log(`    ${chalk.dim(l.url)}`)
                    }
                    if (l.what || l.how || l.impact) {
                        if (l.what) console.log(`    ${chalk.cyan('What:')} ${l.what}`)
                        if (l.how) console.log(`    ${chalk.cyan('How:')} ${l.how}`)
                    }
                }
            }

            console.log('\n' + chalk.dim('=============================================='))
            console.log(chalk.dim('Tip: 次の作業を始める際は `npx yarikiru start` を入力'))

        } catch (err) {
            spinner.fail('取得に失敗しました')
            console.error(chalk.red(err.message))
        }
    })

program
    .command('article')
    .description('蓄積された学習リソースから記事のドラフト(Markdown)を生成します')
    .action(async () => {
        const spinner = ora('記事ドラフトを生成中...').start()
        try {
            const data = await executeOperation('generateArticleFromLearnings', { statusType: 'summarized' })
            spinner.stop()

            if (!data || !data.article) {
                console.log(chalk.yellow('記事化できる学習リソース(summarized状態)がありません。'))
                return
            }

            console.log(chalk.bold.green('✓ 記事ドラフトの生成に成功しました！\n'))

            const filename = `article_draft_${new Date().toISOString().split('T')[0]}.md`
            const outPath = path.join(process.cwd(), filename)
            fs.writeFileSync(outPath, data.article, 'utf8')

            console.log(chalk.bold('生成されたドラフトファイル: ') + chalk.cyan(outPath))
            console.log(chalk.dim('※ エディタで開いて加筆修正を行ってください。'))

            if (data.learningIds && data.learningIds.length > 0) {
                const answer = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'markArticled',
                        message: '使用した学習アイテムを「記事化済み(articled)」としてマークしますか？',
                        default: true
                    }
                ])
                if (answer.markArticled) {
                    const markSpinner = ora('ステータスを更新中...').start()
                    await executeOperation('markLearningsArticled', { learningIds: data.learningIds })
                    markSpinner.succeed('ステータスを更新しました。')
                }
            }
        } catch (err) {
            spinner.fail('記事ドラフトの生成に失敗しました')
            console.error(chalk.red(err.message))
        }
    })

// ============================================
// Graph CLI Commands
// ============================================

const graphCommand = program
    .command('graph')
    .description('Graphベースのタスク管理機能')

graphCommand
    .command('list <goalId>')
    .description('指定したゴールのすべてのグラフを一覧表示します')
    .action(async (goalId) => {
        const spinner = ora('グラフ一覧を取得中...').start()
        try {
            const graphs = await executeOperation('getTaskGraphsByGoalId', { goalId })
            spinner.succeed('グラフ一覧を取得しました')

            if (graphs.length === 0) {
                console.log(chalk.yellow('\nこのゴールにはグラフがありません。'))
                return
            }

            console.log('\n' + chalk.bold('📊 グラフ一覧'))
            for (const g of graphs) {
                const typeLabel = {
                    dag: chalk.blue('DAG'),
                    sequence: chalk.green('順序'),
                    hierarchy: chalk.magenta('階層'),
                    network: chalk.cyan('ネットワーク'),
                    conditional: chalk.yellow('条件付き'),
                    parallel: chalk.red('並列')
                }[g.graph_type] || g.graph_type

                const primaryBadge = g.is_primary ? chalk.bold.green(' [PRIMARY]') : ''

                console.log(`\n${chalk.white.bold(g.title)}${primaryBadge}`)
                console.log(`  ID: ${chalk.dim(g.id)}`)
                console.log(`  タイプ: ${typeLabel}`)
                if (g.description) {
                    console.log(`  説明: ${chalk.dim(g.description)}`)
                }
                console.log(`  作成日: ${new Date(g.created_at).toLocaleString()}`)
            }
            console.log('')
        } catch (err) {
            spinner.fail('取得に失敗しました')
            console.error(chalk.red(err.message))
        }
    })

graphCommand
    .command('show <graphId>')
    .description('グラフの詳細（ノードとエッジ）を表示します')
    .action(async (graphId) => {
        const spinner = ora('グラフ詳細を取得中...').start()
        try {
            const data = await executeOperation('getTaskGraphWithNodesAndEdges', { graphId })
            spinner.succeed('グラフ詳細を取得しました')

            if (!data.graph) {
                console.log(chalk.yellow('\nグラフが見つかりません。'))
                return
            }

            const { graph, nodes, edges } = data

            console.log('\n' + chalk.bold('📊 グラフ詳細'))
            console.log(`${chalk.white.bold(graph.title)} ${chalk.dim(`[ID: ${graph.id}]`)}`)
            console.log(`タイプ: ${graph.graph_type}`)
            if (graph.description) {
                console.log(`説明: ${chalk.dim(graph.description)}`)
            }
            console.log(`ノード数: ${chalk.yellow(nodes.length)} | エッジ数: ${chalk.cyan(edges.length)}`)

            if (nodes.length > 0) {
                console.log('\n' + chalk.bold('ノード:'))
                for (const node of nodes) {
                    const statusIcon = {
                        todo: chalk.gray('○'),
                        in_progress: chalk.yellow('▶'),
                        done: chalk.green('✓'),
                        blocked: chalk.red('■')
                    }[node.properties.status] || chalk.gray('○')

                    const priorityBadge = {
                        critical: chalk.red.bold('[CRITICAL]'),
                        high: chalk.orange.bold('[HIGH]'),
                        medium: chalk.yellow('[MEDIUM]'),
                        low: chalk.gray('[LOW]')
                    }[node.properties.priority] || ''

                    console.log(`\n  ${statusIcon} ${chalk.white.bold(node.label)} ${chalk.dim(`[${node.node_id}]`)}`)
                    if (node.description) {
                        console.log(`      ${chalk.dim(node.description)}`)
                    }
                    if (priorityBadge) {
                        console.log(`      優先度: ${priorityBadge}`)
                    }
                    if (node.properties.estimated_minutes) {
                        console.log(`      見積: ${chalk.yellow(node.properties.estimated_minutes + '分')}`)
                    }
                }
            }

            if (edges.length > 0) {
                console.log('\n' + chalk.bold('エッジ (依存関係):'))
                for (const edge of edges) {
                    const edgeIcon = {
                        dependency: chalk.blue('→'),
                        sequence: chalk.green('→'),
                        conditional: chalk.yellow('⇄'),
                        blocking: chalk.red('⇒')
                    }[edge.edge_type] || chalk.gray('→')

                    console.log(`  ${edge.from_node_id} ${edgeIcon} ${edge.to_node_id} ${chalk.dim(`[${edge.edge_type}]`)}`)
                    if (edge.label) {
                        console.log(`      ラベル: ${chalk.dim(edge.label)}`)
                    }
                }
            }

            console.log('')
        } catch (err) {
            spinner.fail('取得に失敗しました')
            console.error(chalk.red(err.message))
        }
    })

graphCommand
    .command('create <goalId> <title>')
    .description('サブタスクから新しいグラフを作成します')
    .option('-d, --description <text>', 'グラフの説明')
    .action(async (goalId, title, options) => {
        const spinner = ora('グラフを作成中...').start()
        try {
            const result = await executeOperation('createGraphFromSubTasks', {
                goalId,
                graphTitle: title
            })
            spinner.succeed(chalk.green('グラフを作成しました！'))

            console.log(`\nID: ${chalk.dim(result.id)}`)
            console.log(`タイトル: ${chalk.white.bold(title)}`)
        } catch (err) {
            spinner.fail('作成に失敗しました')
            console.error(chalk.red(err.message))
        }
    })

graphCommand
    .command('convert <goalId>')
    .description('既存のサブタスクをグラフに変換します')
    .action(async (goalId) => {
        const spinner = ora('サブタスクをグラフに変換中...').start()
        try {
            const result = await executeOperation('convertSubTasksToGraph', { goalId })
            spinner.succeed(chalk.green('グラフに変換しました！'))

            console.log(`\nID: ${chalk.dim(result.graph.id)}`)
            console.log(`タイトル: ${chalk.white.bold(result.graph.title)}`)
            console.log(`ノード数: ${chalk.yellow(result.nodeCount)}`)
        } catch (err) {
            spinner.fail('変換に失敗しました')
            console.error(chalk.red(err.message))
        }
    })

// ============================================
// Graph Visualization Utilities
// ============================================

/**
 * グラフのトポロジカルソートを実行（DAG用）
 */
function topologicalSort(nodes, edges) {
    const inDegree = new Map()
    const adjList = new Map()
    const nodeIdToNode = new Map()

    // 初期化
    for (const node of nodes) {
        inDegree.set(node.node_id, 0)
        adjList.set(node.node_id, [])
        nodeIdToNode.set(node.node_id, node)
    }

    // エッジを構築
    for (const edge of edges) {
        adjList.get(edge.from_node_id)?.push(edge.to_node_id)
        inDegree.set(edge.to_node_id, (inDegree.get(edge.to_node_id) || 0) + 1)
    }

    // Kahnのアルゴリズム
    const queue = []
    for (const [nodeId, degree] of inDegree) {
        if (degree === 0) queue.push(nodeId)
    }

    const result = []
    while (queue.length > 0) {
        const nodeId = queue.shift()
        result.push(nodeIdToNode.get(nodeId))

        for (const neighbor of adjList.get(nodeId) || []) {
            inDegree.set(neighbor, inDegree.get(neighbor) - 1)
            if (inDegree.get(neighbor) === 0) {
                queue.push(neighbor)
            }
        }
    }

    return result
}

/**
 * グラフのレベルを計算（階層構造用）
 */
function calculateLevels(sortedNodes, edges) {
    const levels = new Map()
    const adjList = new Map()

    // 隣接リスト構築
    for (const node of sortedNodes) {
        adjList.set(node.node_id, [])
    }
    for (const edge of edges) {
        adjList.get(edge.from_node_id)?.push(edge.to_node_id)
    }

    // レベル計算（動的計画法）
    for (const node of sortedNodes) {
        const predecessors = []
        for (const [from, toList] of adjList) {
            if (toList.includes(node.node_id)) {
                predecessors.push(from)
            }
        }

        if (predecessors.length === 0) {
            levels.set(node.node_id, 0)
        } else {
            const maxPredLevel = Math.max(...predecessors.map(p => levels.get(p) || 0))
            levels.set(node.node_id, maxPredLevel + 1)
        }
    }

    return levels
}

/**
 * ノードボックスを生成
 */
function createNodeBox(node, width = 50) {
    const statusIcon = {
        todo: chalk.gray('□'),
        in_progress: chalk.yellow('▶'),
        done: chalk.green('✓'),
        blocked: chalk.red('■')
    }[node.properties?.status] || chalk.gray('□')

    const priorityLabel = {
        critical: chalk.red.bold('[CRITICAL]'),
        high: chalk.hex('#FFA500').bold('[HIGH]'),
        medium: chalk.yellow('[MEDIUM]'),
        low: chalk.gray('[LOW]')
    }[node.properties?.priority] || ''

    const estimated = node.properties?.estimated_minutes
        ? chalk.yellow(`見積: ${node.properties.estimated_minutes}分`)
        : ''

    const lines = [
        `${statusIcon} ${chalk.white.bold(node.label)}`,
    ]

    if (priorityLabel) {
        lines.push(`優先度: ${priorityLabel}`)
    }

    if (estimated) {
        lines.push(estimated)
    }

    // ボックス化
    const boxLines = []
    const innerWidth = width - 2

    boxLines.push('┌' + '─'.repeat(innerWidth) + '┐')

    for (const line of lines) {
        const padded = line.padEnd(innerWidth - 1) + ' '
        boxLines.push('│' + padded + '│')
    }

    boxLines.push('└' + '─'.repeat(innerWidth) + '┘')

    return boxLines
}

/**
 * 水平コネクタを生成
 */
function createHorizontalConnector(length = 50) {
    return '─'.repeat(length)
}

/**
 * 垂直コネクタを生成
 */
function createVerticalConnector(height = 2) {
    return Array(height).fill('│').join('\n')
}

/**
 * DAGを可視化（縦方向）
 */
function visualizeDAG(sortedNodes, edges, nodeWidth = 50) {
    const levels = calculateLevels(sortedNodes, edges)
    const maxLevel = Math.max(...levels.values())

    // レベルごとにノードをグループ化
    const levelGroups = new Map()
    for (const node of sortedNodes) {
        const level = levels.get(node.node_id) || 0
        if (!levelGroups.has(level)) {
            levelGroups.set(level, [])
        }
        levelGroups.get(level).push(node)
    }

    const output = []

    for (let level = 0; level <= maxLevel; level++) {
        const nodesInLevel = levelGroups.get(level) || []

        for (const node of nodesInLevel) {
            const box = createNodeBox(node, nodeWidth)
            output.push(...box)

            // 次のレベルへの接続を確認
            const hasNextLevel = level < maxLevel
            if (hasNextLevel) {
                // エッジを確認
                const hasEdgeToNext = edges.some(e =>
                    e.from_node_id === node.node_id &&
                    levels.get(e.to_node_id) === level + 1
                )

                if (hasEdgeToNext) {
                    output.push(chalk.dim('│'))
                    output.push(chalk.dim('▼'))
                }
            }
        }

        if (level < maxLevel) {
            output.push('') // 空行
        }
    }

    return output.join('\n')
}

/**
 * シーケンスグラフを可視化
 */
function visualizeSequence(sortedNodes, edges, nodeWidth = 50) {
    const output = []

    for (let i = 0; i < sortedNodes.length; i++) {
        const node = sortedNodes[i]
        const box = createNodeBox(node, nodeWidth)
        output.push(...box)

        if (i < sortedNodes.length - 1) {
            output.push(chalk.dim('│'))
            output.push(chalk.dim('▼'))
        }
    }

    return output.join('\n')
}

/**
 * 並列グラフを可視化
 */
function visualizeParallel(sortedNodes, edges, nodeWidth = 50) {
    // 並列タスクを検出（同じレベルのノード）
    const levels = calculateLevels(sortedNodes, edges)
    const levelGroups = new Map()

    for (const node of sortedNodes) {
        const level = levels.get(node.node_id) || 0
        if (!levelGroups.has(level)) {
            levelGroups.set(level, [])
        }
        levelGroups.get(level).push(node)
    }

    const output = []

    for (const [level, nodesInLevel] of levelGroups) {
        if (nodesInLevel.length > 1) {
            // 並列表示
            const boxes = nodesInLevel.map(n => createNodeBox(n, Math.floor(nodeWidth / nodesInLevel.length)))

            // ボックスを結合
            const maxLines = Math.max(...boxes.map(b => b.length))
            for (let line = 0; line < maxLines; line++) {
                const lineParts = boxes.map(box => box[line] || ' '.repeat(Math.floor(nodeWidth / nodesInLevel.length)))
                output.push(lineParts.join(chalk.dim(' ')))
            }
        } else {
            // 単一ノード
            const box = createNodeBox(nodesInLevel[0], nodeWidth)
            output.push(...box)
        }

        if (parseInt(level) < levelGroups.size - 1) {
            output.push(chalk.dim('│'))
            output.push(chalk.dim('▼'))
        }
    }

    return output.join('\n')
}

/**
 * メインの可視化関数
 */
function visualizeGraph(graph, nodes, edges) {
    const headerWidth = 60
    const typeLabel = {
        dag: chalk.blue('DAG'),
        sequence: chalk.green('順序'),
        hierarchy: chalk.magenta('階層'),
        network: chalk.cyan('ネットワーク'),
        conditional: chalk.yellow('条件付き'),
        parallel: chalk.red('並列')
    }[graph.graph_type] || graph.graph_type

    // ヘッダー
    const output = []
    output.push('')
    output.push('┌' + '─'.repeat(headerWidth - 2) + '┐')
    output.push(`│ Graph: ${chalk.white.bold(graph.title.padEnd(headerWidth - 20))} ${typeLabel} │`)
    output.push('└' + '─'.repeat(headerWidth - 2) + '┘')
    output.push('')

    if (graph.description) {
        output.push(chalk.dim(graph.description))
        output.push('')
    }

    // トポロジカルソート
    const sortedNodes = topologicalSort(nodes, edges)

    // グラフタイプに応じた可視化
    let visualization
    switch (graph.graph_type) {
        case 'sequence':
            visualization = visualizeSequence(sortedNodes, edges)
            break
        case 'parallel':
            visualization = visualizeParallel(sortedNodes, edges)
            break
        default:
            visualization = visualizeDAG(sortedNodes, edges)
    }

    output.push(visualization)
    output.push('')
    output.push(chalk.dim('─'.repeat(headerWidth)))
    output.push(`ノード: ${chalk.yellow(nodes.length)} | エッジ: ${chalk.cyan(edges.length)} | タイプ: ${typeLabel}`)

    return output.join('\n')
}

graphCommand
    .command('visualize <graphId>')
    .description('グラフをASCIIアートで可視化します')
    .option('-w, --width <number>', '表示幅', '60')
    .action(async (graphId, options) => {
        const spinner = ora('グラフを可視化中...').start()
        try {
            const data = await executeOperation('getTaskGraphWithNodesAndEdges', { graphId })
            spinner.succeed('可視化完了')

            if (!data.graph) {
                console.log(chalk.yellow('\nグラフが見つかりません。'))
                return
            }

            const { graph, nodes, edges } = data

            if (nodes.length === 0) {
                console.log(chalk.yellow('\nこのグラフにはノードがありません。'))
                return
            }

            const visualization = visualizeGraph(graph, nodes, edges)
            console.log(visualization)
        } catch (err) {
            spinner.fail('可視化に失敗しました')
            console.error(chalk.red(err.message))
        }
    })

// Quick Capture統合: newコマンド
program
    .command('new [copyId]')
    .description('新しい目標を作成します（copyIDまたは対話式）')
    .action(async (copyId) => {
        const spinner = ora('準備中...').start()

        try {
            let goalTitle, goalDescription, goalDeadline, goalPriority

            // copyIDが指定されている場合、LocalStorageから思いつきをロード
            if (copyId && copyId.startsWith('idea_')) {
                const ideaId = copyId.replace('idea_', '')

                try {
                    // LocalStorageはブラウザ環境なので、Node.jsからは直接アクセスできない
                    // 代わりにユーザーに手動入力を促す
                    spinner.info('copyIDが検出されました')
                    console.log(chalk.yellow('\n💡 Quick Captureから思いつきを登録します'))
                    console.log(chalk.dim(`copyID: ${copyId}\n`))

                    // 説明を表示
                    console.log(chalk.cyan('1. まずはブラウザで /ideas ページを開きます'))
                    console.log(chalk.cyan('2. 該当する思いつきの「登録」ボタンで詳細を確認してください'))
                    console.log(chalk.cyan('3. 以下の情報を入力してください\n'))

                    spinner.stop()
                } catch (e) {
                    spinner.fail('copyIDの読み込みに失敗しました')
                    console.error(chalk.red(e.message))
                    return
                }
            } else {
                spinner.stop()
            }

            // 対話式に入力を収集
            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'title',
                    message: '🎯 目標のタイトル:',
                    validate: (input) => input.trim().length > 0 || 'タイトルを入力してください',
                },
                {
                    type: 'input',
                    name: 'description',
                    message: '📝 詳細な説明:',
                    default: '',
                },
                {
                    type: 'input',
                    name: 'deadline',
                    message: '📅 期限 (YYYY-MM-DD、またはEnterでスキップ):',
                    default: '',
                    filter: (input) => {
                        if (!input.trim()) return null
                        const date = new Date(input)
                        if (isNaN(date.getTime())) {
                            console.log(chalk.yellow('⚠️  無効な日付形式です。スキップします。'))
                            return null
                        }
                        return input
                    },
                },
                {
                    type: 'list',
                    name: 'priority',
                    message: '⚡ 優先度:',
                    choices: ['high', 'medium', 'low'],
                    default: 'medium',
                },
            ])

            goalTitle = answers.title
            goalDescription = answers.description
            goalDeadline = answers.deadline
            goalPriority = answers.priority

            console.log('') // 空行
            const createSpinner = ora('目標を作成中...').start()

            // MCP Tool: create_goal を呼び出す
            const createResult = await executeOperation('createGoal', {
                title: goalTitle,
                description: goalDescription,
                deadline: goalDeadline,
                priority: goalPriority,
            })

            createSpinner.succeed('目標を作成しました！')

            const goalId = createResult.goal?.id
            if (!goalId) {
                throw new Error('目標IDの取得に失敗しました')
            }

            console.log(chalk.bold.green(`\n✅ 目標が作成されました！`))
            console.log(chalk.white(`📝 タイトル: ${goalTitle}`))
            console.log(chalk.dim(`   ID: ${goalId}\n`))

            // 自動タスク分解の提案
            const { shouldDecompose } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'shouldDecompose',
                    message: '🤖 今すぐAIで15分タスクに分解しますか？',
                    default: true,
                },
            ])

            if (shouldDecompose) {
                const decomposeSpinner = ora('AIがタスクを分解中...').start()

                try {
                    // MCP Tool: update_goal_subtasks を呼び出す
                    await executeOperation('updateGoalSubtasks', {
                        goalId,
                        title: goalTitle,
                        description: goalDescription,
                    })

                    decomposeSpinner.succeed('タスク分解が完了しました！')

                    // 分解されたタスクを取得して表示
                    const goalData = await executeOperation('getGoal', { goalId })

                    if (goalData.goal?.subTasks && goalData.goal.subTasks.length > 0) {
                        console.log(chalk.bold.cyan('\n📋 生成されたタスク:'))
                        goalData.goal.subTasks.forEach((sub, index) => {
                            const icon = sub.isDone ? chalk.green('✓') : chalk.gray('○')
                            console.log(`  ${icon} ${index + 1}. ${sub.label} (${sub.estimatedMinutes}分)`)
                        })
                        console.log('')
                    }
                } catch (e) {
                    decomposeSpinner.fail('タスク分解に失敗しました')
                    console.error(chalk.red(e.message))
                }
            }

            // GSD Workflowの案内
            console.log(chalk.bold.yellow('\n🚀 次のステップ:'))
            console.log(`1. ${chalk.cyan('/clear')} でコンテキストをリセット`)
            console.log(`2. ${chalk.cyan(`/yarikiru:work-phase ${goalId}`)} で作業を開始`)
            console.log(chalk.dim(`\n💡 goalIDを保存してください: ${goalId}\n`))

        } catch (err) {
            spinner?.fail('作成に失敗しました')
            console.error(chalk.red(err.message))
        }
    })

program
    .command('sync')
    .description('GSDの .planning フォルダを読み込み、Yarikiruデータベースに同期します')
    .action(async () => {
        const spinner = ora('.planning フォルダを同期中...').start()
        try {
            const planningDir = path.join(process.cwd(), '.planning')
            if (!fs.existsSync(planningDir)) {
                spinner.fail('.planning フォルダが見つかりません。')
                console.error(chalk.yellow('GSDプロジェクトのルートで実行してください。'))
                return
            }

            // PROJECT.md
            let projectTitle = 'GSD Project'
            let projectDescription = ''
            const projectFile = path.join(planningDir, 'PROJECT.md')
            if (fs.existsSync(projectFile)) {
                projectDescription = fs.readFileSync(projectFile, 'utf8')
                const titleMatch = projectDescription.match(/^#\s+(.+)$/m)
                if (titleMatch) projectTitle = titleMatch[1]
            }

            const projectData = { title: projectTitle, description: projectDescription }

            // goals/phases
            const goalsData = []
            const phasesDir = path.join(planningDir, 'phases')
            if (fs.existsSync(phasesDir)) {
                const phases = fs.readdirSync(phasesDir).filter(f => fs.statSync(path.join(phasesDir, f)).isDirectory())
                for (const phaseName of phases) {
                    const phasePath = path.join(phasesDir, phaseName)
                    let phaseDesc = ''
                    const tasks = []

                    const files = fs.readdirSync(phasePath)
                    const planFile = files.find(f => f.endsWith('-PLAN.md'))

                    if (planFile) {
                        const planContent = fs.readFileSync(path.join(phasePath, planFile), 'utf8')
                        phaseDesc = planContent

                        // task XML chunks
                        const taskMatches = planContent.match(/<task>([\s\S]*?)<\/task>/g)
                        if (taskMatches) {
                            for (const tMatch of taskMatches) {
                                const content = tMatch.replace(/<\/?task>/g, '').trim()
                                tasks.push({ label: content.substring(0, 100), status: 'todo' })
                            }
                        } else {
                            // Checklists fallback
                            const checkMatches = [...planContent.matchAll(/^- \[(x| )\] (.+)$/gm)]
                            for (const m of checkMatches) {
                                tasks.push({ label: m[2], status: m[1] === 'x' ? 'done' : 'todo' })
                            }
                        }
                    }
                    goalsData.push({ title: phaseName, description: phaseDesc, tasks })
                }
            } else {
                const roadmapFile = path.join(planningDir, 'ROADMAP.md')
                if (fs.existsSync(roadmapFile)) {
                    goalsData.push({
                        title: 'Phase from ROADMAP',
                        description: fs.readFileSync(roadmapFile, 'utf8'),
                        tasks: []
                    })
                }
            }

            // Read STATE.md
            let stateData = null
            const stateFile = path.join(planningDir, 'STATE.md')
            if (fs.existsSync(stateFile)) {
                stateData = fs.readFileSync(stateFile, 'utf8')
            }

            const result = await executeOperation('syncPlanning', { projectData, goalsData, stateData })
            spinner.succeed('同期が完了しました (Project: ' + result.projectId + ')')
            console.log(chalk.green(`  => ${goalsData.length}個の目標 (Phases) を同期しました。`))

        } catch (err) {
            spinner.fail('同期に失敗しました')
            console.error(chalk.red(err.message))
        }
    })

program.parse(process.argv)
