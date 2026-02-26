/**
 * Notion Client Wrapper
 *
 * Wrapper around the official @notionhq/client v5.x with rate limiting
 * and error handling for YARIKIRU integration.
 *
 * Note: Notion API v5 uses dataSources instead of databases.query
 */

import { Client } from '@notionhq/client'
import type { NotionDatabase, NotionPage, NotionQueryFilter } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyResponse = any

/**
 * Rate limiter for Notion API (3 requests per second)
 */
class RateLimiter {
    private queue: Array<() => void> = []
    private lastRequestTime = 0
    private minInterval = 334 // ~3 requests per second (1000ms / 3)

    async waitForSlot(): Promise<void> {
        const now = Date.now()
        const timeSinceLastRequest = now - this.lastRequestTime

        if (timeSinceLastRequest >= this.minInterval) {
            this.lastRequestTime = now
            return
        }

        return new Promise<void>((resolve) => {
            this.queue.push(resolve)
            this.scheduleNext()
        })
    }

    private scheduleNext(): void {
        if (this.queue.length === 0) return

        const now = Date.now()
        const timeSinceLastRequest = now - this.lastRequestTime
        const waitTime = Math.max(0, this.minInterval - timeSinceLastRequest)

        setTimeout(() => {
            const next = this.queue.shift()
            if (next) {
                this.lastRequestTime = Date.now()
                next()
                this.scheduleNext()
            }
        }, waitTime)
    }
}

/**
 * Notion API client wrapper
 */
export class NotionClient {
    private client: Client
    private rateLimiter: RateLimiter

    constructor(accessToken: string) {
        this.client = new Client({ auth: accessToken })
        this.rateLimiter = new RateLimiter()
    }

    /**
     * List all accessible databases
     */
    async listDatabases(): Promise<NotionDatabase[]> {
        await this.rateLimiter.waitForSlot()

        const response = await this.client.search({
            filter: {
                property: 'object',
                value: 'database',
            } as never,
            page_size: 100,
        })

        return response.results
            .filter((item) => 'properties' in item && 'title' in item)
            .map((db) => this.mapDatabase(db))
    }

    /**
     * Query a database with optional filter
     * Uses dataSources.query in API v5
     */
    async queryDatabase(
        databaseId: string,
        filter?: NotionQueryFilter,
        startCursor?: string
    ): Promise<{
        pages: NotionPage[]
        hasMore: boolean
        nextCursor: string | null
    }> {
        await this.rateLimiter.waitForSlot()

        // In Notion API v5, databases are queried via dataSources
        const response = await this.client.dataSources.query({
            data_source_id: databaseId,
            filter: filter as never,
            start_cursor: startCursor,
            page_size: 100,
        } as never)

        const pages = response.results
            .filter((item) => 'properties' in item)
            .map((page) => this.mapPage(page))

        return {
            pages,
            hasMore: response.has_more,
            nextCursor: response.next_cursor ?? null,
        }
    }

    /**
     * Create a new page in a database
     */
    async createPage(
        databaseId: string,
        properties: Record<string, unknown>
    ): Promise<NotionPage> {
        await this.rateLimiter.waitForSlot()

        const response = await this.client.pages.create({
            parent: {
                database_id: databaseId,
            },
            properties: properties as never,
        })

        if (!('properties' in response)) {
            throw new Error('Unexpected response from Notion API')
        }

        return this.mapPage(response)
    }

    /**
     * Update an existing page
     */
    async updatePage(
        pageId: string,
        properties: Record<string, unknown>
    ): Promise<NotionPage> {
        await this.rateLimiter.waitForSlot()

        const response = await this.client.pages.update({
            page_id: pageId,
            properties: properties as never,
        })

        if (!('properties' in response)) {
            throw new Error('Unexpected response from Notion API')
        }

        return this.mapPage(response)
    }

    /**
     * Get page details
     */
    async getPage(pageId: string): Promise<NotionPage> {
        await this.rateLimiter.waitForSlot()

        const response = await this.client.pages.retrieve({
            page_id: pageId,
        })

        if (!('properties' in response)) {
            throw new Error('Unexpected response from Notion API')
        }

        return this.mapPage(response)
    }

    /**
     * Archive (delete) a page
     */
    async archivePage(pageId: string): Promise<void> {
        await this.rateLimiter.waitForSlot()

        await this.client.pages.update({
            page_id: pageId,
            archived: true,
        })
    }

    /**
     * Get database schema
     */
    async getDatabase(databaseId: string): Promise<NotionDatabase> {
        await this.rateLimiter.waitForSlot()

        const response = await this.client.databases.retrieve({
            database_id: databaseId,
        })

        return this.mapDatabase(response)
    }

    /**
     * Map Notion database response to our type
     */
    private mapDatabase(db: AnyResponse): NotionDatabase {
        const title = (db.title || [])
            .map((t: { plain_text: string }) => t.plain_text)
            .join('')

        const properties: Record<string, { id: string; name: string; type: string; [key: string]: unknown }> = {}
        if (db.properties && typeof db.properties === 'object') {
            for (const [key, value] of Object.entries(db.properties)) {
                const propValue = value as { id?: string; type?: string }
                properties[key] = {
                    id: propValue.id || '',
                    name: key,
                    type: propValue.type || 'unknown',
                    ...(value as object),
                }
            }
        }

        return {
            id: db.id,
            title,
            description: db.description?.map((d: { plain_text: string }) => d.plain_text).join('') || null,
            icon: db.icon || null,
            url: db.url,
            properties,
        }
    }

    /**
     * Map Notion page response to our type
     */
    private mapPage(page: AnyResponse): NotionPage {
        // Extract title from the page properties
        let title = ''
        if (page.properties && typeof page.properties === 'object') {
            const titleProp = Object.values(page.properties).find(
                (prop) => typeof prop === 'object' && prop !== null && 'type' in prop && (prop as { type: string }).type === 'title'
            )
            if (titleProp && typeof titleProp === 'object' && 'title' in titleProp && Array.isArray((titleProp as { title: unknown }).title)) {
                title = ((titleProp as { title: Array<{ plain_text: string }> }).title)
                    .map((t) => t.plain_text)
                    .join('')
            }
        }

        return {
            id: page.id,
            title,
            url: page.url,
            icon: page.icon || null,
            properties: page.properties as Record<string, unknown>,
            createdAt: page.created_time,
            updatedAt: page.last_edited_time,
            archived: page.archived,
        }
    }
}

/**
 * Create a Notion client instance
 */
export function createNotionClient(accessToken: string): NotionClient {
    return new NotionClient(accessToken)
}
