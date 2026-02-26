/**
 * Default Code Quality Rules
 *
 * Predefined rules for TypeScript/JavaScript code quality checks.
 */

import type { CodeRule } from '../types/code-rules'

export const DEFAULT_CODE_RULES: readonly CodeRule[] = [
  // ============================================
  // Security Rules
  // ============================================

  {
    id: 'sec_no_any_type',
    title: 'Avoid `any` Type',
    category: 'security',
    severity: 'error',
    description: 'Using `any` disables type checking and can lead to runtime errors. Use specific types or `unknown` with type guards.',
    exampleBad: 'function processData(data: any) { return data.value }',
    exampleGood: 'function processData(data: { value: string }) { return data.value }',
    pattern: /\b:\s*any\b/g,
    isEnabled: true,
  },
  {
    id: 'sec_no_console_log',
    title: 'No Console Log in Production',
    category: 'security',
    severity: 'warning',
    description: 'Console logs can expose sensitive information and should be removed in production code.',
    exampleBad: 'console.log(userData)',
    exampleGood: 'logger.info("User logged in", { userId })',
    pattern: /console\.(log|debug|info|warn|error)\(/g,
    isEnabled: true,
  },
  {
    id: 'sec_no_hardcoded_secrets',
    title: 'No Hardcoded Secrets',
    category: 'security',
    severity: 'error',
    description: 'Never hardcode API keys, passwords, or tokens. Use environment variables.',
    exampleBad: "const apiKey = 'sk_live_12345'",
    exampleGood: "const apiKey = process.env.API_KEY",
    pattern: /(api_key|secret|password|token)\s*=\s*['"`](?!process\.env)[^'"`]+['"`]/gi,
    isEnabled: true,
  },
  {
    id: 'sec_sql_injection_risk',
    title: 'SQL Injection Risk',
    category: 'security',
    severity: 'error',
    description: 'Always use parameterized queries to prevent SQL injection.',
    exampleBad: `db.execute("SELECT * FROM users WHERE id = " + userId)`,
    exampleGood: 'db.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [userId] })',
    isEnabled: true,
  },

  // ============================================
  // Performance Rules
  // ============================================

  {
    id: 'perf_no_use_effect_misuse',
    title: 'Proper useEffect Dependencies',
    category: 'performance',
    severity: 'warning',
    description: 'Missing dependencies in useEffect can cause stale closures or infinite loops.',
    exampleBad: 'useEffect(() => { setData(value) }, []) // missing `value`',
    exampleGood: 'useEffect(() => { setData(value) }, [value])',
    isEnabled: true,
  },
  {
    id: 'perf_avoid_chaining_async',
    title: 'Avoid Chaining async/await',
    category: 'performance',
    severity: 'warning',
    description: 'Use Promise.all() for concurrent async operations instead of sequential awaits.',
    exampleBad: 'const a = await fetchA(); const b = await fetchB();',
    exampleGood: 'const [a, b] = await Promise.all([fetchA(), fetchB()]);',
    isEnabled: true,
  },
  {
    id: 'perf_memo_expensive',
    title: 'Memoize Expensive Computations',
    category: 'performance',
    severity: 'info',
    description: 'Use useMemo for expensive calculations to avoid unnecessary recomputation.',
    exampleBad: 'const sorted = items.sort((a, b) => a.value - b.value)',
    exampleGood: 'const sorted = useMemo(() => [...items].sort((a, b) => a.value - b.value), [items])',
    isEnabled: true,
  },

  // ============================================
  // Maintainability Rules
  // ============================================

  {
    id: 'maint_small_functions',
    title: 'Keep Functions Small',
    category: 'maintainability',
    severity: 'warning',
    description: 'Functions should be under 50 lines. If longer, consider breaking into smaller functions.',
    exampleBad: 'function processEverything() { /* 100+ lines */ }',
    exampleGood: 'function processEverything() { validate(); transform(); save(); }',
    isEnabled: true,
  },
  {
    id: 'maint_descriptive_names',
    title: 'Use Descriptive Names',
    category: 'maintainability',
    severity: 'info',
    description: 'Variable and function names should clearly describe their purpose.',
    exampleBad: 'const d = new Date()',
    exampleGood: 'const currentDate = new Date()',
    isEnabled: true,
  },
  {
    id: 'maint_avoid_magic_numbers',
    title: 'Avoid Magic Numbers',
    category: 'maintainability',
    severity: 'warning',
    description: 'Extract magic numbers into named constants with semantic meaning.',
    exampleBad: 'if (status === 200) { /* ... */ }',
    exampleGood: 'const HTTP_OK = 200; if (status === HTTP_OK) { /* ... */ }',
    pattern: /\b(?!0|1)\d{2,}\b/g,
    isEnabled: true,
  },
  {
    id: 'maint_drY_principle',
    title: 'Follow DRY Principle',
    category: 'maintainability',
    severity: 'warning',
    description: 'Don\'t Repeat Yourself. Extract duplicated code into reusable functions.',
    exampleBad: '/* Same logic repeated 3 times */',
    exampleGood: 'function reusableLogic() { /* shared logic */ }',
    isEnabled: true,
  },

  // ============================================
  // Type Safety Rules
  // ============================================

  {
    id: 'type_strict_null_checks',
    title: 'Handle Null/Undefined Explicitly',
    category: 'type-safety',
    severity: 'error',
    description: 'Always handle potential null/undefined values with proper type guards or optional chaining.',
    exampleBad: 'const name = user.profile.name',
    exampleGood: 'const name = user.profile?.name ?? "Anonymous"',
    isEnabled: true,
  },
  {
    id: 'type_return_types',
    title: 'Explicit Return Types',
    category: 'type-safety',
    severity: 'info',
    description: 'Define explicit return types for exported functions for better API documentation.',
    exampleBad: 'export function getData() { return data }',
    exampleGood: 'export function getData(): ResponseType { return data }',
    isEnabled: true,
  },
  {
    id: 'type_no_type_assertion',
    title: 'Avoid Type Assertions',
    category: 'type-safety',
    severity: 'warning',
    description: 'Type assertions (`as`) bypass type checking. Use type guards or proper typing.',
    exampleBad: 'const value = data as UserData',
    exampleGood: 'const value: UserData = isUserData(data) ? data : defaultData',
    pattern: /\s+as\s+\w+/g,
    isEnabled: true,
  },

  // ============================================
  // Testing Rules
  // ============================================

  {
    id: 'test_coverage_critical_paths',
    title: 'Test Critical Paths',
    category: 'testing',
    severity: 'warning',
    description: 'Critical business logic should have corresponding test coverage.',
    exampleBad: '/* No tests for payment processing */',
    exampleGood: 'describe("PaymentProcessor", () => { /* tests */ })',
    isEnabled: true,
  },
  {
    id: 'test_edge_cases',
    title: 'Test Edge Cases',
    category: 'testing',
    severity: 'info',
    description: 'Include tests for edge cases like empty inputs, null values, and boundary conditions.',
    exampleBad: '/* Only tests happy path */',
    exampleGood: 'test("handles empty array", () => { /* edge case */ })',
    isEnabled: true,
  },

  // ============================================
  // Error Handling Rules
  // ============================================

  {
    id: 'err_async_error_handling',
    title: 'Handle Async Errors',
    category: 'error-handling',
    severity: 'error',
    description: 'Always handle promise rejections with try/catch or .catch().',
    exampleBad: 'const data = await fetchData()',
    exampleGood: 'try { const data = await fetchData() } catch (error) { handleError(error) }',
    isEnabled: true,
  },
  {
    id: 'err_meaningful_errors',
    title: 'Meaningful Error Messages',
    category: 'error-handling',
    severity: 'warning',
    description: 'Throw errors with descriptive messages that help debugging.',
    exampleBad: 'throw new Error("Error")',
    exampleGood: 'throw new Error(`Failed to fetch user ${userId}: ${response.status}`)',
    isEnabled: true,
  },
  {
    id: 'err_no_silent_catch',
    title: 'No Silent Catch Blocks',
    category: 'error-handling',
    severity: 'error',
    description: 'Empty catch blocks swallow errors. At least log the error.',
    exampleBad: 'try { /* ... */ } catch (e) {}',
    exampleGood: 'try { /* ... */ } catch (e) { console.error("Operation failed:", e) }',
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
    isEnabled: true,
  },
] as const

export function getDefaultRules(): CodeRule[] {
  return DEFAULT_CODE_RULES.map((rule) => ({ ...rule })) as CodeRule[]
}

export function getRulesByCategory(category: string): CodeRule[] {
  return getDefaultRules().filter((rule) => rule.category === category)
}

export function getRuleById(id: string): CodeRule | null {
  return getDefaultRules().find((rule) => rule.id === id) ?? null
}

export function getCategories(): readonly string[] {
  return ['security', 'performance', 'maintainability', 'type-safety', 'testing', 'error-handling'] as const
}
