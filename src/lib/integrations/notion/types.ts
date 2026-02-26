/**
 * Notion Integration Types
 *
 * Type definitions for Notion API integration with YARIKIRU.
 */

/**
 * Notion database information
 */
export interface NotionDatabase {
    id: string
    title: string
    description?: string | null
    icon?: {
        type: 'emoji' | 'external' | 'file' | 'custom_emoji'
        emoji?: string
        external?: { url: string }
        file?: { url: string }
    } | null
    url: string
    properties: Record<string, {
        id: string
        name: string
        type: string
        [key: string]: unknown
    }>
}

/**
 * Notion page data
 */
export interface NotionPage {
    id: string
    title: string
    url: string
    icon?: {
        type: 'emoji' | 'external' | 'file' | 'custom_emoji'
        emoji?: string
        external?: { url: string }
        file?: { url: string }
    } | null
    properties: Record<string, unknown>
    createdAt: string
    updatedAt: string
    archived: boolean
}

/**
 * User's Notion configuration stored in database
 */
export interface NotionConfig {
    userId: string
    accessToken: string  // Encrypted
    workspaceId?: string | null
    workspaceName?: string | null
    workspaceIcon?: string | null
    selectedDatabases: SelectedDatabase[]
    createdAt: string
    updatedAt: string
}

/**
 * Selected database for sync
 */
export interface SelectedDatabase {
    databaseId: string
    databaseName: string
    syncDirection: SyncDirection
    propertyMapping?: PropertyMapping
    lastSyncedAt?: string | null
}

/**
 * Sync direction for database mapping
 */
export type SyncDirection = 'to_notion' | 'from_notion' | 'bidirectional'

/**
 * Property mapping between Notion and YARIKIRU
 */
export interface PropertyMapping {
    // Notion property name -> YARIKIRU field
    title?: string           // Maps to goal title
    description?: string     // Maps to goal description
    status?: string          // Maps to goal status
    priority?: string        // Maps to goal priority
    dueDate?: string         // Maps to goal due date
    projectId?: string       // Maps to project ID
    learning?: string        // Maps to goal learning
    tags?: string            // Maps to goal tags
}

/**
 * Page mapping between Notion page and YARIKIRU goal
 */
export interface NotionPageMapping {
    goalId: string
    pageId: string
    databaseId: string
    lastSyncedAt: string
    syncDirection: SyncDirection
    notionUpdatedAt?: string | null
    yarikiruUpdatedAt?: string | null
}

/**
 * Sync result for a single item
 */
export interface SyncResult {
    success: boolean
    goalId?: string
    pageId?: string
    action: 'created' | 'updated' | 'skipped' | 'error'
    message?: string
}

/**
 * Full sync report
 */
export interface SyncReport {
    databaseId: string
    direction: SyncDirection
    startedAt: string
    finishedAt?: string
    totalProcessed: number
    created: number
    updated: number
    skipped: number
    errors: number
    results: SyncResult[]
}

/**
 * Database query filter type - simplified to avoid API version issues
 */
export type NotionQueryFilter = Record<string, unknown>

/**
 * OAuth state for CSRF protection
 */
export interface OAuthState {
    userId: string
    redirectUrl?: string
    createdAt: number
}

/**
 * Notion API error
 */
export interface NotionApiError {
    code: string
    message: string
    status?: number
}
