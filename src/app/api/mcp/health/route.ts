import { NextResponse } from 'next/server'
import { getTursoClient as createClient } from '../../../../lib/turso/client'

/**
 * データベース接続チェック
 */
async function checkDatabase() {
    const startTime = Date.now()
    try {
        const url = process.env.TURSO_DATABASE_URL
        const token = process.env.TURSO_AUTH_TOKEN

        if (!url || !token) {
            return { status: 'error', message: 'Missing database credentials' }
        }

        const client = createClient({ url, authToken: token })

        // 簡易的なクエリで接続を確認
        await client.execute('SELECT 1')

        const latency = Date.now() - startTime
        return { status: 'ok', latency }
    } catch (error: any) {
        return { status: 'error', message: error.message || 'Unknown database error' }
    }
}

/**
 * API設定チェック
 */
async function checkApi() {
    try {
        const url = process.env.TURSO_DATABASE_URL
        const token = process.env.TURSO_AUTH_TOKEN

        if (!url || !token) {
            return { status: 'error', message: 'Missing API configuration' }
        }

        return { status: 'ok' }
    } catch (error: any) {
        return { status: 'error', message: error.message || 'Unknown API error' }
    }
}

/**
 * ヘルスチェックエンドポイント
 */
export async function GET() {
    const startTime = Date.now()

    const [database, api] = await Promise.all([
        checkDatabase(),
        checkApi(),
    ])

    const overallStatus = database.status === 'ok' && api.status === 'ok' ? 'ok' : 'degraded'

    return NextResponse.json({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            database,
            api,
        },
    }, {
        status: overallStatus === 'ok' ? 200 : 503,
    })
}
