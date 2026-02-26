/**
 * src/lib/turso/rls.ts
 *
 * Provides Row-Level Security (RLS) enforcement utilities for Turso SQLite.
 * Since SQLite does not have native RLS like PostgreSQL, these functions generate
 * secure subquery conditions to ensure users can only access data they own.
 */

/**
 * Returns the authorization filter for the `yarikiru_projects` table.
 * @param userId - The Clerk User ID
 * @param tableAlias - The alias or table name (default: 'p')
 */
export function enforceProjectRLS(userId: string, tableAlias: string = 'p') {
    return {
        condition: `(${tableAlias}.user_id = ? OR ${tableAlias}.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = ?))`,
        args: [userId, userId]
    }
}

/**
 * Returns the authorization filter for the `yarikiru_goals` table.
 * It enforces ownership by joining with the parent `yarikiru_projects` table.
 * @param userId - The Clerk User ID
 * @param targetIdColumn - The column to check against (default: 'id')
 */
export function enforceGoalRLS(userId: string, targetIdColumn: string = 'id') {
    return {
        condition: `${targetIdColumn} IN (
      SELECT g.id FROM yarikiru_goals g 
      JOIN yarikiru_projects p ON g.project_id = p.id 
      WHERE (p.user_id = ? OR p.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = ?))
    )`,
        args: [userId, userId]
    }
}

/**
 * Returns the authorization filter for the `yarikiru_sub_tasks` table.
 * Enforces ownership by joining upwards all the way to `yarikiru_projects`.
 * @param userId - The Clerk User ID
 * @param targetIdColumn - The column to check against (default: 'id')
 */
export function enforceSubTaskRLS(userId: string, targetIdColumn: string = 'id') {
    return {
        condition: `${targetIdColumn} IN (
      SELECT st.id FROM yarikiru_sub_tasks st 
      JOIN yarikiru_goals g ON st.goal_id = g.id 
      JOIN yarikiru_projects p ON g.project_id = p.id 
      WHERE (p.user_id = ? OR p.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = ?))
    )`,
        args: [userId, userId]
    }
}

/**
 * Returns the authorization filter for the `yarikiru_learnings` table.
 * @param userId - The Clerk User ID
 * @param tableAlias - The alias or table name (default: 'l')
 */
export function enforceLearningRLS(userId: string, tableAlias: string = 'l') {
    return {
        condition: `(${tableAlias}.user_id = ? OR ${tableAlias}.workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = ?))`,
        args: [userId, userId]
    }
}
