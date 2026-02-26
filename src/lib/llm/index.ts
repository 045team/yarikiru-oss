/**
 * LLM Client Index
 * Factory function and exports for LLM integration
 */

import type { LLMProvider, SummarizeOptions, SummarizeResult, LocalLLMConfig } from './types'
import { LocalLLMProvider, getLocalLLM, isLocalLLMAvailable } from './local-llm'

// Re-export types
export * from './types'
export { LocalLLMProvider, getLocalLLM, isLocalLLMAvailable }

/**
 * LLM Client type
 */
export interface LLMClient {
  provider: LLMProvider | null
  isAvailable: boolean
  summarize: (text: string, options?: SummarizeOptions) => Promise<SummarizeResult>
}

/**
 * Create an LLM client
 * Returns a local client if available, null otherwise
 */
export async function getLLMClient(config: LocalLLMConfig = {}): Promise<LLMClient> {
  const localProvider = getLocalLLM(config)
  const isAvailable = await localProvider.isAvailable()

  return {
    provider: isAvailable ? localProvider : null,
    isAvailable,
    summarize: async (text: string, options: SummarizeOptions = {}) => {
      if (!isAvailable) {
        throw new Error('No LLM provider available. Please ensure Ollama or LM Studio is running.')
      }
      return localProvider.summarize(text, options)
    }
  }
}

/**
 * Summarize URL content using local LLM
 * This is a convenience function for the learning URL feature
 */
export async function summarizeURLContent(
  content: string,
  options: SummarizeOptions = {}
): Promise<SummarizeResult> {
  const client = await getLLMClient()

  if (!client.isAvailable) {
    throw new Error('Local LLM is not available. Please start Ollama or LM Studio.')
  }

  return client.summarize(content, options)
}

/**
 * Parse structured summary from LLM response
 * Extracts WHAT, HOW, IMPACT sections from the summary
 */
export function parseStructuredSummary(summary: string): {
  what: string
  how: string
  impact: string
  raw: string
} {
  const result = {
    what: '',
    how: '',
    impact: '',
    raw: summary
  }

  // Try to extract structured sections
  const whatMatch = summary.match(/(?:WHAT|What|what)[:\s]*([\s\S]*?)(?=(?:HOW|How|how|$))/i)
  const howMatch = summary.match(/(?:HOW|How|how)[:\s]*([\s\S]*?)(?=(?:IMPACT|Impact|impact|$))/i)
  const impactMatch = summary.match(/(?:IMPACT|Impact|impact)[:\s]*([\s\S]*?)$/i)

  if (whatMatch) result.what = whatMatch[1].trim()
  if (howMatch) result.how = howMatch[1].trim()
  if (impactMatch) result.impact = impactMatch[1].trim()

  // If no structured sections found, use the whole summary as 'what'
  if (!result.what && !result.how && !result.impact) {
    result.what = summary.trim()
  }

  return result
}
