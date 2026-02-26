#!/usr/bin/env node
/**
 * YARIKIRU MCP Server (SaaS Architecture)
 *
 * This server implements the Model Context Protocol to allow Claude Code / Cursor
 * to interact with YARIKIRU's task management system safely via API Keys.
 *
 * Usage:
 *   node src/mcp-server/index.mjs
 *
 * Environment variables required:
 *   - YARIKIRU_API_KEY: Personal Access Token generated from the YARIKIRU web UI
 *   - YARIKIRU_API_URL: (Optional) defaults to https://yarikiru.com/api/mcp
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'

// Import utilities
import { logRequest, logResponse, logError, logWarning, logInfo, createTimer, measure } from './utils/logger.js'
import { createDataFetcher } from './utils/data-fetcher.js'

// Load .env.local file for direct node execution (useful for local dev)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '../..')
const envPath = join(projectRoot, '.env.local')

try {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const firstEq = trimmed.indexOf('=')
      const key = trimmed.slice(0, firstEq).trim()
      let value = trimmed.slice(firstEq + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (value && !process.env[key]) {
        process.env[key] = value
      }
    }
  }
} catch (err) {
  // Ignore
}

// ============================================
// Error Handling & Retry Utilities
// ============================================

class YarikiruError extends Error {
  constructor(message, type, details) {
    super(message);
    this.name = 'YarikiruError';
    this.type = type; // 'network' | 'database' | 'api' | 'validation'
    this.details = details;
  }
}

async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  let retryCount = 0;
  let delay = initialDelay;

  while (retryCount < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      retryCount++;
      if (retryCount >= maxRetries) throw error;

      console.error(`[YARIKIRU MCP] Retry ${retryCount}/${maxRetries} after ${delay}ms: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

async function withTimeout(promise, timeoutMs, operation) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`[YARIKIRU MCP] ${operation} timeout after ${timeoutMs}ms`)), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}

// ============================================
// Parallel Execution Control
// ============================================

/**
 * ConcurrencyLimiter - Controls parallel execution to prevent resource exhaustion
 */
class ConcurrencyLimiter {
  constructor(maxConcurrent = 5) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }

  /**
   * Execute a function with concurrency control
   * @param {Function} fn - Async function to execute
   * @returns {Promise<any>} Result of the function
   */
  async execute(fn) {
    while (this.running >= this.maxConcurrent) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      const next = this.queue.shift();
      if (next) next();
    }
  }

  /**
   * Execute multiple functions in parallel with concurrency control
   * @param {Function[]} fns - Array of async functions
   * @returns {Promise<any[]>} Array of results
   */
  async executeAll(fns) {
    return Promise.all(fns.map(fn => this.execute(fn)));
  }

  /**
   * Get current statistics
   * @returns {object} Stats object
   */
  getStats() {
    return {
      running: this.running,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      available: this.maxConcurrent - this.running
    };
  }
}

/**
 * ConnectionPool - Manages database connections efficiently
 */
class ConnectionPool {
  constructor(options = {}) {
    this.maxConnections = options.maxConnections ?? 10;
    this.timeout = options.timeout ?? 10000;
    this.idleTimeout = options.idleTimeout ?? 30000;
    this.connections = [];
    this.acquired = new Set();
    this.lastUsed = new Map();
  }

  /**
   * Acquire a connection from the pool
   * @returns {Promise<object>} Database connection
   */
  async acquire() {
    const startTime = Date.now();

    while (this.connections.length < this.maxConnections) {
      const conn = this.connections.find(c => !this.acquired.has(conn));
      if (conn) {
        this.acquired.add(conn);
        this.lastUsed.set(conn, Date.now());
        return conn;
      }
      break;
    }

    if (this.acquired.size >= this.maxConnections) {
      throw new Error('Connection pool exhausted');
    }

    // Create new connection
    const db = await getLocalDb();
    this.connections.push(db);
    this.acquired.add(db);
    this.lastUsed.set(db, Date.now());
    return db;
  }

  /**
   * Release a connection back to the pool
   * @param {object} conn - Connection to release
   */
  release(conn) {
    this.acquired.delete(conn);
    this.lastUsed.set(conn, Date.now());
  }

  /**
   * Get pool statistics
   * @returns {object} Stats object
   */
  getStats() {
    return {
      total: this.connections.length,
      acquired: this.acquired.size,
      available: this.connections.length - this.acquired.size,
      maxConnections: this.maxConnections
    };
  }

  /**
   * Clean up idle connections
   */
  cleanupIdle() {
    const now = Date.now();
    for (const conn of this.connections) {
      if (!this.acquired.has(conn)) {
        const lastUsed = this.lastUsed.get(conn) ?? 0;
        if (now - lastUsed > this.idleTimeout) {
          const idx = this.connections.indexOf(conn);
          if (idx > -1) {
            this.connections.splice(idx, 1);
            this.lastUsed.delete(conn);
          }
        }
      }
    }
  }
}

// Global instances
const concurrencyLimiter = new ConcurrencyLimiter(5);
let dataFetcher = null;

/**
 * Get the DataFetcher instance (lazy initialization)
 * @returns {DataFetcher} DataFetcher instance
 */
function getDataFetcher() {
  if (!dataFetcher) {
    dataFetcher = createDataFetcher(callYarikiruApi, {
      cacheTTL: 5000,
      maxCacheSize: 100
    });
  }
  return dataFetcher;
}

// ============================================
// API Client (Hybrid Local / Cloud)
// ============================================

const YARIKIRU_DIR = join(homedir(), '.yarikiru')
const CREDENTIALS_PATH = join(YARIKIRU_DIR, 'credentials.json')

// Timeout configurations
const API_TIMEOUT = 30000; // 30 seconds for API requests
const DB_TIMEOUT = 10000;  // 10 seconds for database operations

let apiKey = process.env.YARIKIRU_API_KEY || process.env.VITE_YARIKIRU_API_KEY
if (!apiKey && existsSync(CREDENTIALS_PATH)) {
  try {
    const creds = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8'))
    apiKey = creds.apiKey
  } catch (e) {
    // Ignore parse errors
  }
}

const isLocalMode = !apiKey;
// Fallback to localhost for development if not provided
const API_URL = process.env.YARIKIRU_API_URL || 'http://localhost:3000/api/mcp'

let localDb = null;
async function getLocalDb() {
  if (!localDb) {
    // Wrap DB initialization with timeout
    const initDb = async () => {
      const { getTursoClient: createClient } = await import('../lib/turso/client')
      if (!existsSync(YARIKIRU_DIR)) {
        import('fs').then(fs => fs.mkdirSync(YARIKIRU_DIR, { recursive: true })).catch(() => { })
      }
      const dbPath = join(YARIKIRU_DIR, 'local.db')
      // Ensure dir exists or let libsql handle it if it does
      const db = createClient({ url: `file:${dbPath}` })

      // Auto-apply schema migrations on first connection
      const { ensureLocalDbSchema } = await import('../lib/mcp/local-db-init.ts')
      await ensureLocalDbSchema(db)
      return db;
    };

    localDb = await withTimeout(initDb(), DB_TIMEOUT, 'Database initialization');
  }
  return localDb;
}

async function callYarikiruApi(operation, args) {
  const timer = createTimer(operation);
  logRequest(operation, args);

  try {
    let result;

    if (isLocalMode) {
      result = await concurrencyLimiter.execute(async () => {
        try {
          const db = await getLocalDb();
          // Load the shared TS operations. Requires `npx tsx` to run.
          let ops;
          try {
            ops = await import('../lib/mcp/core-operations.ts');
          } catch (e) {
            // Fallback for when running in compiled JS, or try with .js
            ops = await import('../lib/mcp/core-operations.js').catch(() => {
              throw new YarikiruError(
                "Could not import core operations. Ensure MCP server runs via 'tsx'.",
                'database',
                { originalError: e?.message }
              );
            });
          }

          const fnName = 'mcp' + operation.charAt(0).toUpperCase() + operation.slice(1);
          if (typeof ops[fnName] !== 'function') {
            throw new YarikiruError(
              `Unsupported local operation: ${operation}`,
              'validation',
              { operation }
            );
          }

          const localUserId = 'local-user'; // Default local user ID

          // Apply timeout and retry for local operations
          const localOp = async () => {
            return await withTimeout(
              ops[fnName](db, args || {}, localUserId),
              DB_TIMEOUT,
              `Local operation: ${operation}`
            );
          };

          return await retryWithBackoff(localOp, 2, 500);
        } catch (error) {
          console.error(`[YARIKIRU MCP LOCAL] Failed:`, error.message)
          throw error instanceof YarikiruError ? error : new YarikiruError(
            error.message,
            'database',
            { operation, args }
          );
        }
      });
    } else {
      // Cloud Proxy Mode with retry and timeout
      result = await concurrencyLimiter.execute(async () => {
        const cloudOp = async () => {
          try {
            const response = await withTimeout(
              fetch(API_URL, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({ operation, args })
              }),
              API_TIMEOUT,
              `API request: ${operation}`
            );

            const result = await response.json();

            if (!response.ok) {
              throw new YarikiruError(
                `API Error (${response.status}): ${result.error || JSON.stringify(result)}`,
                'api',
                { status: response.status, body: result }
              );
            }

            return result.data;
          } catch (error) {
            // Convert timeout to YarikiruError
            if (error.message.includes('timeout')) {
              throw new YarikiruError(error.message, 'network', { operation, args });
            }
            throw error;
          }
        };

        return await retryWithBackoff(cloudOp, 3, 1000);
      });

      try {
        return await result;
      } catch (error) {
        console.error(`[YARIKIRU MCP CLOUD] Request Failed:`, error.message);
        throw error instanceof YarikiruError ? error : new YarikiruError(
          error.message,
          'network',
          { operation, args }
        );
      }
    }

    timer.end(result);
    return result;
  } catch (error) {
    logError(operation, error);
    throw error;
  }
}

// ============================================
// MCP Server Setup
// ============================================

import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

async function main() {
  const args = process.argv.slice(2);
  const portArg = args.find(a => a.startsWith('--port='));
  const transportArg = args.find(a => a.startsWith('--transport='));

  const requestedPort = portArg ? parseInt(portArg.split('=')[1]) : null;
  const transportType = transportArg ? transportArg.split('=')[1] : 'stdio';

  console.error('[YARIKIRU MCP] Starting YARIKIRU MCP Client Server...');
  if (isLocalMode) {
    console.error('[YARIKIRU MCP] Running in LOCAL-FIRST MODE (SQLite)');
  } else {
    console.error(`[YARIKIRU MCP] Running in CLOUD-SYNC MODE. Connecting to: ${API_URL}`);
  }

  const server = new McpServer(
    {
      name: 'yarikiru-mcp-server',
      version: '1.2.0',
    },
    { capabilities: { tools: {} } }
  );

  // -----------------------------------------------------
  // 0. Parallel Operations (Batch Fetching)
  // -----------------------------------------------------

  server.registerTool('fetch_goals_batch', {
    title: 'Fetch Multiple Goals in Parallel',
    description: 'Fetch multiple goals efficiently in a single batch operation with caching',
    inputSchema: {
      goalIds: z.array(z.string()).describe('Array of goal IDs to fetch'),
      useCache: z.boolean().optional().describe('Whether to use cached data (default: true)'),
    }
  }, async (args) => {
    const fetcher = getDataFetcher();
    const goals = await fetcher.fetchGoals(args.goalIds, args.useCache ?? true);
    return {
      content: [{ type: 'text', text: JSON.stringify(goals, null, 2) }],
      structuredContent: { goals, count: goals.length }
    };
  });

  server.registerTool('fetch_projects_cached', {
    title: 'Fetch All Projects (Cached)',
    description: 'Fetch all projects with intelligent caching for better performance',
    inputSchema: {
      useCache: z.boolean().optional().describe('Whether to use cached data (default: true)'),
    }
  }, async (args) => {
    const fetcher = getDataFetcher();
    const projects = await fetcher.fetchAllProjects(args.useCache ?? true);
    return {
      content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }],
      structuredContent: { projects, count: projects.length }
    };
  });

  server.registerTool('clear_cache', {
    title: 'Clear Data Fetcher Cache',
    description: 'Clear the internal cache for data fetching operations',
    inputSchema: {
      pattern: z.string().optional().describe('Optional pattern to clear (e.g., "goal:", "project:"). If not provided, clears all cache.'),
    }
  }, async (args) => {
    const fetcher = getDataFetcher();
    if (args.pattern) {
      fetcher.clearCachePattern(args.pattern);
    } else {
      fetcher.clearCache();
    }
    const stats = fetcher.getCacheStats();
    return {
      content: [{ type: 'text', text: `Cache cleared. Current stats: ${JSON.stringify(stats, null, 2)}` }],
      structuredContent: { stats, cleared: true }
    };
  });

  server.registerTool('get_concurrency_stats', {
    title: 'Get Concurrency Statistics',
    description: 'Get current statistics about parallel execution and resource usage',
    inputSchema: {}
  }, async (args) => {
    const concurrencyStats = concurrencyLimiter.getStats();
    const cacheStats = getDataFetcher().getCacheStats();
    return {
      content: [{ type: 'text', text: JSON.stringify({ concurrency: concurrencyStats, cache: cacheStats }, null, 2) }],
      structuredContent: { concurrency: concurrencyStats, cache: cacheStats }
    };
  });

  // -----------------------------------------------------
  // 1. Goal Management
  // -----------------------------------------------------

  server.registerTool('list_goals', {
    title: 'List Goals', description: 'List all goals for the authenticated user',
    inputSchema: {},
  }, async (args) => {
    const result = await callYarikiruApi('listGoals', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('get_goal', {
    title: 'Get Goal', description: 'Get a single goal with its associated tasks',
    inputSchema: { goalId: z.string().describe('The goal ID') },
  }, async (args) => {
    const result = await callYarikiruApi('getGoal', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('create_goal', {
    title: 'Create Goal', description: 'Create a new goal in YARIKIRU',
    inputSchema: {
      title: z.string().describe('Goal title'),
      description: z.string().optional().describe('Goal description (optional)'),
      deadline: z.string().optional().describe('Deadline date (ISO format, optional)'),
    },
  }, async (args) => {
    const result = await callYarikiruApi('createGoal', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('start_goal_work', {
    title: 'Start Working on a Goal', description: 'Starts time tracking and sets goal to in_progress',
    inputSchema: { goalId: z.string().describe('The goal ID') },
  }, async (args) => {
    const result = await callYarikiruApi('startGoalWork', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('complete_goal_work', {
    title: 'Complete Goal Work', description: 'Stops time tracking, saves learning, and sets goal to done',
    inputSchema: {
      goalId: z.string().describe('The goal ID'),
      learning: z.string().optional().describe('What you learned while doing this task, reusable patterns, or thoughts'),
      logId: z.string().optional().describe('The work log ID (if obtained from start_goal_work)'),
    },
  }, async (args) => {
    const result = await callYarikiruApi('completeGoalWork', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  // -----------------------------------------------------
  // 2. Task / Subtask Management
  // -----------------------------------------------------

  const SubTaskSchema = z.object({
    title: z.string(),
    estimatedMinutes: z.number().optional(),
  })

  const TaskSchema = z.object({
    title: z.string(),
    estimatedMinutes: z.number().optional(),
    priority: z.enum(['high', 'medium', 'low']).optional(),
    subTasks: z.array(SubTaskSchema).optional(),
  })

  server.registerTool('create_tasks', {
    title: 'Create Tasks for Goal', description: 'Create decomposed tasks / subtasks for a goal',
    inputSchema: {
      goalId: z.string().describe('The targeted goal ID'),
      tasks: z.array(TaskSchema).describe('Array of decomposed tasks'),
    },
  }, async (args) => {
    const result = await callYarikiruApi('createTasks', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('update_task_status', {
    title: 'Update Task Status', description: 'Mark a task / subtask as completed or uncompleted',
    inputSchema: {
      taskId: z.string().describe('The task or subtask ID (often starts with s_)'),
      isCompleted: z.boolean().describe('True if completed, false if not'),
    },
  }, async (args) => {
    const result = await callYarikiruApi('updateTaskStatus', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('list_projects', {
    title: 'List Projects', description: 'Lists all projects, goals, and subtasks (hierarchical)',
    inputSchema: {},
  }, async (args) => {
    const result = await callYarikiruApi('listProjects', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('sync_planning', {
    title: 'Sync GSD Planning', description: 'Reads the .planning directory created by Get-Shit-Done workflows and maps/synchronizes them to the Yarikiru DB.',
    inputSchema: {},
  }, async (args) => {
    const planningDir = join(process.cwd(), '.planning')
    if (!existsSync(planningDir)) return { content: [{ type: 'text', text: 'No .planning directory found in CWD' }] }

    let projectTitle = 'GSD Project'
    let projectDescription = ''
    const projectFile = join(planningDir, 'PROJECT.md')
    if (existsSync(projectFile)) {
      projectDescription = readFileSync(projectFile, 'utf8')
      const titleMatch = projectDescription.match(/^#\s+(.+)$/m)
      if (titleMatch) projectTitle = titleMatch[1]
    }
    const projectData = { title: projectTitle, description: projectDescription }

    const goalsData = []
    const phasesDir = join(planningDir, 'phases')
    if (existsSync(phasesDir)) {
      const phases = readdirSync(phasesDir).filter(f => statSync(join(phasesDir, f)).isDirectory())
      for (const phaseName of phases) {
        const phasePath = join(phasesDir, phaseName)
        let phaseDesc = ''
        const tasks = []
        const planFile = readdirSync(phasePath).find(f => f.endsWith('-PLAN.md'))
        if (planFile) {
          const planContent = readFileSync(join(phasePath, planFile), 'utf8')
          phaseDesc = planContent
          const taskMatches = planContent.match(/<task>([\s\S]*?)<\/task>/g)
          if (taskMatches) {
            for (const tMatch of taskMatches) {
              const content = tMatch.replace(/<\/?task>/g, '').trim()
              tasks.push({ label: content.substring(0, 100), status: 'todo' })
            }
          } else {
            const checkMatches = [...planContent.matchAll(/^- \[(x| )\] (.+)$/gm)]
            for (const m of checkMatches) {
              tasks.push({ label: m[2], status: m[1] === 'x' ? 'done' : 'todo' })
            }
          }
        }
        goalsData.push({ title: phaseName, description: phaseDesc, tasks })
      }
    } else {
      const roadmapFile = join(planningDir, 'ROADMAP.md')
      if (existsSync(roadmapFile)) {
        goalsData.push({ title: 'Phase from ROADMAP', description: readFileSync(roadmapFile, 'utf8'), tasks: [] })
      }
    }

    const result = await callYarikiruApi('syncPlanning', { projectData, goalsData })
    return { content: [{ type: 'text', text: `Sync successful. Inserted/Updated project ${result.projectId}.` }], structuredContent: result }
  })

  server.registerTool('update_goal_subtasks', {
    title: 'Update Goal Subtasks', description: 'Replace the uncompleted subtasks of a goal with a new list of subtasks (used when re-planning or breaking down a goal)',
    inputSchema: {
      goalId: z.string().describe('The target goal ID'),
      tasks: z.array(z.string()).describe('Array of NEW string labels for the subtasks'),
    },
  }, async (args) => {
    const result = await callYarikiruApi('updateGoalSubtasks', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('decompose_goal', {
    title: 'Decompose Goal', description: 'AI-powered task decomposition for a goal. Breaks down a goal into 15-minute tasks and automatically creates a task graph.',
    inputSchema: {
      goalId: z.string().describe('The goal ID to decompose'),
      goalTitle: z.string().describe('The goal title'),
      goalDescription: z.string().optional().describe('The goal description (optional)'),
      availableHours: z.number().optional().describe('Available hours per day (default: 8)'),
    },
  }, async (args) => {
    const result = await callYarikiruApi('decomposeGoal', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  // -----------------------------------------------------
  // 3. Learning & Web Features
  // -----------------------------------------------------

  server.registerTool('add_learning_url', {
    title: 'Add Learning URL', description: 'Save a technical article, tweet, or resource URL for later analysis',
    inputSchema: {
      url: z.string().describe('The URL to save'),
      title: z.string().optional(),
      what: z.string().optional().describe('What is this about?'),
      how: z.string().optional().describe('How to use it?'),
      impact: z.string().optional().describe('Why is it impactful?'),
    },
  }, async (args) => {
    const result = await callYarikiruApi('addLearningUrl', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('generate_article_from_learnings', {
    title: 'Generate Article Data', description: 'Reads saved learning URLs (status filtered) to be converted into an article',
    inputSchema: {
      statusType: z.enum(['unread', 'summarized', 'articled', 'all']).default('summarized').describe('Filter by status'),
    }
  }, async (args) => {
    const result = await callYarikiruApi('generateArticleFromLearnings', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('mark_learnings_articled', {
    title: 'Mark Learnings Articled', description: 'Change the status of multiple learning items to "articled" (completed)',
    inputSchema: {
      learningIds: z.array(z.string()).describe('Array of learning item IDs (li_...)'),
    }
  }, async (args) => {
    const result = await callYarikiruApi('markLearningsArticled', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  // -----------------------------------------------------
  // 4. legacy urgent/stats features (may be deprecated but kept for compat)
  // -----------------------------------------------------

  server.registerTool('get_stats', {
    title: 'Get Stats', description: 'Database statistics',
    inputSchema: {}
  }, async (args) => {
    const result = await callYarikiruApi('getStats', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('list_urgent_tasks', {
    title: 'List Urgent Tasks', description: 'List priority generated tasks',
    inputSchema: {}
  }, async (args) => {
    const result = await callYarikiruApi('listUrgentTasks', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('toggle_task_urgent', {
    title: 'Toggle Task Urgent', description: 'Toggle urgent flag for a generated task',
    inputSchema: {
      taskId: z.string(),
      isUrgent: z.boolean()
    }
  }, async (args) => {
    const result = await callYarikiruApi('toggleTaskUrgent', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  // -----------------------------------------------------
  // 5. Code Quality Rules
  // -----------------------------------------------------

  server.registerTool('list_code_rules', {
    title: 'List Code Rules', description: 'List all available code quality rules with user customizations',
    inputSchema: {
      category: z.string().optional().describe('Filter by category (security, performance, maintainability, type-safety, testing, error-handling)'),
    }
  }, async (args) => {
    const result = await callYarikiruApi('listCodeRules', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('update_code_rule', {
    title: 'Update Code Rule', description: 'Enable or disable a specific code quality rule',
    inputSchema: {
      ruleId: z.string().describe('The rule ID to update'),
      isEnabled: z.boolean().describe('Whether the rule should be enabled'),
    }
  }, async (args) => {
    const result = await callYarikiruApi('updateCodeRule', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('run_code_review', {
    title: 'Run Code Review', description: 'Run a code quality review against enabled rules (lightweight static analysis)',
    inputSchema: {
      code: z.string().describe('The code to review'),
      language: z.string().optional().describe('Programming language (default: typescript)'),
      filePath: z.string().optional().describe('File path for context (optional)'),
    }
  }, async (args) => {
    const result = await callYarikiruApi('runCodeReview', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('get_review_history', {
    title: 'Get Review History', description: 'Get historical code review results',
    inputSchema: {
      limit: z.number().optional().describe('Maximum number of results (default: 50)'),
      goalId: z.string().optional().describe('Filter by goal ID (optional)'),
    }
  }, async (args) => {
    const result = await callYarikiruApi('getReviewHistory', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('reset_code_rules', {
    title: 'Reset Code Rules', description: 'Reset all code rules to default enabled state',
    inputSchema: {}
  }, async (args) => {
    const result = await callYarikiruApi('resetCodeRules', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  // -----------------------------------------------------
  // 6. Graph Operations (DAG-based Task Specifications)
  // -----------------------------------------------------

  server.registerTool('create_graph', {
    title: 'Create Graph', description: 'Create a new task dependency graph (DAG) for a goal',
    inputSchema: {
      goalId: z.string().describe('The goal ID to attach the graph to'),
      graphData: z.object({
        title: z.string().optional().describe('Graph title'),
        description: z.string().optional().describe('Graph description'),
        graph_type: z.enum(['dag', 'sequence', 'hierarchy', 'network', 'conditional', 'parallel']).optional().describe('Graph type'),
        nodes: z.array(z.object({
          node_id: z.string().describe('Unique node identifier in graph'),
          label: z.string().describe('Node label'),
          description: z.string().optional().describe('Node description'),
          sort_order: z.number().optional().describe('Display order'),
          properties: z.object({
            status: z.enum(['todo', 'in_progress', 'done', 'blocked']).optional(),
            priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
            estimated_minutes: z.number().optional(),
          }).optional(),
          x: z.number().optional().describe('UI X coordinate'),
          y: z.number().optional().describe('UI Y coordinate'),
        })).describe('Graph nodes'),
        edges: z.array(z.object({
          from_node_id: z.string().describe('Source node ID'),
          to_node_id: z.string().describe('Target node ID'),
          edge_type: z.enum(['dependency', 'sequence', 'conditional', 'blocking']).optional(),
          condition: z.object({
            type: z.enum(['completion', 'approval', 'manual', 'time_based', 'custom']).optional(),
          }).optional(),
          label: z.string().optional().describe('Edge label'),
        })).describe('Graph edges (dependencies)'),
      }).describe('Graph data including nodes and edges'),
    },
  }, async (args) => {
    const result = await callYarikiruApi('createGraph', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('get_graph', {
    title: 'Get Graph', description: 'Get the task dependency graph for a goal',
    inputSchema: {
      goalId: z.string().describe('The goal ID'),
    },
  }, async (args) => {
    const result = await callYarikiruApi('getGraph', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('validate_graph', {
    title: 'Validate Graph', description: 'Validate graph for cycles and structural integrity',
    inputSchema: {
      goalId: z.string().describe('The goal ID'),
    },
  }, async (args) => {
    const result = await callYarikiruApi('validateGraph', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('execute_graph_wave', {
    title: 'Execute Graph Wave', description: 'Calculate parallel execution waves (topological sort)',
    inputSchema: {
      goalId: z.string().describe('The goal ID'),
      startNodeId: z.string().optional().describe('Optional starting node ID'),
    },
  }, async (args) => {
    const result = await callYarikiruApi('executeGraphWave', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  // -----------------------------------------------------
  // 5. Vector Search & Memory (3-Layer Protocol)
  // -----------------------------------------------------

  server.registerTool('search_memory', {
    title: 'Search Memory (Index Layer)',
    description: 'Step 1: Search memory. Returns index with IDs. Use timeline() to get context, get_observations() to fetch full details. Optimized for token efficiency.',
    inputSchema: {
      query: z.string().describe('The search query to match against entity names, types, and observation content'),
      limit: z.number().optional().describe('Maximum number of results (default: 10)'),
      type: z.enum(['learning_item', 'work_log', 'goal', 'sub_task', 'all']).optional().describe('Filter by content type (default: all)'),
    },
  }, async (args) => {
    const result = await callYarikiruApi('searchMemory', {
      ...args,
      layer: 'index',
    })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('get_observations', {
    title: 'Get Observations (Full Layer)',
    description: 'Step 3: Fetch full details for filtered IDs. Params: ids (array of observation IDs, required). Returns complete observations with content.',
    inputSchema: {
      ids: z.array(z.string()).describe('Array of observation IDs to fetch (required)'),
      type: z.enum(['learning_item', 'work_log', 'goal', 'sub_task', 'all']).optional().describe('Filter by content type (default: all)'),
    },
  }, async (args) => {
    const result = await callYarikiruApi('searchMemory', {
      ...args,
      layer: 'full',
    })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('timeline', {
    title: 'Get Timeline (Context Layer)',
    description: 'Step 2: Get context around results. Params: anchor (observation ID) OR query (finds anchor automatically), depth_before, depth_after. Returns observations around the anchor.',
    inputSchema: {
      anchor: z.string().optional().describe('Observation ID to get context around (optional if using query)'),
      query: z.string().optional().describe('Query to find anchor automatically (optional if using anchor)'),
      depth_before: z.number().optional().describe('Number of items before anchor (default: 3)'),
      depth_after: z.number().optional().describe('Number of items after anchor (default: 3)'),
      type: z.enum(['learning_item', 'work_log', 'goal', 'sub_task', 'all']).optional().describe('Filter by content type (default: all)'),
    },
  }, async (args) => {
    const result = await callYarikiruApi('searchMemory', {
      ...args,
      layer: 'timeline',
    })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  // -----------------------------------------------------
  // 7. GitHub Integration
  // -----------------------------------------------------

  server.registerTool('list_github_repositories', {
    title: 'List GitHub Repositories',
    description: 'List all registered GitHub repositories for the authenticated user',
    inputSchema: {
      includeInactive: z.boolean().optional().describe('Include archived/inactive repositories (default: false)'),
    }
  }, async (args) => {
    const result = await callYarikiruApi('listGitHubRepositories', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('register_github_repository', {
    title: 'Register GitHub Repository',
    description: 'Register a GitHub repository to YARIKIRU for task synchronization',
    inputSchema: {
      githubId: z.number().describe('GitHub repository ID'),
      name: z.string().describe('Repository name'),
      fullName: z.string().describe('Full repository name (owner/repo)'),
      ownerLogin: z.string().describe('Repository owner login'),
      description: z.string().optional().describe('Repository description'),
      url: z.string().describe('Repository URL'),
      language: z.string().optional().describe('Primary programming language'),
      stargazersCount: z.number().optional().describe('Number of stargazers'),
    }
  }, async (args) => {
    const result = await callYarikiruApi('registerGitHubRepository', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  // -----------------------------------------------------
  // 8. Ideas (Quick Capture)
  // -----------------------------------------------------

  server.registerTool('list_ideas', {
    title: 'List Ideas',
    description: 'List all quick-capture ideas for the authenticated user',
    inputSchema: {
      status: z.enum(['draft', 'registered', 'archived']).optional().describe('Filter by status'),
      limit: z.number().optional().describe('Maximum number of results'),
    }
  }, async (args) => {
    const result = await callYarikiruApi('listIdeas', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('create_idea', {
    title: 'Create Idea',
    description: 'Quickly capture an idea for later development. Creates a draft idea that can be converted to a project.',
    inputSchema: {
      title: z.string().describe('Idea title/name'),
      description: z.string().optional().describe('Optional description or notes'),
    }
  }, async (args) => {
    const result = await callYarikiruApi('createIdea', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('update_idea_status', {
    title: 'Update Idea Status',
    description: 'Update the status of an idea (draft -> registered -> archived)',
    inputSchema: {
      ideaId: z.string().describe('The idea ID'),
      status: z.enum(['draft', 'registered', 'archived']).describe('New status'),
    }
  }, async (args) => {
    const result = await callYarikiruApi('updateIdeaStatus', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  server.registerTool('convert_idea_to_goal', {
    title: 'Convert Idea to Goal',
    description: 'Convert a quick-capture idea into a temporary goal with instant ID issuance',
    inputSchema: {
      ideaId: z.string().describe('The idea ID to convert'),
      projectId: z.string().optional().describe('Target project ID (optional, uses first project if not specified)'),
    }
  }, async (args) => {
    const result = await callYarikiruApi('convertIdeaToGoal', args)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result }
  })

  // ============================================
  // Transport Selection & Port Discovery
  // ============================================

  if (transportType === 'sse') {
    const app = express();
    let transport;

    const findAvailablePort = async (startPort, endPort) => {
      const net = await import('net');
      return new Promise((resolve, reject) => {
        const checkPort = (port) => {
          if (port > endPort) {
            reject(new Error('No available ports in range 3100-3110'));
            return;
          }
          const checkServer = net.createServer();
          checkServer.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
              checkPort(port + 1);
            } else {
              reject(err);
            }
          });
          checkServer.once('listening', () => {
            checkServer.close();
            resolve(port);
          });
          checkServer.listen(port);
        };
        checkPort(startPort);
      });
    };

    try {
      const port = requestedPort || await findAvailablePort(3100, 3110);

      app.get('/sse', async (req, res) => {
        transport = new SSEServerTransport('/messages', res);
        await server.connect(transport);
      });

      app.post('/messages', async (req, res) => {
        if (!transport) {
          res.status(400).send('No active SSE connection');
          return;
        }
        await transport.handlePostMessage(req, res);
      });

      app.listen(port, () => {
        console.error(`[YARIKIRU MCP] SSE server running on port ${port}`);
        console.error(`[YARIKIRU MCP] Endpoint: http://localhost:${port}/sse`);
      });
    } catch (err) {
      console.error(`[YARIKIRU MCP] Failed to start SSE server: ${err.message}`);
      process.exit(1);
    }
  } else {
    // Default to STDIO transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[YARIKIRU MCP] Server running on stdio');
  }
}

main().catch((error) => {
  const errorMessage = error instanceof YarikiruError
    ? `[${error.type}] ${error.message}${error.details ? ` | Details: ${JSON.stringify(error.details)}` : ''}`
    : error.message;
  console.error('[YARIKIRU MCP] Fatal error:', errorMessage)
  if (error.stack) {
    console.error('[YARIKIRU MCP] Stack trace:', error.stack)
  }
  process.exit(1)
})
