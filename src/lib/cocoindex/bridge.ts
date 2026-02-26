/**
 * CocoIndex Bridge
 * Connects to CocoIndex MCP server for code search and dev workflow support
 */

import type {
    CocoIndexConfig,
    CocoIndexStatus,
    CodeSearchResult,
    CodeSearchOptions,
    FileSymbol,
    FunctionContext,
    MCPToolCallRequest,
    MCPToolCallResponse,
} from './types'

// Default configuration
const DEFAULT_CONFIG: CocoIndexConfig = {
    serverUrl: 'http://127.0.0.1:3033/mcp',
    timeout: 30000,
    retryEnabled: true,
    retryAttempts: 2,
}

/**
 * CocoIndex Bridge class
 * Provides methods to interact with CocoIndex MCP server
 */
export class CocoIndexBridge {
    private config: CocoIndexConfig
    private availableTools: string[] = []

    constructor(config: Partial<CocoIndexConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config }
    }

    /**
     * Call an MCP tool on the CocoIndex server
     */
    private async callTool(
        toolName: string,
        args: Record<string, unknown>
    ): Promise<MCPToolCallResponse> {
        const request: MCPToolCallRequest = {
            method: 'tools/call',
            params: {
                name: toolName,
                arguments: args,
            },
        }

        let lastError: Error | null = null
        const attempts = this.config.retryEnabled ? (this.config.retryAttempts || 2) + 1 : 1

        for (let i = 0; i < attempts; i++) {
            try {
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

                const response = await fetch(this.config.serverUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(request),
                    signal: controller.signal,
                })

                clearTimeout(timeoutId)

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
                }

                const data = await response.json()

                // Handle MCP response format
                if (data.error) {
                    throw new Error(data.error.message || 'MCP tool call failed')
                }

                return data.result || data
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error))
                // Wait before retry (exponential backoff)
                if (i < attempts - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
                }
            }
        }

        throw lastError || new Error('Failed to call CocoIndex tool')
    }

    /**
     * List available tools from CocoIndex server
     */
    async listTools(): Promise<string[]> {
        try {
            const response = await fetch(this.config.serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    method: 'tools/list',
                    params: {},
                }),
            })

            if (!response.ok) {
                return []
            }

            const data = await response.json()
            const tools = data.result?.tools || data.tools || []
            this.availableTools = tools.map((t: { name: string }) => t.name)
            return this.availableTools
        } catch {
            return []
        }
    }

    /**
     * Check connection status to CocoIndex server
     */
    async checkStatus(): Promise<CocoIndexStatus> {
        try {
            const tools = await this.listTools()

            if (tools.length === 0) {
                return {
                    connected: false,
                    error: 'No tools available from CocoIndex server',
                }
            }

            return {
                connected: true,
                indexedFiles: 0, // CocoIndex doesn't expose this directly
            }
        } catch (error) {
            return {
                connected: false,
                error: error instanceof Error ? error.message : 'Connection failed',
            }
        }
    }

    /**
     * Search code in the indexed codebase
     */
    async searchCode(
        query: string,
        options: CodeSearchOptions = {}
    ): Promise<CodeSearchResult[]> {
        const { limit = 20, filePattern, contextLines = 3 } = options

        try {
            const response = await this.callTool('search_code', {
                query,
                limit,
                file_pattern: filePattern,
                context_lines: contextLines,
            })

            // Parse the response content
            const textContent = this.extractTextContent(response)

            if (!textContent) {
                return []
            }

            // Parse search results from text format
            return this.parseSearchResults(textContent)
        } catch (error) {
            console.error('CocoIndex search error:', error)
            throw new Error(
                `Code search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
        }
    }

    /**
     * Get symbols in a specific file
     */
    async getFileSymbols(filePath: string): Promise<FileSymbol[]> {
        try {
            const response = await this.callTool('get_file_structure', {
                file_path: filePath,
            })

            const textContent = this.extractTextContent(response)

            if (!textContent) {
                return []
            }

            return this.parseFileSymbols(textContent)
        } catch (error) {
            console.error('CocoIndex get file symbols error:', error)
            return []
        }
    }

    /**
     * Get context around a specific function
     */
    async getFunctionContext(
        filePath: string,
        functionName: string
    ): Promise<FunctionContext | null> {
        try {
            const response = await this.callTool('get_code_context', {
                file_path: filePath,
                function_name: functionName,
            })

            const textContent = this.extractTextContent(response)

            if (!textContent) {
                return null
            }

            return this.parseFunctionContext(textContent, filePath, functionName)
        } catch (error) {
            console.error('CocoIndex get function context error:', error)
            return null
        }
    }

    /**
     * Extract text content from MCP response
     */
    private extractTextContent(response: MCPToolCallResponse): string | null {
        if (response.isError) {
            return null
        }

        const textContent = response.content?.find(c => c.type === 'text')
        return textContent?.text || null
    }

    /**
     * Parse search results from CocoIndex text output
     */
    private parseSearchResults(text: string): CodeSearchResult[] {
        const results: CodeSearchResult[] = []
        const lines = text.split('\n')

        let currentResult: Partial<CodeSearchResult> | null = null
        let snippetLines: string[] = []

        for (const line of lines) {
            // Match file path patterns like "src/file.ts:42:" or "--- src/file.ts ---"
            const fileMatch = line.match(/^(?:---\s*)?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)(?::(\d+))?(?:\s*---)?$/)
            if (fileMatch) {
                // Save previous result
                if (currentResult && currentResult.file) {
                    results.push({
                        file: currentResult.file,
                        line: currentResult.line || 1,
                        snippet: snippetLines.join('\n').trim(),
                        symbol: currentResult.symbol,
                    })
                }

                currentResult = {
                    file: fileMatch[1],
                    line: fileMatch[2] ? parseInt(fileMatch[2], 10) : 1,
                }
                snippetLines = []
                continue
            }

            // Match line number patterns like "  42 | code here"
            const lineMatch = line.match(/^\s*(\d+)\s*\|\s*(.*)$/)
            if (lineMatch && currentResult) {
                snippetLines.push(lineMatch[2])
                continue
            }

            // Regular code line
            if (currentResult && line.trim()) {
                snippetLines.push(line)
            }
        }

        // Save last result
        if (currentResult && currentResult.file) {
            results.push({
                file: currentResult.file,
                line: currentResult.line || 1,
                snippet: snippetLines.join('\n').trim(),
                symbol: currentResult.symbol,
            })
        }

        return results
    }

    /**
     * Parse file symbols from CocoIndex output
     */
    private parseFileSymbols(text: string): FileSymbol[] {
        const symbols: FileSymbol[] = []
        const lines = text.split('\n')

        for (const line of lines) {
            // Match patterns like "function myFunc (line 42)" or "class MyClass: line 10"
            const symbolMatch = line.match(/^(function|class|interface|variable|constant|method|property)\s+(\w+).*?(?:line\s*|:)\s*(\d+)/i)
            if (symbolMatch) {
                const type = symbolMatch[1].toLowerCase() as FileSymbol['type']
                symbols.push({
                    name: symbolMatch[2],
                    type,
                    line: parseInt(symbolMatch[3], 10),
                })
            }
        }

        return symbols
    }

    /**
     * Parse function context from CocoIndex output
     */
    private parseFunctionContext(
        text: string,
        filePath: string,
        functionName: string
    ): FunctionContext | null {
        const lines = text.split('\n')

        // Find the function definition line
        let startLine = 1
        let endLine = 1
        let signature = ''
        let docstring = ''
        let source = ''

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]

            // Look for function definition
            if (line.includes(functionName) && (
                line.includes('function') ||
                line.includes('def ') ||
                line.includes('const ') ||
                line.includes('async ')
            )) {
                startLine = i + 1
                signature = line.trim()
            }
        }

        // Collect source code (everything or until next function)
        source = text

        return {
            name: functionName,
            file: filePath,
            line: startLine,
            endLine,
            source,
            signature,
            docstring: docstring || undefined,
        }
    }
}

// Singleton instance
let bridgeInstance: CocoIndexBridge | null = null

/**
 * Get the singleton CocoIndex bridge instance
 */
export function getCocoIndexBridge(config?: Partial<CocoIndexConfig>): CocoIndexBridge {
    if (!bridgeInstance) {
        bridgeInstance = new CocoIndexBridge(config)
    }
    return bridgeInstance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetCocoIndexBridge(): void {
    bridgeInstance = null
}

/**
 * Generate a VS Code deep link for a code reference
 */
export function generateVSCodeDeepLink(
    filePath: string,
    line: number,
    workspacePath?: string
): string {
    const absolutePath = workspacePath
        ? `${workspacePath}/${filePath}`
        : filePath

    return `vscode://file/${absolutePath}:${line}`
}

/**
 * Generate a code reference object
 */
export function createCodeReference(
    file: string,
    line: number,
    symbol?: string,
    description?: string
): { file: string; line: number; symbol?: string; description?: string } {
    const ref: { file: string; line: number; symbol?: string; description?: string } = {
        file,
        line,
    }

    if (symbol) {
        ref.symbol = symbol
    }

    if (description) {
        ref.description = description
    }

    return ref
}
