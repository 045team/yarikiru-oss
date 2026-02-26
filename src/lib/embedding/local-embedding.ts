/**
 * Local Embedding Generation using Transformers.js
 *
 * Provides offline embedding generation without network calls.
 * Uses Xenova/all-MiniLM-L6-v2 model with lazy loading and memory caching.
 */

import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js for Node.js/Next.js environment
env.allowLocalModels = false;
env.useBrowserCache = false;

const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIMENSIONS = 384; // all-MiniLM-L6-v2 has 384 dimensions

// Singleton pipeline promise to cache model in memory after first load
// Using 'any' to avoid complex generic type issues with transformers.js pipeline
let embeddingPipelinePromise: Promise<any> | null = null;

/**
 * Get or create the embedding pipeline (lazy loading)
 * Model is cached in memory after first load for performance
 */
async function getPipeline(): Promise<any> {
    if (!embeddingPipelinePromise) {
        embeddingPipelinePromise = pipeline('feature-extraction', EMBEDDING_MODEL);
    }
    return embeddingPipelinePromise;
}

/**
 * Generate embedding for a single text using a local Transformers model.
 * No network calls required - model runs entirely locally.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
        return new Array(EMBEDDING_DIMENSIONS).fill(0);
    }

    try {
        const extractor = await getPipeline();
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        const embedding = Array.from(output.data) as number[];
        return embedding;
    } catch (error) {
        console.error('[local-embedding] Failed to generate embedding:', error);
        return new Array(EMBEDDING_DIMENSIONS).fill(0);
    }
}

/**
 * Get the embedding dimensions for the current model
 */
export function getEmbeddingDimensions(): number {
    return EMBEDDING_DIMENSIONS;
}

/**
 * Get the model name being used
 */
export function getEmbeddingModelName(): string {
    return EMBEDDING_MODEL;
}

/**
 * Check if the model is loaded in memory
 */
export function isModelLoaded(): boolean {
    return embeddingPipelinePromise !== null;
}

/**
 * Preload the model (optional - useful for reducing first-request latency)
 */
export async function preloadModel(): Promise<void> {
    await getPipeline();
}

/**
 * Compute cosine similarity between two embedding vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) throw new Error('Vectors must have same dimensions');
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}

/**
 * Convert embedding array to Buffer (for storage)
 */
export function embeddingToBuffer(embedding: number[]): Buffer {
    const buffer = Buffer.allocUnsafe(embedding.length * 4);
    for (let i = 0; i < embedding.length; i++) {
        buffer.writeFloatLE(embedding[i], i * 4);
    }
    return buffer;
}

/**
 * Convert Buffer back to embedding array
 */
export function bufferToEmbedding(buffer: Buffer): number[] {
    const count = buffer.length / 4;
    const embedding: number[] = [];
    for (let i = 0; i < count; i++) {
        embedding.push(buffer.readFloatLE(i * 4));
    }
    return embedding;
}

export interface EmbeddingResult {
    embedding: number[];
    model: string;
    dimensions: number;
}
