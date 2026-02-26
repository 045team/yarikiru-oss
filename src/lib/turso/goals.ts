import { execute, executeOne, executeWithMVCC } from './client'
import { encryptForDb, decryptFromDb } from '@/lib/e2ee'

async function decryptGoal(g: any): Promise<any> {
    if (!g) return g;
    const decrypted = { ...g };
    if (g.title) decrypted.title = await decryptFromDb(g.title);
    if (g.description) decrypted.description = await decryptFromDb(g.description);
    if (g.context) decrypted.context = await decryptFromDb(g.context);

    if (g.decomposition_metadata) {
        try {
            const decMeta = await decryptFromDb(g.decomposition_metadata);
            decrypted.decomposition_metadata = JSON.parse(decMeta);
        } catch (e) {
            console.error('Failed to parse decomposition_metadata:', e)
        }
    }
    return decrypted;
}

async function decryptGeneratedTask(t: any): Promise<any> {
    if (!t) return t;
    const decrypted = { ...t };
    if (t.title) decrypted.title = await decryptFromDb(t.title);
    if (t.description) decrypted.description = await decryptFromDb(t.description);

    if (t.subtasks) {
        try {
            const decSubtasks = await decryptFromDb(t.subtasks);
            decrypted.subtasks = JSON.parse(decSubtasks);
        } catch (e) {
            console.error('Failed to parse subtasks:', e)
            decrypted.subtasks = [];
        }
    }
    return decrypted;
}

// ============================================
// Goals & AI-Generated Tasks
// ============================================

export async function createGoal(data: {
    user_id: string
    title: string
    description: string
    deadline: string
    available_hours_per_day: number
    context?: string
    decomposition_metadata?: any
}): Promise<any> {
    const id = crypto.randomUUID()

    const encTitle = await encryptForDb(data.title)
    const encDesc = await encryptForDb(data.description)
    const encContext = data.context ? await encryptForDb(data.context) : null
    const encDecMeta = data.decomposition_metadata ? await encryptForDb(JSON.stringify(data.decomposition_metadata)) : null

    const sql = `
    INSERT INTO goals (
      id, user_id, title, description, deadline, available_hours_per_day,
      context, status, decomposition_metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `
    const [result] = await execute(sql, [
        id,
        data.user_id,
        encTitle,
        encDesc,
        data.deadline,
        data.available_hours_per_day,
        encContext,
        'active',
        encDecMeta,
    ])
    return decryptGoal(result!)
}

export async function getGoalById(goalId: string): Promise<any | null> {
    const sql = `SELECT * FROM goals WHERE id = ?`
    const result = await executeOne(sql, [goalId])
    return result ? await decryptGoal(result) : null
}

export async function getGoalsByUserId(userId: string): Promise<any[]> {
    const sql = `
    SELECT * FROM goals
    WHERE user_id = ?
    ORDER BY created_at DESC
  `
    const results = await execute(sql, [userId])
    return Promise.all(results.map(r => decryptGoal(r)))
}

export async function updateGoalStatus(goalId: string, status: string): Promise<any | null> {
    const sql = `
    UPDATE goals
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    RETURNING *
  `
    const result = await executeOne(sql, [status, goalId])
    return result ? await decryptGoal(result) : null
}

export async function updateGoal(goalId: string, data: {
    title?: string
    description?: string
}): Promise<any | null> {
    const updates: string[] = []
    const values: any[] = []

    if (data.title !== undefined) {
        updates.push('title = ?')
        values.push(await encryptForDb(data.title))
    }
    if (data.description !== undefined) {
        updates.push('description = ?')
        values.push(await encryptForDb(data.description))
    }

    if (updates.length === 0) return await getGoalById(goalId)

    values.push(goalId)
    const sql = `
    UPDATE goals
    SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    RETURNING *
  `
    const result = await executeOne(sql, values)
    return result ? await decryptGoal(result) : null
}

export async function createGeneratedTasks(goalId: string, tasks: any[]): Promise<any[]> {
    const createdTasks: any[] = []
    for (const task of tasks) {
        const taskId = crypto.randomUUID()

        const encTitle = await encryptForDb(task.title)
        const encSubtasks = await encryptForDb(JSON.stringify(task.subTasks || []))

        const sql = `
      INSERT INTO generated_tasks (
        id, goal_id, title, description, priority, order_index,
        estimated_minutes, status, subtasks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `
        const [result] = await execute(sql, [
            taskId,
            goalId,
            encTitle,
            null, // description - can be added later
            task.priority,
            task.order,
            task.estimatedMinutes,
            'pending',
            encSubtasks,
        ])
        createdTasks.push(await decryptGeneratedTask(result!))
    }
    return createdTasks
}

export async function getTasksByGoalId(goalId: string): Promise<any[]> {
    const sql = `
    SELECT * FROM generated_tasks
    WHERE goal_id = ?
    ORDER BY order_index ASC
  `
    const results = await execute(sql, [goalId])
    return Promise.all(results.map(r => decryptGeneratedTask(r)))
}

export async function updateGeneratedTaskStatus(taskId: string, status: string): Promise<any | null> {
    const sql = `
    UPDATE generated_tasks
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    RETURNING *
  `
    const result = await executeOne(sql, [status, taskId])
    return result ? await decryptGeneratedTask(result) : null
}

export async function updateSubtaskStatus(
    taskId: string,
    subtaskIndex: number,
    completed: boolean
): Promise<any | null> {
    const task = await getTaskById(taskId) // Instead of raw execute, use our decrypt helper to get actual array
    if (!task) return null

    let subtasks = task.subtasks || []
    if (subtaskIndex >= 0 && subtaskIndex < subtasks.length) {
        subtasks[subtaskIndex].completed = completed
    }

    const encSubtasks = await encryptForDb(JSON.stringify(subtasks))

    const sql = `
    UPDATE generated_tasks
    SET subtasks = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    RETURNING *
  `
    const result = await executeOne(sql, [encSubtasks, taskId])
    return result ? await decryptGeneratedTask(result) : null
}

// We also need a helper for getTaskById since updateSubtaskStatus relies on it now
async function getTaskById(taskId: string): Promise<any | null> {
    const sql = `SELECT * FROM generated_tasks WHERE id = ?`
    const result = await executeOne(sql, [taskId])
    return result ? decryptGeneratedTask(result) : null
}

export async function toggleTaskUrgent(taskId: string): Promise<any | null> {
    const sqlSelect = 'SELECT is_urgent FROM generated_tasks WHERE id = ?'
    const task = await executeOne(sqlSelect, [taskId])
    if (!task) return null

    const currentUrgent = (task as any).is_urgent === 1
    const newUrgent = currentUrgent ? 0 : 1

    const sql = `
    UPDATE generated_tasks
    SET is_urgent = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    RETURNING *
  `
    const result = await executeOne(sql, [newUrgent, taskId])
    return result ? await decryptGeneratedTask(result) : null
}

export async function getUrgentTasksByGoal(goalId: string): Promise<any[]> {
    const sql = `
    SELECT * FROM generated_tasks
    WHERE goal_id = ? AND is_urgent = 1
    ORDER BY priority ASC, created_at ASC
  `
    const results = await execute(sql, [goalId])
    return Promise.all(results.map(r => decryptGeneratedTask(r)))
}

export async function deleteGoal(goalId: string): Promise<boolean> {
    await execute('DELETE FROM generated_tasks WHERE goal_id = ?', [goalId])
    const sql = `DELETE FROM goals WHERE id = ?`
    const result = await execute(sql, [goalId])
    return result.length > 0
}

export async function getGoalProgress(goalId: string): Promise<{
    totalTasks: number
    completedTasks: number
    totalSubtasks: number
    completedSubtasks: number
    completionPercentage: number
} | null> {
    const tasks = await getTasksByGoalId(goalId)

    let totalSubtasks = 0
    let completedSubtasks = 0
    let completedTasks = 0

    for (const task of tasks) {
        const taskSubtasks = task.subtasks || []
        totalSubtasks += taskSubtasks.length

        const taskCompleted = taskSubtasks.every((st: any) => st.completed)
        if (taskCompleted) {
            completedTasks++
        }

        for (const subtask of taskSubtasks) {
            if (subtask.completed) {
                completedSubtasks++
            }
        }
    }

    const completionPercentage = totalSubtasks > 0
        ? (completedSubtasks / totalSubtasks) * 100
        : 0

    return {
        totalTasks: tasks.length,
        completedTasks,
        totalSubtasks,
        completedSubtasks,
        completionPercentage,
    }
}
