/**
 * src/lib/e2ee/index.ts
 *
 * Proof-of-Concept for Client-Side End-to-End Encryption (E2EE).
 * Uses Web Crypto API (AES-GCM) exclusively so it works in modern browsers
 * and Node.js without external dependencies (e.g. crypto-js).
 */

// Helper to reliably get the crypto object across Browser/Node environments.
const getCrypto = () => {
    if (typeof globalThis !== 'undefined' && globalThis.crypto) {
        return globalThis.crypto;
    }
    throw new Error('Web Crypto API is not available in this environment.');
};

/**
 * Generate a new random AES-GCM encryption key.
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
    const crypto = getCrypto();
    return crypto.subtle.generateKey(
        {
            name: 'AES-GCM',
            length: 256,
        },
        true, // extractable
        ['encrypt', 'decrypt']
    );
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
    const raw = atob(base64);
    const result = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
        result[i] = raw.charCodeAt(i);
    }
    return result;
}

/**
 * Export a CryptoKey to a base64 string for storage (e.g., localStorage).
 */
export async function exportKey(key: CryptoKey): Promise<string> {
    const crypto = getCrypto();
    const exported = await crypto.subtle.exportKey('raw', key);
    return uint8ArrayToBase64(new Uint8Array(exported));
}

/**
 * Import a CryptoKey from a base64 string.
 */
export async function importKey(base64Key: string): Promise<CryptoKey> {
    const crypto = getCrypto();
    const keyArray = base64ToUint8Array(base64Key);
    return crypto.subtle.importKey(
        'raw',
        keyArray.buffer as ArrayBuffer,
        { name: 'AES-GCM' },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt a plaintext string using AES-GCM.
 * Returns a base64 string containing both the IV and the encrypted data.
 */
export async function encryptText(text: string, key: CryptoKey): Promise<string> {
    const crypto = getCrypto();

    // AES-GCM requires a unique Initialization Vector (IV) for every encryption operation.
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(text);

    const encryptedBuffer = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv as any,
        },
        key,
        encodedText as any
    );

    // Combine IV and Ciphertext so it can be stored as a single string
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv);
    combined.set(encryptedArray, iv.length);

    return uint8ArrayToBase64(combined);
}

/**
 * Decrypt a base64 ciphertext string (which includes the IV) back to plaintext.
 */
export async function decryptText(encryptedBase64: string, key: CryptoKey): Promise<string> {
    const crypto = getCrypto();

    const combinedArray = base64ToUint8Array(encryptedBase64);

    // Extract the 12-byte IV from the beginning
    const iv = combinedArray.slice(0, 12);
    const encryptedData = combinedArray.slice(12);

    const decryptedBuffer = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: iv as any,
        },
        key,
        encryptedData as any
    );

    return new TextDecoder().decode(decryptedBuffer);
}

const ENC_PREFIX = 'ENC:';

/**
 * Server-only: Get the application-level encryption key from the environment.
 * Used for encrypting/decrypting sensitive data stored in the database.
 * For OSS version, uses a default key if not set.
 */
export async function getAppCryptoKey(): Promise<CryptoKey> {
    // For OSS version, use a default base64-encoded 256-bit key if not set
    // This is exactly 32 bytes (256 bits) for AES-GCM
    const keyString = process.env.APP_ENCRYPTION_KEY || 'MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=';
    return importKey(keyString);
}

/**
 * Server-only: Encrypt plaintext for database storage.
 * It adds `ENC:` prefix to distinguish from plaintext.
 */
export async function encryptForDb(text: string): Promise<string> {
    if (!text) return text;
    // If it's already encrypted, don't encrypt it again
    if (text.startsWith(ENC_PREFIX)) return text;

    const key = await getAppCryptoKey();
    const encrypted = await encryptText(text, key);
    return `${ENC_PREFIX}${encrypted}`;
}

/**
 * Server-only: Decrypt encrypted text from database storage.
 * It will only decrypt if the string has the `ENC:` prefix.
 */
export async function decryptFromDb(encryptedText: string): Promise<string> {
    if (!encryptedText) return encryptedText;
    if (!encryptedText.startsWith(ENC_PREFIX)) return encryptedText;

    try {
        const key = await getAppCryptoKey();
        const base64Data = encryptedText.substring(ENC_PREFIX.length);
        return await decryptText(base64Data, key);
    } catch (error) {
        console.error('Failed to decrypt data:', error);
        // Fallback to returning original text if decryption fails
        return encryptedText;
    }
}
