import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const yarikiruProjects = sqliteTable('yarikiru_projects', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    systemStateMd: text('system_state_md'),
    status: text('status', { enum: ['active', 'completed', 'archived'] }).default('active').notNull(),
    workspaceId: text('workspace_id'),
    createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const yarikiruGoals = sqliteTable('yarikiru_goals', {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => yarikiruProjects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    estimatedMinutes: integer('estimated_minutes').default(30).notNull(),
    actualMinutes: integer('actual_minutes'),
    aiPredictedMinutes: integer('ai_predicted_minutes'),
    priority: integer('priority').default(0).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    status: text('status', { enum: ['todo', 'in_progress', 'done', 'blocked'] }).default('todo').notNull(),
    startedAt: text('started_at'),
    completedAt: text('completed_at'),
    learning: text('learning'),
    embedding: blob('embedding'),
    createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const yarikiruSubTasks = sqliteTable('yarikiru_sub_tasks', {
    id: text('id').primaryKey(),
    goalId: text('goal_id').notNull().references(() => yarikiruGoals.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    isDone: integer('is_done').default(0).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    startedAt: text('started_at'),
    completedAt: text('completed_at'),
    embedding: blob('embedding'),
    createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});

export const yarikiruWorkLogs = sqliteTable('yarikiru_work_logs', {
    id: text('id').primaryKey(),
    goalId: text('goal_id').notNull().references(() => yarikiruGoals.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    startedAt: text('started_at').notNull(),
    endedAt: text('ended_at'),
    durationMinutes: integer('duration_minutes'),
    notes: text('notes'),
    approach: text('approach'),
    effectiveness: integer('effectiveness'),
    loopDetected: integer('loop_detected').default(0).notNull(),
    embedding: blob('embedding'),
    createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

export const yarikiruLearningItems = sqliteTable('yarikiru_learning_items', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    url: text('url').notNull(),
    title: text('title'),
    what: text('what'),
    how: text('how'),
    impact: text('impact'),
    status: text('status', { enum: ['unread', 'summarized', 'articled'] }).default('unread').notNull(),
    embedding: blob('embedding'),
    createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});
