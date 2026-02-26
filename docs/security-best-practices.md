# YARIKIRU Security Best Practices

## 1. Tenancy Enforcement (Row-Level Security)
Since Turso (SQLite) doesn't support native Row-Level Security like PostgreSQL, we must strictly enforce tenancy at the application layer. **Always verify that a user can only access data they own.**

### Using `src/lib/turso/rls.ts`
We introduced standard RLS utility functions to prevent IDOR (Insecure Direct Object Reference). When querying data associated with a specific user, ALWAYS append the relevant `rls.ts` condition:

```typescript
import { enforceGoalRLS } from '@/lib/turso/rls'

const rls = enforceGoalRLS(userId)

const result = await db.execute({
  sql: `SELECT * FROM yarikiru_goals WHERE id = ? AND ${rls.condition}`,
  args: [goalId, ...rls.args]
})
```

## 2. API Endpoint Validation
- Every route MUST authenticate the user via `auth()` from `@clerk/nextjs/server`.
- Return `401 Unauthorized` if the `userId` is missing.
- When performing mutations (`POST`, `PUT`, `PATCH`, `DELETE`), verify ownership BEFORE making any updates. Do not assume that simply knowing the `id` grants resource permission.

## 3. IDOR Prevention Pattern
When nested resources are fetched (e.g., fetching a `yarikiru_sub_task`), you must `JOIN` upwards to `yarikiru_projects` to confirm the `user_id`:

```sql
SELECT st.* FROM yarikiru_sub_tasks st
JOIN yarikiru_goals g ON st.goal_id = g.id
JOIN yarikiru_projects p ON g.project_id = p.id
WHERE st.id = ? AND p.user_id = ?
```

The `rls.ts` library provides these joins out-of-the-box via `enforceSubTaskRLS()`, `enforceGoalRLS()`, and `enforceProjectRLS()`.
