import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { getTursoClient as createClient } from '../../../../../lib/turso/client'

async function getDb() {
    return createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
    })
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const { userId } = await auth()
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { projectId } = await params
        const db = await getDb()

        // 所有者確認とアーカイブ状態への更新
        const result = await db.execute({
            sql: `
        UPDATE yarikiru_projects
        SET status = 'archived', updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `,
            args: [projectId, userId],
        })

        if (result.rowsAffected === 0) {
            return NextResponse.json(
                { error: 'Project not found or not authorized' },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error archiving project:', error)
        return NextResponse.json(
            { error: 'Failed to archive project', details: String(error) },
            { status: 500 }
        )
    }
}
