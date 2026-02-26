/**
 * GET /api/work-logs - 作業ログ一覧
 * POST /api/work-logs - 作業ログ作成（タイマー開始）
 * PATCH /api/work-logs - 作業ログ更新（タイマー終了）
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../lib/turso/client'
import { encryptForDb, decryptFromDb } from '@/lib/e2ee'

async function getDb() {
    return createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
    })
}

export async function GET(request: NextRequest) {
    const { userId } = await auth()
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const goalId = searchParams.get('goalId')

    try {
        const db = await getDb()

        const sql = goalId
            ? `SELECT id, goal_id, started_at, ended_at, duration_minutes, notes, approach, effectiveness, loop_detected
         FROM yarikiru_work_logs WHERE user_id = ? AND goal_id = ? ORDER BY started_at DESC`
            : `SELECT id, goal_id, started_at, ended_at, duration_minutes, notes, approach, effectiveness, loop_detected
         FROM yarikiru_work_logs WHERE user_id = ? ORDER BY started_at DESC LIMIT 50`

        const args = goalId ? [userId, goalId] : [userId]
        const result = await db.execute({ sql, args })

        const logs = await Promise.all(result.rows.map(async row => ({
            id: String(row[0]),
            goalId: String(row[1]),
            startedAt: String(row[2]),
            endedAt: row[3] ? String(row[3]) : null,
            durationMinutes: row[4] ? Number(row[4]) : null,
            notes: row[5] ? await decryptFromDb(String(row[5])) : null,
            approach: row[6] ? await decryptFromDb(String(row[6])) : null,
            effectiveness: row[7] ? Number(row[7]) : null,
            loopDetected: Number(row[8]) === 1,
        })))

        return NextResponse.json({ logs })
    } catch (error) {
        console.error('Error fetching work logs:', error)
        return NextResponse.json(
            { error: 'Failed to fetch work logs', details: String(error) },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    const { userId } = await auth()
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { goalId } = body

        if (!goalId) {
            return NextResponse.json({ error: 'goalId is required' }, { status: 400 })
        }

        const db = await getDb()
        const logId = `wl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
        const startedAt = new Date().toISOString()

        await db.execute({
            sql: `INSERT INTO yarikiru_work_logs (id, goal_id, user_id, started_at)
            VALUES (?, ?, ?, ?)`,
            args: [logId, goalId, userId, startedAt],
        })

        // 中目標のステータスを in_progress に更新
        await db.execute({
            sql: `UPDATE yarikiru_goals SET status = 'in_progress', started_at = COALESCE(started_at, ?) WHERE id = ?`,
            args: [startedAt, goalId],
        })

        return NextResponse.json({
            log: { id: logId, goalId, startedAt, endedAt: null, durationMinutes: null },
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating work log:', error)
        return NextResponse.json(
            { error: 'Failed to create work log', details: String(error) },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest) {
    const { userId } = await auth()
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { logId, notes, approach, effectiveness } = body

        if (!logId) {
            return NextResponse.json({ error: 'logId is required' }, { status: 400 })
        }

        const db = await getDb()
        const endedAt = new Date().toISOString()

        // Calculate duration
        const existing = await db.execute({
            sql: `SELECT started_at FROM yarikiru_work_logs WHERE id = ? AND user_id = ?`,
            args: [logId, userId],
        })

        if (existing.rows.length === 0) {
            return NextResponse.json({ error: 'Work log not found' }, { status: 404 })
        }

        const startedAt = String(existing.rows[0][0])
        const durationMs = new Date(endedAt).getTime() - new Date(startedAt).getTime()
        const durationMinutes = Math.round(durationMs / 60000)

        const encNotes = notes ? await encryptForDb(notes) : null
        const encApproach = approach ? await encryptForDb(approach) : null

        await db.execute({
            sql: `UPDATE yarikiru_work_logs
            SET ended_at = ?, duration_minutes = ?, notes = ?, approach = ?, effectiveness = ?
            WHERE id = ? AND user_id = ?`,
            args: [endedAt, durationMinutes, encNotes, encApproach, effectiveness || null, logId, userId],
        })

        return NextResponse.json({
            log: { id: logId, endedAt, durationMinutes, notes, approach, effectiveness },
        })
    } catch (error) {
        console.error('Error updating work log:', error)
        return NextResponse.json(
            { error: 'Failed to update work log', details: String(error) },
            { status: 500 }
        )
    }
}
