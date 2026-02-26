/**
 * Notion Sync Logic
 *
 * Bidirectional sync between YARIKIRU goals/projects and Notion pages.
 */

import { execute, executeOne } from '../../turso/client'
import { decryptFromDb, encryptForDb } from '../../e2ee'
import { createNotionClient, NotionClient } from './client'
import type {
    NotionConfig,
    NotionPageMapping,
    NotionPage,
    SyncReport,
    SyncResult,
    SyncDirection,
    SelectedDatabase,
    PropertyMapping,
} from './types'

/**
 * Get user's Notion configuration
 */
export async function getNotionConfig(userId: string): Promise<NotionConfig | null> {
    const row = await executeOne<{
        user_id: string
        access_token: string
        workspace_id: string | null
        workspace_name: string | null
        workspace_icon: string | null
        selected_databases: string
        created_at: string
        updated_at: string
    }>(
        `SELECT * FROM yarikiru_notion_configs WHERE user_id = ?`,
        [userId]
    )

    if (!row) return null

    const decryptedToken = await decryptFromDb(row.access_token)
    let selectedDatabases: SelectedDatabase[] = []
    try {
        selectedDatabases = JSON.parse(row.selected_databases || '[]')
    } catch {
        selectedDatabases = []
    }

    return {
        userId: row.user_id,
        accessToken: decryptedToken,
        workspaceId: row.workspace_id,
        workspaceName: row.workspace_name,
        workspaceIcon: row.workspace_icon,
        selectedDatabases,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

/**
 * Save user's Notion configuration
 */
export async function saveNotionConfig(config: Partial<NotionConfig> & { userId: string }): Promise<void> {
    const encryptedToken = config.accessToken ? await encryptForDb(config.accessToken) : null
    const databasesJson = config.selectedDatabases ? JSON.stringify(config.selectedDatabases) : '[]'

    await execute(
        `INSERT INTO yarikiru_notion_configs (
            user_id, access_token, workspace_id, workspace_name, workspace_icon,
            selected_databases, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
            access_token = COALESCE(excluded.access_token, access_token),
            workspace_id = COALESCE(excluded.workspace_id, workspace_id),
            workspace_name = COALESCE(excluded.workspace_name, workspace_name),
            workspace_icon = COALESCE(excluded.workspace_icon, workspace_icon),
            selected_databases = excluded.selected_databases,
            updated_at = datetime('now')`,
        [
            config.userId,
            encryptedToken || '',
            config.workspaceId || null,
            config.workspaceName || null,
            config.workspaceIcon || null,
            databasesJson,
        ]
    )
}

/**
 * Delete user's Notion configuration
 */
export async function deleteNotionConfig(userId: string): Promise<void> {
    await execute(`DELETE FROM yarikiru_notion_page_mappings WHERE goal_id IN (
        SELECT g.id FROM yarikiru_goals g
        JOIN yarikiru_projects p ON g.project_id = p.id
        WHERE p.user_id = ?
    )`, [userId])

    await execute(`DELETE FROM yarikiru_notion_configs WHERE user_id = ?`, [userId])
}

/**
 * Get page mapping for a goal
 */
export async function getPageMapping(goalId: string): Promise<NotionPageMapping | null> {
    const row = await executeOne<{
        goal_id: string
        page_id: string
        database_id: string
        last_synced_at: string
        sync_direction: string
        notion_updated_at: string | null
        yarikiru_updated_at: string | null
    }>(
        `SELECT * FROM yarikiru_notion_page_mappings WHERE goal_id = ?`,
        [goalId]
    )

    if (!row) return null

    return {
        goalId: row.goal_id,
        pageId: row.page_id,
        databaseId: row.database_id,
        lastSyncedAt: row.last_synced_at,
        syncDirection: row.sync_direction as SyncDirection,
        notionUpdatedAt: row.notion_updated_at,
        yarikiruUpdatedAt: row.yarikiru_updated_at,
    }
}

/**
 * Save page mapping
 */
export async function savePageMapping(mapping: NotionPageMapping): Promise<void> {
    await execute(
        `INSERT INTO yarikiru_notion_page_mappings (
            goal_id, page_id, database_id, last_synced_at, sync_direction,
            notion_updated_at, yarikiru_updated_at
        ) VALUES (?, ?, ?, datetime('now'), ?, ?, ?)
        ON CONFLICT(goal_id) DO UPDATE SET
            page_id = excluded.page_id,
            database_id = excluded.database_id,
            last_synced_at = datetime('now'),
            sync_direction = excluded.sync_direction,
            notion_updated_at = excluded.notion_updated_at,
            yarikiru_updated_at = excluded.yarikiru_updated_at`,
        [
            mapping.goalId,
            mapping.pageId,
            mapping.databaseId,
            mapping.syncDirection,
            mapping.notionUpdatedAt || null,
            mapping.yarikiruUpdatedAt || null,
        ]
    )
}

/**
 * Delete page mapping
 */
export async function deletePageMapping(goalId: string): Promise<void> {
    await execute(`DELETE FROM yarikiru_notion_page_mappings WHERE goal_id = ?`, [goalId])
}

/**
 * Sync projects to a Notion database
 */
export async function syncProjectsToDatabase(
    userId: string,
    databaseId: string,
    client: NotionClient
): Promise<SyncReport> {
    const report: SyncReport = {
        databaseId,
        direction: 'to_notion',
        startedAt: new Date().toISOString(),
        totalProcessed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        results: [],
    }

    // Get all projects for the user
    const projects = await execute<{
        id: string
        title: string
        description: string | null
        status: string
        created_at: string
        updated_at: string
    }>(
        `SELECT id, title, description, status, created_at, updated_at
         FROM yarikiru_projects WHERE user_id = ?`,
        [userId]
    )

    // Get database schema to find title property
    const dbSchema = await client.getDatabase(databaseId)
    const titlePropName = Object.keys(dbSchema.properties).find(
        (key) => dbSchema.properties[key].type === 'title'
    ) || 'Name'

    for (const project of projects) {
        report.totalProcessed++

        try {
            // Check if mapping exists
            const existingMapping = await executeOne<{ page_id: string }>(
                `SELECT page_id FROM yarikiru_notion_page_mappings
                 WHERE goal_id = ? AND database_id = ?`,
                [project.id, databaseId]
            )

            if (existingMapping) {
                // Update existing page
                await client.updatePage(existingMapping.page_id, {
                    [titlePropName]: {
                        title: [{ text: { content: project.title } }],
                    },
                })

                report.updated++
                report.results.push({
                    success: true,
                    goalId: project.id,
                    pageId: existingMapping.page_id,
                    action: 'updated',
                })
            } else {
                // Create new page
                const page = await client.createPage(databaseId, {
                    [titlePropName]: {
                        title: [{ text: { content: project.title } }],
                    },
                })

                // Save mapping
                await savePageMapping({
                    goalId: project.id,
                    pageId: page.id,
                    databaseId,
                    lastSyncedAt: new Date().toISOString(),
                    syncDirection: 'to_notion',
                })

                report.created++
                report.results.push({
                    success: true,
                    goalId: project.id,
                    pageId: page.id,
                    action: 'created',
                })
            }
        } catch (error) {
            report.errors++
            report.results.push({
                success: false,
                goalId: project.id,
                action: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
            })
        }
    }

    report.finishedAt = new Date().toISOString()
    return report
}

/**
 * Sync goals to a Notion database
 */
export async function syncGoalsToDatabase(
    userId: string,
    databaseId: string,
    projectId: string | null,
    client: NotionClient
): Promise<SyncReport> {
    const report: SyncReport = {
        databaseId,
        direction: 'to_notion',
        startedAt: new Date().toISOString(),
        totalProcessed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        results: [],
    }

    // Build query
    let sql = `
        SELECT g.id, g.title, g.description, g.status, g.priority,
               g.learning, g.estimated_minutes, g.actual_minutes,
               g.created_at, g.updated_at, g.completed_at, g.project_id
        FROM yarikiru_goals g
        JOIN yarikiru_projects p ON g.project_id = p.id
        WHERE p.user_id = ?
    `
    const params: (string | number | null)[] = [userId]

    if (projectId) {
        sql += ` AND g.project_id = ?`
        params.push(projectId)
    }

    const goals = await execute<{
        id: string
        title: string
        description: string | null
        status: string
        priority: number | null
        learning: string | null
        estimated_minutes: number | null
        actual_minutes: number | null
        created_at: string
        updated_at: string
        completed_at: string | null
        project_id: string
    }>(sql, params)

    // Get database schema
    const dbSchema = await client.getDatabase(databaseId)
    const titlePropName = Object.keys(dbSchema.properties).find(
        (key) => dbSchema.properties[key].type === 'title'
    ) || 'Name'

    // Find available property names for mapping
    const statusPropName = findPropertyByType(dbSchema.properties, 'status')
    const priorityPropName = findPropertyByType(dbSchema.properties, 'select')
    const descPropName = findPropertyByType(dbSchema.properties, 'rich_text')

    for (const goal of goals) {
        report.totalProcessed++

        try {
            // Build properties
            const properties: Record<string, unknown> = {
                [titlePropName]: {
                    title: [{ text: { content: goal.title } }],
                },
            }

            if (descPropName && goal.description) {
                properties[descPropName] = {
                    rich_text: [{ text: { content: goal.description.substring(0, 2000) } }],
                }
            }

            if (statusPropName && goal.status) {
                properties[statusPropName] = {
                    status: { name: mapStatusToNotion(goal.status) },
                }
            }

            // Check if mapping exists
            const existingMapping = await executeOne<{ page_id: string }>(
                `SELECT page_id FROM yarikiru_notion_page_mappings
                 WHERE goal_id = ? AND database_id = ?`,
                [goal.id, databaseId]
            )

            if (existingMapping) {
                await client.updatePage(existingMapping.page_id, properties)
                report.updated++
                report.results.push({
                    success: true,
                    goalId: goal.id,
                    pageId: existingMapping.page_id,
                    action: 'updated',
                })
            } else {
                const page = await client.createPage(databaseId, properties)

                await savePageMapping({
                    goalId: goal.id,
                    pageId: page.id,
                    databaseId,
                    lastSyncedAt: new Date().toISOString(),
                    syncDirection: 'to_notion',
                    yarikiruUpdatedAt: goal.updated_at,
                })

                report.created++
                report.results.push({
                    success: true,
                    goalId: goal.id,
                    pageId: page.id,
                    action: 'created',
                })
            }
        } catch (error) {
            report.errors++
            report.results.push({
                success: false,
                goalId: goal.id,
                action: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
            })
        }
    }

    report.finishedAt = new Date().toISOString()
    return report
}

/**
 * Import pages from a Notion database as goals
 */
export async function importFromDatabase(
    userId: string,
    databaseId: string,
    projectId: string,
    client: NotionClient,
    propertyMapping?: PropertyMapping
): Promise<SyncReport> {
    const report: SyncReport = {
        databaseId,
        direction: 'from_notion',
        startedAt: new Date().toISOString(),
        totalProcessed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        results: [],
    }

    // Get database schema
    const dbSchema = await client.getDatabase(databaseId)

    // Query all pages
    let hasMore = true
    let nextCursor: string | null = null
    const allPages: NotionPage[] = []

    while (hasMore) {
        const result = await client.queryDatabase(databaseId, undefined, nextCursor || undefined)
        allPages.push(...result.pages)
        hasMore = result.hasMore
        nextCursor = result.nextCursor
    }

    // Get property names from mapping or auto-detect
    const titleProp = propertyMapping?.title ||
        Object.keys(dbSchema.properties).find((key) => dbSchema.properties[key].type === 'title') ||
        'Name'
    const descProp = propertyMapping?.description ||
        findPropertyByType(dbSchema.properties, 'rich_text')
    const statusProp = propertyMapping?.status ||
        findPropertyByType(dbSchema.properties, 'status')

    for (const page of allPages) {
        if (page.archived) continue

        report.totalProcessed++

        try {
            // Check if mapping exists
            const existingMapping = await executeOne<{ goal_id: string }>(
                `SELECT goal_id FROM yarikiru_notion_page_mappings WHERE page_id = ?`,
                [page.id]
            )

            if (existingMapping) {
                // Update existing goal
                const updates: string[] = []
                const params: (string | number | null)[] = []

                updates.push('title = ?')
                params.push(page.title)

                if (descProp) {
                    const description = extractRichText(page.properties, descProp)
                    if (description) {
                        updates.push('description = ?')
                        params.push(description)
                    }
                }

                if (statusProp) {
                    const notionStatus = extractStatus(page.properties, statusProp)
                    if (notionStatus) {
                        updates.push('status = ?')
                        params.push(mapStatusFromNotion(notionStatus))
                    }
                }

                updates.push('updated_at = datetime("now")')
                params.push(existingMapping.goal_id)

                await execute(
                    `UPDATE yarikiru_goals SET ${updates.join(', ')} WHERE id = ?`,
                    params
                )

                // Update mapping
                await execute(
                    `UPDATE yarikiru_notion_page_mappings
                     SET last_synced_at = datetime("now"), notion_updated_at = ?
                     WHERE page_id = ?`,
                    [page.updatedAt, page.id]
                )

                report.updated++
                report.results.push({
                    success: true,
                    goalId: existingMapping.goal_id,
                    pageId: page.id,
                    action: 'updated',
                })
            } else {
                // Create new goal
                const description = descProp ? extractRichText(page.properties, descProp) : null
                const notionStatus = statusProp ? extractStatus(page.properties, statusProp) : null

                const goalId = `g_${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`

                await execute(
                    `INSERT INTO yarikiru_goals (
                        id, title, description, status, project_id, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))`,
                    [
                        goalId,
                        page.title || 'Untitled',
                        description,
                        mapStatusFromNotion(notionStatus) || 'todo',
                        projectId,
                    ]
                )

                // Save mapping
                await savePageMapping({
                    goalId,
                    pageId: page.id,
                    databaseId,
                    lastSyncedAt: new Date().toISOString(),
                    syncDirection: 'from_notion',
                    notionUpdatedAt: page.updatedAt,
                })

                report.created++
                report.results.push({
                    success: true,
                    goalId,
                    pageId: page.id,
                    action: 'created',
                })
            }
        } catch (error) {
            report.errors++
            report.results.push({
                success: false,
                pageId: page.id,
                action: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
            })
        }
    }

    report.finishedAt = new Date().toISOString()
    return report
}

/**
 * Perform bidirectional sync
 */
export async function bidirectionalSync(
    userId: string,
    databaseId: string,
    projectId: string,
    client: NotionClient
): Promise<{ toNotion: SyncReport; fromNotion: SyncReport }> {
    const toNotion = await syncGoalsToDatabase(userId, databaseId, projectId, client)
    const fromNotion = await importFromDatabase(userId, databaseId, projectId, client)

    return { toNotion, fromNotion }
}

// Helper functions

function findPropertyByType(
    properties: Record<string, { type: string; [key: string]: unknown }>,
    type: string
): string | null {
    for (const [key, prop] of Object.entries(properties)) {
        if (prop.type === type) {
            return key
        }
    }
    return null
}

function mapStatusToNotion(status: string): string {
    const mapping: Record<string, string> = {
        'todo': 'Not started',
        'in_progress': 'In progress',
        'done': 'Done',
        'blocked': 'Blocked',
    }
    return mapping[status] || 'Not started'
}

function mapStatusFromNotion(notionStatus: string | null): string {
    if (!notionStatus) return 'todo'

    const mapping: Record<string, string> = {
        'not started': 'todo',
        'in progress': 'in_progress',
        'done': 'done',
        'blocked': 'blocked',
        'to do': 'todo',
        'completed': 'done',
    }
    return mapping[notionStatus.toLowerCase()] || 'todo'
}

function extractRichText(properties: Record<string, unknown>, propName: string): string | null {
    const prop = properties[propName]
    if (!prop || typeof prop !== 'object' || !('rich_text' in prop)) return null

    const richText = (prop as { rich_text?: Array<{ plain_text?: string }> }).rich_text
    if (!Array.isArray(richText)) return null

    return richText.map((t) => t.plain_text || '').join('')
}

function extractStatus(properties: Record<string, unknown>, propName: string): string | null {
    const prop = properties[propName]
    if (!prop || typeof prop !== 'object') return null

    if ('status' in prop) {
        const status = (prop as { status?: { name?: string } }).status
        return status?.name || null
    }

    if ('select' in prop) {
        const select = (prop as { select?: { name?: string } }).select
        return select?.name || null
    }

    return null
}

/**
 * Get sync client from config
 */
export async function getSyncClient(userId: string): Promise<{ client: NotionClient; config: NotionConfig } | null> {
    const config = await getNotionConfig(userId)
    if (!config) return null

    const client = createNotionClient(config.accessToken)
    return { client, config }
}
