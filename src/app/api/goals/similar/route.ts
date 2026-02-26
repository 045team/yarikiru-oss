/**
 * API Route: Find Similar Goals
 *
 * POST /api/goals/similar
 *
 * Request body:
 * {
 *   "query": string,        // Search query text
 *   "limit": number,        // Max results (default: 5)
 *   "userId": string        // Optional: filter by user
 * }
 *
 * Response:
 * {
 *   "results": Array<{
 *     "id": string,
 *     "title": string,
 *     "description": string,
 *     "status": string,
 *     "similarity": number,
 *     "project": {
 *       "id": string,
 *       "title": string
 *     }
 *   }>
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-stub';
import { generateEmbedding } from '@/lib/turso/embeddings';
import { findSimilarGoals } from '@/lib/turso/similarity';
import { getMemberById } from '@/lib/turso/members';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { query, limit = 5 } = body;

    // Validate request
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    if (limit && (typeof limit !== 'number' || limit < 1 || limit > 20)) {
      return NextResponse.json(
        { error: 'Limit must be a number between 1 and 20' },
        { status: 400 }
      );
    }

    // Get user's member record
    const member = await getMemberById(userId);
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if user has configured Vertex AI credentials
    if (!member.vertex_ai_api_key) {
      return NextResponse.json(
        {
          error: 'Vertex AI credentials not configured',
          message: 'Please configure your GCP service account credentials in settings',
        },
        { status: 400 }
      );
    }

    // Parse service account credentials
    let credentials: Record<string, unknown>;
    try {
      credentials = JSON.parse(member.vertex_ai_api_key);
    } catch {
      return NextResponse.json(
        { error: 'Invalid credentials format' },
        { status: 400 }
      );
    }

    // Generate embedding for query
    const { embedding: queryEmbedding } = await generateEmbedding(query, credentials);

    // Find similar goals
    const results = await findSimilarGoals(queryEmbedding, limit, userId);

    // Format response
    const formattedResults = results.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description || '',
      status: r.status || 'active',
      similarity: Math.round(r.similarity * 1000) / 1000, // Round to 3 decimals
      project: {
        id: r.project_id,
        title: r.project_title,
      },
    }));

    return NextResponse.json({
      results: formattedResults,
      count: formattedResults.length,
    });
  } catch (error) {
    console.error('Error in /api/goals/similar:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
