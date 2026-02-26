/**
 * Local Embeddings Integration
 *
 * Uses @xenova/transformers (all-MiniLM-L6-v2) for zero-cost, local semantic search.
 */

import { pipeline, env } from '@xenova/transformers';

// Configure transformers.js for Node.js/Next.js environment
env.allowLocalModels = false;
env.useBrowserCache = false;

const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIMENSIONS = 384; // all-MiniLM-L6-v2 has 384 dimensions

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  model: string;
}

// Singleton pipeline to prevent reloading the model multiple times
let embeddingPipelinePromise: Promise<any> | null = null;

async function getPipeline() {
  if (!embeddingPipelinePromise) {
    embeddingPipelinePromise = pipeline('feature-extraction', EMBEDDING_MODEL);
  }
  return embeddingPipelinePromise;
}

/**
 * Generate embedding for a single text using a local Transformers model.
 *
 * @param text - The text to generate embedding for
 * @param credentials - (Ignored) Kept for compatibility with existing codebase
 * @returns Embedding vector (384 dimensions)
 */
export async function generateEmbedding(
  text: string,
  credentials?: Record<string, unknown>
): Promise<EmbeddingResult> {
  try {
    const extractor = await getPipeline();
    // Generate embeddings
    const output = await extractor(text, { pooling: 'mean', normalize: true });

    // Extractor returns a Tensor. The 'data' property holds a Float32Array.
    const embedding = Array.from(output.data);

    return {
      embedding: embedding as number[],
      dimensions: EMBEDDING_DIMENSIONS,
      model: EMBEDDING_MODEL,
    };
  } catch (error) {
    console.error('[generateEmbedding] Failed to generate local embedding:', error);
    // Fallback to zero vector if local model fails to load
    return {
      embedding: new Array(EMBEDDING_DIMENSIONS).fill(0),
      dimensions: EMBEDDING_DIMENSIONS,
      model: 'fallback-zeros',
    };
  }
}

/**
 * Convert embedding array to binary buffer for storage
 * Float32Array = 4 bytes per dimension * 384 = 1536 bytes
 */
export function embeddingToBuffer(embedding: number[]): Uint8Array {
  const float32Array = new Float32Array(embedding);
  return new Uint8Array(float32Array.buffer);
}

/**
 * Convert binary buffer back to embedding array
 * Handles both Uint8Array and base64 string (from database)
 */
export function bufferToEmbedding(buffer: Uint8Array | string): number[] {
  let uint8Array: Uint8Array;

  if (typeof buffer === 'string') {
    // Base64 encoded string from database
    uint8Array = new Uint8Array(Buffer.from(buffer, 'base64'));
  } else {
    uint8Array = buffer;
  }

  const float32Array = new Float32Array(uint8Array.buffer);
  return Array.from(float32Array);
}

/**
 * Calculate cosine similarity between two embeddings
 * Returns value between -1 (opposite) and 1 (identical)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    // Graceful fallback for legacy 768-dim embeddings
    // If comparing old Vertex embeddings to new MiniLM embeddings, return 0 similarity
    console.warn(`[cosineSimilarity] Dimension mismatch: ${a.length} vs ${b.length}. Returning 0.`);
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
