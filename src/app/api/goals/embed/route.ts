/**
 * API Route: Generate Embedding for Goal
 *
 * POST /api/goals/embed
 *
 * Request body:
 * {
 *   "goalId": string,
 *   "title": string,
 *   "description": string
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "embeddingGenerated": true
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-stub';
import { generateEmbedding, embeddingToBuffer } from '@/lib/turso/embeddings';
import { execute } from '@/lib/turso/client';
import { getMemberById } from '@/lib/turso/members';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { goalId, title, description } = body;

    // Validate request
    if (!goalId || typeof goalId !== 'string') {
      return NextResponse.json(
        { error: 'goalId is required and must be a string' },
        { status: 400 }
      );
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'title is required and must be a string' },
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

    // Prepare text for embedding
    const text = description ? `${title}\n${description}` : title;

    // Generate embedding
    const { embedding } = await generateEmbedding(text, credentials);

    // Save to database
    const blob = embeddingToBuffer(embedding);
    // Convert Uint8Array to base64 string for storage
    const base64Blob = Buffer.from(blob).toString('base64');

    await execute(
      'UPDATE yarikiru_goals SET embedding = ? WHERE id = ?',
      [base64Blob, goalId]
    );

    return NextResponse.json({
      success: true,
      embeddingGenerated: true,
    });
  } catch (error) {
    console.error('Error in /api/goals/embed:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
