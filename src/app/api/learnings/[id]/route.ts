/**
 * PATCH /api/learnings/[id] - ステータス等を更新
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../../lib/turso/client'

async function getDb() {
    return createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
    })
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth()
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    try {
        const body = await request.json()
        const { status } = body

        if (!status || !['unread', 'summarized', 'articled'].includes(status)) {
            return NextResponse.json({ error: 'Valid status is required' }, { status: 400 })
        }

        const db = await getDb()
        await db.execute({
            sql: `UPDATE yarikiru_learning_items SET status = ? WHERE id = ? AND user_id = ?`,
            args: [status, id, userId],
        })

        return NextResponse.json({ success: true, id, status })
    } catch (error) {
        console.error('Error updating learning item:', error)
        return NextResponse.json(
            { error: 'Failed to update learning item', details: String(error) },
            { status: 500 }
        )
    }
}
