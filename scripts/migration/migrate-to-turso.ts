// ============================================
// Turso Migration Script
// Google SheetsからエクスポートしたデータをTursoに移行
// ============================================

import { getTursoClient } from '@/lib/turso/client'
import { validateAllSourceData } from './validate-source'
import type { Industry, Schedule, Task } from '@/types/turso'

export interface MigrationOptions {
  dryRun?: boolean        // dry-runモード（SQLのみ出力）
  validateOnly?: boolean   // 整合性チェックのみ実行
  batchSize?: number       // バッチサイズ（デフォルト: 100）
  continueOnError?: boolean // エラー時も続けるか（デフォルト: false）
  verbose?: boolean        // 詳細ログ出力
}

/**
 * Tursoへのデータ移行メイン関数
 */
export async function migrateToTurso(
  sourceData: {
    industries: any[]
    schedules: any[]
    tasks: any[]
  },
  options: MigrationOptions = {}
): Promise<void> {
  const {
    dryRun = false,
    validateOnly = false,
    batchSize = 100,
    continueOnError = false,
    verbose = false,
  } = options

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made')
  }

  if (validateOnly) {
    console.log('✅ VALIDATION MODE - Checking data integrity only')
  }

  const client = getTursoClient()

  // Step 1: 移行前の整合性チェック
  console.log('\n📋 Step 1: Validating source data...')
  const validation = await validateAllSourceData(sourceData)

  if (!validation.valid) {
    throw new Error('Source data validation failed. Aborting migration.')
  }

  // Step 2: データのマッピング
  console.log('\n📋 Step 2: Mapping source data to Turso schema...')
  const industries = mapIndustries(sourceData.industries)
  const schedules = mapSchedules(sourceData.schedules)
  const tasks = mapTasks(sourceData.tasks)

  if (verbose) {
    console.log(`  - Industries: ${industries.length} rows mapped`)
    console.log(`  - Schedules: ${schedules.length} rows mapped`)
    console.log(`  - Tasks: ${tasks.length} rows mapped`)
  }

  if (dryRun || validateOnly) {
    console.log('\n📝 Dry-run complete. No changes made.')
    console.log('\n💡 Run without --dry-run to execute migration.')
    return
  }

  // Step 3: Tursoへのデータインポート
  console.log('\n📋 Step 3: Importing data to Turso...')

  try {
    // MVCCトランザクションでインサート
    await client.execute('BEGIN CONCURRENT')

    try {
      // インダストリーのインサート
      await migrateIndustries(client, industries, batchSize, verbose)

      // タスクのインサート
      await migrateTasks(client, tasks, batchSize, verbose)

      // スケジュールのインサート
      await migrateSchedules(client, schedules, batchSize, verbose)

      await client.execute('COMMIT')

      console.log('\n✅ Migration completed successfully')

      // Step 4: 移行後の整合性検証
      console.log('\n📋 Step 4: Validating Turso data...')
      await validateTursoData(client)
    } catch (error) {
      await client.execute('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    throw error
  }
}

/**
 * データマッピング関数：Industries
 */
function mapIndustries(sourceData: any[]): Partial<Industry>[] {
  return sourceData.map((row) => ({
    category: row.category,
    industry: row.industry,
    stakeholders: row.stakeholders ? JSON.stringify(parseJSONArray(row.stakeholders)) : null,
    business_layer: row.business_layer || null,
    it_layer: row.it_layer || null,
    ai_layer: row.ai_layer || null,
  }))
}

/**
 * データマッピング関数：Schedules
 */
function mapSchedules(sourceData: any[]): any[] {
  return sourceData.map((row) => ({
    day_of_week: row.day_of_week,
    time_slot: row.time_slot,
    business_category: row.business_category,
    task: row.task,
    duration: row.duration,
    frequency: row.frequency || null,
    pain_points: row.pain_points || null,
    ai_solution: row.ai_solution || null,
    priority: row.priority || null,
    cost_reduction_estimate: row.cost_reduction_estimate || null,
  }))
}

/**
 * データマッピング関数：Tasks
 */
function mapTasks(sourceData: any[]): any[] {
  return sourceData.map((row) => ({
    task_category: row.task_category,
    task_detail: row.task_detail,
    frequency: row.frequency || null,
    duration: row.duration || null,
    urgency: row.urgency || null,
    importance: row.importance || null,
    pain_points: row.pain_points || null,
    current_process: row.current_process || null,
    ai_solution: row.ai_solution || null,
    implementation_difficulty: row.implementation_difficulty || null,
    effect: row.effect || null,
    cost_reduction: row.cost_reduction || null,
    priority: row.priority || null,
  }))
}

/**
 * JSON配列をパース
 */
function parseJSONArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return value.split(',').map((s) => s.trim())
  }
}

/**
 * インダストリーデータの移行
 */
async function migrateIndustries(
  client: any,
  data: Partial<Industry>[],
  batchSize: number,
  verbose: boolean
): Promise<void> {
  const totalBatches = Math.ceil(data.length / batchSize)
  let insertedCount = 0

  for (let i = 0; i < totalBatches; i++) {
    const batch = data.slice(i * batchSize, (i + 1) * batchSize)

    for (const row of batch) {
      const sql = `
        INSERT INTO industries (
          category, industry, stakeholders, business_layer, it_layer, ai_layer
        ) VALUES (?, ?, ?, ?, ?, ?)
      `

      try {
        await client.execute(sql, [
          row.category,
          row.industry,
          row.stakeholders,
          row.business_layer,
          row.it_layer,
          row.ai_layer,
        ])
        insertedCount++
      } catch (error: any) {
        // 一意制約違反はスキップ（既存データ）
        if (error.message && error.message.includes('UNIQUE')) {
          if (verbose) {
            console.log(`  ⏭️  Skipped duplicate industry: ${row.industry}`)
          }
          continue
        }
        throw error
      }
    }

    console.log(`  ✅ Batch ${i + 1}/${totalBatches}: ${insertedCount} industries inserted`)
  }
}

/**
 * タスクデータの移行
 */
async function migrateTasks(
  client: any,
  data: Partial<Task>[],
  batchSize: number,
  verbose: boolean
): Promise<void> {
  const totalBatches = Math.ceil(data.length / batchSize)
  let insertedCount = 0

  // industry_idを取得（インダストリー名から）
  const industryMap = await getIndustryIdMap(client)

  for (let i = 0; i < totalBatches; i++) {
    const batch = data.slice(i * batchSize, (i + 1) * batchSize)

    for (const row of batch) {
      const sql = `
        INSERT INTO tasks (
          industry_id, task_category, task_detail, frequency, duration,
          urgency, importance, pain_points, current_process, ai_solution,
          implementation_difficulty, effect, cost_reduction, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `

      try {
        await client.execute(sql, [
          null, // industry_idは後で更新
          row.task_category,
          row.task_detail,
          row.frequency,
          row.duration,
          row.urgency,
          row.importance,
          row.pain_points,
          row.current_process,
          row.ai_solution,
          row.implementation_difficulty,
          row.effect,
          row.cost_reduction,
          row.priority,
        ])
        insertedCount++
      } catch (error: any) {
        if (error.message && error.message.includes('UNIQUE')) {
          if (verbose) {
            console.log(`  ⏭️  Skipped duplicate task: ${row.task_detail}`)
          }
          continue
        }
        throw error
      }
    }

    console.log(`  ✅ Batch ${i + 1}/${totalBatches}: ${insertedCount} tasks inserted`)
  }
}

/**
 * スケジュールデータの移行
 */
async function migrateSchedules(
  client: any,
  data: Partial<Schedule>[],
  batchSize: number,
  verbose: boolean
): Promise<void> {
  const totalBatches = Math.ceil(data.length / batchSize)
  let insertedCount = 0

  for (let i = 0; i < totalBatches; i++) {
    const batch = data.slice(i * batchSize, (i + 1) * batchSize)

    for (const row of batch) {
      const sql = `
        INSERT INTO schedules (
          industry_id, day_of_week, time_slot, business_category, task,
          duration, frequency, pain_points, ai_solution, priority, cost_reduction_estimate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `

      try {
        await client.execute(sql, [
          null, // industry_idは後で更新
          row.day_of_week,
          row.time_slot,
          row.business_category,
          row.task,
          row.duration,
          row.frequency,
          row.pain_points,
          row.ai_solution,
          row.priority,
          row.cost_reduction_estimate,
        ])
        insertedCount++
      } catch (error: any) {
        if (error.message && error.message.includes('UNIQUE')) {
          if (verbose) {
            console.log(`  ⏭️  Skipped duplicate schedule: ${row.task} (${row.day_of_week} ${row.time_slot})`)
          }
          continue
        }
        throw error
      }
    }

    console.log(`  ✅ Batch ${i + 1}/${totalBatches}: ${insertedCount} schedules inserted`)
  }
}

/**
 * インダストリー名とIDのマップを取得
 */
async function getIndustryIdMap(client: any): Promise<Map<string, number>> {
  const result = await client.execute('SELECT id, industry FROM industries')
  const map = new Map<string, number>()

  for (const row of result.rows) {
    const id = row.id as number | undefined
    const industry = row.industry as string | undefined
    if (id !== undefined && industry !== undefined) {
      map.set(industry, id)
    }
  }

  return map
}

/**
 * 移行後の整合性検証
 */
async function validateTursoData(client: any): Promise<void> {
  const industriesResult = await client.execute('SELECT COUNT(*) as count FROM industries')
  const industriesCount = industriesResult.rows[0]?.count as number | undefined

  const tasksResult = await client.execute('SELECT COUNT(*) as count FROM tasks')
  const tasksCount = tasksResult.rows[0]?.count as number | undefined

  const schedulesResult = await client.execute('SELECT COUNT(*) as count FROM schedules')
  const schedulesCount = schedulesResult.rows[0]?.count as number | undefined

  console.log('\n✅ Turso data validation passed:')
  console.log(`  - Industries: ${industriesCount || 0} rows`)
  console.log(`  - Tasks: ${tasksCount || 0} rows`)
  console.log(`  - Schedules: ${schedulesCount || 0} rows`)

  if (!industriesCount || industriesCount === 0) {
    throw new Error('Validation failed: No data found in industries table')
  }
}

/**
 * メイン関数（CLI実行用）
 */
export async function main() {
  try {
    // 標準入力からデータを読み込む
    let inputData = ''

    for await (const chunk of process.stdin) {
      inputData += chunk
    }

    if (!inputData) {
      throw new Error('No input data provided. Pipe JSON data from export script.')
    }

    const sourceData = JSON.parse(inputData)

    // 移行を実行
    await migrateToTurso(sourceData, {
      dryRun: process.argv.includes('--dry-run'),
      validateOnly: process.argv.includes('--validate'),
      batchSize: 100,
      verbose: process.argv.includes('--verbose'),
    })

    if (process.argv.includes('--dry-run')) {
      console.log('\n🔍 Dry-run complete. Run without --dry-run to execute migration.')
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

// スクリプトが直接実行された場合のみmainを呼ぶ
if (require.main === module) {
  main()
}
