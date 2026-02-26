import { drizzle } from 'drizzle-orm/libsql';
import { getTursoClient } from '../lib/turso/client';
import * as schema from './schema';

// Export a getter to ensure we reuse the existing tursoClient singleton logic
let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
    if (dbInstance) return dbInstance;
    const client = getTursoClient();
    dbInstance = drizzle(client, { schema });
    return dbInstance;
}

export { schema };
