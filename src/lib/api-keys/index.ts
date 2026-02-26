/**
 * API Key Management Library (OSS版)
 *
 * Provides functions for creating, validating, and managing API keys
 * for the public REST API endpoints.
 * Uses local SQLite instead of Turso.
 */

import { execute, executeOne } from '../turso/client'
import * as crypto from 'crypto'

// ============================================
// Types
// ============================================

export type APIScope =
    | 'projects:read'
    | 'projects:write'
    | 'goals:read'
    | 'goals:write'
    | 'learnings:read'
    | 'learnings:write'

export interface APIKey {
    id: string
    user_id: string
    name: string
    scopes: APIScope[]
    rate_limit: number
    created_at: string
    last_used_at: string | null
    revoked_at: string | null
}

export interface APIKeyValidationResult {
    valid: boolean
    userId?: string
    scopes?: APIScope[]
    keyId?: string
    rateLimit?: number
    error?: string
}

export interface CreateAPIKeyOptions {
    userId: string
    name: string
    scopes?: APIScope[]
    rateLimit?: number
}

export interface CreateAPIKeyResult {
    id: string
    rawKey: string
    name: string
}

// ============================================
// Constants
// ============================================

const KEY_PREFIX = 'yrk_'
const KEY_LENGTH = 32 // Random bytes length
const DEFAULT_SCOPES: APIScope[] = [
    'projects:read',
    'projects:write',
    'goals:read',
    'goals:write',
    'learnings:read',
    'learnings:write'
]
const DEFAULT_RATE_LIMIT = 100 // requests per minute

// ============================================
// Helper Functions
// ============================================

/**
 * Hash a key using SHA-256
 */
export function hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Generate a random API key
 */
function generateRawKey(): string {
    const randomBytes = crypto.randomBytes(KEY_LENGTH / 2)
    return KEY_PREFIX + randomBytes.toString('hex')
}

/**
 * Generate a unique key ID
 */
function generateKeyId(): string {
    const timestamp = Date.now().toString(36)
    const random = crypto.randomBytes(4).toString('hex')
    return `ak_${timestamp}_${random}`
}

// ============================================
// Main Functions
// ============================================

/**
 * Generate a new API key for a user
 * Returns the raw key once (cannot be retrieved again)
 */
export async function generateAPIKey(
    options: CreateAPIKeyOptions
): Promise<CreateAPIKeyResult> {
    const { userId, name, scopes = DEFAULT_SCOPES, rateLimit = DEFAULT_RATE_LIMIT } = options

    const id = generateKeyId()
    const rawKey = generateRawKey()
    const keyHash = hashKey(rawKey)
    const scopesJson = JSON.stringify(scopes)

    await execute(
        `INSERT INTO yarikiru_api_keys (id, user_id, name, key_hash, scopes, rate_limit, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [id, userId, name, keyHash, scopesJson, rateLimit]
    )

    return {
        id,
        rawKey,
        name,
    }
}

/**
 * Validate an API key and return user info
 */
export async function validateAPIKey(key: string): Promise<APIKeyValidationResult> {
    if (!key || !key.startsWith(KEY_PREFIX)) {
        return { valid: false, error: 'Invalid key format' }
    }

    const keyHash = hashKey(key)

    const rows = await execute<{
        id: string
        user_id: string
        scopes: string
        rate_limit: number
        revoked_at: string | null
    }>(
        `SELECT id, user_id, scopes, rate_limit, revoked_at
         FROM yarikiru_api_keys
         WHERE key_hash = ?`,
        [keyHash]
    )

    if (rows.length === 0) {
        return { valid: false, error: 'Key not found' }
    }

    const row = rows[0]

    // Check if revoked
    if (row.revoked_at) {
        return { valid: false, error: 'Key has been revoked' }
    }

    // Parse scopes
    let scopes: APIScope[] = DEFAULT_SCOPES
    try {
        if (row.scopes && typeof row.scopes === 'string') {
            scopes = JSON.parse(row.scopes) as APIScope[]
        }
    } catch {
        // Use default scopes if parsing fails
    }

    return {
        valid: true,
        userId: row.user_id as string,
        keyId: row.id as string,
        scopes,
        rateLimit: (row.rate_limit as number) || DEFAULT_RATE_LIMIT,
    }
}

/**
 * List all API keys for a user (without hashes)
 */
export async function listAPIKeys(userId: string): Promise<Omit<APIKey, 'key_hash'>[]> {
    const rows = await execute<{
        id: string
        user_id: string
        name: string
        scopes: string
        rate_limit: number
        created_at: string
        last_used_at: string | null
        revoked_at: string | null
    }>(
        `SELECT id, user_id, name, scopes, rate_limit, created_at, last_used_at, revoked_at
         FROM yarikiru_api_keys
         WHERE user_id = ?
         ORDER BY created_at DESC`,
        [userId]
    )

    return rows.map((row) => {
        let scopes: APIScope[] = DEFAULT_SCOPES
        try {
            if (row.scopes && typeof row.scopes === 'string') {
                scopes = JSON.parse(row.scopes) as APIScope[]
            }
        } catch {
            // Use default scopes
        }

        return {
            id: row.id as string,
            user_id: row.user_id as string,
            name: row.name as string,
            scopes,
            rate_limit: (row.rate_limit as number) || DEFAULT_RATE_LIMIT,
            created_at: row.created_at as string,
            last_used_at: row.last_used_at as string | null,
            revoked_at: row.revoked_at as string | null,
        }
    })
}

/**
 * Revoke an API key (soft delete)
 */
export async function revokeAPIKey(userId: string, keyId: string): Promise<boolean> {
    await execute(
        `UPDATE yarikiru_api_keys
         SET revoked_at = datetime('now')
         WHERE id = ? AND user_id = ? AND revoked_at IS NULL`,
        [keyId, userId]
    )
    // Note: libsql doesn't return rowsAffected in the same way
    // For OSS version, we'll assume success if no error was thrown
    return true
}

/**
 * Delete an API key completely (hard delete)
 */
export async function deleteAPIKey(userId: string, keyId: string): Promise<boolean> {
    await execute(
        `DELETE FROM yarikiru_api_keys WHERE id = ? AND user_id = ?`,
        [keyId, userId]
    )
    return true
}

/**
 * Update last_used_at timestamp
 */
export async function updateLastUsed(keyId: string): Promise<void> {
    await execute(
        `UPDATE yarikiru_api_keys
         SET last_used_at = datetime('now')
         WHERE id = ?`,
        [keyId]
    )
}

/**
 * Check if a key has a specific scope
 */
export function hasScope(scopes: APIScope[], requiredScope: APIScope): boolean {
    return scopes.includes(requiredScope)
}

/**
 * Parse scope string to APIScope array
 */
export function parseScopes(scopesStr: string | null): APIScope[] {
    if (!scopesStr) return DEFAULT_SCOPES
    try {
        return JSON.parse(scopesStr) as APIScope[]
    } catch {
        return DEFAULT_SCOPES
    }
}
