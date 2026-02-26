// ============================================
// Task Decomposer with Local LLM Support
// Direct communication with Ollama, LM Studio, or any OpenAI-compatible server
// No MCP protocol required - simple HTTP API calls
// ============================================

// ============================================
// Type Definitions
// ============================================

export interface TaskDecompositionInput {
  goal: string
  deadline: Date
  availableHours: number
  userContext?: string
}

export interface SubTask {
  title: string
  estimatedMinutes: number
  completed: boolean
}

export interface MainTask {
  title: string
  estimatedMinutes: number
  subTasks: SubTask[]
  priority: 'high' | 'medium' | 'low'
  order: number
}

export interface TaskDecompositionOutput {
  mainTasks: MainTask[]
  totalEstimatedMinutes: number
  recommendedSchedule: {
    tasksPerDay: number
    hoursPerDay: number
    completionDate: Date
  }
  assumptions: string[]
}

export interface GoalInput {
  userId: string
  title: string
  description: string
  deadline: Date
  availableHoursPerDay: number
  context?: string
}

// ============================================
// LLM Provider Configuration
// ============================================

type LLMProvider = 'ollama' | 'lm-studio' | 'openai-compatible'

interface LLMConfig {
  provider: LLMProvider
  baseURL: string
  model: string
}

function getLLMConfig(): LLMConfig {
  const provider = (process.env.LLM_PROVIDER || 'ollama') as LLMProvider

  switch (provider) {
    case 'ollama':
      return {
        provider: 'ollama',
        baseURL: process.env.LLM_OLLAMA_BASE_URL || 'http://localhost:11434',
        model: process.env.LLM_OLLAMA_MODEL || 'llama3.3',
      }
    case 'lm-studio':
      return {
        provider: 'lm-studio',
        baseURL: process.env.LLM_LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
        model: process.env.LLM_LM_STUDIO_MODEL || 'local-model',
      }
    case 'openai-compatible':
      if (!process.env.LLM_OPENAI_COMPATIBLE_BASE_URL) {
        throw new Error('LLM_OPENAI_COMPATIBLE_BASE_URL is required for openai-compatible provider')
      }
      return {
        provider: 'openai-compatible',
        baseURL: process.env.LLM_OPENAI_COMPATIBLE_BASE_URL,
        model: process.env.LLM_OPENAI_COMPATIBLE_MODEL || 'model',
      }
    default:
      throw new Error(`Unknown LLM provider: ${provider}`)
  }
}

// ============================================
// Prompt Generation
// ============================================

function generateDecompositionPrompt(input: TaskDecompositionInput): string {
  const totalAvailableMinutes = input.availableHours * 60
  const daysUntilDeadline = Math.max(
    1,
    Math.ceil((input.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )

  return `あなたはプロジェクト管理とタスク分解の専門家です。ユーザーの目標を15分単位で実行可能なタスクに分解してください。

**目標:** ${input.goal}

**制約条件:**
- 期限: ${input.deadline.toLocaleDateString('ja-JP')}
- 1日あたりの利用可能時間: ${input.availableHours}時間
- 期限までの日数: ${daysUntilDeadline}日
- 総利用可能時間: ${totalAvailableMinutes}分
${input.userContext ? `- 追加コンテキスト: ${input.userContext}` : ''}

**指示:**
1. 各タスクを15分単位のサブタスクに分解してください
2. 優先度（高/中/低）を設定してください
3. タスク間の依存関係を考慮して順序を決めてください
4. 現実的な時間を見積もってください

**出力形式:**
以下のJSON形式で出力してください（余計な説明は不要）：

\`\`\`json
{
  "mainTasks": [
    {
      "title": "具体的なタスク名",
      "estimatedMinutes": 45,
      "subTasks": [
        {"title": "サブタスク1", "estimatedMinutes": 15, "completed": false},
        {"title": "サブタスク2", "estimatedMinutes": 15, "completed": false},
        {"title": "サブタスク3", "estimatedMinutes": 15, "completed": false}
      ],
      "priority": "high",
      "order": 1
    }
  ],
  "totalEstimatedMinutes": 120,
  "assumptions": ["前提条件1", "前提条件2"]
}
\`\`\`

重要:
- 各サブタスクは約15分で完了できるようにしてください
- タスクは優先度と依存関係に基づいて順序付けてください
- 総見積もり時間は利用可能時間内に収めてください`
}

// ============================================
// Ollama API Client
// ============================================

async function callOllama(
  config: LLMConfig,
  prompt: string
): Promise<TaskDecompositionOutput> {
  const response = await fetch(`${config.baseURL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  if (!data.message?.content) {
    throw new Error('Invalid Ollama response: missing message content')
  }

  return parseAndValidateResponse(data.message.content)
}

// ============================================
// LM Studio / OpenAI-Compatible API Client
// ============================================

async function callOpenAICompatible(
  config: LLMConfig,
  prompt: string
): Promise<TaskDecompositionOutput> {
  const response = await fetch(`${config.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content:
            'あなたはプロジェクト管理とタスク分解の専門家です。常に有効なJSON形式で回答してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    throw new Error(
      `LLM API error: ${response.status} ${response.statusText}`
    )
  }

  const data = await response.json()

  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid LLM response: missing message content')
  }

  return parseAndValidateResponse(data.choices[0].message.content)
}

// ============================================
// Response Parsing
// ============================================

function parseAndValidateResponse(content: string): TaskDecompositionOutput {
  // Extract JSON from markdown code blocks if present
  let jsonContent = content.trim()

  // Remove markdown code blocks
  const codeBlockMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonContent = codeBlockMatch[1].trim()
  }

  // Try to find JSON object
  const jsonObjectMatch = jsonContent.match(/\{[\s\S]*\}/)
  if (jsonObjectMatch) {
    jsonContent = jsonObjectMatch[0]
  }

  let parsed: any
  try {
    parsed = JSON.parse(jsonContent)
  } catch (error) {
    throw new Error(
      `Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}\n\nResponse content: ${jsonContent.slice(0, 500)}...`
    )
  }

  // Validate response structure
  if (!parsed.mainTasks || !Array.isArray(parsed.mainTasks)) {
    throw new Error('Invalid response: missing or invalid mainTasks array')
  }

  for (let i = 0; i < parsed.mainTasks.length; i++) {
    const task = parsed.mainTasks[i]
    if (!task.title) {
      throw new Error(`Invalid task at index ${i}: missing title`)
    }
    if (!task.subTasks || !Array.isArray(task.subTasks)) {
      throw new Error(`Invalid task at index ${i}: missing or invalid subTasks`)
    }
    if (!['high', 'medium', 'low'].includes(task.priority)) {
      task.priority = 'medium' // Default to medium if invalid
    }
  }

  return parsed as TaskDecompositionOutput
}

// ============================================
// Task Decomposition
// ============================================

/**
 * Decompose a user goal into manageable 15-minute tasks using local LLM
 */
export async function decomposeGoal(
  input: TaskDecompositionInput
): Promise<TaskDecompositionOutput> {
  const config = getLLMConfig()
  const prompt = generateDecompositionPrompt(input)

  try {
    // Call appropriate LLM provider
    let result: TaskDecompositionOutput

    switch (config.provider) {
      case 'ollama':
        result = await callOllama(config, prompt)
        break
      case 'lm-studio':
      case 'openai-compatible':
        result = await callOpenAICompatible(config, prompt)
        break
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`)
    }

    // Calculate recommended schedule
    const daysUntilDeadline = Math.max(
      1,
      Math.ceil((input.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    )
    const totalAvailableMinutes = input.availableHours * 60
    const minutesPerDay = totalAvailableMinutes / daysUntilDeadline
    const tasksPerDay = Math.ceil(minutesPerDay / 15)

    const completionDate = new Date()
    completionDate.setDate(completionDate.getDate() + daysUntilDeadline)

    return {
      ...result,
      recommendedSchedule: {
        tasksPerDay,
        hoursPerDay: Math.ceil(minutesPerDay / 60),
        completionDate,
      },
    }
  } catch (error) {
    console.error('Error calling LLM:', error)
    throw enhanceLMLError(error, config)
  }
}

/**
 * Validate and adjust task decomposition based on user feedback
 */
export async function refineDecomposition(
  originalDecomposition: TaskDecompositionOutput,
  feedback: string
): Promise<TaskDecompositionOutput> {
  const config = getLLMConfig()

  const prompt = `ユーザーから以下のフィードバックを受け取りました。タスク分解を修正してください。

**フィードバック:** ${feedback}

**現在のタスク分解:**
\`\`\`json
${JSON.stringify(originalDecomposition, null, 2)}
\`\`\`

修正したタスク分解を同じJSON形式で出力してください。`

  try {
    let result: TaskDecompositionOutput

    switch (config.provider) {
      case 'ollama':
        result = await callOllama(config, prompt)
        break
      case 'lm-studio':
      case 'openai-compatible':
        result = await callOpenAICompatible(config, prompt)
        break
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`)
    }

    return result
  } catch (error) {
    console.error('Error refining decomposition:', error)
    throw enhanceLMLError(error, config)
  }
}

// ============================================
// Error Handling
// ============================================

function enhanceLMLError(error: unknown, config: LLMConfig): Error {
  if (error instanceof Error) {
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      return new Error(
        `${config.provider.toUpperCase()}サーバーに接続できません。\n\n` +
        `設定済みのエンドポイント: ${config.baseURL}\n\n` +
        `解決策:\n` +
        getTroubleshootingTips(config.provider)
      )
    }
    return error
  }
  return new Error(`LLMサーバーでエラーが発生しました: ${String(error)}`)
}

function getTroubleshootingTips(provider: LLMProvider): string {
  switch (provider) {
    case 'ollama':
      return `- Ollamaがインストールされているか確認: brew install ollama\n` +
             `- モデルがダウンロードされているか確認: ollama list\n` +
             `- モデルをダウンロード: ollama pull llama3.3\n` +
             `- Ollamaサーバーが実行中か確認: ollama serve`
    case 'lm-studio':
      return `- LM Studioが起動しているか確認してください\n` +
             `- [Server]タブで「Start Server」をクリック\n` +
             `- ポート番号が1234であるか確認してください`
    case 'openai-compatible':
      return `- サーバーが実行中か確認してください\n` +
             `- ベースURLが正しいか確認してください\n` +
             `- モデル名が正しいか確認してください`
    default:
      return '- サーバーの設定を確認してください'
  }
}

// ============================================
// Goal Processing Pipeline
// ============================================

export interface GoalDecompositionResult {
  goalId: string
  decomposition: TaskDecompositionOutput
  metadata: {
    provider: LLMProvider
    model: string
    generatedAt: Date
    processingTimeMs: number
  }
}

/**
 * Complete pipeline for decomposing a goal and storing it
 */
export async function processGoalDecomposition(
  input: GoalInput
): Promise<GoalDecompositionResult> {
  const startTime = Date.now()

  try {
    const config = getLLMConfig()

    // Decompose the goal
    const decomposition = await decomposeGoal({
      goal: input.description,
      deadline: input.deadline,
      availableHours: input.availableHoursPerDay,
      userContext: input.context,
    })

    const processingTime = Date.now() - startTime

    // Generate a unique goal ID
    const goalId = `goal_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    return {
      goalId,
      decomposition,
      metadata: {
        provider: config.provider,
        model: config.model,
        generatedAt: new Date(),
        processingTimeMs: processingTime,
      },
    }
  } catch (error) {
    console.error('Error processing goal decomposition:', error)
    throw error
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate task completion percentage
 */
export function calculateCompletion(mainTasks: MainTask[]): number {
  if (mainTasks.length === 0) return 0

  let totalSubtasks = 0
  let completedSubtasks = 0

  for (const task of mainTasks) {
    for (const subtask of task.subTasks) {
      totalSubtasks++
      if (subtask.completed) {
        completedSubtasks++
      }
    }
  }

  return totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0
}

/**
 * Get next pending task
 */
export function getNextPendingTask(mainTasks: MainTask[]): MainTask | null {
  for (const task of mainTasks) {
    const hasPendingSubtask = task.subTasks.some((st) => !st.completed)
    if (hasPendingSubtask) {
      return task
    }
  }
  return null
}

/**
 * Filter tasks by priority
 */
export function filterTasksByPriority(
  mainTasks: MainTask[],
  priority: 'high' | 'medium' | 'low'
): MainTask[] {
  return mainTasks.filter((task) => task.priority === priority)
}

/**
 * Sort tasks by order
 */
export function sortTasksByOrder(mainTasks: MainTask[]): MainTask[] {
  return [...mainTasks].sort((a, b) => a.order - b.order)
}

/**
 * Check if LLM server is configured and available
 */
export async function checkLLMServerAvailable(): Promise<{
  available: boolean
  provider: LLMProvider | null
  error?: string
}> {
  try {
    const config = getLLMConfig()

    const response = await fetch(
      config.provider === 'ollama'
        ? `${config.baseURL}/api/tags`
        : `${config.baseURL}/models`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      }
    )

    return {
      available: response.ok,
      provider: config.provider,
    }
  } catch (error) {
    return {
      available: false,
      provider: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Get available models from LLM server
 */
export async function getAvailableModels(): Promise<string[]> {
  try {
    const config = getLLMConfig()

    if (config.provider === 'ollama') {
      const response = await fetch(`${config.baseURL}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) return []

      const data = await response.json()
      return data.models?.map((m: any) => m.name) || []
    } else {
      // OpenAI-compatible
      const response = await fetch(`${config.baseURL}/models`, {
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) return []

      const data = await response.json()
      return data.data?.map((m: any) => m.id) || []
    }
  } catch {
    return []
  }
}
