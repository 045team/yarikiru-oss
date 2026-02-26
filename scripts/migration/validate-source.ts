// ============================================
// Source Data Validation Script
// Google Sheetsからエクスポートしたデータの整合性チェック
// ============================================

import type { Industry, Schedule, Task } from '@/types/turso'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  stats: {
    totalRows: number
    validRows: number
    invalidRows: number
  }
}

/**
 * テーブルごとの必須フィールドを取得
 */
function getRequiredFields(tableName: string): string[] {
  switch (tableName) {
    case 'industries':
      return ['category', 'industry']
    case 'schedules':
      return ['day_of_week', 'time_slot', 'business_category', 'task', 'duration']
    case 'tasks':
      return ['task_category', 'task_detail']
    default:
      return []
  }
}

/**
 * データ型の検証
 */
function validateFieldTypes(tableName: string, row: any): boolean {
  switch (tableName) {
    case 'schedules':
      // day_of_week: 曜日チェック
      if (row.day_of_week && typeof row.day_of_week !== 'string') {
        return false
      }
      // duration: 文字列チェック
      if (row.duration && typeof row.duration !== 'string') {
        return false
      }
      return true

    case 'industries':
      // category, industry: 文字列チェック
      if (row.category && typeof row.category !== 'string') {
        return false
      }
      if (row.industry && typeof row.industry !== 'string') {
        return false
      }
      return true

    case 'tasks':
      // task_category, task_detail: 文字列チェック
      if (row.task_category && typeof row.task_category !== 'string') {
        return false
      }
      if (row.task_detail && typeof row.task_detail !== 'string') {
        return false
      }
      return true

    default:
      return true
  }
}

/**
 * 重複データを検出
 */
function findDuplicates(data: any[], tableName: string): any[] {
  // テーブルごとの一意キー定義
  const uniqueKeys: Record<string, string[]> = {
    industries: ['industry'],
    schedules: ['day_of_week', 'time_slot', 'task'],
    tasks: ['task_category', 'task_detail'],
  }

  const keys = uniqueKeys[tableName]
  if (!keys) {
    return []
  }

  const seen = new Set<string>()
  const duplicates: any[] = []

  for (const row of data) {
    // 複合キーを作成
    const compositeKey = keys
      .map((k) => {
        const value = row[k]
        return value !== undefined ? String(value) : ''
      })
      .join('|')

    if (seen.has(compositeKey)) {
      duplicates.push(row)
    } else {
      seen.add(compositeKey)
    }
  }

  return duplicates
}

/**
 ソースデータの整合性チェック
 */
export function validateSourceData(data: any[], tableName: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let validRows = 0

  if (!Array.isArray(data)) {
    return {
      valid: false,
      errors: [`Data for ${tableName} is not an array`],
      warnings: [],
      stats: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
      },
    }
  }

  // 必須フィールドの取得
  const requiredFields = getRequiredFields(tableName)

  if (requiredFields.length === 0) {
    warnings.push(`No required fields defined for table "${tableName}"`)
  }

  // 各行の検証
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const rowNumber = i + 2 // ヘッダー行を考慮（Google Sheetsは1-indexed）

    if (typeof row !== 'object' || row === null) {
      errors.push(`${tableName} row ${rowNumber}: Invalid row data (not an object)`)
      continue
    }

    // 必須フィールドの検証
    let rowValid = true
    for (const field of requiredFields) {
      if (!row[field] || row[field] === '') {
        errors.push(`${tableName} row ${rowNumber}: Missing required field '${field}'`)
        rowValid = false
      }
    }

    // データ型の検証
    if (!validateFieldTypes(tableName, row)) {
      errors.push(`${tableName} row ${rowNumber}: Invalid field type`)
      rowValid = false
    }

    if (rowValid) {
      validRows++
    }
  }

  // 重複チェック
  const duplicates = findDuplicates(data, tableName)
  if (duplicates.length > 0) {
    warnings.push(
      `Found ${duplicates.length} potential duplicate(s) in ${tableName} based on unique keys`
    )
  }

  // データ量チェック
  if (data.length === 0) {
    warnings.push(`No data found in ${tableName}`)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalRows: data.length,
      validRows,
      invalidRows: data.length - validRows,
    },
  }
}

/**
 * 全ソースデータの検証
 */
export async function validateAllSourceData(sourceData: {
  industries: any[]
  schedules: any[]
  tasks: any[]
}): Promise<{
  valid: boolean
  results: Record<string, ValidationResult>
}> {
  console.log('🔍 Validating source data...')

  const results = {
    industries: validateSourceData(sourceData.industries, 'industries'),
    schedules: validateSourceData(sourceData.schedules, 'schedules'),
    tasks: validateSourceData(sourceData.tasks, 'tasks'),
  }

  // 結果のサマリーを出力
  console.log('\n📊 Validation Summary:')

  let allValid = true
  for (const [table, result] of Object.entries(results)) {
    console.log(`\n${table.toUpperCase()}:`)
    console.log(`  Total: ${result.stats.totalRows} rows`)
    console.log(`  Valid: ${result.stats.validRows} rows`)
    console.log(`  Invalid: ${result.stats.invalidRows} rows`)

    if (result.errors.length > 0) {
      console.error(`  ❌ Errors (${result.errors.length}):`)
      result.errors.slice(0, 10).forEach((err) => console.error(`    - ${err}`))
      if (result.errors.length > 10) {
        console.error(`    ... and ${result.errors.length - 10} more errors`)
      }
      allValid = false
    }

    if (result.warnings.length > 0) {
      console.warn(`  ⚠️  Warnings (${result.warnings.length}):`)
      result.warnings.forEach((warn) => console.warn(`    - ${warn}`))
    }

    if (result.valid) {
      console.log(`  ✅ Validation passed`)
    }
  }

  if (allValid) {
    console.log('\n✅ All source data is valid')
  } else {
    console.error('\n❌ Source data validation failed')
  }

  return {
    valid: allValid,
    results,
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

    // 整合性チェックを実行
    const validation = await validateAllSourceData(sourceData)

    // 終了コードを設定
    process.exit(validation.valid ? 0 : 1)
  } catch (error) {
    console.error('❌ Validation script failed:', error)
    process.exit(1)
  }
}

// スクリプトが直接実行された場合のみmainを呼ぶ
if (require.main === module) {
  main()
}
