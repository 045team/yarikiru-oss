/**
 * Similarity Search Functions
 *
 * Provides functions for finding similar goals and projects using vector embeddings.
 */

import { execute } from './client'
import { cosineSimilarity, bufferToEmbedding } from './embeddings'

// Similarity search result type
export interface SimilarityResult {
  id: string
  title: string
  description?: string
  status?: string
  similarity: number
  project_id?: string
  project_title?: string
  embedding?: Uint8Array
}

/**
 * Find similar goals using vector search
 */
export async function findSimilarGoals(
  queryEmbedding: number[],
  limit: number = 5,
  userId?: string
): Promise<SimilarityResult[]> {
  let sql = `
    SELECT
      g.id,
      g.title,
      g.description,
      g.status,
      g.embedding,
      p.id as project_id,
      p.title as project_title
    FROM yarikiru_goals g
    JOIN yarikiru_projects p ON g.project_id = p.id
    WHERE g.embedding IS NOT NULL
  `

  const params: any[] = []

  if (userId) {
    sql += ` AND p.user_id = ?`
    params.push(userId)
  }

  sql += ` LIMIT ?`
  params.push(limit * 2) // Get more candidates for filtering

  const result = await execute(sql, params)

  // Calculate similarities in JavaScript (for simplicity)
  // In production, you'd use Turso's native vector_top_k function
  const candidates = (result as any[]).map((row: any) => ({
    ...row,
    similarity: row.embedding
      ? cosineSimilarity(queryEmbedding, bufferToEmbedding(row.embedding))
      : 0,
  }))

  // Sort by similarity and return top results
  return candidates
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .filter((r) => r.similarity > 0.3) // Minimum similarity threshold
}

/**
 * Find similar projects using vector search
 */
export async function findSimilarProjects(
  queryEmbedding: number[],
  limit: number = 5,
  userId?: string
): Promise<SimilarityResult[]> {
  let sql = `
    SELECT
      id,
      title,
      embedding
    FROM yarikiru_projects
    WHERE embedding IS NOT NULL
  `

  const params: any[] = []

  if (userId) {
    sql += ` AND user_id = ?`
    params.push(userId)
  }

  sql += ` LIMIT ?`
  params.push(limit * 2)

  const result = await execute(sql, params)

  // Calculate similarities in JavaScript
  const candidates = (result as any[]).map((row: any) => ({
    ...row,
    similarity: row.embedding
      ? cosineSimilarity(queryEmbedding, bufferToEmbedding(row.embedding))
      : 0,
  }))

  return candidates
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .filter((r) => r.similarity > 0.3)
}
