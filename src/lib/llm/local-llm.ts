/**
 * Local LLM Client
 * Supports Ollama, LM Studio, and other OpenAI-compatible local LLMs
 */

import type {
  LLMProvider,
  LLMProviderType,
  LLMModel,
  SummarizeOptions,
  SummarizeResult,
  LocalLLMConfig,
  ChatCompletionResponse,
  ModelsListResponse
} from './types'
import { DEFAULT_SUMMARIZE_OPTIONS, SYSTEM_PROMPTS } from './types'

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<LocalLLMConfig> = {
  baseUrl: process.env.OPENAI_BASE_URL || 'http://localhost:11434/v1',
  apiKey: process.env.OPENAI_API_KEY || 'ollama', // Ollama doesn't require a real API key
  defaultModel: '',
  timeout: 30000
}

/**
 * Preferred models for summarization (in order of preference)
 */
const PREFERRED_MODELS = [
  'llama3.2',
  'llama3.1',
  'llama3',
  'llama2',
  'mistral',
  'mixtral',
  'codellama',
  'deepseek-coder',
  'qwen2.5',
  'qwen2',
  'gemma2',
  'gemma',
  'phi3',
  'phi'
]

/**
 * Local LLM Provider implementation
 */
export class LocalLLMProvider implements LLMProvider {
  readonly type: LLMProviderType = 'local'
  private baseUrl: string
  private apiKey: string
  private defaultModel: string
  private timeout: number
  private cachedModels: LLMModel[] | null = null
  private modelsCacheTime: number = 0
  private readonly MODELS_CACHE_TTL = 60000 // 1 minute cache

  constructor(config: LocalLLMConfig = {}) {
    this.baseUrl = config.baseUrl || DEFAULT_CONFIG.baseUrl
    this.apiKey = config.apiKey || DEFAULT_CONFIG.apiKey
    this.defaultModel = config.defaultModel || DEFAULT_CONFIG.defaultModel
    this.timeout = config.timeout || DEFAULT_CONFIG.timeout
  }

  /**
   * Check if the local LLM server is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }
    if (this.apiKey && this.apiKey !== 'ollama') {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }
    return headers
  }

  /**
   * List available models from the server
   */
  async listModels(): Promise<LLMModel[]> {
    // Return cached models if still valid
    if (this.cachedModels && Date.now() - this.modelsCacheTime < this.MODELS_CACHE_TTL) {
      return this.cachedModels
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders()
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`)
      }

      const data = (await response.json()) as ModelsListResponse
      this.cachedModels = data.data.map(model => ({
        id: model.id,
        name: model.id,
        owned_by: model.owned_by
      }))
      this.modelsCacheTime = Date.now()

      return this.cachedModels
    } catch (error) {
      console.error('[LocalLLM] Error fetching models:', error)
      return []
    }
  }

  /**
   * Get the default model for summarization
   * Auto-detects the best available model if not configured
   */
  async getDefaultModel(): Promise<string> {
    // Return configured default model
    if (this.defaultModel) {
      return this.defaultModel
    }

    // Auto-detect best available model
    const models = await this.listModels()

    if (models.length === 0) {
      throw new Error('No models available. Please ensure Ollama or LM Studio is running with at least one model.')
    }

    // Find preferred model
    for (const preferred of PREFERRED_MODELS) {
      const match = models.find(m =>
        m.id.toLowerCase().includes(preferred.toLowerCase())
      )
      if (match) {
        this.defaultModel = match.id
        return match.id
      }
    }

    // Fallback to first available model
    this.defaultModel = models[0].id
    return models[0].id
  }

  /**
   * Summarize text using the local LLM
   */
  async summarize(text: string, options: SummarizeOptions = {}): Promise<SummarizeResult> {
    const startTime = Date.now()

    const mergedOptions = { ...DEFAULT_SUMMARIZE_OPTIONS, ...options }
    const model = options.model || await this.getDefaultModel()
    const systemPrompt = options.systemPrompt || SYSTEM_PROMPTS[mergedOptions.language]

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), mergedOptions.timeout)

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Please summarize the following content:\n\n${text}` }
          ],
          max_tokens: mergedOptions.maxTokens,
          temperature: mergedOptions.temperature
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Summarization failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = (await response.json()) as ChatCompletionResponse

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response generated from the model')
      }

      const duration = Date.now() - startTime

      return {
        summary: data.choices[0].message.content.trim(),
        model: data.model,
        provider: this.type,
        duration,
        tokensUsed: data.usage?.total_tokens
      }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Summarization timed out after ${mergedOptions.timeout}ms`)
      }

      throw error
    }
  }
}

/**
 * Singleton instance
 */
let localLLMInstance: LocalLLMProvider | null = null

/**
 * Get or create the local LLM provider instance
 */
export function getLocalLLM(config: LocalLLMConfig = {}): LocalLLMProvider {
  if (!localLLMInstance) {
    localLLMInstance = new LocalLLMProvider(config)
  }
  return localLLMInstance
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetLocalLLM(): void {
  localLLMInstance = null
}

/**
 * Check if local LLM is configured and available
 */
export async function isLocalLLMAvailable(): Promise<boolean> {
  const llm = getLocalLLM()
  return llm.isAvailable()
}

/**
 * Quick summarization helper
 */
export async function summarizeWithLocalLLM(
  text: string,
  options: SummarizeOptions = {}
): Promise<SummarizeResult> {
  const llm = getLocalLLM()
  return llm.summarize(text, options)
}
