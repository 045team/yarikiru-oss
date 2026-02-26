import { Purchases, LogLevel } from '@revenuecat/purchases-js';

// RevenueCat Web SDK initialization singleton
let purchasesInstance: Purchases | null = null;

export const getRevenueCat = (): Purchases => {
    if (purchasesInstance) return purchasesInstance;

    const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY;

    if (!apiKey) {
        console.warn("RevenueCat API Key is missing. Check your .env.local file.");
    }

    // Generate or retrieve an anonymous ID for Web SDK
    const anonIdKey = "rc_anon_id";
    let anonId = typeof window !== "undefined" ? localStorage.getItem(anonIdKey) : null;
    if (!anonId) {
        anonId = `anon_${Math.random().toString(36).substring(2, 15)}`;
        if (typeof window !== "undefined") {
            localStorage.setItem(anonIdKey, anonId);
        }
    }

    // Create a new Purchases instance
    purchasesInstance = Purchases.configure({
        apiKey: apiKey || "api_key_placeholder",
        appUserId: anonId
    });

    // Configure log level depending on environment
    if (process.env.NODE_ENV === 'development') {
        Purchases.setLogLevel(LogLevel.Debug);
    } else {
        Purchases.setLogLevel(LogLevel.Error);
    }

    return purchasesInstance;
};

/**
 * Log in to RevenueCat using a specific App User ID (e.g. Clerk user ID).
 */
export const configureRevenueCatWithUser = async (appUserId: string) => {
    const purchases = getRevenueCat();
    try {
        const customerInfo = await purchases.changeUser(appUserId);
        return customerInfo;
    } catch (error) {
        console.error("Failed to log in to RevenueCat (changeUser):", error);
        throw error;
    }
};

/**
 * Log out the current user and switch to anonymous mode.
 */
export const logoutRevenueCatUser = async () => {
    // Web SDK doesn't natively expose logOut yet; you'd typically clear your own session
    // or call changeUser with a new anonymous ID.
    console.log("Logout triggered for RevenueCat");
};
