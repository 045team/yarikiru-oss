/**
 * CocoIndex Types
 * Types for CocoIndex MCP integration for code search and dev workflow support
 */

// ============================================
// Code Search Types
// ============================================

/**
 * A single code search result from CocoIndex
 */
export interface CodeSearchResult {
    /** File path relative to project root */
    file: string
    /** Line number where the match starts */
    line: number
    /** End line number for multi-line matches */
    endLine?: number
    /** Function or symbol name containing the match */
    symbol?: string
    /** Code snippet showing the match */
    snippet: string
    /** Relevance score (higher = more relevant) */
    score?: number
    /** Language of the code file */
    language?: string
}

/**
 * Reference to a specific location in code
 */
export interface CodeReference {
    /** File path relative to project root */
    file: string
    /** Line number */
    line: number
    /** End line number for multi-line references */
    endLine?: number
    /** Symbol name (function, class, variable) */
    symbol?: string
    /** Optional description of what this reference is about */
    description?: string
}

/**
 * Options for code search
 */
export interface CodeSearchOptions {
    /** Maximum number of results to return */
    limit?: number
    /** Filter by file pattern (glob) */
    filePattern?: string
    /** Filter by language */
    language?: string
    /** Include context lines around matches */
    contextLines?: number
}

/**
 * Symbol information in a file
 */
export interface FileSymbol {
    /** Symbol name */
    name: string
    /** Symbol type (function, class, variable, etc.) */
    type: 'function' | 'class' | 'interface' | 'variable' | 'constant' | 'method' | 'property' | 'import' | 'export' | 'other'
    /** Line number where symbol is defined */
    line: number
    /** End line number */
    endLine?: number
    /** Symbol signature or declaration */
    signature?: string
    /** Documentation string */
    docstring?: string
}

/**
 * Context around a function
 */
export interface FunctionContext {
    /** Function name */
    name: string
    /** File path */
    file: string
    /** Start line */
    line: number
    /** End line */
    endLine?: number
    /** Full function source code */
    source?: string
    /** Function signature */
    signature?: string
    /** Parameters */
    parameters?: Array<{
        name: string
        type?: string
        defaultValue?: string
    }>
    /** Return type */
    returnType?: string
    /** Documentation */
    docstring?: string
    /** Called functions */
    calls?: string[]
    /** Functions that call this one */
    calledBy?: string[]
}

// ============================================
// Configuration Types
// ============================================

/**
 * CocoIndex connection configuration
 */
export interface CocoIndexConfig {
    /** CocoIndex MCP server URL */
    serverUrl: string
    /** Request timeout in milliseconds */
    timeout?: number
    /** Whether to retry failed requests */
    retryEnabled?: boolean
    /** Number of retry attempts */
    retryAttempts?: number
}

/**
 * CocoIndex server status
 */
export interface CocoIndexStatus {
    /** Whether the server is connected */
    connected: boolean
    /** Server version */
    version?: string
    /** Number of indexed files */
    indexedFiles?: number
    /** Last index update time */
    lastIndexUpdate?: string
    /** Error message if not connected */
    error?: string
}

// ============================================
// MCP Protocol Types
// ============================================

/**
 * MCP Tool definition
 */
export interface MCPTool {
    name: string
    description: string
    inputSchema: {
        type: 'object'
        properties: Record<string, {
            type: string
            description?: string
            enum?: string[]
        }>
        required?: string[]
    }
}

/**
 * MCP Tool call request
 */
export interface MCPToolCallRequest {
    method: 'tools/call'
    params: {
        name: string
        arguments: Record<string, unknown>
    }
}

/**
 * MCP Tool call response
 */
export interface MCPToolCallResponse {
    content: Array<{
        type: 'text' | 'image' | 'resource'
        text?: string
        data?: string
        mimeType?: string
    }>
    isError?: boolean
}

/**
 * MCP List tools response
 */
export interface MCPListToolsResponse {
    tools: MCPTool[]
}

// ============================================
// API Types
// ============================================

/**
 * Code search API response
 */
export interface CodeSearchAPIResponse {
    success: boolean
    results: CodeSearchResult[]
    query: string
    total: number
    error?: string
}

/**
 * CocoIndex status API response
 */
export interface CocoIndexStatusAPIResponse {
    success: boolean
    status: CocoIndexStatus
    error?: string
}
