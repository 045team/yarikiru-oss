/**
 * Embedding Module - Common Interface (OSS版)
 *
 * Provides a unified interface for embedding operations.
 * Uses local Transformers.js for offline embedding generation.
 */

export {
    generateEmbedding,
    getEmbeddingDimensions,
    getEmbeddingModelName,
    isModelLoaded,
    preloadModel,
    cosineSimilarity,
    embeddingToBuffer,
    bufferToEmbedding,
    type EmbeddingResult,
} from './local-embedding';
