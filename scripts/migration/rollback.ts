// ============================================
// Migration Rollback Script
// Turso移行をロールバック（データ削除）
// ============================================

import { getTursoClient } from '@/lib/turso/client'

export interface RollbackOptions {
  dryRun?: boolean
  confirm?: boolean
  verbose?: boolean
}

/**
 * 移行ロールバックメイン関数
 */
export async function rollbackMigration(options: RollbackOptions = {}): Promise<void> {
  const { dryRun = false, confirm = false, verbose = false } = options

  if (!confirm && !dryRun) {
    console.error('❌ ROLLBACK REQUIRES CONFIRMATION')
    console.error('')
    console.error('⚠️  This will DELETE all migrated data from Turso!')
    console.error('')
    console.error('To preview what will be deleted:')
    console.error('  npx tsx scripts/migration/rollback.ts --dry-run')
    console.error('')
    console.error('To execute rollback:')
    console.error('  npx tsx scripts/migration/rollback.ts --confirm')
    console.error('')
    throw new Error('Rollback aborted: confirmation required')
  }

  const client = getTursoClient()

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - Previewing rollback')
    console.log('')
  }

  try {
    await client.execute('BEGIN CONCURRENT')

    try {
      // 外部キー制約を守るため、逆順で削除
      // 1. スケジュールを削除
      await rollbackSchedules(client, dryRun, verbose)

      // 2. タスクを削除
      await rollbackTasks(client, dryRun, verbose)

      // 3. インダストリーを削除（施工管理技士データのみ）
      await rollbackIndustries(client, dryRun, verbose)

      await client.execute('COMMIT')

      if (!dryRun) {
        console.log('')
        console.log('✅ Rollback completed successfully')
        console.log('')
        console.log('📝 All migrated data has been removed from Turso.')
      } else {
        console.log('')
        console.log('📝 Dry-run complete. No changes made.')
        console.log('')
        console.log('💡 Run with --confirm to execute rollback.')
      }
    } catch (error) {
      await client.execute('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('')
    console.error('❌ Rollback failed:', error)
    throw error
  }
}

/**
 * インダストリーデータの削除
 */
async function rollbackIndustries(client: any, dryRun: boolean, verbose: boolean): Promise<void> {
  // 施工管理技士データを削除
  const sql = `DELETE FROM industries WHERE industry = ?`
  const params = ['施工管理技士']

  if (dryRun) {
    console.log('  [DRY RUN] Would delete industries:')
    console.log(`    SQL: ${sql}`)
    console.log(`    Params: ${JSON.stringify(params)}`)

    // 削除対象を確認
    const checkSql = `SELECT COUNT(*) as count FROM industries WHERE industry = ?`
    const result = await client.execute(checkSql, params)
    const count = result.rows[0].count as number
    console.log(`    Affected rows: ${count}`)
    return
  }

  if (verbose) {
    console.log('')
    console.log('🗑️  Rolling back industries...')
  }

  const result = await client.execute(sql, params)
  console.log(`  Deleted ${result.rowsAffected || 0} industries`)
}

/**
 * タスクデータの削除
 */
async function rollbackTasks(client: any, dryRun: boolean, verbose: boolean): Promise<void> {
  // 全タスクを削除（施工管理技士関連データ）
  const sql = `DELETE FROM tasks WHERE industry_id IS NULL`

  if (dryRun) {
    console.log('  [DRY RUN] Would delete tasks:')
    console.log(`    SQL: ${sql}`)

    // 削除対象を確認
    const checkSql = `SELECT COUNT(*) as count FROM tasks WHERE industry_id IS NULL`
    const result = await client.execute(checkSql)
    const count = result.rows[0].count as number
    console.log(`    Affected rows: ${count}`)
    return
  }

  if (verbose) {
    console.log('')
    console.log('🗑️  Rolling back tasks...')
  }

  const result = await client.execute(sql)
  console.log(`  Deleted ${result.rowsAffected || 0} tasks`)
}

/**
 * スケジュールデータの削除
 */
async function rollbackSchedules(client: any, dryRun: boolean, verbose: boolean): Promise<void> {
  // 全スケジュールを削除（施工管理技士関連データ）
  const sql = `DELETE FROM schedules WHERE industry_id IS NULL`

  if (dryRun) {
    console.log('  [DRY RUN] Would delete schedules:')
    console.log(`    SQL: ${sql}`)

    // 削除対象を確認
    const checkSql = `SELECT COUNT(*) as count FROM schedules WHERE industry_id IS NULL`
    const result = await client.execute(checkSql)
    const count = result.rows[0].count as number
    console.log(`    Affected rows: ${count}`)
    return
  }

  if (verbose) {
    console.log('')
    console.log('🗑️  Rolling back schedules...')
  }

  const result = await client.execute(sql)
  console.log(`  Deleted ${result.rowsAffected || 0} schedules`)
}

/**
 * メイン関数（CLI実行用）
 */
export async function main() {
  try {
    await rollbackMigration({
      dryRun: process.argv.includes('--dry-run'),
      confirm: process.argv.includes('--confirm'),
      verbose: process.argv.includes('--verbose'),
    })
  } catch (error) {
    // 確認が必要なエラーは特別に処理
    if (error instanceof Error && error.message === 'Rollback aborted: confirmation required') {
      console.error('')
      process.exit(1)
    }
    console.error('\n❌ Rollback script failed:', error)
    process.exit(1)
  }
}

// スクリプトが直接実行された場合のみmainを呼ぶ
if (require.main === module) {
  main()
}
