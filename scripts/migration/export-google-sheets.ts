// ============================================
// Google Sheets Data Export Script
// 既存データをGoogle Sheetsからエクスポート
// ============================================

import { GoogleSpreadsheet } from 'google-spreadsheet'
import type { Industry, Schedule, Task } from '@/types/turso'

export interface GoogleSheetConfig {
  spreadsheetId: string
  sheetName: string
}

/**
 * Google Sheetsから指定されたシートのデータをエクスポート
 */
export async function exportFromGoogleSheets(config: GoogleSheetConfig): Promise<any[]> {
  // 環境変数の検証
  const spreadsheetId = config.spreadsheetId || process.env.GOOGLE_SPREADSHEET_ID
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SPREADSHEET_ID is not defined')
  }

  if (!serviceAccountEmail) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL is not defined')
  }

  if (!privateKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is not defined')
  }

  try {
    // Google Sheets API認証
    const doc = new GoogleSpreadsheet({
      spreadsheetId,
    })
    await doc.useServiceAccountAuth({
      clientEmail: serviceAccountEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    })

    // スプレッドシート情報をロード
    await doc.loadInfo()

    // シートを取得
    const sheet = doc.sheetsByTitle[config.sheetName]

    if (!sheet) {
      throw new Error(`Sheet "${config.sheetName}" not found in spreadsheet`)
    }

    // データをエクスポート（ヘッダー行を含む）
    const rows = await sheet.getRows()

    // ヘッダー行を除外してデータを抽出
    const data = rows.map((row) => {
      const rowData: Record<string, any> = {}
      // 行のすべてのフィールドを取得（v4 API）
      row.forEach((value: any, key: string) => {
        rowData[key] = value
      })
      return rowData
    })

    console.log(`✅ Exported ${data.length} rows from "${config.sheetName}"`)
    return data
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to export from Google Sheets: ${error.message}`)
    }
    throw error
  }
}

/**
 * 既存データのエクスポート（施工管理技士データ）
 */
export async function exportExistingData(): Promise<{
  industries: any[]
  schedules: any[]
  tasks: any[]
}> {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SPREADSHEET_ID environment variable is required')
  }

  console.log('📤 Exporting data from Google Sheets...')

  try {
    // 並列エクスポートで効率化
    const [industries, schedules, tasks] = await Promise.all([
      exportFromGoogleSheets({
        spreadsheetId,
        sheetName: 'industries',
      }),
      exportFromGoogleSheets({
        spreadsheetId,
        sheetName: 'schedules',
      }),
      exportFromGoogleSheets({
        spreadsheetId,
        sheetName: 'tasks',
      }),
    ])

    console.log('✅ All data exported successfully')
    console.log(`  - Industries: ${industries.length} rows`)
    console.log(`  - Schedules: ${schedules.length} rows`)
    console.log(`  - Tasks: ${tasks.length} rows`)

    return {
      industries,
      schedules,
      tasks,
    }
  } catch (error) {
    console.error('❌ Export failed:', error)
    throw error
  }
}

/**
 * シートの一覧を取得
 */
export async function listSheets(): Promise<string[]> {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SPREADSHEET_ID environment variable is required')
  }

  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY

  if (!serviceAccountEmail || !privateKey) {
    throw new Error('Google service account credentials are required')
  }

  try {
    const doc = new GoogleSpreadsheet({
      spreadsheetId,
    })
    await doc.useServiceAccountAuth({
      clientEmail: serviceAccountEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    })

    await doc.loadInfo()

    const sheetNames = Object.keys(doc.sheetsByTitle)
    console.log(`📋 Found ${sheetNames.length} sheets:`, sheetNames)

    return sheetNames
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to list sheets: ${error.message}`)
    }
    throw error
  }
}

/**
 * メイン関数（CLI実行用）
 */
export async function main() {
  try {
    const args = process.argv.slice(2)

    if (args.includes('--list-sheets')) {
      // シート一覧を表示
      await listSheets()
      return
    }

    if (args.includes('--sheet')) {
      // 特定シートのエクスポート
      const sheetIndex = args.indexOf('--sheet')
      const sheetName = args[sheetIndex + 1]

      if (!sheetName) {
        throw new Error('--sheet requires a sheet name argument')
      }

      const data = await exportFromGoogleSheets({
        spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
        sheetName,
      })

      console.log(JSON.stringify(data, null, 2))
      return
    }

    // デフォルト：既存データをエクスポート
    const data = await exportExistingData()
    console.log(JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('❌ Export script failed:', error)
    process.exit(1)
  }
}

// スクリプトが直接実行された場合のみmainを呼ぶ
if (require.main === module) {
  main()
}
