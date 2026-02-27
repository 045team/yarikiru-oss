import fs from 'fs'
import path from 'path'
import os from 'os'
import { createClient } from '@libsql/client'

export interface TursoEnv {
    TURSO_DATABASE_URL: string
    TURSO_AUTH_TOKEN?: string
}

const DEFAULT_LOCAL_DB = `file:${path.join(os.homedir(), '.yarikiru', 'local.db')}`

function getEnv(): TursoEnv {
    return {
        TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL || DEFAULT_LOCAL_DB,
    }
}

let tursoClient: ReturnType<typeof createClient> | null = null
let schemaEnsured = false

async function ensureSchemaOnce(): Promise<void> {
    if (schemaEnsured) return
    const env = getEnv()
    if (!env.TURSO_DATABASE_URL.startsWith('file:')) return
    const client = getTursoClient()
    const { ensureLocalDbSchema } = await import('@/lib/mcp/local-db-init')
    await ensureLocalDbSchema(client)
    schemaEnsured = true
}

export function getTursoClient() {
    if (tursoClient) {
        return tursoClient
    }

    const env = getEnv()

    // Ensure the directory exists if using a local file database
    if (env.TURSO_DATABASE_URL.startsWith('file:')) {
        const dbPath = env.TURSO_DATABASE_URL.replace('file:', '')
        const dir = path.dirname(dbPath)
        if (dir && dir !== '.' && !fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
    }

    tursoClient = createClient({
        url: env.TURSO_DATABASE_URL,
    })

    return tursoClient
}

/** ローカル DB 使用時にマイグレーションを実行（初回のみ）。API ルートで getDb の前に呼ぶ */
export async function ensureDbSchema(): Promise<void> {
    await ensureSchemaOnce()
}

// ============================================
// SQL実行ヘルパー (共通関数化)
// ============================================

export async function execute<T>(
    sql: string,
    params: (string | number | boolean | null)[] = []
): Promise<T[]> {
    const client = getTursoClient()
    const result = await client.execute({ sql, args: params })
    return result.rows as T[]
}

export async function executeWithObject<T>(
    options: { sql: string; args: (string | number | boolean | null)[] }
): Promise<T[]> {
    const client = getTursoClient()
    const result = await client.execute(options)
    return result.rows as T[]
}

export async function executeOne<T>(
    sql: string,
    params: (string | number | boolean | null)[] = []
): Promise<T | null> {
    const rows = await execute<T>(sql, params)
    return rows[0] || null
}

// MVCC transactions

export async function executeWithMVCC<T>(
    sql: string,
    params: (string | number | boolean | null)[] = []
): Promise<T[]> {
    const client = getTursoClient()
    await client.execute('BEGIN CONCURRENT')
    try {
        const result = await client.execute({ sql, args: params })
        await client.execute('COMMIT')
        return result.rows as T[]
    } catch (error) {
        await client.execute('ROLLBACK')
        throw error
    }
}

export async function executeOneWithMVCC<T>(
    sql: string,
    params: (string | number | boolean | null)[] = []
): Promise<T | null> {
    const rows = await executeWithMVCC<T>(sql, params)
    return rows[0] || null
}
