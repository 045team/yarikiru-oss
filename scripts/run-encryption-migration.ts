import { createClient } from '@libsql/client';
import { encryptForDb } from '../src/lib/e2ee/index.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_AUTH_TOKEN;

if (!url || !token) {
    console.error('Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
    process.exit(1);
}

const db = createClient({ url, authToken: token });

const ENC_PREFIX = 'ENC:';

async function encryptTextIfNeeded(text?: string | null): Promise<string | null> {
    if (!text) return null;
    if (text.startsWith(ENC_PREFIX)) return text;
    return await encryptForDb(text);
}

async function run() {
    console.log('Starting encryption migration...');
    console.log('Using DB URL:', url);

    // Get seed projects to skip
    const seedProjectsResult = await db.execute("SELECT id FROM yarikiru_projects WHERE title = 'YARIKIRUをやり切る'");
    const skipProjectIds = new Set(seedProjectsResult.rows.map(r => r[0] as string));

    const skipGoalIds = new Set<string>();
    if (skipProjectIds.size > 0) {
        const placeholders = Array.from(skipProjectIds).map(() => '?').join(',');
        const seedGoalsResult = await db.execute({
            sql: `SELECT id FROM yarikiru_goals WHERE project_id IN (${placeholders})`,
            args: Array.from(skipProjectIds)
        });
        seedGoalsResult.rows.forEach(r => skipGoalIds.add(r[0] as string));
    }

    // 1. yarikiru_projects
    console.log('Migrating yarikiru_projects...');
    const projRes = await db.execute('SELECT * FROM yarikiru_projects');
    for (const p of projRes.rows) {
        const id = p.id as string;
        if (skipProjectIds.has(id)) continue;

        const title = await encryptTextIfNeeded(p.title as string);
        const desc = await encryptTextIfNeeded(p.description as string | null);
        if (title !== p.title || desc !== p.description) {
            await db.execute({
                sql: 'UPDATE yarikiru_projects SET title = ?, description = ? WHERE id = ?',
                args: [title, desc, id]
            });
            console.log(`Updated project ${id}`);
        }
    }

    // 2. yarikiru_goals
    console.log('Migrating yarikiru_goals...');
    const goalsRes = await db.execute('SELECT * FROM yarikiru_goals');
    for (const g of goalsRes.rows) {
        const id = g.id as string;
        if (skipGoalIds.has(id)) continue;

        const title = await encryptTextIfNeeded(g.title as string);
        const desc = await encryptTextIfNeeded(g.description as string | null);
        const learning = await encryptTextIfNeeded(g.learning as string | null);

        if (title !== g.title || desc !== g.description || learning !== g.learning) {
            await db.execute({
                sql: 'UPDATE yarikiru_goals SET title = ?, description = ?, learning = ? WHERE id = ?',
                args: [title, desc, learning, id]
            });
            console.log(`Updated goal ${id}`);
        }
    }

    // 3. yarikiru_sub_tasks
    console.log('Migrating yarikiru_sub_tasks...');
    const tasksRes = await db.execute('SELECT * FROM yarikiru_sub_tasks');
    for (const t of tasksRes.rows) {
        const id = t.id as string;
        const goalId = t.goal_id as string;
        if (skipGoalIds.has(goalId)) continue;

        const label = await encryptTextIfNeeded(t.label as string);
        if (label !== t.label) {
            await db.execute({
                sql: 'UPDATE yarikiru_sub_tasks SET label = ? WHERE id = ?',
                args: [label, id]
            });
            console.log(`Updated sub_task ${id}`);
        }
    }

    // 4. yarikiru_learning_items
    console.log('Migrating yarikiru_learning_items...');
    const learnRes = await db.execute('SELECT * FROM yarikiru_learning_items');
    for (const l of learnRes.rows) {
        const id = l.id as string;
        const title = await encryptTextIfNeeded(l.title as string | null);
        const what = await encryptTextIfNeeded(l.what as string | null);
        const how = await encryptTextIfNeeded(l.how as string | null);
        const impact = await encryptTextIfNeeded(l.impact as string | null);

        if (title !== l.title || what !== l.what || how !== l.how || impact !== l.impact) {
            await db.execute({
                sql: 'UPDATE yarikiru_learning_items SET title = ?, what = ?, how = ?, impact = ? WHERE id = ?',
                args: [title, what, how, impact, id]
            });
            console.log(`Updated learning_item ${id}`);
        }
    }

    // 5. yarikiru_work_logs
    console.log('Migrating yarikiru_work_logs...');
    const logsRes = await db.execute('SELECT * FROM yarikiru_work_logs');
    for (const wl of logsRes.rows) {
        const id = wl.id as string;
        const notes = await encryptTextIfNeeded(wl.notes as string | null);
        const approach = await encryptTextIfNeeded(wl.approach as string | null);

        if (notes !== wl.notes || approach !== wl.approach) {
            await db.execute({
                sql: 'UPDATE yarikiru_work_logs SET notes = ?, approach = ? WHERE id = ?',
                args: [notes, approach, id]
            });
            console.log(`Updated work_log ${id}`);
        }
    }

    // 6. task_graphs
    console.log('Migrating task_graphs...');
    const graphsRes = await db.execute('SELECT * FROM task_graphs');
    for (const g of graphsRes.rows) {
        const id = g.id as string;
        const goalId = g.goal_id as string;
        if (skipGoalIds.has(goalId)) continue;

        const title = await encryptTextIfNeeded(g.title as string | null);
        const desc = await encryptTextIfNeeded(g.description as string | null);

        if (title !== g.title || desc !== g.description) {
            await db.execute({
                sql: 'UPDATE task_graphs SET title = ?, description = ? WHERE id = ?',
                args: [title, desc, id]
            });
            console.log(`Updated task_graph ${id}`);
        }
    }

    // 7. task_graph_nodes
    console.log('Migrating task_graph_nodes...');
    const nodesRes = await db.execute('SELECT * FROM task_graph_nodes');
    for (const n of nodesRes.rows) {
        const id = n.id as string;
        // checking graph_id -> goal_id is a bit complex, let's just encrypt all nodes.
        // The calendar script doesn't read from task_graph_nodes using 'カレンダーの実装' anyway.
        const label = await encryptTextIfNeeded(n.label as string | null);
        const desc = await encryptTextIfNeeded(n.description as string | null);

        if (label !== n.label || desc !== n.description) {
            await db.execute({
                sql: 'UPDATE task_graph_nodes SET label = ?, description = ? WHERE id = ?',
                args: [label, desc, id]
            });
            console.log(`Updated task_graph_node ${id}`);
        }
    }

    console.log('Migration completed successfully.');
    process.exit(0);
}

run().catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
});
