/**
 * Local LLM Integration Types
 * Supports Ollama, LM Studio, and other OpenAI-compatible local LLMs
 */

/**
 * Available LLM provider types
 */
export type LLMProviderType = 'local' | 'openai' | 'anthropic'

/**
 * Model information returned from the LLM server
 */
export interface LLMModel {
  id: string
  name?: string
  owned_by?: string
}

/**
 * Options for summarization
 */
export interface SummarizeOptions {
  /** Maximum tokens in the response */
  maxTokens?: number
  /** Temperature for randomness (0-1) */
  temperature?: number
  /** Specific model to use (optional, auto-detected if not provided) */
  model?: string
  /** Timeout in milliseconds */
  timeout?: number
  /** Custom system prompt */
  systemPrompt?: string
  /** Language for the summary */
  language?: 'en' | 'ja'
}

/**
 * Result of summarization
 */
export interface SummarizeResult {
  /** The summarized text */
  summary: string
  /** Model used for summarization */
  model: string
  /** Provider type */
  provider: LLMProviderType
  /** Time taken in milliseconds */
  duration: number
  /** Number of tokens used (if available) */
  tokensUsed?: number
}

/**
 * LLM Provider interface
 */
export interface LLMProvider {
  /** Provider type identifier */
  readonly type: LLMProviderType

  /** Check if the provider is available */
  isAvailable(): Promise<boolean>

  /** Get list of available models */
  listModels(): Promise<LLMModel[]>

  /** Summarize text */
  summarize(text: string, options?: SummarizeOptions): Promise<SummarizeResult>

  /** Get default model for this provider */
  getDefaultModel(): Promise<string>
}

/**
 * Configuration for local LLM client
 */
export interface LocalLLMConfig {
  /** Base URL for the LLM API (default: http://localhost:11434/v1 for Ollama) */
  baseUrl?: string
  /** API key (optional for local LLMs) */
  apiKey?: string
  /** Default model to use */
  defaultModel?: string
  /** Request timeout in milliseconds */
  timeout?: number
}

/**
 * Response from OpenAI-compatible chat completion API
 */
export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Response from OpenAI-compatible models list API
 */
export interface ModelsListResponse {
  object: string
  data: Array<{
    id: string
    object: string
    created: number
    owned_by: string
  }>
}

/**
 * URL content for summarization
 */
export interface URLContent {
  url: string
  title?: string
  content: string
}

/**
 * Summarization result for URL content
 */
export interface URLSummarizeResult extends SummarizeResult {
  url: string
  title?: string
  what?: string
  how?: string
  impact?: string
}

/**
 * Default summarization options
 */
export const DEFAULT_SUMMARIZE_OPTIONS: Required<Omit<SummarizeOptions, 'model' | 'systemPrompt'>> = {
  maxTokens: 500,
  temperature: 0.3,
  timeout: 30000,
  language: 'en'
}

/**
 * Default system prompts
 */
export const SYSTEM_PROMPTS = {
  en: `You are a helpful assistant that summarizes technical content concisely.
Analyze the content and provide:
1. WHAT: A brief summary of what this content is about
2. HOW: Key technical approaches, methods, or techniques mentioned
3. IMPACT: The significance or practical applications

Keep the summary clear, accurate, and useful for developers.`,
  ja: `あなたは技術コンテンツを簡潔に要約する役立つアシスタントです。
コンテンツを分析して以下を提供してください：
1. WHAT: このコンテンツについて何についているかの要約
2. HOW: 言及されている主要な技術的アプローチ、メソッド、またはテクニック
3. IMPACT: 重要性または実用的な応用

要約は開発者にとって明確で、正確で、有用なものにしてください。`
}
