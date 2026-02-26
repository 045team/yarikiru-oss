import { auth } from '@/lib/auth-stub'
import { NextRequest, NextResponse } from 'next/server'
import { getTursoClient as createClient } from '../../../../lib/turso/client'
import crypto from 'crypto'

function hashKey(key: string) {
    return crypto.createHash('sha256').update(key).digest('hex')
}

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const db = createClient({
            url: process.env.TURSO_DATABASE_URL!,
            authToken: process.env.TURSO_AUTH_TOKEN!,
        })

        const result = await db.execute({
            sql: `
        SELECT id, name, created_at, last_used_at, expires_at
        FROM yarikiru_api_keys
        WHERE user_id = ?
        ORDER BY created_at DESC
      `,
            args: [userId],
        })

        const keys = result.rows.map(row => ({
            id: row[0],
            name: row[1],
            createdAt: row[2],
            lastUsedAt: row[3],
            expiresAt: row[4],
        }))

        return NextResponse.json({ success: true, keys })
    } catch (error: any) {
        console.error('Error fetching API keys:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name } = await request.json()
        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const db = createClient({
            url: process.env.TURSO_DATABASE_URL!,
            authToken: process.env.TURSO_AUTH_TOKEN!,
        })

        // Generate a new API Key: yk_ + 32 random hex chars
        const keyMaterial = crypto.randomBytes(16).toString('hex')
        const rawKey = `yk_${keyMaterial}`
        const hashedKey = hashKey(rawKey)
        const id = `ak_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`

        await db.execute({
            sql: `
        INSERT INTO yarikiru_api_keys (id, user_id, name, key_hash, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `,
            args: [id, userId, name, hashedKey],
        })

        // Return the RAW KEY exactly once (it cannot be retrieved again)
        return NextResponse.json({ success: true, rawKey, id, name })
    } catch (error: any) {
        console.error('Error creating API key:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const url = new URL(request.url)
        const id = url.searchParams.get('id')
        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        const db = createClient({
            url: process.env.TURSO_DATABASE_URL!,
            authToken: process.env.TURSO_AUTH_TOKEN!,
        })

        await db.execute({
            sql: `DELETE FROM yarikiru_api_keys WHERE id = ? AND user_id = ?`,
            args: [id, userId],
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting API key:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
