// ============================================
// Task Decomposer Unit Tests
// ============================================

import {
  decomposeGoal,
  refineDecomposition,
  processGoalDecomposition,
  calculateCompletion,
  getNextPendingTask,
  filterTasksByPriority,
  sortTasksByOrder,
  checkLLMServerAvailable,
  getAvailableModels,
  type TaskDecompositionInput,
  type GoalInput,
} from '../task-decomposer'

// Mock fetch for testing
global.fetch = jest.fn()

describe('Task Decomposer - Helper Functions', () => {
  const mockTasks = [
    {
      title: 'Task 1',
      estimatedMinutes: 45,
      subTasks: [
        { title: 'Subtask 1.1', estimatedMinutes: 15, completed: true },
        { title: 'Subtask 1.2', estimatedMinutes: 15, completed: true },
        { title: 'Subtask 1.3', estimatedMinutes: 15, completed: false },
      ],
      priority: 'high' as const,
      order: 1,
    },
    {
      title: 'Task 2',
      estimatedMinutes: 30,
      subTasks: [
        { title: 'Subtask 2.1', estimatedMinutes: 15, completed: false },
        { title: 'Subtask 2.2', estimatedMinutes: 15, completed: false },
      ],
      priority: 'medium' as const,
      order: 2,
    },
    {
      title: 'Task 3',
      estimatedMinutes: 15,
      subTasks: [
        { title: 'Subtask 3.1', estimatedMinutes: 15, completed: true },
      ],
      priority: 'low' as const,
      order: 3,
    },
  ]

  describe('calculateCompletion', () => {
    it('should calculate overall completion percentage', () => {
      // Total subtasks: 6
      // Completed: 4
      // Expected: 66.67%
      const result = calculateCompletion(mockTasks)
      expect(result).toBeCloseTo(66.67, 1)
    })

    it('should return 0 for empty tasks', () => {
      const result = calculateCompletion([])
      expect(result).toBe(0)
    })

    it('should return 100 when all subtasks are completed', () => {
      const allCompleted = mockTasks.map(task => ({
        ...task,
        subTasks: task.subTasks.map(st => ({ ...st, completed: true })),
      }))
      const result = calculateCompletion(allCompleted)
      expect(result).toBe(100)
    })
  })

  describe('getNextPendingTask', () => {
    it('should return the first task with uncompleted subtasks', () => {
      const result = getNextPendingTask(mockTasks)
      expect(result?.title).toBe('Task 1')
    })

    it('should return null when all tasks are completed', () => {
      const allCompleted = mockTasks.map(task => ({
        ...task,
        subTasks: task.subTasks.map(st => ({ ...st, completed: true })),
      }))
      const result = getNextPendingTask(allCompleted)
      expect(result).toBeNull()
    })

    it('should return null for empty tasks', () => {
      const result = getNextPendingTask([])
      expect(result).toBeNull()
    })
  })

  describe('filterTasksByPriority', () => {
    it('should filter high priority tasks', () => {
      const result = filterTasksByPriority(mockTasks, 'high')
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Task 1')
    })

    it('should filter medium priority tasks', () => {
      const result = filterTasksByPriority(mockTasks, 'medium')
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Task 2')
    })

    it('should filter low priority tasks', () => {
      const result = filterTasksByPriority(mockTasks, 'low')
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Task 3')
    })
  })

  describe('sortTasksByOrder', () => {
    it('should sort tasks by order index', () => {
      const unordered = [mockTasks[2], mockTasks[0], mockTasks[1]]
      const result = sortTasksByOrder(unordered)
      expect(result[0].order).toBe(1)
      expect(result[1].order).toBe(2)
      expect(result[2].order).toBe(3)
    })
  })
})

describe('Task Decomposer - Input Validation', () => {
  it('should require valid GoalInput', () => {
    const input: GoalInput = {
      userId: 'user-123',
      title: 'Test Goal',
      description: 'Test description',
      deadline: new Date(),
      availableHoursPerDay: 2,
    }

    expect(input.userId).toBeDefined()
    expect(input.title).toBeDefined()
    expect(input.description).toBeDefined()
    expect(input.deadline).toBeInstanceOf(Date)
    expect(input.availableHoursPerDay).toBeGreaterThan(0)
  })

  it('should accept optional context in GoalInput', () => {
    const input: GoalInput = {
      userId: 'user-123',
      title: 'Test Goal',
      description: 'Test description',
      deadline: new Date(),
      availableHoursPerDay: 2,
      context: 'Additional context',
    }

    expect(input.context).toBeDefined()
  })
})

describe('Task Decomposer - LLM Server Check', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('should return available=true when LLM server responds', async () => {
    process.env.LLM_PROVIDER = 'ollama'

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
    })

    const result = await checkLLMServerAvailable()
    expect(result.available).toBe(true)
    expect(result.provider).toBe('ollama')
  })

  it('should return available=false when LLM server is unreachable', async () => {
    process.env.LLM_PROVIDER = 'ollama'

    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('ECONNREFUSED')
    )

    const result = await checkLLMServerAvailable()
    expect(result.available).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('Task Decomposer - Get Available Models', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('should return models from Ollama', async () => {
    process.env.LLM_PROVIDER = 'ollama'

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        models: [
          { name: 'llama3.3' },
          { name: 'llama3.2' },
          { name: 'qwen2.5' },
        ],
      }),
    })

    const models = await getAvailableModels()
    expect(models).toEqual(['llama3.3', 'llama3.2', 'qwen2.5'])
  })

  it('should return models from OpenAI-compatible server', async () => {
    process.env.LLM_PROVIDER = 'lm-studio'

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: 'local-model' },
          { id: 'another-model' },
        ],
      }),
    })

    const models = await getAvailableModels()
    expect(models).toEqual(['local-model', 'another-model'])
  })

  it('should return empty array on error', async () => {
    process.env.LLM_PROVIDER = 'ollama'

    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    const models = await getAvailableModels()
    expect(models).toEqual([])
  })
})

describe('Task Decomposer - Decompose Goal', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    // Set default provider
    process.env.LLM_PROVIDER = 'ollama'
  })

  it('should call Ollama API with correct parameters', async () => {
    const mockResponse = {
      message: {
        content: JSON.stringify({
          mainTasks: [
            {
              title: 'Test Task',
              estimatedMinutes: 30,
              subTasks: [
                { title: 'Subtask 1', estimatedMinutes: 15, completed: false },
                { title: 'Subtask 2', estimatedMinutes: 15, completed: false },
              ],
              priority: 'high' as const,
              order: 1,
            },
          ],
          totalEstimatedMinutes: 30,
          assumptions: [],
        }),
      },
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const input: TaskDecompositionInput = {
      goal: 'Test goal',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      availableHours: 2,
    }

    const result = await decomposeGoal(input)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/chat'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    )

    expect(result.mainTasks).toHaveLength(1)
    expect(result.mainTasks[0].title).toBe('Test Task')
  })

  it('should handle JSON response with markdown code blocks', async () => {
    const mockResponse = {
      message: {
        content: `\`\`\`json
{
  "mainTasks": [
    {
      "title": "Test Task",
      "estimatedMinutes": 30,
      "subTasks": [
        {"title": "Subtask 1", "estimatedMinutes": 15, "completed": false},
        {"title": "Subtask 2", "estimatedMinutes": 15, "completed": false}
      ],
      "priority": "high",
      "order": 1
    }
  ],
  "totalEstimatedMinutes": 30,
  "assumptions": []
}
\`\`\``,
      },
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const input: TaskDecompositionInput = {
      goal: 'Test goal',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      availableHours: 2,
    }

    const result = await decomposeGoal(input)

    expect(result.mainTasks).toHaveLength(1)
  })

  it('should throw error when LLM server is unreachable', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('ECONNREFUSED')
    )

    const input: TaskDecompositionInput = {
      goal: 'Test goal',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      availableHours: 2,
    }

    await expect(decomposeGoal(input)).rejects.toThrow()
  })

  it('should work with LM Studio provider', async () => {
    process.env.LLM_PROVIDER = 'lm-studio'

    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              mainTasks: [
                {
                  title: 'Test Task',
                  estimatedMinutes: 30,
                  subTasks: [
                    { title: 'Subtask 1', estimatedMinutes: 15, completed: false },
                  ],
                  priority: 'high' as const,
                  order: 1,
                },
              ],
              totalEstimatedMinutes: 30,
              assumptions: [],
            }),
          },
        },
      ],
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const input: TaskDecompositionInput = {
      goal: 'Test goal',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      availableHours: 2,
    }

    const result = await decomposeGoal(input)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/chat/completions'),
      expect.any(Object)
    )
    expect(result.mainTasks).toHaveLength(1)
  })
})

describe('Task Decomposer - Refine Decomposition', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    process.env.LLM_PROVIDER = 'ollama'
  })

  it('should refine decomposition based on feedback', async () => {
    const originalDecomposition = {
      mainTasks: [
        {
          title: 'Original Task',
          estimatedMinutes: 30,
          subTasks: [
            { title: 'Subtask 1', estimatedMinutes: 15, completed: false },
          ],
          priority: 'high' as const,
          order: 1,
        },
      ],
      totalEstimatedMinutes: 30,
      assumptions: [],
      recommendedSchedule: {
        tasksPerDay: 2,
        hoursPerDay: 1,
        completionDate: new Date(),
      },
    }

    const mockResponse = {
      message: {
        content: JSON.stringify({
          mainTasks: [
            {
              title: 'Refined Task',
              estimatedMinutes: 45,
              subTasks: [
                { title: 'New Subtask 1', estimatedMinutes: 15, completed: false },
                { title: 'New Subtask 2', estimatedMinutes: 15, completed: false },
                { title: 'New Subtask 3', estimatedMinutes: 15, completed: false },
              ],
              priority: 'high' as const,
              order: 1,
            },
          ],
          totalEstimatedMinutes: 45,
          assumptions: [],
        }),
      },
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const result = await refineDecomposition(originalDecomposition, 'より詳細に分解してください')

    expect(result.mainTasks[0].title).toBe('Refined Task')
    expect(result.mainTasks[0].subTasks).toHaveLength(3)
  })
})
