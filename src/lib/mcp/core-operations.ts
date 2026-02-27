import { hasProAccess } from '@/lib/revenuecat-server'
import { getMemberById } from '@/lib/turso/members'
import { generateEmbedding, embeddingToBuffer } from '@/lib/turso/embeddings'
import { encryptForDb, decryptFromDb } from '@/lib/e2ee'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from '@/db/schema'
import { eq, and, ne, desc, asc, sql } from 'drizzle-orm'

// ============================================
// Code Quality Rules Operations Data
// ============================================
export const defaultRules = [
    { id: 'sec_no_any_type', title: 'Avoid `any` Type', category: 'security', severity: 'error', description: 'Using `any` disables type checking and can lead to runtime errors.', isEnabled: true },
    { id: 'sec_no_console_log', title: 'No Console Log in Production', category: 'security', severity: 'warning', description: 'Console logs can expose sensitive information.', isEnabled: true },
    { id: 'sec_no_hardcoded_secrets', title: 'No Hardcoded Secrets', category: 'security', severity: 'error', description: 'Never hardcode API keys, passwords, or tokens.', isEnabled: true },
    { id: 'sec_sql_injection_risk', title: 'SQL Injection Risk', category: 'security', severity: 'error', description: 'Always use parameterized queries.', isEnabled: true },
    { id: 'perf_no_use_effect_misuse', title: 'Proper useEffect Dependencies', category: 'performance', severity: 'warning', description: 'Missing dependencies can cause issues.', isEnabled: true },
    { id: 'perf_avoid_chaining_async', title: 'Avoid Chaining async/await', category: 'performance', severity: 'warning', description: 'Use Promise.all() for concurrent operations.', isEnabled: true },
    { id: 'perf_memo_expensive', title: 'Memoize Expensive Computations', category: 'performance', severity: 'info', description: 'Use useMemo for expensive calculations.', isEnabled: true },
    { id: 'maint_small_functions', title: 'Keep Functions Small', category: 'maintainability', severity: 'warning', description: 'Functions should be under 50 lines.', isEnabled: true },
    { id: 'maint_descriptive_names', title: 'Use Descriptive Names', category: 'maintainability', severity: 'info', description: 'Names should clearly describe purpose.', isEnabled: true },
    { id: 'maint_avoid_magic_numbers', title: 'Avoid Magic Numbers', category: 'maintainability', severity: 'warning', description: 'Extract magic numbers into constants.', isEnabled: true },
    { id: 'maint_drY_principle', title: 'Follow DRY Principle', category: 'maintainability', severity: 'warning', description: "Don't Repeat Yourself.", isEnabled: true },
    { id: 'type_strict_null_checks', title: 'Handle Null/Undefined Explicitly', category: 'type-safety', severity: 'error', description: 'Always handle potential null/undefined values.', isEnabled: true },
    { id: 'type_return_types', title: 'Explicit Return Types', category: 'type-safety', severity: 'info', description: 'Define explicit return types for exported functions.', isEnabled: true },
    { id: 'type_no_type_assertion', title: 'Avoid Type Assertions', category: 'type-safety', severity: 'warning', description: 'Type assertions bypass type checking.', isEnabled: true },
    { id: 'test_coverage_critical_paths', title: 'Test Critical Paths', category: 'testing', severity: 'warning', description: 'Critical business logic should have tests.', isEnabled: true },
    { id: 'test_edge_cases', title: 'Test Edge Cases', category: 'testing', severity: 'info', description: 'Include tests for edge cases.', isEnabled: true },
    { id: 'err_async_error_handling', title: 'Handle Async Errors', category: 'error-handling', severity: 'error', description: 'Always handle promise rejections.', isEnabled: true },
    { id: 'err_meaningful_errors', title: 'Meaningful Error Messages', category: 'error-handling', severity: 'warning', description: 'Throw errors with descriptive messages.', isEnabled: true },
    { id: 'err_no_silent_catch', title: 'No Silent Catch Blocks', category: 'error-handling', severity: 'error', description: 'Empty catch blocks swallow errors.', isEnabled: true },
]

export async function mcpListGoals(dbClient: any, args: any, userId: string) {
    const db = drizzle(dbClient, { schema });
    const rows = await db
        .select({
            id: schema.yarikiruGoals.id,
            title: schema.yarikiruGoals.title,
            description: schema.yarikiruGoals.description,
            status: schema.yarikiruGoals.status,
            createdAt: schema.yarikiruGoals.createdAt,
            updatedAt: schema.yarikiruGoals.updatedAt,
        })
        .from(schema.yarikiruGoals)
        .innerJoin(schema.yarikiruProjects, eq(schema.yarikiruGoals.projectId, schema.yarikiruProjects.id))
        .where(
            and(
                eq(schema.yarikiruProjects.userId, userId),
                ne(schema.yarikiruGoals.status, 'archived' as any),
                ne(schema.yarikiruGoals.status, 'done')
            )
        )
        .orderBy(desc(schema.yarikiruGoals.createdAt));

    return {
        goals: await Promise.all(rows.map(async (row: any) => ({
            id: row.id,
            title: await decryptFromDb(row.title),
            description: row.description ? await decryptFromDb(row.description) : null,
            deadline: null,
            status: row.status,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        }))),
    }
}

export async function mcpGetGoal(dbClient: any, args: any, userId: string) {
    const { goalId } = args
    if (!goalId) throw new Error('goalId is required')

    const db = drizzle(dbClient, { schema });
    const goalsResult = await db
        .select({
            id: schema.yarikiruGoals.id,
            title: schema.yarikiruGoals.title,
            description: schema.yarikiruGoals.description,
            status: schema.yarikiruGoals.status,
            createdAt: schema.yarikiruGoals.createdAt,
            updatedAt: schema.yarikiruGoals.updatedAt,
        })
        .from(schema.yarikiruGoals)
        .innerJoin(schema.yarikiruProjects, eq(schema.yarikiruGoals.projectId, schema.yarikiruProjects.id))
        .where(
            and(
                eq(schema.yarikiruGoals.id, goalId),
                eq(schema.yarikiruProjects.userId, userId)
            )
        );

    if (goalsResult.length === 0) {
        throw new Error(`Goal not found or unauthorized: ${goalId}`)
    }

    const row = goalsResult[0]

    const tasksResult = await db
        .select({
            id: schema.yarikiruSubTasks.id,
            label: schema.yarikiruSubTasks.label,
            isDone: schema.yarikiruSubTasks.isDone,
        })
        .from(schema.yarikiruSubTasks)
        .where(eq(schema.yarikiruSubTasks.goalId, goalId))
        .orderBy(asc(schema.yarikiruSubTasks.sortOrder));

    return {
        goal: {
            id: row.id,
            title: await decryptFromDb(row.title),
            description: row.description ? await decryptFromDb(row.description) : null,
            deadline: null,
            status: row.status,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        },
        tasks: await Promise.all(tasksResult.map(async (t: any) => ({
            id: t.id,
            title: await decryptFromDb(t.label),
            estimatedMinutes: 15, priority: 'medium',
            isCompleted: t.isDone === 1, scheduledDate: null,
        }))),
    }
}

export async function mcpCreateGoal(dbClient: any, args: any, userId: string) {
    const { title, description, deadline } = args
    if (!title) throw new Error('title is required')

    const db = drizzle(dbClient, { schema });

    // 最後に更新されたプロジェクトを取得
    const projectResult = await db
        .select({ id: schema.yarikiruProjects.id })
        .from(schema.yarikiruProjects)
        .where(eq(schema.yarikiruProjects.userId, userId))
        .orderBy(desc(schema.yarikiruProjects.createdAt))
        .limit(1);

    let projectId
    if (projectResult.length === 0) {
        const ts = Date.now()
        projectId = `p_${ts}_general`
        await db.insert(schema.yarikiruProjects).values({
            id: projectId,
            userId: userId,
            title: 'General Tasks',
        });
    } else {
        projectId = projectResult[0].id
    }

    const goalId = `g_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    const encTitle = await encryptForDb(title)
    const encDesc = description ? await encryptForDb(description) : null

    await db.insert(schema.yarikiruGoals).values({
        id: goalId,
        projectId: projectId,
        title: encTitle,
        description: encDesc,
        estimatedMinutes: 45,
        status: 'todo',
        priority: 1,
    });

    // Generate embedding for the goal
    try {
        const member = await getMemberById(userId)
        if (member?.vertex_ai_api_key) {
            const credentials = JSON.parse(member.vertex_ai_api_key) as Record<string, unknown>
            const text = `${title}\n${description || ''}`.trim()
            const { embedding } = await generateEmbedding(text, credentials)
            const buffer = embeddingToBuffer(embedding)

            await db.update(schema.yarikiruGoals)
                .set({ embedding: buffer })
                .where(eq(schema.yarikiruGoals.id, goalId));
        }
    } catch (error) {
        // Log error but don't fail the goal creation
        console.error('[mcpCreateGoal] Failed to generate embedding:', error)
    }

    return { goalId, success: true }
}

export async function mcpCreateTasks(dbClient: any, args: any, userId: string) {
    const { goalId, tasks } = args
    if (!goalId || !tasks || !Array.isArray(tasks)) throw new Error('goalId and tasks array are required')

    const db = drizzle(dbClient, { schema });

    // Verify goal ownership (from yarikiru_goals -> yarikiru_projects)
    const verify = await db
        .select({ id: schema.yarikiruGoals.id })
        .from(schema.yarikiruGoals)
        .innerJoin(schema.yarikiruProjects, eq(schema.yarikiruGoals.projectId, schema.yarikiruProjects.id))
        .where(
            and(
                eq(schema.yarikiruGoals.id, goalId),
                eq(schema.yarikiruProjects.userId, userId)
            )
        );

    if (verify.length === 0) throw new Error('Goal not found or unauthorized')

    // Get member for embedding generation
    const member = await getMemberById(userId)
    const hasVertexAi = member?.vertex_ai_api_key
    let credentials: Record<string, unknown> | null = null
    if (hasVertexAi) {
        try {
            credentials = JSON.parse(member.vertex_ai_api_key) as Record<string, unknown>
        } catch {
            console.error('[mcpCreateTasks] Failed to parse Vertex AI credentials')
        }
    }

    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i]
        if (task.subTasks && Array.isArray(task.subTasks)) {
            // It's a v3 style sub_tasks insertion
            let order = 0;
            for (const subTask of task.subTasks) {
                const subTaskId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
                const encLabel = await encryptForDb(subTask.title)

                await db.insert(schema.yarikiruSubTasks).values({
                    id: subTaskId,
                    goalId: goalId,
                    label: encLabel,
                    sortOrder: order++,
                    isDone: 0
                });

                // Generate embedding for subtask
                if (credentials && subTask.title) {
                    try {
                        const { embedding } = await generateEmbedding(subTask.title, credentials)
                        const buffer = embeddingToBuffer(embedding)

                        await db.update(schema.yarikiruSubTasks)
                            .set({ embedding: buffer })
                            .where(eq(schema.yarikiruSubTasks.id, subTaskId));
                    } catch (error) {
                        console.error(`[mcpCreateTasks] Failed to generate embedding for subtask ${subTaskId}:`, error)
                    }
                }
            }
        } else {
            // Fallback
            const subTaskId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
            const encLabel = await encryptForDb(task.title)

            await db.insert(schema.yarikiruSubTasks).values({
                id: subTaskId,
                goalId: goalId,
                label: encLabel,
                sortOrder: i,
                isDone: 0
            });

            // Generate embedding for subtask
            if (credentials && task.title) {
                try {
                    const { embedding } = await generateEmbedding(task.title, credentials)
                    const buffer = embeddingToBuffer(embedding)

                    await db.update(schema.yarikiruSubTasks)
                        .set({ embedding: buffer })
                        .where(eq(schema.yarikiruSubTasks.id, subTaskId));
                } catch (error) {
                    console.error(`[mcpCreateTasks] Failed to generate embedding for subtask ${subTaskId}:`, error)
                }
            }
        }
    }

    return { success: true, tasksCreated: tasks.length }
}

export async function mcpDecomposeGoal(db: any, args: any, userId: string) {
    const { goalId, goalTitle, goalDescription, availableHours = 8 } = args
    if (!goalId) throw new Error('goalId is required')
    if (!goalTitle) throw new Error('goalTitle is required')

    // Verify goal ownership
    const verify = await db.execute({
        sql: `
      SELECT g.id FROM yarikiru_goals g
      JOIN yarikiru_projects p ON g.project_id = p.id
      WHERE g.id = ? AND p.user_id = ?
    `,
        args: [goalId, userId]
    })
    if (verify.rows.length === 0) throw new Error('Goal not found or unauthorized')

    // Check if subtasks already exist
    const existingSubTasks = await db.execute({
        sql: `SELECT COUNT(*) FROM yarikiru_sub_tasks WHERE goal_id = ?`,
        args: [goalId]
    })
    const existingCount = Number(existingSubTasks.rows[0][0])
    if (existingCount > 0) {
        // Subtasks exist, just create graph from them
        const subTasksResult = await db.execute({
            sql: `SELECT id, label, sort_order FROM yarikiru_sub_tasks WHERE goal_id = ? ORDER BY sort_order ASC`,
            args: [goalId]
        })

        const subTasks = subTasksResult.rows.map((row: any) => ({
            id: String(row[0]),
            label: String(row[1]),
            sort_order: Number(row[2])
        }))

        // Create graph from existing subtasks
        const graphId = `tg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
        await db.execute({
            sql: `
                INSERT INTO task_graphs (id, goal_id, title, description, graph_type, is_primary)
                VALUES (?, ?, ?, NULL, 'sequence', 1)
            `,
            args: [graphId, goalId, `${goalTitle} - Task Graph`]
        })

        // Create nodes
        const createdNodes = []
        for (const subTask of subTasks) {
            const nodeId = `tgn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
            const node_id = `node_${subTask.id}`
            const encLabel = await encryptForDb(subTask.label)
            await db.execute({
                sql: `
                    INSERT INTO task_graph_nodes (id, graph_id, node_id, label, description, sort_order, properties, x, y)
                    VALUES (?, ?, ?, ?, NULL, ?, ?, NULL, NULL)
                `,
                args: [
                    nodeId,
                    graphId,
                    node_id,
                    encLabel,
                    subTask.sort_order,
                    JSON.stringify({ status: 'todo', priority: 'medium' })
                ]
            })
            createdNodes.push({ id: nodeId, node_id, label: subTask.label })
        }

        // Create edges
        for (let i = 1; i < createdNodes.length; i++) {
            const edgeId = `tge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
            await db.execute({
                sql: `
                    INSERT INTO task_graph_edges (id, graph_id, from_node_id, to_node_id, edge_type, condition, label)
                    VALUES (?, ?, ?, ?, 'sequence', '{}', NULL)
                `,
                args: [
                    edgeId,
                    graphId,
                    createdNodes[i - 1].node_id,
                    createdNodes[i].node_id
                ]
            })
        }

        return {
            success: true,
            graphId,
            goalId,
            graphTitle: `${goalTitle} - Task Graph`,
            graphType: 'sequence',
            isPrimary: true,
            nodeCount: createdNodes.length,
            message: `Graph created from ${createdNodes.length} existing subtasks`
        }
    }

    // AI-powered task decomposition using OpenAI (OS) or Anthropic
    const openAIBaseUrl = process.env.OPENAI_BASE_URL;
    const openAIApiKey = process.env.OPENAI_API_KEY || 'local-dummy-key';
    const openAIModel = process.env.OLLAMA_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (!openAIBaseUrl && !anthropicApiKey) {
        throw new Error('Neither OPENAI_BASE_URL nor ANTHROPIC_API_KEY is configured. AI assistance is unavailable.');
    }

    const prompt = `あなたはプロジェクト管理の専門家です。以下の目標を15分単位の具体的なタスクに分解してください。

目標: ${goalTitle}
${goalDescription ? `説明: ${goalDescription}` : ''}

ルール:
1. 各タスクは15分で完了できるようにする
2. タスクは具体的で実行可能な形式にする（例: 「設計を考える」ではなく「APIエンドポイントの仕様を書く」）
3. 優先度（high, medium, low）を適切に設定
4. 依存関係がある場合は順序を考慮
5. 日本語で出力

JSON形式で返してください（タスクの配列）:
[
  {"title": "タスク名", "estimatedMinutes": 15, "priority": "high"},
  ...
]`;

    let content = '';

    if (openAIBaseUrl) {
        // Use OpenAI-compatible endpoint (e.g., Ollama, LM Studio, vLLM)
        const openAIResponse = await fetch(`${openAIBaseUrl.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAIApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: openAIModel,
                temperature: 0.1,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            }),
        });

        if (!openAIResponse.ok) {
            const errorText = await openAIResponse.text();
            console.error('OpenAI API error:', errorText);
            throw new Error(`Failed to get AI response from Local/OpenAI API: ${openAIResponse.statusText}`);
        }

        const openAIData = await openAIResponse.json();
        content = openAIData.choices?.[0]?.message?.content || '';
    } else {
        // Fallback to Anthropic API (Cloud / Pro)
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': anthropicApiKey!,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-3-5-haiku-20241022',
                max_tokens: 4000,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            }),
        });

        if (!claudeResponse.ok) {
            const errorText = await claudeResponse.text();
            console.error('Claude API error:', errorText);
            throw new Error('Failed to get AI response from Claude API');
        }

        const claudeData = await claudeResponse.json();
        content = claudeData.content[0]?.text || '';
    }

    // Extract JSON from response
    let tasks: Array<{ title: string; estimatedMinutes: number; priority: string }> = []

    try {
        const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/) ||
            content.match(/(\[[\s\S]*\])/)

        if (jsonMatch) {
            tasks = JSON.parse(jsonMatch[1])
        } else {
            tasks = JSON.parse(content)
        }
    } catch (parseError) {
        console.error('Failed to parse AI response:', content)
        throw new Error(`Failed to parse AI response: ${parseError}`)
    }

    // Validate tasks
    if (!Array.isArray(tasks) || tasks.length === 0) {
        throw new Error('Invalid AI response: no tasks generated')
    }

    // Save subtasks to database
    const subTasks: Array<{ id: string; label: string; sort_order: number }> = []
    for (let i = 0; i < tasks.length; i++) {
        const subTaskId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        await db.execute({
            sql: `INSERT INTO yarikiru_sub_tasks (id, goal_id, label, sort_order, is_done) VALUES (?, ?, ?, ?, 0)`,
            args: [subTaskId, goalId, tasks[i].title, i]
        })
        subTasks.push({ id: subTaskId, label: tasks[i].title, sort_order: i })
    }

    // Create graph from subtasks
    const graphId = `tg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    await db.execute({
        sql: `
            INSERT INTO task_graphs (id, goal_id, title, description, graph_type, is_primary)
            VALUES (?, ?, ?, NULL, 'sequence', 1)
        `,
        args: [graphId, goalId, `${goalTitle} - Task Graph`]
    })

    // Create nodes
    const createdNodes = []
    for (const subTask of subTasks) {
        const nodeId = `tgn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
        const node_id = `node_${subTask.id}`
        const encLabel = await encryptForDb(subTask.label)
        await db.execute({
            sql: `
                INSERT INTO task_graph_nodes (id, graph_id, node_id, label, description, sort_order, properties, x, y)
                VALUES (?, ?, ?, ?, NULL, ?, ?, NULL, NULL)
            `,
            args: [
                nodeId,
                graphId,
                node_id,
                encLabel,
                subTask.sort_order,
                JSON.stringify({ status: 'todo', priority: 'medium' })
            ]
        })
        createdNodes.push({ id: nodeId, node_id, label: subTask.label })
    }

    // Create edges
    for (let i = 1; i < createdNodes.length; i++) {
        const edgeId = `tge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
        await db.execute({
            sql: `
                INSERT INTO task_graph_edges (id, graph_id, from_node_id, to_node_id, edge_type, condition, label)
                VALUES (?, ?, ?, ?, 'sequence', '{}', NULL)
            `,
            args: [
                edgeId,
                graphId,
                createdNodes[i - 1].node_id,
                createdNodes[i].node_id
            ]
        })
    }

    return {
        success: true,
        graphId,
        goalId,
        graphTitle: `${goalTitle} - Task Graph`,
        graphType: 'sequence',
        isPrimary: true,
        nodeCount: createdNodes.length,
        subtasksCreated: subTasks.length,
        tasks
    }
}

export async function mcpUpdateTaskStatus(db: any, args: any, userId: string) {
    const { taskId, isCompleted } = args
    if (!taskId) throw new Error('taskId is required')

    // verify ownership
    const verify = await db.execute({
        sql: `
      SELECT st.id FROM yarikiru_sub_tasks st
      JOIN yarikiru_goals g ON st.goal_id = g.id
      JOIN yarikiru_projects p ON g.project_id = p.id
      WHERE st.id = ? AND p.user_id = ?
    `,
        args: [taskId, userId]
    })
    if (verify.rows.length === 0) throw new Error('Subtask not found or unauthorized')

    await db.execute({
        sql: `UPDATE yarikiru_sub_tasks SET is_done = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [isCompleted ? 1 : 0, taskId],
    })

    return { success: true }
}

export async function mcpListProjects(db: any, args: any, userId: string) {
    const projectsResult = await db.execute({
        sql: `SELECT id, title, status FROM yarikiru_projects
          WHERE user_id = ? AND (status IS NULL OR status != 'archived')
          ORDER BY created_at DESC`,
        args: [userId],
    })

    const projects = []
    for (const row of projectsResult.rows) {
        const projectId = String(row[0])
        const goalsResult = await db.execute({
            sql: `SELECT id, title, status, estimated_minutes, actual_minutes, learning, priority
            FROM yarikiru_goals WHERE project_id = ?
            ORDER BY priority DESC, sort_order ASC`,
            args: [projectId],
        })

        const goals = await Promise.all(goalsResult.rows.map(async (g: any) => {
            const subResult = await db.execute({
                sql: `SELECT id, label, is_done FROM yarikiru_sub_tasks WHERE goal_id = ? ORDER BY sort_order ASC`,
                args: [String(g[0])],
            })
            return {
                id: String(g[0]),
                title: await decryptFromDb(String(g[1] ?? '')),
                status: String(g[2] ?? 'todo'),
                estimatedMinutes: Number(g[3]) || 30, actualMinutes: g[4] ? Number(g[4]) : null,
                learning: g[5] ? await decryptFromDb(String(g[5])) : null,
                priority: Number(g[6]) || 0,
                subTasks: await Promise.all(subResult.rows.map(async (s: any) => ({
                    id: String(s[0]),
                    label: await decryptFromDb(String(s[1])),
                    isDone: Number(s[2]) === 1
                }))),
            }
        }))
        projects.push({
            id: projectId,
            title: await decryptFromDb(String(row[1])),
            status: String(row[2] ?? 'active'),
            goals
        })
    }
    return { projects }
}

export async function mcpStartGoalWork(dbClient: any, args: any, userId: string) {
    const { goalId } = args
    if (!goalId) throw new Error('goalId is required')

    const db = drizzle(dbClient, { schema });

    const verify = await db
        .select({ id: schema.yarikiruGoals.id, title: schema.yarikiruGoals.title })
        .from(schema.yarikiruGoals)
        .innerJoin(schema.yarikiruProjects, eq(schema.yarikiruGoals.projectId, schema.yarikiruProjects.id))
        .where(
            and(
                eq(schema.yarikiruGoals.id, goalId),
                eq(schema.yarikiruProjects.userId, userId)
            )
        );

    if (verify.length === 0) throw new Error('Goal not found or unauthorized')

    const logId = `wl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const startedAt = new Date().toISOString()
    const goalTitle = await decryptFromDb(String(verify[0].title))

    await db.insert(schema.yarikiruWorkLogs).values({
        id: logId,
        goalId: goalId,
        userId: userId,
        startedAt: startedAt,
    });

    await db.update(schema.yarikiruGoals)
        .set({
            status: 'in_progress',
            startedAt: sql`COALESCE(${schema.yarikiruGoals.startedAt}, ${startedAt})`
        })
        .where(eq(schema.yarikiruGoals.id, goalId));

    // Generate embedding for the work log
    try {
        const member = await getMemberById(userId)
        if (member?.vertex_ai_api_key) {
            const credentials = JSON.parse(member.vertex_ai_api_key) as Record<string, unknown>
            const text = `Started working on: ${goalTitle}`.trim()
            const { embedding } = await generateEmbedding(text, credentials)
            const buffer = embeddingToBuffer(embedding)

            await db.update(schema.yarikiruWorkLogs)
                .set({ embedding: buffer })
                .where(eq(schema.yarikiruWorkLogs.id, logId));
        }
    } catch (error) {
        console.error('[mcpStartGoalWork] Failed to generate embedding:', error)
    }

    // We return contextual info so the MCP CLI can write to `.yarikiru/active-work.json` locally.
    return { success: true, logId, goalId, goalTitle, startedAt, userId }
}

export async function mcpCompleteGoalWork(dbClient: any, args: any, userId: string) {
    const { goalId, learning, logId } = args
    if (!goalId) throw new Error('goalId is required')

    const db = drizzle(dbClient, { schema });

    const verify = await db
        .select({ id: schema.yarikiruGoals.id, title: schema.yarikiruGoals.title })
        .from(schema.yarikiruGoals)
        .innerJoin(schema.yarikiruProjects, eq(schema.yarikiruGoals.projectId, schema.yarikiruProjects.id))
        .where(
            and(
                eq(schema.yarikiruGoals.id, goalId),
                eq(schema.yarikiruProjects.userId, userId)
            )
        );

    if (verify.length === 0) throw new Error('Goal not found or unauthorized')

    const goalTitle = await decryptFromDb(String(verify[0].title))
    const endedAt = new Date().toISOString()

    // Determine which work log to update
    let targetLogId = logId
    if (!logId) {
        const activeLogResult = await db
            .select({ id: schema.yarikiruWorkLogs.id })
            .from(schema.yarikiruWorkLogs)
            .where(
                and(
                    eq(schema.yarikiruWorkLogs.goalId, goalId),
                    eq(schema.yarikiruWorkLogs.userId, userId),
                    sql`${schema.yarikiruWorkLogs.endedAt} IS NULL`
                )
            )
            .orderBy(desc(schema.yarikiruWorkLogs.startedAt))
            .limit(1);

        if (activeLogResult.length > 0) {
            targetLogId = activeLogResult[0].id;
        }
    }

    if (targetLogId) {
        await db.update(schema.yarikiruWorkLogs)
            .set({
                endedAt: endedAt,
                durationMinutes: sql`CAST((julianday(${endedAt}) - julianday(${schema.yarikiruWorkLogs.startedAt})) * 24 * 60 AS INTEGER)`
            })
            .where(
                and(
                    eq(schema.yarikiruWorkLogs.id, targetLogId),
                    eq(schema.yarikiruWorkLogs.userId, userId),
                    sql`${schema.yarikiruWorkLogs.endedAt} IS NULL`
                )
            );

        // Generate embedding for the completed work log with learning
        try {
            const member = await getMemberById(userId)
            if (member?.vertex_ai_api_key && learning) {
                const credentials = JSON.parse(member.vertex_ai_api_key) as Record<string, unknown>
                const text = `Completed: ${goalTitle}\nLearning: ${learning}`.trim()
                const { embedding } = await generateEmbedding(text, credentials)
                const buffer = embeddingToBuffer(embedding)

                await db.update(schema.yarikiruWorkLogs)
                    .set({ embedding: buffer })
                    .where(eq(schema.yarikiruWorkLogs.id, targetLogId));
            }
        } catch (error) {
            console.error('[mcpCompleteGoalWork] Failed to generate embedding:', error)
        }
    }

    const totalResult = await db
        .select({ total: sql`COALESCE(SUM(${schema.yarikiruWorkLogs.durationMinutes}), 0)` })
        .from(schema.yarikiruWorkLogs)
        .where(eq(schema.yarikiruWorkLogs.goalId, goalId));

    const actualMinutes = Number(totalResult[0]?.total) || 0

    const encLearning = learning ? await encryptForDb(learning) : null

    await db.update(schema.yarikiruGoals)
        .set({
            status: 'done',
            completedAt: endedAt,
            learning: encLearning,
            actualMinutes: actualMinutes || null
        })
        .where(eq(schema.yarikiruGoals.id, goalId));

    await db.update(schema.yarikiruSubTasks)
        .set({
            isDone: 1,
            completedAt: endedAt
        })
        .where(eq(schema.yarikiruSubTasks.goalId, goalId));

    return { success: true, goalId, learning: learning || null, actualMinutes, completedAt: endedAt }
}

export async function mcpGetStats(db: any, args: any, userId: string) {
    const goalsResult = await db.execute({
        sql: `SELECT COUNT(*) FROM yarikiru_goals g JOIN yarikiru_projects p ON g.project_id = p.id WHERE p.user_id = ? AND g.status IN ('todo', 'in_progress')`,
        args: [userId],
    })

    const tasksResult = await db.execute({
        sql: `SELECT
             COUNT(*) as total,
             SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as completed
           FROM yarikiru_sub_tasks st
           JOIN yarikiru_goals g ON st.goal_id = g.id
           JOIN yarikiru_projects p ON g.project_id = p.id
           WHERE p.user_id = ?`,
        args: [userId],
    })

    return {
        activeGoals: goalsResult.rows[0][0],
        totalTasks: tasksResult.rows[0][0],
        completedTasks: tasksResult.rows[0][1],
        completionRate: tasksResult.rows[0][0] > 0
            ? Math.round((tasksResult.rows[0][1] / tasksResult.rows[0][0]) * 100) : 0,
    }
}

export async function mcpListUrgentTasks(db: any, args: any, userId: string) {
    const result = await db.execute({
        sql: `
      SELECT
        g.id as task_id, g.title as task_title, g.estimated_minutes, g.priority as priority,
        g.id as goal_id, g.title as goal_title,
        p.id as project_id, p.title as project_title
      FROM yarikiru_goals g
      JOIN yarikiru_projects p ON g.project_id = p.id
      WHERE p.user_id = ? AND g.priority >= 3 AND g.status != 'done'
      ORDER BY g.priority DESC, g.created_at ASC
    `,
        args: [userId],
    })

    return {
        urgentTasks: await Promise.all(result.rows.map(async (row: any) => ({
            taskId: String(row[0]), taskTitle: await decryptFromDb(String(row[1])), estimatedMinutes: Number(row[2]) || 60,
            priority: String(row[3] || 'high'), goalId: String(row[4]), goalTitle: await decryptFromDb(String(row[5])),
            projectId: String(row[6]), projectTitle: await decryptFromDb(String(row[7] || 'General')),
        }))),
        count: result.rows.length,
    }
}

export async function mcpToggleTaskUrgent(db: any, args: any, userId: string) {
    // In V3, urgency maps to goal priority >= 3
    const { taskId, isUrgent } = args
    if (!taskId) throw new Error('taskId/goalId is required')

    // Find the goal to update (if taskId is a subtask, find parent goal, else assume it is a goal)
    const verify = await db.execute({
        sql: `SELECT g.id FROM yarikiru_goals g JOIN yarikiru_projects p ON g.project_id = p.id WHERE (g.id = ? OR g.id = (SELECT goal_id FROM yarikiru_sub_tasks WHERE id = ?)) AND p.user_id = ?`,
        args: [taskId, taskId, userId]
    })
    if (verify.rows.length === 0) throw new Error('Goal/Task not found or unauthorized')

    const targetGoalId = verify.rows[0][0]

    await db.execute({
        sql: `UPDATE yarikiru_goals SET priority = ? WHERE id = ?`,
        args: [isUrgent ? 3 : 1, targetGoalId],
    })

    return { success: true, taskId: targetGoalId, isUrgent: Boolean(isUrgent) }
}

export async function mcpAddLearningUrl(db: any, args: any, userId: string) {
    const { url, title, what, how, impact } = args
    if (!url) throw new Error('url is required')

    const encTitle = title ? await encryptForDb(title) : null
    const encWhat = what ? await encryptForDb(what) : null
    const encHow = how ? await encryptForDb(how) : null
    const encImpact = impact ? await encryptForDb(impact) : null

    const id = `li_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    await db.execute({
        sql: `INSERT INTO yarikiru_learning_items (id, user_id, url, title, what, how, impact, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'unread')`,
        args: [id, userId, url.trim(), encTitle, encWhat, encHow, encImpact],
    })
    return { success: true, id, url }
}

export async function mcpGenerateArticleFromLearnings(db: any, args: any, userId: string) {
    const { statusType } = args
    let sql = `SELECT id, url, title, what, how, impact, status, created_at FROM yarikiru_learning_items WHERE user_id = ?`
    const queryArgs = [userId]
    if (statusType && statusType !== 'all') {
        sql += ` AND status = ?`
        queryArgs.push(statusType)
    }
    sql += ` ORDER BY created_at ASC`
    const result = await db.execute({ sql, args: queryArgs })

    return {
        success: true,
        learnings: await Promise.all(result.rows.map(async (row: any) => ({
            id: row[0], url: row[1],
            title: row[2] ? await decryptFromDb(row[2]) : null,
            what: row[3] ? await decryptFromDb(row[3]) : null,
            how: row[4] ? await decryptFromDb(row[4]) : null,
            impact: row[5] ? await decryptFromDb(row[5]) : null,
            status: row[6], createdAt: row[7]
        })))
    }
}

export async function mcpMarkLearningsArticled(db: any, args: any, userId: string) {
    const { learningIds } = args
    if (!Array.isArray(learningIds) || learningIds.length === 0) throw new Error('learningIds array is required')

    const placeholders = learningIds.map(() => '?').join(',')
    await db.execute({
        sql: `UPDATE yarikiru_learning_items SET status = 'articled' WHERE user_id = ? AND id IN (${placeholders})`,
        args: [userId, ...learningIds],
    })
    return { success: true, count: learningIds.length }
}

export async function mcpUpdateGoalSubtasks(db: any, args: any, userId: string) {
    const { goalId, tasks } = args
    if (!goalId || !Array.isArray(tasks)) throw new Error('goalId and tasks array are required')

    const verify = await db.execute({
        sql: `SELECT g.id FROM yarikiru_goals g JOIN yarikiru_projects p ON g.project_id = p.id WHERE g.id = ? AND p.user_id = ?`,
        args: [goalId, userId]
    })
    if (verify.rows.length === 0) throw new Error('Goal not found or unauthorized')

    await db.execute({ sql: `DELETE FROM yarikiru_sub_tasks WHERE goal_id = ?`, args: [goalId] })

    let insertedCount = 0
    for (let i = 0; i < tasks.length; i++) {
        const subTaskId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
        const encLabel = await encryptForDb(tasks[i])
        await db.execute({
            sql: `INSERT INTO yarikiru_sub_tasks (id, goal_id, label, sort_order, is_done) VALUES (?, ?, ?, ?, 0)`,
            args: [subTaskId, goalId, encLabel, i],
        })
        insertedCount++
    }

    return { success: true, insertedCount }
}

export async function mcpListCodeRules(db: any, args: any, userId: string) {
    const { category } = args

    const userRulesResult = await db.execute({
        sql: `SELECT rule_id, is_enabled FROM yarikiru_code_rules WHERE user_id = ?`,
        args: [userId],
    })

    const userRuleMap = new Map()
    for (const row of userRulesResult.rows) {
        userRuleMap.set(String(row[0]), Number(row[1]) === 1)
    }

    let rules = defaultRules.map((rule) => ({
        ...rule,
        isEnabled: userRuleMap.has(rule.id) ? userRuleMap.get(rule.id) : rule.isEnabled,
    }))

    if (category) {
        rules = rules.filter((rule) => rule.category === category)
    }

    return { rules, categories: ['security', 'performance', 'maintainability', 'type-safety', 'testing', 'error-handling'] }
}

export async function mcpUpdateCodeRule(db: any, args: any, userId: string) {
    const { ruleId, isEnabled } = args
    if (!ruleId || typeof isEnabled !== 'boolean') throw new Error('ruleId and isEnabled are required')

    const ruleExists = defaultRules.find((r) => r.id === ruleId)
    if (!ruleExists) throw new Error(`Rule not found: ${ruleId}`)

    const existingResult = await db.execute({
        sql: `SELECT id FROM yarikiru_code_rules WHERE user_id = ? AND rule_id = ?`,
        args: [userId, ruleId],
    })

    if (existingResult.rows.length > 0) {
        await db.execute({
            sql: `UPDATE yarikiru_code_rules SET is_enabled = ?, updated_at = datetime('now') WHERE user_id = ? AND rule_id = ?`,
            args: [isEnabled ? 1 : 0, userId, ruleId],
        })
    } else {
        const id = `ucr_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
        await db.execute({
            sql: `INSERT INTO yarikiru_code_rules (id, user_id, rule_id, is_enabled) VALUES (?, ?, ?, ?)`,
            args: [id, userId, ruleId, isEnabled ? 1 : 0],
        })
    }

    return { success: true, ruleId, isEnabled }
}

export async function mcpResetCodeRules(db: any, args: any, userId: string) {
    await db.execute({
        sql: `DELETE FROM yarikiru_code_rules WHERE user_id = ?`,
        args: [userId],
    })

    return { success: true, message: 'All rules reset to default' }
}

export async function mcpRunCodeReview(db: any, args: any, userId: string) {
    const { code, language = 'typescript', filePath } = args
    if (!code) throw new Error('code is required')

    // Get user's enabled rules
    const userRulesResult = await db.execute({
        sql: `SELECT rule_id, is_enabled FROM yarikiru_code_rules WHERE user_id = ?`,
        args: [userId],
    })

    const userRuleMap = new Map()
    for (const row of userRulesResult.rows) {
        userRuleMap.set(String(row[0]), Number(row[1]) === 1)
    }

    const enabledRules = defaultRules.filter((rule) => {
        const userSetting = userRuleMap.get(rule.id)
        return userSetting !== undefined ? userSetting : rule.isEnabled
    })

    const findings = []

    // Simple pattern-based checks
    for (const rule of enabledRules) {
        if (rule.id === 'sec_no_any_type') {
            const matches = code.match(/:\s*any\b/g)
            if (matches) {
                findings.push({
                    ruleId: rule.id,
                    ruleTitle: rule.title,
                    severity: rule.severity,
                    category: rule.category,
                    message: rule.description,
                    count: matches.length,
                })
            }
        }

        if (rule.id === 'sec_no_console_log') {
            const matches = code.match(/console\.(log|debug|info|warn|error)\(/g)
            if (matches) {
                findings.push({
                    ruleId: rule.id,
                    ruleTitle: rule.title,
                    severity: rule.severity,
                    category: rule.category,
                    message: rule.description,
                    count: matches.length,
                })
            }
        }

        if (rule.id === 'sec_no_hardcoded_secrets') {
            const secretPattern = /(api_key|secret|password|token)\s*=\s*['"\`](?!process\.env|undefined|null)[^'"\`]{10,}['"\`]/gi
            const matches = code.match(secretPattern)
            if (matches) {
                findings.push({
                    ruleId: rule.id,
                    ruleTitle: rule.title,
                    severity: rule.severity,
                    category: rule.category,
                    message: rule.description,
                    count: matches.length,
                })
            }
        }

        if (rule.id === 'err_no_silent_catch') {
            const silentCatchPattern = /catch\s*\([^)]*\)\s*\{\s*\}/g
            const matches = code.match(silentCatchPattern)
            if (matches) {
                findings.push({
                    ruleId: rule.id,
                    ruleTitle: rule.title,
                    severity: rule.severity,
                    category: rule.category,
                    message: rule.description,
                    count: matches.length,
                })
            }
        }

        if (rule.id === 'type_no_type_assertion') {
            const matches = code.match(/\s+as\s+\w+/g)
            if (matches) {
                findings.push({
                    ruleId: rule.id,
                    ruleTitle: rule.title,
                    severity: rule.severity,
                    category: rule.category,
                    message: rule.description,
                    count: matches.length,
                })
            }
        }
    }

    // Check for function length
    const functionBlocks = code.match(/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/g) || []
    for (const block of functionBlocks) {
        const lines = block.split('\n').length
        if (lines > 50) {
            const funcName = block.match(/function\s+(\w+)/)?.[1] || 'unknown'
            findings.push({
                ruleId: 'maint_small_functions',
                ruleTitle: 'Keep Functions Small',
                severity: 'warning',
                category: 'maintainability',
                message: `Function "${funcName}" is ${lines} lines long. Consider breaking it down.`,
            })
        }
    }

    const rulesFailed = findings.length
    const rulesPassed = enabledRules.length - rulesFailed

    // Save to history if associated with a goal
    const { goalId } = args
    if (goalId) {
        const historyId = `rvh_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
        await db.execute({
            sql: `INSERT INTO yarikiru_review_history (id, user_id, goal_id, rules_passed, rules_failed, findings) VALUES (?, ?, ?, ?, ?, ?)`,
            args: [historyId, userId, goalId, rulesPassed, rulesFailed, JSON.stringify(findings)],
        })
    }

    return {
        rulesPassed,
        rulesFailed,
        totalRules: enabledRules.length,
        findings,
        reviewedAt: new Date().toISOString(),
    }
}

export async function mcpGetReviewHistory(db: any, args: any, userId: string) {
    const { limit = 50, goalId } = args

    let sql = `SELECT id, user_id, goal_id, review_date, rules_passed, rules_failed, findings
               FROM yarikiru_review_history WHERE user_id = ?`
    const queryArgs = [userId]

    if (goalId) {
        sql += ` AND goal_id = ?`
        queryArgs.push(goalId)
    }

    sql += ` ORDER BY review_date DESC LIMIT ?`
    queryArgs.push(limit)

    const result = await db.execute({ sql, args: queryArgs })

    const history = result.rows.map((row: any) => {
        let findings = []
        try {
            findings = JSON.parse(row[6] || '[]')
        } catch (e) {
            console.error('Failed to parse findings:', e)
        }

        return {
            id: row[0],
            userId: row[1],
            goalId: row[2],
            reviewDate: row[3],
            rulesPassed: row[4],
            rulesFailed: row[5],
            findings,
        }
    })

    return { history, count: history.length }
}

// ============================================
// Graph Operations
// ============================================

export async function mcpCreateGraph(db: any, args: any, userId: string) {
    const { goalId, graphData } = args
    if (!goalId) throw new Error('goalId is required')
    if (!graphData) throw new Error('graphData is required')

    // Goalの所有権を確認
    const goalCheck = await db.execute({
        sql: `
            SELECT g.id FROM yarikiru_goals g
            JOIN yarikiru_projects p ON g.project_id = p.id
            WHERE g.id = ? AND p.user_id = ?
        `,
        args: [goalId, userId],
    })

    if (goalCheck.rows.length === 0) {
        throw new Error(`Goal not found or unauthorized: ${goalId}`)
    }

    const { title = 'Task Graph', description, graph_type = 'dag', nodes = [], edges = [] } = graphData

    // Graphを作成
    const graphId = `tg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    await db.execute({
        sql: `
            INSERT INTO task_graphs (id, goal_id, title, description, graph_type, is_primary)
            VALUES (?, ?, ?, ?, ?, 0)
        `,
        args: [graphId, goalId, title, description || null, graph_type],
    })

    // Nodesを作成
    const createdNodes = []
    for (const node of nodes) {
        const nodeId = `tgn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
        await db.execute({
            sql: `
                INSERT INTO task_graph_nodes (id, graph_id, node_id, label, description, sort_order, properties, x, y)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
                nodeId,
                graphId,
                node.node_id,
                node.label,
                node.description || null,
                node.sort_order || 0,
                JSON.stringify(node.properties || { status: 'todo' }),
                node.x || null,
                node.y || null,
            ],
        })
        createdNodes.push({ ...node, id: nodeId })
    }

    // Edgesを作成
    const createdEdges = []
    for (const edge of edges) {
        const edgeId = `tge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
        await db.execute({
            sql: `
                INSERT INTO task_graph_edges (id, graph_id, from_node_id, to_node_id, edge_type, condition, label)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
                edgeId,
                graphId,
                edge.from_node_id,
                edge.to_node_id,
                edge.edge_type || 'dependency',
                JSON.stringify(edge.condition || {}),
                edge.label || null,
            ],
        })
        createdEdges.push({ ...edge, id: edgeId })
    }

    return {
        graphId,
        goalId,
        title,
        graph_type,
        nodes: createdNodes,
        edges: createdEdges,
    }
}

export async function mcpGetGraph(db: any, args: any, userId: string) {
    const { goalId } = args
    if (!goalId) throw new Error('goalId is required')

    // Goalの所有権を確認
    const goalCheck = await db.execute({
        sql: `
            SELECT g.id FROM yarikiru_goals g
            JOIN yarikiru_projects p ON g.project_id = p.id
            WHERE g.id = ? AND p.user_id = ?
        `,
        args: [goalId, userId],
    })

    if (goalCheck.rows.length === 0) {
        throw new Error(`Goal not found or unauthorized: ${goalId}`)
    }

    // Graphを取得
    const graphResult = await db.execute({
        sql: `
            SELECT * FROM task_graphs
            WHERE goal_id = ?
            ORDER BY is_primary DESC, created_at DESC
            LIMIT 1
        `,
        args: [goalId],
    })

    if (graphResult.rows.length === 0) {
        return { graph: null, nodes: [], edges: [] }
    }

    const graphRow = graphResult.rows[0]
    const graphId = String(graphRow[0])

    const [nodesResult, edgesResult] = await Promise.all([
        db.execute({
            sql: `SELECT * FROM task_graph_nodes WHERE graph_id = ? ORDER BY sort_order ASC`,
            args: [graphId],
        }),
        db.execute({
            sql: `SELECT * FROM task_graph_edges WHERE graph_id = ? ORDER BY created_at ASC`,
            args: [graphId],
        }),
    ])

    const graph = {
        id: String(graphRow[0]),
        goal_id: String(graphRow[1]),
        title: String(graphRow[2]),
        description: graphRow[3] ? String(graphRow[3]) : null,
        graph_type: String(graphRow[4]),
        is_primary: Number(graphRow[5]) === 1,
        created_at: String(graphRow[6]),
        updated_at: String(graphRow[7]),
    }

    const nodes = nodesResult.rows.map((row: any) => ({
        id: String(row[0]),
        graph_id: String(row[1]),
        node_id: String(row[2]),
        label: String(row[3]),
        description: row[4] ? String(row[4]) : undefined,
        sort_order: Number(row[5]),
        properties: row[6] ? JSON.parse(String(row[6])) : { status: 'todo' },
        x: row[7] ? Number(row[7]) : undefined,
        y: row[8] ? Number(row[8]) : undefined,
        started_at: row[9] ? String(row[9]) : undefined,
        completed_at: row[10] ? String(row[10]) : undefined,
        created_at: String(row[11]),
    }))

    const edges = edgesResult.rows.map((row: any) => ({
        id: String(row[0]),
        graph_id: String(row[1]),
        from_node_id: String(row[2]),
        to_node_id: String(row[3]),
        edge_type: String(row[4]),
        condition: row[5] ? JSON.parse(String(row[5])) : {},
        label: row[6] ? String(row[6]) : undefined,
        created_at: String(row[7]),
    }))

    return { graph, nodes, edges }
}

export async function mcpGetTaskGraphsByGoalId(db: any, args: any, userId: string) {
    const { goalId } = args
    if (!goalId) throw new Error('goalId is required')

    // Goalの所有権を確認
    const goalCheck = await db.execute({
        sql: `
            SELECT g.id FROM yarikiru_goals g
            JOIN yarikiru_projects p ON g.project_id = p.id
            WHERE g.id = ? AND p.user_id = ?
        `,
        args: [goalId, userId],
    })

    if (goalCheck.rows.length === 0) {
        throw new Error(`Goal not found or unauthorized: ${goalId}`)
    }

    // Graph一覧を取得
    const graphResult = await db.execute({
        sql: `
            SELECT * FROM task_graphs
            WHERE goal_id = ?
            ORDER BY is_primary DESC, created_at DESC
        `,
        args: [goalId],
    })

    const graphs = graphResult.rows.map((row: any) => ({
        id: String(row[0]),
        goal_id: String(row[1]),
        title: String(row[2]),
        description: row[3] ? String(row[3]) : null,
        graph_type: String(row[4]),
        is_primary: Number(row[5]) === 1,
        created_at: String(row[6]),
        updated_at: String(row[7]),
    }))

    return graphs
}

export async function mcpGetTaskGraphWithNodesAndEdges(db: any, args: any, userId: string) {
    const { graphId } = args
    if (!graphId) throw new Error('graphId is required')

    // Graphの所有権を確認（goal経由）
    const graphCheck = await db.execute({
        sql: `
            SELECT tg.id FROM task_graphs tg
            JOIN yarikiru_goals g ON tg.goal_id = g.id
            JOIN yarikiru_projects p ON g.project_id = p.id
            WHERE tg.id = ? AND p.user_id = ?
        `,
        args: [graphId, userId],
    })

    if (graphCheck.rows.length === 0) {
        throw new Error(`Graph not found or unauthorized: ${graphId}`)
    }

    // Graphを取得
    const graphResult = await db.execute({
        sql: `SELECT * FROM task_graphs WHERE id = ?`,
        args: [graphId],
    })

    if (graphResult.rows.length === 0) {
        return { graph: null, nodes: [], edges: [] }
    }

    const graphRow = graphResult.rows[0]

    const [nodesResult, edgesResult] = await Promise.all([
        db.execute({
            sql: `SELECT * FROM task_graph_nodes WHERE graph_id = ? ORDER BY sort_order ASC`,
            args: [graphId],
        }),
        db.execute({
            sql: `SELECT * FROM task_graph_edges WHERE graph_id = ? ORDER BY created_at ASC`,
            args: [graphId],
        }),
    ])

    const graph = {
        id: String(graphRow[0]),
        goal_id: String(graphRow[1]),
        title: String(graphRow[2]),
        description: graphRow[3] ? String(graphRow[3]) : null,
        graph_type: String(graphRow[4]),
        is_primary: Number(graphRow[5]) === 1,
        created_at: String(graphRow[6]),
        updated_at: String(graphRow[7]),
    }

    const nodes = nodesResult.rows.map((row: any) => ({
        id: String(row[0]),
        graph_id: String(row[1]),
        node_id: String(row[2]),
        label: String(row[3]),
        description: row[4] ? String(row[4]) : undefined,
        sort_order: Number(row[5]),
        properties: row[6] ? JSON.parse(String(row[6])) : { status: 'todo' },
        x: row[7] ? Number(row[7]) : undefined,
        y: row[8] ? Number(row[8]) : undefined,
        started_at: row[9] ? String(row[9]) : undefined,
        completed_at: row[10] ? String(row[10]) : undefined,
        created_at: String(row[11]),
    }))

    const edges = edgesResult.rows.map((row: any) => ({
        id: String(row[0]),
        graph_id: String(row[1]),
        from_node_id: String(row[2]),
        to_node_id: String(row[3]),
        edge_type: String(row[4]),
        condition: row[5] ? JSON.parse(String(row[5])) : {},
        label: row[6] ? String(row[6]) : undefined,
        created_at: String(row[7]),
    }))

    return { graph, nodes, edges }
}

export async function mcpCreateGraphFromSubTasks(db: any, args: any, userId: string) {
    const { goalId, graphTitle } = args
    if (!goalId) throw new Error('goalId is required')
    if (!graphTitle) throw new Error('graphTitle is required')

    // Goalの所有権を確認
    const goalCheck = await db.execute({
        sql: `
            SELECT g.id FROM yarikiru_goals g
            JOIN yarikiru_projects p ON g.project_id = p.id
            WHERE g.id = ? AND p.user_id = ?
        `,
        args: [goalId, userId],
    })

    if (goalCheck.rows.length === 0) {
        throw new Error(`Goal not found or unauthorized: ${goalId}`)
    }

    // 既存のサブタスクを取得
    const subTasksResult = await db.execute({
        sql: `SELECT id, label, sort_order FROM yarikiru_sub_tasks WHERE goal_id = ? ORDER BY sort_order ASC`,
        args: [goalId],
    })

    if (subTasksResult.rows.length === 0) {
        throw new Error(`No subtasks found for goal: ${goalId}`)
    }

    const subTasks = subTasksResult.rows.map((row: any) => ({
        id: String(row[0]),
        label: String(row[1]),
        sort_order: Number(row[2]),
    }))

    // Graphを作成
    const graphId = `tg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    await db.execute({
        sql: `
            INSERT INTO task_graphs (id, goal_id, title, description, graph_type, is_primary)
            VALUES (?, ?, ?, NULL, 'sequence', 1)
        `,
        args: [graphId, goalId, graphTitle],
    })

    // ノードを作成
    const createdNodes = []
    for (const subTask of subTasks) {
        const nodeId = `tgn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
        const node_id = `node_${subTask.id}`
        await db.execute({
            sql: `
                INSERT INTO task_graph_nodes (id, graph_id, node_id, label, description, sort_order, properties, x, y)
                VALUES (?, ?, ?, ?, NULL, ?, ?, NULL, NULL)
            `,
            args: [
                nodeId,
                graphId,
                node_id,
                subTask.label,
                subTask.sort_order,
                JSON.stringify({ status: 'todo', priority: 'medium' }),
            ],
        })
        createdNodes.push({ id: nodeId, node_id, label: subTask.label })
    }

    // エッジを作成（直前のノードへの依存）
    const createdEdges = []
    for (let i = 1; i < createdNodes.length; i++) {
        const edgeId = `tge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
        await db.execute({
            sql: `
                INSERT INTO task_graph_edges (id, graph_id, from_node_id, to_node_id, edge_type, condition, label)
                VALUES (?, ?, ?, ?, 'sequence', '{}', NULL)
            `,
            args: [
                edgeId,
                graphId,
                createdNodes[i - 1].node_id,
                createdNodes[i].node_id,
            ],
        })
        createdEdges.push({
            id: edgeId,
            from_node_id: createdNodes[i - 1].node_id,
            to_node_id: createdNodes[i].node_id,
        })
    }

    return {
        id: graphId,
        goal_id: goalId,
        title: graphTitle,
        graph_type: 'sequence',
        is_primary: true,
        nodeCount: createdNodes.length,
    }
}

export async function mcpConvertSubTasksToGraph(db: any, args: any, userId: string) {
    const { goalId } = args
    if (!goalId) throw new Error('goalId is required')

    // mcpCreateGraphFromSubTasksと同じ処理
    const graphTitle = 'Task Graph from SubTasks'
    return await mcpCreateGraphFromSubTasks(db, { goalId, graphTitle }, userId)
}

export async function mcpValidateGraph(db: any, args: any, userId: string) {
    const { goalId } = args
    if (!goalId) throw new Error('goalId is required')

    // Graphを取得
    const { nodes, edges } = await mcpGetGraph(db, { goalId }, userId)

    if (!nodes || nodes.length === 0) {
        return { isValid: true, hasCycles: false, cycles: [], message: 'Graph is empty' }
    }

    // 循環検出（深さ優先探索）
    const adjList = new Map<string, string[]>()
    const visited = new Set<string>()
    const recStack = new Set<string>()
    const cycles: string[][] = []

    // 隣接リストを構築
    for (const node of nodes) {
        adjList.set(node.node_id, [])
    }
    for (const edge of edges) {
        const list = adjList.get(edge.from_node_id) || []
        list.push(edge.to_node_id)
        adjList.set(edge.from_node_id, list)
    }

    // DFSで循環検出
    function dfs(nodeId: string, path: string[]): boolean {
        visited.add(nodeId)
        recStack.add(nodeId)
        path.push(nodeId)

        const neighbors = adjList.get(nodeId) || []
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                if (dfs(neighbor, [...path])) {
                    return true
                }
            } else if (recStack.has(neighbor)) {
                // 循環を検出
                const cycleStart = path.indexOf(neighbor)
                const cycle = [...path.slice(cycleStart), neighbor]
                cycles.push(cycle)
                return true
            }
        }

        recStack.delete(nodeId)
        return false
    }

    let hasCycles = false
    for (const node of nodes) {
        if (!visited.has(node.node_id)) {
            if (dfs(node.node_id, [])) {
                hasCycles = true
            }
        }
    }

    // 孤立ノードを検出
    const orphanNodes: string[] = []
    for (const node of nodes) {
        const hasIncoming = edges.some((e: any) => e.to_node_id === node.node_id)
        const hasOutgoing = edges.some((e: any) => e.from_node_id === node.node_id)
        if (!hasIncoming && !hasOutgoing && nodes.length > 1) {
            orphanNodes.push(node.node_id)
        }
    }

    return {
        isValid: !hasCycles,
        hasCycles,
        cycles,
        orphanNodes,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        message: hasCycles
            ? `Graph contains ${cycles.length} cycle(s)`
            : orphanNodes.length > 0
                ? `Graph is valid but has ${orphanNodes.length} orphan node(s)`
                : 'Graph is valid',
    }
}

export async function mcpExecuteGraphWave(db: any, args: any, userId: string) {
    const { goalId, startNodeId } = args
    if (!goalId) throw new Error('goalId is required')

    // Graphを取得
    const { nodes, edges } = await mcpGetGraph(db, { goalId }, userId)

    if (!nodes || nodes.length === 0) {
        return { waves: [], message: 'Graph is empty' }
    }

    // トポロジカルソート（Kahnのアルゴリズム）
    const inDegree = new Map<string, number>()
    const adjList = new Map<string, string[]>()

    // 初期化
    for (const node of nodes) {
        inDegree.set(node.node_id, 0)
        adjList.set(node.node_id, [])
    }

    // 依存関係を構築
    for (const edge of edges) {
        const list = adjList.get(edge.from_node_id) || []
        list.push(edge.to_node_id)
        adjList.set(edge.from_node_id, list)
        inDegree.set(edge.to_node_id, (inDegree.get(edge.to_node_id) || 0) + 1)
    }

    // 開始ノードが指定されている場合は、そこから開始
    const queue: string[] = []
    if (startNodeId) {
        const startNode = nodes.find((n: any) => n.node_id === startNodeId)
        if (!startNode) {
            throw new Error(`Start node not found: ${startNodeId}`)
        }
        if (inDegree.get(startNodeId) === 0) {
            queue.push(startNodeId)
        }
    } else {
        // 0入力のノードから開始
        for (const [nodeId, degree] of inDegree.entries()) {
            if (degree === 0) {
                queue.push(nodeId)
            }
        }
    }

    // Wave実行順序を計算
    const waves: string[][] = []
    const processed = new Set<string>()

    while (queue.length > 0) {
        const currentWave: string[] = []
        const waveSize = queue.length

        for (let i = 0; i < waveSize; i++) {
            const nodeId = queue.shift()!
            currentWave.push(nodeId)
            processed.add(nodeId)

            const neighbors = adjList.get(nodeId) || []
            for (const neighbor of neighbors) {
                const newDegree = (inDegree.get(neighbor) || 0) - 1
                inDegree.set(neighbor, newDegree)
                if (newDegree === 0 && !processed.has(neighbor)) {
                    queue.push(neighbor)
                }
            }
        }

        if (currentWave.length > 0) {
            waves.push(currentWave)
        }
    }

    // 未処理のノードがある場合は循環がある
    const unprocessed = nodes.filter((n: any) => !processed.has(n.node_id))

    return {
        waves,
        totalWaves: waves.length,
        processedNodes: processed.size,
        unprocessedNodes: unprocessed.map((n: any) => n.node_id),
        message:
            unprocessed.length > 0
                ? `Partial execution: ${unprocessed.length} node(s) unreachable (possible cycle)`
                : `Execution plan: ${waves.length} wave(s)`,
    }
}

// ============================================
// Vector Search Operations (3-Layer Protocol)
// ============================================

/**
 * Helper: Convert buffer to embedding array
 */
function bufferToEmbedding(buffer: Uint8Array): number[] {
    const float32Array = new Float32Array(buffer.buffer)
    return Array.from(float32Array)
}

/**
 * Helper: Calculate cosine similarity
 */
function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error('Embeddings must have the same dimensions')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i]
        normA += a[i] * a[i]
        normB += b[i] * b[i]
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Generate embedding using Vertex AI API (Legacy local function for semantic search)
 * @deprecated Use generateEmbedding from @/lib/turso/embeddings instead
 */
async function generateEmbeddingLegacy(
    text: string,
    credentials: Record<string, unknown>
): Promise<{ embedding: number[]; dimensions: number }> {
    const { GoogleAuth } = await import('google-auth-library')

    const EMBEDDING_MODEL = 'text-embedding-004'
    const EMBEDDING_DIMENSIONS = 768
    const API_URL = `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.VERTEX_PROJECT_ID}/locations/us-central1/publishers/google/models/${EMBEDDING_MODEL}:predict`

    const auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    })

    const accessToken = await auth.getAccessToken()

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
            instances: [{ content: text }],
        }),
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Vertex AI API error (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    const embedding = data.predictions[0].embeddings.values as number[]

    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Invalid embedding dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${embedding?.length}`)
    }

    return { embedding, dimensions: embedding.length }
}

/**
 * Layer 1: Search Memory (Index Layer)
 * Returns only IDs and similarity scores
 */
export async function mcpSearchMemory(db: any, args: any, userId: string) {
    const { query, layer = 'index', limit = 10, type = 'all', ids, depth_before = 3, depth_after = 3 } = args

    // Get user's Vertex AI credentials
    const userResult = await db.execute({
        sql: `SELECT vertex_ai_api_key FROM members WHERE id = ?`,
        args: [userId],
    })

    if (userResult.rows.length === 0 || !userResult.rows[0][0]) {
        throw new Error('Vertex AI credentials not configured. Please set up your GCP service account in settings.')
    }

    let credentials: Record<string, unknown>
    try {
        credentials = JSON.parse(userResult.rows[0][0] as string)
    } catch {
        throw new Error('Invalid credentials format')
    }

    // Handle different layers
    if (layer === 'full' && ids && Array.isArray(ids) && ids.length > 0) {
        return await getFullDetails(db, ids, type)
    }

    if (layer === 'timeline') {
        if (ids && Array.isArray(ids) && ids.length > 0) {
            return await getTimeline(db, ids, depth_before, depth_after, type)
        }
        if (query) {
            // Find anchor by search first
            const searchResults = await searchIndex(db, query, credentials, 1, type)
            if (searchResults.results.length > 0) {
                return await getTimeline(db, [searchResults.results[0].id], depth_before, depth_after, type)
            }
        }
        return { observations: [] }
    }

    // Default: index layer
    return await searchIndex(db, query, credentials, limit, type)
}

/**
 * Index search - returns IDs and scores only
 */
async function searchIndex(
    db: any,
    query: string,
    credentials: Record<string, unknown>,
    limit: number,
    type: string
) {
    // Generate embedding for query
    const { embedding: queryEmbedding } = await generateEmbeddingLegacy(query, credentials)

    // Determine which tables to search
    const tables: string[] = []
    if (type === 'all' || type === 'learning_item') {
        tables.push('yarikiru_learning_items')
    }

    const results: Array<{ id: string; score: number; type: string }> = []

    for (const table of tables) {
        const sql = `SELECT id, embedding FROM ${table} WHERE embedding IS NOT NULL AND user_id = ?`
        const itemsResult = await db.execute({ sql, args: ['user_39sGQ4PcU2NitBLghsqblRKuUr2'] })

        for (const row of itemsResult.rows) {
            const id = row[0] as string
            const embedding = row[1] as Uint8Array
            const itemEmbedding = bufferToEmbedding(embedding)
            const score = cosineSimilarity(queryEmbedding, itemEmbedding)

            results.push({
                id,
                score,
                type: table === 'yarikiru_learning_items' ? 'learning_item' : table,
            })
        }
    }

    // Sort by similarity (descending) and limit results
    const sorted = results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)

    return {
        results: sorted,
        query_dimension: queryEmbedding.length,
    }
}

/**
 * Timeline layer - returns context around specified IDs
 */
async function getTimeline(db: any, ids: string[], depthBefore: number, depthAfter: number, type: string) {
    let table = 'yarikiru_learning_items'
    if (type === 'learning_item') {
        table = 'yarikiru_learning_items'
    }

    const placeholders = ids.map(() => '?').join(',')
    const sql = `
        SELECT * FROM ${table}
        WHERE id IN (${placeholders})
        ORDER BY created_at DESC
    `

    const result = await db.execute({ sql, args: ids })

    return {
        observations: result.rows.map((row: any) => ({
            id: row[0],
            // Map other columns based on table structure
        })),
    }
}

/**
 * Full details layer - returns complete observations
 */
async function getFullDetails(db: any, ids: string[], type: string) {
    let table = 'yarikiru_learning_items'
    if (type === 'learning_item') {
        table = 'yarikiru_learning_items'
    }

    const placeholders = ids.map(() => '?').join(',')
    const sql = `
        SELECT * FROM ${table}
        WHERE id IN (${placeholders})
        ORDER BY created_at DESC
    `

    const result = await db.execute({ sql, args: ids })

    return {
        observations: result.rows.map((row: any) => ({
            id: row[0],
            // Map other columns based on table structure
        })),
    }
}

// ============================================
// GitHub Integration Operations
// ============================================

export async function mcpListGitHubRepositories(db: any, args: any, userId: string) {
    const { includeInactive = false } = args

    const sql = includeInactive
        ? `SELECT id, user_id, github_id, name, full_name, owner_login, description, url, language, stargazers_count, is_active, created_at, updated_at
           FROM github_repositories
           WHERE user_id = ?
           ORDER BY created_at DESC`
        : `SELECT id, user_id, github_id, name, full_name, owner_login, description, url, language, stargazers_count, is_active, created_at, updated_at
           FROM github_repositories
           WHERE user_id = ? AND is_active = 1
           ORDER BY created_at DESC`

    const result = await db.execute({ sql, args: [userId] })

    return {
        repositories: result.rows.map((row: any) => ({
            id: row[0],
            userId: row[1],
            githubId: row[2],
            name: row[3],
            fullName: row[4],
            ownerLogin: row[5],
            description: row[6],
            url: row[7],
            language: row[8],
            stargazersCount: row[9],
            isActive: row[10] === 1,
            createdAt: row[11],
            updatedAt: row[12],
        })),
    }
}

export async function mcpRegisterGitHubRepository(db: any, args: any, userId: string) {
    const { githubId, name, fullName, ownerLogin, description, url, language, stargazersCount } = args

    if (!githubId || !name || !fullName || !ownerLogin || !url) {
        throw new Error('Missing required fields: githubId, name, fullName, ownerLogin, url')
    }

    // Check if repository already exists
    const existingResult = await db.execute({
        sql: `SELECT id FROM github_repositories WHERE github_id = ? AND user_id = ?`,
        args: [githubId, userId],
    })

    if (existingResult.rows.length > 0) {
        const existingId = existingResult.rows[0][0]

        // Update existing repository
        const updateFields: string[] = []
        const updateValues: (string | number | null)[] = []

        if (description !== undefined) {
            updateFields.push('description = ?')
            updateValues.push(description)
        }
        if (language !== undefined) {
            updateFields.push('language = ?')
            updateValues.push(language)
        }
        if (stargazersCount !== undefined) {
            updateFields.push('stargazers_count = ?')
            updateValues.push(stargazersCount)
        }

        if (updateFields.length > 0) {
            updateFields.push('updated_at = datetime(\'now\')')
            updateValues.push(existingId, userId)

            await db.execute({
                sql: `UPDATE github_repositories SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`,
                args: updateValues,
            })
        }

        // Fetch and return updated repository
        const result = await db.execute({
            sql: `SELECT id, user_id, github_id, name, full_name, owner_login, description, url, language, stargazers_count, is_active, created_at, updated_at
                   FROM github_repositories WHERE id = ?`,
            args: [existingId],
        })

        const row = result.rows[0]
        return {
            repository: {
                id: row[0],
                userId: row[1],
                githubId: row[2],
                name: row[3],
                fullName: row[4],
                ownerLogin: row[5],
                description: row[6],
                url: row[7],
                language: row[8],
                stargazersCount: row[9],
                isActive: row[10] === 1,
                createdAt: row[11],
                updatedAt: row[12],
            },
        }
    }

    // Create new repository
    const repoId = crypto.randomUUID()

    await db.execute({
        sql: `INSERT INTO github_repositories (id, user_id, github_id, name, full_name, owner_login, description, url, language, stargazers_count, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [repoId, userId, githubId, name, fullName, ownerLogin, description || null, url, language || null, stargazersCount || 0],
    })

    const result = await db.execute({
        sql: `SELECT id, user_id, github_id, name, full_name, owner_login, description, url, language, stargazers_count, is_active, created_at, updated_at
               FROM github_repositories WHERE id = ?`,
        args: [repoId],
    })

    const row = result.rows[0]
    return {
        repository: {
            id: row[0],
            userId: row[1],
            githubId: row[2],
            name: row[3],
            fullName: row[4],
            ownerLogin: row[5],
            description: row[6],
            url: row[7],
            language: row[8],
            stargazersCount: row[9],
            isActive: row[10] === 1,
            createdAt: row[11],
            updatedAt: row[12],
        },
    }
}

// ============================================
// Ideas (Quick Capture) Operations
// ============================================

export async function mcpListIdeas(db: any, args: any, userId: string) {
    const { status, limit } = args

    let sql = `SELECT id, user_id, title, description, status, created_at, updated_at FROM ideas WHERE user_id = ?`
    const sqlArgs: (string | number)[] = [userId]

    if (status && ['draft', 'registered', 'archived'].includes(status)) {
        sql += ' AND status = ?'
        sqlArgs.push(status)
    }

    sql += ' ORDER BY created_at DESC'

    if (limit && typeof limit === 'number') {
        sql += ' LIMIT ?'
        sqlArgs.push(limit)
    }

    const result = await db.execute({ sql, args: sqlArgs })

    return {
        ideas: await Promise.all(result.rows.map(async (row: any) => ({
            id: row[0],
            userId: row[1],
            title: await decryptFromDb(row[2]),
            description: row[3] ? await decryptFromDb(row[3]) : null,
            status: row[4],
            createdAt: row[5],
            updatedAt: row[6],
        }))),
    }
}

export async function mcpCreateIdea(db: any, args: any, userId: string) {
    const { title, description } = args

    if (!title || typeof title !== 'string' || !title.trim()) {
        throw new Error('title is required and must be a non-empty string')
    }

    if (title.length > 200) {
        throw new Error('title must be 200 characters or less')
    }

    const ideaId = crypto.randomUUID()
    const encryptedTitle = await encryptForDb(title.trim())
    const encryptedDescription = description ? await encryptForDb(description.trim()) : null

    await db.execute({
        sql: `INSERT INTO ideas (id, user_id, title, description, status) VALUES (?, ?, ?, ?, 'draft')`,
        args: [ideaId, userId, encryptedTitle, encryptedDescription],
    })

    const result = await db.execute({
        sql: `SELECT id, user_id, title, description, status, created_at, updated_at FROM ideas WHERE id = ?`,
        args: [ideaId],
    })

    const row = result.rows[0]
    return {
        idea: {
            id: row[0],
            userId: row[1],
            title: await decryptFromDb(row[2]),
            description: row[3] ? await decryptFromDb(row[3]) : null,
            status: row[4],
            createdAt: row[5],
            updatedAt: row[6],
        },
    }
}

export async function mcpUpdateIdeaStatus(db: any, args: any, userId: string) {
    const { ideaId, status } = args

    if (!ideaId) {
        throw new Error('ideaId is required')
    }

    if (!status || !['draft', 'registered', 'archived'].includes(status)) {
        throw new Error('status must be one of: draft, registered, archived')
    }

    // Verify ownership
    const ownershipCheck = await db.execute({
        sql: `SELECT id FROM ideas WHERE id = ? AND user_id = ?`,
        args: [ideaId, userId],
    })

    if (ownershipCheck.rows.length === 0) {
        throw new Error('Idea not found or unauthorized')
    }

    await db.execute({
        sql: `UPDATE ideas SET status = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`,
        args: [status, ideaId, userId],
    })

    const result = await db.execute({
        sql: `SELECT id, user_id, title, description, status, created_at, updated_at FROM ideas WHERE id = ?`,
        args: [ideaId],
    })

    const row = result.rows[0]
    return {
        idea: {
            id: row[0],
            userId: row[1],
            title: await decryptFromDb(row[2]),
            description: row[3] ? await decryptFromDb(row[3]) : null,
            status: row[4],
            createdAt: row[5],
            updatedAt: row[6],
        },
    }
}

// ============================================
// Loop Detection & Weekly Report
// ============================================

export async function mcpDetectLoops(db: any, args: any, userId: string) {
    const { goalId } = args
    if (!goalId) {
        throw new Error('goalId is required')
    }

    // A simple loop detection logic:
    // If there are more than 5 work logs for the same goal within the last 24 hours,
    // and the goal is not 'done', we consider it in a loop.
    const logsResult = await db.execute({
        sql: `
            SELECT COUNT(*) 
            FROM yarikiru_work_logs wl
            JOIN yarikiru_goals g ON wl.goal_id = g.id
            JOIN yarikiru_projects p ON g.project_id = p.id
            WHERE p.user_id = ? 
              AND wl.goal_id = ? 
              AND wl.created_at >= datetime('now', '-1 day')
              AND g.status != 'done'
        `,
        args: [userId, goalId],
    })

    const count = Number(logsResult.rows[0][0] || 0)
    const isLooping = count >= 5

    return {
        isLooping,
        count,
        message: isLooping ? '💡 このタスクでスタック（ループ）していませんか？細分化するか、気分転換をおすすめします。' : null
    }
}

export async function mcpGenerateWeeklyReport(db: any, args: any, userId: string) {
    // Aggregate work logs and completed goals for the past 7 days
    const statsResult = await db.execute({
        sql: `
            SELECT 
                COUNT(wl.id) as sessions_count,
                COALESCE(SUM(wl.duration_minutes), 0) as total_minutes
            FROM yarikiru_work_logs wl
            JOIN yarikiru_goals g ON wl.goal_id = g.id
            JOIN yarikiru_projects p ON g.project_id = p.id
            WHERE p.user_id = ? 
              AND wl.created_at >= datetime('now', '-7 days')
        `,
        args: [userId],
    })

    const goalsResult = await db.execute({
        sql: `
            SELECT 
                g.id, g.title, g.actual_minutes, g.learning, p.title as project_title, g.completed_at
            FROM yarikiru_goals g
            JOIN yarikiru_projects p ON g.project_id = p.id
            WHERE p.user_id = ? 
              AND g.status = 'done'
              AND g.completed_at >= datetime('now', '-7 days')
            ORDER BY g.completed_at DESC
        `,
        args: [userId],
    })

    const completedGoals = await Promise.all(goalsResult.rows.map(async (row: any) => ({
        id: String(row[0]),
        title: await decryptFromDb(String(row[1])),
        actualMinutes: Number(row[2]) || 0,
        learning: row[3] ? await decryptFromDb(String(row[3])) : null,
        projectTitle: await decryptFromDb(String(row[4])),
        completedAt: String(row[5])
    })))

    return {
        success: true,
        report: {
            totalMinutes: Number(statsResult.rows[0][1] || 0),
            sessionsCount: Number(statsResult.rows[0][0] || 0),
            completedGoals
        }
    }
}

// ============================================
// Sync Operations (GSD Integration)
// ============================================

export async function mcpSyncPlanning(dbClient: any, args: any, userId: string) {
    const { projectData, goalsData, stateData, planningPath, forceCreate } = args;
    if (!projectData) throw new Error('projectData is required');
    if (!goalsData || !Array.isArray(goalsData)) throw new Error('goalsData array is required');

    // @ts-ignore - DB Client uses wrapper or drizzle
    const db = drizzle(dbClient, { schema });

    // 1. PROJECT SYNC -- Match by planningPath or use latest active
    let projects = await db
        .select()
        .from(schema.yarikiruProjects)
        .where(
            and(
                eq(schema.yarikiruProjects.userId, userId),
                eq(schema.yarikiruProjects.status, 'active')
            )
        )
        .orderBy(desc(schema.yarikiruProjects.createdAt));

    let projectId: string;
    const encProjectTitle = await encryptForDb(projectData.title || 'GSD Project');
    const encProjectDesc = projectData.description ? await encryptForDb(projectData.description) : null;
    const encStateData = stateData ? await encryptForDb(stateData) : null;

    const phaseContentsObj: Record<string, { plan?: string; summary?: string; verification?: string }> = {};
    for (const p of goalsData) {
        if (p.plan || p.summary || p.verification || p.description) {
            phaseContentsObj[p.title] = {
                plan: p.plan ?? p.description ?? '',
                summary: p.summary ?? '',
                verification: p.verification ?? '',
            };
        }
    }
    const encPhaseContents = Object.keys(phaseContentsObj).length > 0
        ? await encryptForDb(JSON.stringify(phaseContentsObj))
        : null;

    const resolvedPath = planningPath ? String(planningPath) : null;
    const matchedByPath = resolvedPath
        ? projects.find((p) => p.planningPath === resolvedPath)
        : null;

    if (matchedByPath) {
        projectId = matchedByPath.id;
        await db.update(schema.yarikiruProjects)
            .set({
                title: encProjectTitle,
                description: encProjectDesc,
                systemStateMd: encStateData,
                planningPath: resolvedPath,
                phaseContents: encPhaseContents,
                updatedAt: sql`(datetime('now'))`
            })
            .where(eq(schema.yarikiruProjects.id, projectId));
    } else if (resolvedPath || projects.length === 0 || forceCreate) {
        // 新規 planningPath / プロジェクトなし / import 時は常に新規作成
        projectId = `p_${Date.now()}_sync`;
        await db.insert(schema.yarikiruProjects).values({
            id: projectId,
            userId: userId,
            title: encProjectTitle,
            description: encProjectDesc,
            systemStateMd: encStateData,
            planningPath: resolvedPath,
            phaseContents: encPhaseContents,
        });
    } else {
        // 後方互換: planningPath なし & 既存プロジェクトあり → 最新を更新
        projectId = projects[0].id;
        await db.update(schema.yarikiruProjects)
            .set({
                title: encProjectTitle,
                description: encProjectDesc,
                systemStateMd: encStateData,
                planningPath: resolvedPath,
                phaseContents: encPhaseContents,
                updatedAt: sql`(datetime('now'))`
            })
            .where(eq(schema.yarikiruProjects.id, projectId));
    }

    // 2. GOALS SYNC -- Match by decrypted title
    const existingGoals = await db.select().from(schema.yarikiruGoals).where(eq(schema.yarikiruGoals.projectId, projectId));
    const decGoals = await Promise.all(existingGoals.map(async g => ({
        id: g.id,
        title: await decryptFromDb(g.title)
    })));

    for (const phase of goalsData) {
        let goalId;
        const matchedGoal = decGoals.find(g => g.title === phase.title);

        const encTitle = await encryptForDb(phase.title);
        const encDesc = phase.description ? await encryptForDb(phase.description) : null;

        if (matchedGoal) {
            goalId = matchedGoal.id;
            await db.update(schema.yarikiruGoals)
                .set({ description: encDesc })
                .where(eq(schema.yarikiruGoals.id, goalId));
        } else {
            goalId = `g_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            await db.insert(schema.yarikiruGoals).values({
                id: goalId,
                projectId: projectId,
                title: encTitle,
                description: encDesc,
                estimatedMinutes: 60,
                status: phase.status || 'todo',
                priority: 1,
            });
        }

        // 3. SUBTASKS SYNC -- Match by decrypted label
        if (phase.tasks && Array.isArray(phase.tasks)) {
            const existingSubTasks = await db.select().from(schema.yarikiruSubTasks).where(eq(schema.yarikiruSubTasks.goalId, goalId));
            const decSubTasks = await Promise.all(existingSubTasks.map(async s => ({
                id: s.id,
                label: await decryptFromDb(s.label),
                isDone: s.isDone
            })));

            for (let i = 0; i < phase.tasks.length; i++) {
                const phaseTask = phase.tasks[i];
                const matchedTask = decSubTasks.find(s => s.label === phaseTask.label);

                if (matchedTask) {
                    await db.update(schema.yarikiruSubTasks)
                        .set({ sortOrder: i })
                        .where(eq(schema.yarikiruSubTasks.id, matchedTask.id));
                } else {
                    const subTaskId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                    const encLabel = await encryptForDb(phaseTask.label);

                    await db.insert(schema.yarikiruSubTasks).values({
                        id: subTaskId,
                        goalId: goalId,
                        label: encLabel,
                        sortOrder: i,
                        isDone: phaseTask.status === 'done' ? 1 : 0
                    });
                }
            }
        }
    }

    return { success: true, projectId };
}
