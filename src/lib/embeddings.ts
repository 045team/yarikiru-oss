/**
 * Embedding utilities for YARIKIRU
 *
 * @deprecated This file is kept for backward compatibility.
 * New code should use @/lib/turso/embeddings instead.
 *
 * This file now re-exports functions from the Vertex AI-based implementation.
 *
 * Provides functions for:
 * - Generating text embeddings using Vertex AI (text-embedding-004)
 * - Converting embeddings to/from Turso blob format
 * - Vector similarity search
 */

// Re-export from the new Vertex AI implementation
export {
  generateEmbedding,
  cosineSimilarity,
  embeddingToBuffer as embeddingToBlob,
  bufferToEmbedding as blobToEmbedding,
  type EmbeddingResult,
} from '@/lib/turso/embeddings'

// Re-export similarity search functions
export { findSimilarGoals, findSimilarProjects } from '@/lib/turso/similarity'

// Legacy type for backward compatibility
export interface LegacyEmbeddingResult {
  id: string;
  similarity: number;
  [key: string]: any;
}

// Legacy constants (deprecated)
const EMBEDDING_MODEL = 'text-embedding-004'; // Updated to Vertex AI model
const EMBEDDING_DIMENSIONS = 768; // Updated to Vertex AI dimensions

/**
 * Convert embedding to vector string for Turso SQL
 * @deprecated Use embeddingToBuffer instead
 */
export function embeddingToVectorString(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}
