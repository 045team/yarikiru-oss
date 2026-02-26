---
description: Yarikiru Custom CLI Commands and Planning Workflows
---
This workflow manages the execution cycle of Yarikiru, ensuring "List-First" planning is correctly synchronized and tracked in the database.

### 1. Planning Synchronization

Any changes made to the `.planning/` directory (like ROADMAP.md, PROJECT.md) MUST be synchronized with the Yarikiru database.
// turbo
```bash
npx yarikiru sync
```

### 2. Status Verification

Check the overall overarching status of the ongoing Yarikiru projects.
// turbo
```bash
npx yarikiru status
```

Check the active projects and goals in detail to decide what to work on.
// turbo
```bash
npx yarikiru list
```

### 3. Goal Execution

To view details and subtasks for a specific goal:
```bash
npx yarikiru info <goalId>
```

Start the timer and begin working on the task:
```bash
npx yarikiru start <goalId>
```

Stop the timer, mark the goal as complete, and record your learnings:
```bash
npx yarikiru done <goalId> -l "Enter what you learned here"
```

### 4. Learning Capabilities

Feed an external URL to the AI Learning Agent to digest and store in Yarikiru:
```bash
npx yarikiru learn https://example.com -t "title"
```
