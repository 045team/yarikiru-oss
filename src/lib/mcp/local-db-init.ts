/**
 * Local DB Auto-Migration
 *
 * Ensures that the local SQLite database (~/.yarikiru/local.db) is initialized
 * with the correct schema before any MCP / CLI operation runs.
 *
 * Strategy:
 *   1. Create a `_yarikiru_migrations` tracking table if it doesn't exist.
 *   2. Read all *.sql files from `turso/migrations/` in filename-sorted order.
 *   3. Apply any migration that has not yet been recorded in the tracking table.
 *
 * This is intentionally a pure Node/TypeScript file with no Next.js dependencies
 * so it can be imported from both `src/mcp-server/index.mjs` and `cli/index.mjs`.
 */

import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Resolve the project root (works regardless of whether we're running from
// src/lib/mcp/ or a compiled dist directory).
const PROJECT_ROOT = join(__dirname, '../../..')
const MIGRATIONS_DIR = join(PROJECT_ROOT, 'turso/migrations')

/**
 * Run pending migrations on the given `@libsql/client` database instance.
 * Safe to call multiple times – already-applied migrations are skipped.
 */
export async function ensureLocalDbSchema(db: any): Promise<void> {
    // --- 1. Create migration-tracking table ---
    await db.execute(`
    CREATE TABLE IF NOT EXISTS _yarikiru_migrations (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      name     TEXT    NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

    // --- 2. Find already-applied migrations ---
    const appliedResult = await db.execute(
        'SELECT name FROM _yarikiru_migrations ORDER BY name ASC'
    )
    const applied = new Set<string>(
        appliedResult.rows.map((r: any) => String(r[0]))
    )

    // --- 3. Find all migration files ---
    if (!existsSync(MIGRATIONS_DIR)) {
        console.error(`[Local DB] Migrations directory not found: ${MIGRATIONS_DIR}`)
        return
    }

    const files = readdirSync(MIGRATIONS_DIR)
        .filter((f: string) => f.endsWith('.sql'))
        .sort() // ascending filename order (001_, 002_, …)

    // --- 4. Apply pending migrations ---
    let ran = 0
    for (const file of files) {
        if (applied.has(file)) continue

        const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')

        // Split on semicolons to execute statement-by-statement
        // (libsql's execute() handles a single statement at a time)
        const statements = sql
            .split(';')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0)

        for (const stmt of statements) {
            try {
                await db.execute(stmt)
            } catch (err: any) {
                // Some statements (e.g. duplicate indexes from older migrations)
                // are safe to ignore under "IF NOT EXISTS".
                // Only log; don't abort the entire migration.
                console.error(`[Local DB] Warning in ${file}: ${err.message}`)
            }
        }

        // Record this migration as applied
        await db.execute({
            sql: 'INSERT OR IGNORE INTO _yarikiru_migrations (name) VALUES (?)',
            args: [file],
        })

        console.error(`[Local DB] Applied migration: ${file}`)
        ran++
    }

    if (ran === 0) {
        console.error('[Local DB] Schema is up-to-date.')
    } else {
        console.error(`[Local DB] Applied ${ran} migration(s).`)
    }
}
