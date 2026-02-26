import { auth } from '@/lib/auth-stub';
import { getTursoClient as createClient } from './turso/client';

/**
 * Check if the user has an active "Yarikiru Pro" entitlement.
 * Uses the RevenueCat REST API securely from the backend.
 * 
 * Includes a DEVELOPER_USER_ID bypass for skipping paywalls during local testing.
 */
export async function hasProAccess(userId: string | null = null): Promise<boolean> {
    let uid = userId;
    if (!uid) {
        const { userId: authUserId } = await auth();
        uid = authUserId;
    }

    if (!uid) return false;

    // Developer Bypass
    if (process.env.DEVELOPER_USER_ID && process.env.DEVELOPER_USER_ID === uid) {
        return true;
    }

    if (!process.env.NEXT_PUBLIC_REVENUECAT_API_KEY) {
        console.warn("NEXT_PUBLIC_REVENUECAT_API_KEY is missing, defaulting to Free tier.");
        return false;
    }

    // Connect to SQLite
    const db = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    try {
        // Fast DB check first
        const dbRes = await db.execute({
            sql: `SELECT plan, status FROM yarikiru_user_plans WHERE user_id = ?`,
            args: [uid]
        });

        if (dbRes.rows.length > 0) {
            const plan = dbRes.rows[0][0] as string;
            // If the local DB says it is 'pro' or higher, we can trust it.
            // Expiration and syncs will be handled exclusively by Webhooks.
            if (plan === 'pro' || plan === 'max') {
                return true;
            } else {
                return false;
            }
        }
    } catch (error) {
        console.error("Local DB check failed, falling back to RevenueCat:", error);
    }

    try {
        const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${uid}`, {
            headers: {
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_REVENUECAT_API_KEY}`,
            },
            // Keep fresh but avoid spamming RC
            next: { revalidate: 60 }
        });

        if (!res.ok) return false;

        const data = await res.json();
        const entitlements = data?.subscriber?.entitlements || {};

        const proEntitlement = entitlements['Yarikiru Pro'];
        if (!proEntitlement) return false;

        // expires_date will be null for lifetime, or an ISO string
        if (!proEntitlement.expires_date) return true;

        const active = new Date(proEntitlement.expires_date).getTime() > Date.now();

        // As a fallback sync, write back to DB
        try {
            await db.execute({
                sql: `
               INSERT INTO yarikiru_user_plans (user_id, plan, status, updated_at)
               VALUES (?, ?, ?, datetime('now'))
               ON CONFLICT(user_id) DO UPDATE SET
                 plan = excluded.plan,
                 status = excluded.status,
                 updated_at = excluded.updated_at
             `,
                args: [uid, active ? 'pro' : 'free', active ? 'active' : 'expired']
            });
        } catch (dbErr) {
            console.error("Fallback DB Update failed:", dbErr);
        }

        return active;
    } catch (error) {
        console.error("RevenueCat Server Error:", error);
        return false;
    }
}
