import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const firstEq = trimmed.indexOf('=');
        const key = trimmed.slice(0, firstEq).trim();
        let value = trimmed.slice(firstEq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
    }
}

const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
    const userRes = await db.execute("SELECT user_id FROM yarikiru_projects LIMIT 1");
    const userId = userRes.rows[0]?.[0] || 'user_123';

    const projRes = await db.execute("SELECT id FROM yarikiru_projects LIMIT 1");
    const projectId = projRes.rows[0]?.[0];

    const goalId = 'g_phase2_' + Date.now();

    await db.execute({
        sql: `INSERT INTO yarikiru_goals (id, project_id, title, status, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        args: [goalId, projectId, 'Phase 2: Plusプラン決済実装 (RevenueCat Webhook & DB同期)', 'in_progress', 'high'],
    });
    console.log('Created Phase 2 mid goal:', goalId);

    const tasks = [
        'Webhookエンドポイント実装',
        'hasProAccessのDB最適化',
        'UI/UX疎通確認'
    ];

    for (let i = 0; i < tasks.length; i++) {
        const taskId = 'ts_phase2_' + i + '_' + Date.now();
        await db.execute({
            sql: `INSERT INTO yarikiru_sub_tasks (id, goal_id, label, is_done, sort_order) VALUES (?, ?, ?, ?, ?)`,
            args: [taskId, goalId, tasks[i], 0, i],
        });
        console.log('Created task:', taskId);
    }

    const logId = 'wl_phase2_' + Date.now();
    await db.execute({
        sql: `INSERT INTO yarikiru_work_logs (id, user_id, goal_id, started_at) VALUES (?, ?, ?, datetime('now'))`,
        args: [logId, userId, goalId]
    });
    console.log('Started Time Tracking with log:', logId);
}

main().catch(console.error);
