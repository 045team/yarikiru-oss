/**
 * URL Summarization Module
 * Fetches and summarizes URL content using local LLM
 */

import { JSDOM } from 'jsdom'
import {
    getLLMClient,
    parseStructuredSummary,
    type SummarizeOptions,
    type URLSummarizeResult
} from './index'

/**
 * Options for URL summarization
 */
export interface URLSummarizeOptions extends SummarizeOptions {
    /** Maximum content length to fetch (in characters) */
    maxContentLength?: number
    /** Fetch timeout in milliseconds */
    fetchTimeout?: number
}

/**
 * Default options for URL summarization
 */
const DEFAULT_URL_OPTIONS: Required<Pick<URLSummarizeOptions, 'maxContentLength' | 'fetchTimeout'>> = {
    maxContentLength: 50000,
    fetchTimeout: 15000
}

/**
 * Fetch content from a URL
 */
async function fetchURLContent(
    url: string,
    timeout: number
): Promise<{ title: string; content: string }> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; YARIKIRU-Bot/1.0)'
            },
            signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
        }

        const html = await response.text()
        const dom = new JSDOM(html)
        const document = dom.window.document

        // Extract title
        const title =
            document.querySelector('title')?.textContent ||
            document.querySelector('h1')?.textContent ||
            url

        // Extract main content
        const contentSelectors = [
            'article',
            '[role="main"]',
            'main',
            '.content',
            '.post-content',
            '.article-content',
            '#content',
            '.entry-content',
            'body'
        ]

        let content = ''
        for (const selector of contentSelectors) {
            const element = document.querySelector(selector)
            if (element) {
                element.querySelectorAll('script, style, nav, header, footer, aside').forEach(el => el.remove())
                content = element.textContent || ''
                if (content.length > 500) break
            }
        }

        content = content
            .replace(/\s+/g, ' ')
            .trim()

        return { title: title.trim(), content }
    } catch (error) {
        clearTimeout(timeoutId)

        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`URL fetch timed out after ${timeout}ms`)
        }

        throw error
    }
}

/**
 * Summarize a URL using local LLM
 */
export async function summarizeURL(
    url: string,
    options: URLSummarizeOptions = {}
): Promise<URLSummarizeResult> {
    const mergedOptions = { ...DEFAULT_URL_OPTIONS, ...options }

    const client = await getLLMClient()
    if (!client.isAvailable) {
        throw new Error('Local LLM is not available. Please start Ollama or LM Studio.')
    }

    const { title, content } = await fetchURLContent(url, mergedOptions.fetchTimeout)

    if (!content || content.length < 100) {
        throw new Error('Could not extract sufficient content from the URL')
    }

    const truncatedContent = content.slice(0, mergedOptions.maxContentLength)

    const result = await client.summarize(
        `URL: ${url}\nTitle: ${title}\n\nContent:\n${truncatedContent}`,
        options
    )

    const structured = parseStructuredSummary(result.summary)

    return {
        ...result,
        url,
        title,
        ...structured
    }
}

/**
 * Check if local LLM is available for summarization
 */
export async function canSummarizeLocally(): Promise<boolean> {
    const client = await getLLMClient()
    return client.isAvailable
}
