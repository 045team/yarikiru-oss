import { execute, executeOne, executeWithMVCC } from './client'
import {
    ProjectSchema,
    MilestoneSchema,
    ProjectTaskSchema,
} from '@/lib/validation/schemas'
import type {
    Project,
    ProjectInsert,
    ProjectUpdate,
    Milestone,
    MilestoneInsert,
    MilestoneUpdate,
    ProjectTask,
    ProjectTaskInsert,
    ProjectTaskUpdate,
    ProjectSolutionLink,
} from '@/types/turso'
import { encryptForDb, decryptFromDb } from '@/lib/e2ee'

async function decryptProject<T extends Project>(p: T): Promise<T> {
    if (!p) return p;
    return {
        ...p,
        name: p.name ? await decryptFromDb(p.name) : p.name,
        description: p.description ? await decryptFromDb(p.description) : p.description
    };
}

async function decryptMilestone(m: Milestone): Promise<Milestone> {
    if (!m) return m;
    return {
        ...m,
        name: m.name ? await decryptFromDb(m.name) : m.name,
        description: m.description ? await decryptFromDb(m.description) : m.description
    };
}

async function decryptTask(t: ProjectTask): Promise<ProjectTask> {
    if (!t) return t;
    return {
        ...t,
        title: t.title ? await decryptFromDb(t.title) : t.title,
        description: t.description ? await decryptFromDb(t.description) : t.description
    };
}

// ============================================
// Projects
// ============================================

export async function getProjectsByUserId(userId: string): Promise<Project[]> {
    const sql = `
    SELECT p.*, COUNT(DISTINCT pt.id) as task_count
    FROM projects p
    LEFT JOIN project_tasks pt ON p.id = pt.project_id
    WHERE p.user_id = ?
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `
    const results = await execute<Project>(sql, [userId])
    return Promise.all(results.map(p => decryptProject(p)))
}

export async function getProjectById(projectId: string): Promise<Project | null> {
    const sql = `SELECT * FROM projects WHERE id = ?`
    const result = await executeOne<Project>(sql, [projectId])
    return result ? decryptProject(result) : null
}

export async function createProject(data: ProjectInsert): Promise<Project> {
    const validated = ProjectSchema.parse(data)
    const id = crypto.randomUUID()

    const encryptedName = await encryptForDb(validated.name)
    const encryptedDescription = validated.description ? await encryptForDb(validated.description) : null

    const sql = `
    INSERT INTO projects (
      id, user_id, name, description, status, start_date, target_end_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `
    const [result] = await executeWithMVCC<Project>(sql, [
        id,
        validated.user_id,
        encryptedName,
        encryptedDescription,
        validated.status,
        validated.start_date || null,
        validated.target_end_date || null,
    ])
    return decryptProject(result!)
}

export async function updateProject(projectId: string, data: ProjectUpdate): Promise<Project | null> {
    const fields: string[] = []
    const values: (string | number | boolean | null)[] = []

    if (data.name !== undefined) {
        fields.push('name = ?')
        values.push(await encryptForDb(data.name))
    }
    if (data.description !== undefined) {
        fields.push('description = ?')
        values.push(data.description ? await encryptForDb(data.description) : null)
    }
    if (data.status !== undefined) {
        fields.push('status = ?')
        values.push(data.status)
    }
    if (data.start_date !== undefined) {
        fields.push('start_date = ?')
        values.push(data.start_date)
    }
    if (data.target_end_date !== undefined) {
        fields.push('target_end_date = ?')
        values.push(data.target_end_date)
    }
    if (data.actual_end_date !== undefined) {
        fields.push('actual_end_date = ?')
        values.push(data.actual_end_date)
    }

    if (fields.length === 0) return await getProjectById(projectId)

    values.push(projectId)
    const sql = `
    UPDATE projects
    SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    RETURNING *
  `
    const result = await executeOne<Project>(sql, values)
    return result ? decryptProject(result) : null
}

export async function deleteProject(projectId: string): Promise<boolean> {
    const sql = `DELETE FROM projects WHERE id = ?`
    const result = await execute(sql, [projectId])
    return result.length > 0
}

// ============================================
// Milestones
// ============================================

export async function getMilestonesByProject(projectId: string): Promise<Milestone[]> {
    const sql = `
    SELECT * FROM milestones
    WHERE project_id = ?
    ORDER BY target_date ASC
  `
    const results = await execute<Milestone>(sql, [projectId])
    return Promise.all(results.map(m => decryptMilestone(m)))
}

export async function getMilestoneById(milestoneId: string): Promise<Milestone | null> {
    const sql = `SELECT * FROM milestones WHERE id = ?`
    const result = await executeOne<Milestone>(sql, [milestoneId])
    return result ? decryptMilestone(result) : null
}

export async function createMilestone(data: MilestoneInsert): Promise<Milestone> {
    const validated = MilestoneSchema.parse(data)
    const id = crypto.randomUUID()

    const encryptedName = await encryptForDb(validated.name)
    const encryptedDescription = validated.description ? await encryptForDb(validated.description) : null

    const sql = `
    INSERT INTO milestones (id, project_id, name, description, target_date, status)
    VALUES (?, ?, ?, ?, ?, ?)
    RETURNING *
  `
    const [result] = await executeWithMVCC<Milestone>(sql, [
        id,
        validated.project_id,
        encryptedName,
        encryptedDescription,
        validated.target_date,
        validated.status,
    ])
    return decryptMilestone(result!)
}

export async function updateMilestone(milestoneId: string, data: MilestoneUpdate): Promise<Milestone | null> {
    const fields: string[] = []
    const values: (string | number | boolean | null)[] = []

    if (data.name !== undefined) {
        fields.push('name = ?')
        values.push(await encryptForDb(data.name))
    }
    if (data.description !== undefined) {
        fields.push('description = ?')
        values.push(data.description ? await encryptForDb(data.description) : null)
    }
    if (data.target_date !== undefined) {
        fields.push('target_date = ?')
        values.push(data.target_date)
    }
    if (data.status !== undefined) {
        fields.push('status = ?')
        values.push(data.status)
    }

    if (fields.length === 0) return await getMilestoneById(milestoneId)

    values.push(milestoneId)
    const sql = `
    UPDATE milestones
    SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    RETURNING *
  `
    const result = await executeOne<Milestone>(sql, values)
    return result ? decryptMilestone(result) : null
}

export async function deleteMilestone(milestoneId: string): Promise<boolean> {
    const sql = `DELETE FROM milestones WHERE id = ?`
    const result = await execute(sql, [milestoneId])
    return result.length > 0
}

// ============================================
// ProjectTasks
// ============================================

export async function getTasksByProject(projectId: string): Promise<ProjectTask[]> {
    const sql = `
    SELECT * FROM project_tasks
    WHERE project_id = ? AND parent_task_id IS NULL
    ORDER BY priority ASC, due_date ASC
  `
    const results = await execute<ProjectTask>(sql, [projectId])
    return Promise.all(results.map(t => decryptTask(t)))
}

export async function getTaskById(taskId: string): Promise<ProjectTask | null> {
    const sql = `SELECT * FROM project_tasks WHERE id = ?`
    const result = await executeOne<ProjectTask>(sql, [taskId])
    return result ? decryptTask(result) : null
}

export async function createTask(data: ProjectTaskInsert): Promise<ProjectTask> {
    const validated = ProjectTaskSchema.parse(data)
    const id = crypto.randomUUID()

    const encryptedTitle = await encryptForDb(validated.title)
    const encryptedDescription = validated.description ? await encryptForDb(validated.description) : null

    const sql = `
    INSERT INTO project_tasks (
      id, project_id, milestone_id, parent_task_id, title, description,
      status, priority, due_date, estimated_hours
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `
    const [result] = await executeWithMVCC<ProjectTask>(sql, [
        id,
        validated.project_id,
        validated.milestone_id || null,
        validated.parent_task_id || null,
        encryptedTitle,
        encryptedDescription,
        validated.status,
        validated.priority,
        validated.due_date || null,
        validated.estimated_hours || null,
    ])
    return decryptTask(result!)
}

export async function updateTask(taskId: string, data: ProjectTaskUpdate): Promise<ProjectTask | null> {
    const fields: string[] = []
    const values: (string | number | boolean | null)[] = []

    if (data.title !== undefined) {
        fields.push('title = ?')
        values.push(await encryptForDb(data.title))
    }
    if (data.description !== undefined) {
        fields.push('description = ?')
        values.push(data.description ? await encryptForDb(data.description) : null)
    }
    if (data.status !== undefined) {
        fields.push('status = ?')
        values.push(data.status)
    }
    if (data.priority !== undefined) {
        fields.push('priority = ?')
        values.push(data.priority)
    }
    if (data.due_date !== undefined) {
        fields.push('due_date = ?')
        values.push(data.due_date)
    }
    if (data.estimated_hours !== undefined) {
        fields.push('estimated_hours = ?')
        values.push(data.estimated_hours)
    }
    if (data.actual_hours !== undefined) {
        fields.push('actual_hours = ?')
        values.push(data.actual_hours)
    }
    if (data.milestone_id !== undefined) {
        fields.push('milestone_id = ?')
        values.push(data.milestone_id)
    }

    if (fields.length === 0) return await getTaskById(taskId)

    values.push(taskId)
    const sql = `
    UPDATE project_tasks
    SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    RETURNING *
  `
    const result = await executeOne<ProjectTask>(sql, values)
    return result ? decryptTask(result) : null
}

export async function deleteTask(taskId: string): Promise<boolean> {
    const sql = `DELETE FROM project_tasks WHERE id = ?`
    const result = await execute(sql, [taskId])
    return result.length > 0
}

export async function getSubTasks(parentTaskId: string): Promise<ProjectTask[]> {
    const sql = `
    SELECT * FROM project_tasks
    WHERE parent_task_id = ?
    ORDER BY priority ASC
  `
    const results = await execute<ProjectTask>(sql, [parentTaskId])
    return Promise.all(results.map(t => decryptTask(t)))
}

// ============================================
// ProjectSolutionLinks
// ============================================

export async function linkProjectToSolution(projectId: string, solutionId: string | number): Promise<ProjectSolutionLink> {
    const id = crypto.randomUUID()
    const sql = `
    INSERT INTO project_solution_links (id, project_id, solution_id)
    VALUES (?, ?, ?)
    RETURNING *
  `
    const [result] = await executeWithMVCC<ProjectSolutionLink>(sql, [id, projectId, String(solutionId)])
    return result!
}

export async function getProjectsBySolutionId(solutionId: string | number): Promise<Project[]> {
    const sql = `
    SELECT p.* FROM projects p
    INNER JOIN project_solution_links psl ON p.id = psl.project_id
    WHERE psl.solution_id = ?
    ORDER BY p.created_at DESC
  `
    const results = await execute<Project>(sql, [String(solutionId)])
    return Promise.all(results.map(p => decryptProject(p)))
}
