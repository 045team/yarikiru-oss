/**
 * Code Quality Rules Types
 *
 * Types for code quality checking rules used in AI review functionality.
 */

export type RuleCategory =
  | 'security'
  | 'performance'
  | 'maintainability'
  | 'type-safety'
  | 'testing'
  | 'error-handling'

export type RuleSeverity = 'error' | 'warning' | 'info'

export interface CodeRule {
  id: string
  title: string
  category: RuleCategory
  severity: RuleSeverity
  description: string
  exampleBad?: string
  exampleGood?: string
  pattern?: string | RegExp // Regex pattern for detection (optional)
  isEnabled: boolean
}

export interface CodeRuleFinding {
  ruleId: string
  ruleTitle: string
  severity: RuleSeverity
  category: RuleCategory
  message: string
  filePath?: string
  lineNumber?: number
  codeSnippet?: string
}

export interface CodeReviewResult {
  rulesPassed: number
  rulesFailed: number
  findings: CodeRuleFinding[]
  reviewedAt: string
}

export interface UserCodeRule {
  id: string
  userId: string
  ruleId: string
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface ReviewHistoryEntry {
  id: string
  userId: string
  goalId: string | null
  reviewDate: string
  rulesPassed: number
  rulesFailed: number
  findings: CodeRuleFinding[]
}
