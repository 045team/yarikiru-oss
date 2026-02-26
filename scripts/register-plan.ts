import { mcpCreateGoal, mcpCreateTasks } from '../src/lib/mcp/core-operations';
import { getDatabase } from '../src/lib/turso';

async function run() {
    try {
        const dbClient = getDatabase().client;
        const userId = 'user_39sGQ4PcU2NitBLghsqblRKuUr2';

        console.log('Creating Goal...');
        const goal = await mcpCreateGoal(dbClient, {
            title: 'MCP Roles: cocoindex & yarikiru',
            description: 'Separate cocoindex MCP (code context) and yarikiru MCP (UI/UX) to optimize agent workflows and conform to List-First constraints.'
        }, userId);

        console.log('Goal created:', goal.goalId);

        console.log('Creating Tasks...');
        await mcpCreateTasks(dbClient, {
            goalId: goal.goalId,
            tasks: [
                { title: 'UPDATE: Document MCP role separation in CLAUDE.md', estimatedMinutes: 15 },
                { title: 'UPDATE: Modify Agents.md to reflect the separation if needed', estimatedMinutes: 10 },
                { title: 'REVIEW: Check yarikiru MCP tools for strict UI/UX constraints', estimatedMinutes: 15 }
            ]
        }, userId);
        console.log('Tasks created successfully.');
    } catch (e) {
        console.error(e);
    }
}
run();
