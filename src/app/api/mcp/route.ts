import { NextRequest, NextResponse } from 'next/server'
import { getTursoClient as createClient } from '../../../lib/turso/client'
import crypto from 'crypto'

/**
 * 簡易的なハッシュ関数（Sha256）
 */
function hashKey(key: string) {
    return crypto.createHash('sha256').update(key).digest('hex')
}

// ============================================
// Database Connection
// ============================================
function getDatabase() {
    const url = process.env.TURSO_DATABASE_URL
    const token = process.env.TURSO_AUTH_TOKEN
    if (!url || !token) {
        throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set')
    }
    return createClient({ url, authToken: token })
}

import {
    mcpListGoals,
    mcpGetGoal,
    mcpCreateGoal,
    mcpCreateTasks,
    mcpUpdateTaskStatus,
    mcpListProjects,
    mcpStartGoalWork,
    mcpCompleteGoalWork,
    mcpGetStats,
    mcpListUrgentTasks,
    mcpToggleTaskUrgent,
    mcpAddLearningUrl,
    mcpGenerateArticleFromLearnings,
    mcpMarkLearningsArticled,
    mcpUpdateGoalSubtasks,
    mcpListCodeRules,
    mcpUpdateCodeRule,
    mcpResetCodeRules,
    mcpRunCodeReview,
    mcpGetReviewHistory,
    mcpCreateGraph,
    mcpGetGraph,
    mcpValidateGraph,
    mcpExecuteGraphWave,
    mcpSearchMemory,
    mcpListGitHubRepositories,
    mcpRegisterGitHubRepository,
    mcpListIdeas,
    mcpCreateIdea,
    mcpUpdateIdeaStatus,
    mcpDetectLoops,
    mcpGenerateWeeklyReport
} from '../../../lib/mcp/core-operations'

// Registry of operations
const operations: Record<string, (db: any, args: any, userId: string) => Promise<any>> = {
    listGoals: mcpListGoals,
    getGoal: mcpGetGoal,
    createGoal: mcpCreateGoal,
    createTasks: mcpCreateTasks,
    updateTaskStatus: mcpUpdateTaskStatus,
    listProjects: mcpListProjects,
    startGoalWork: mcpStartGoalWork,
    completeGoalWork: mcpCompleteGoalWork,
    getStats: mcpGetStats,
    listUrgentTasks: mcpListUrgentTasks,
    toggleTaskUrgent: mcpToggleTaskUrgent,
    addLearningUrl: mcpAddLearningUrl,
    generateArticleFromLearnings: mcpGenerateArticleFromLearnings,
    markLearningsArticled: mcpMarkLearningsArticled,
    updateGoalSubtasks: mcpUpdateGoalSubtasks,
    // Code Quality Rules
    listCodeRules: mcpListCodeRules,
    updateCodeRule: mcpUpdateCodeRule,
    resetCodeRules: mcpResetCodeRules,
    runCodeReview: mcpRunCodeReview,
    getReviewHistory: mcpGetReviewHistory,
    // Graph Operations
    createGraph: mcpCreateGraph,
    getGraph: mcpGetGraph,
    validateGraph: mcpValidateGraph,
    executeGraphWave: mcpExecuteGraphWave,
    // Vector Search Operations (3-Layer Protocol)
    searchMemory: mcpSearchMemory,
    // GitHub Integration
    listGitHubRepositories: mcpListGitHubRepositories,
    registerGitHubRepository: mcpRegisterGitHubRepository,
    // Ideas (Quick Capture)
    listIdeas: mcpListIdeas,
    createIdea: mcpCreateIdea,
    updateIdeaStatus: mcpUpdateIdeaStatus,
    detectLoops: mcpDetectLoops,
    generateWeeklyReport: mcpGenerateWeeklyReport,
}

export async function POST(request: NextRequest) {
    try {
        // Development mode bypass for local testing
        const isDev = process.env.NODE_ENV !== 'production'
        const devApiKey = process.env.DEV_API_KEY

        const authHeader = request.headers.get('Authorization')

        // Dev mode: Allow bypass with special header or env var
        if (isDev && devApiKey && authHeader === `Bearer ${devApiKey}`) {
            const db = getDatabase()
            const body = await request.json()
            const { operation, args } = body

            if (!operation || !operations[operation]) {
                return NextResponse.json({ error: `Unknown operation: ${operation}` }, { status: 400 })
            }

            // Use current user for dev mode
            const result = await operations[operation](db, args || {}, 'user_39sGQ4PcU2NitBLghsqblRKuUr2')
            return NextResponse.json({ success: true, data: result })
        }

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 })
        }

        const apiKey = authHeader.split(' ')[1]
        const hashedKey = hashKey(apiKey)

        const db = getDatabase()

        // Validate API Key
        const keyResult = await db.execute({
            sql: `SELECT user_id, id FROM yarikiru_api_keys WHERE key_hash = ? AND (expires_at IS NULL OR expires_at > datetime('now'))`,
            args: [hashedKey]
        })

        if (keyResult.rows.length === 0) {
            return NextResponse.json({ error: 'Invalid or expired API Key' }, { status: 401 })
        }

        const userId = String(keyResult.rows[0][0])
        const keyId = String(keyResult.rows[0][1])

        // Update last_used_at
        await db.execute({
            sql: `UPDATE yarikiru_api_keys SET last_used_at = datetime('now') WHERE id = ?`,
            args: [keyId]
        })

        const body = await request.json()
        const { operation, args } = body

        if (!operation || !operations[operation]) {
            return NextResponse.json({ error: `Unknown operation: ${operation}` }, { status: 400 })
        }

        // Execute operation
        const result = await operations[operation](db, args || {}, userId)

        return NextResponse.json({ success: true, data: result })
    } catch (error: any) {
        console.error('[MCP API Error]', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
