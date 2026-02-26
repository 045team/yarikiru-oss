import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth-stub'
import { execute } from '@/lib/turso/client'

// GET - 現在の設定を取得
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await execute<[string, string | null]>(
      `SELECT id, vertex_ai_api_key FROM members WHERE id = ?`,
      [userId]
    )

    if (result.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const row = result[0]
    const apiKey = row[1]

    if (!apiKey) {
      return NextResponse.json({
        success: true,
        config: { configured: false }
      })
    }

    // Parse to validate and get basic info
    try {
      const parsed = JSON.parse(apiKey) as Record<string, unknown>
      return NextResponse.json({
        success: true,
        config: {
          configured: true,
          project_id: parsed.project_id as string,
          client_email: parsed.client_email as string
        }
      })
    } catch {
      return NextResponse.json({
        success: true,
        config: { configured: false }
      })
    }
  } catch (error) {
    console.error('[AI Settings GET Error]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST - 設定を保存
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { apiKeyJson } = body as { apiKeyJson: string }

    if (!apiKeyJson) {
      return NextResponse.json({ error: 'apiKeyJson is required' }, { status: 400 })
    }

    // Validate JSON
    let parsed
    try {
      parsed = JSON.parse(apiKeyJson)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 })
    }

    // Validate required fields
    if (
      !parsed.type ||
      parsed.type !== 'service_account' ||
      !parsed.project_id ||
      !parsed.private_key ||
      !parsed.client_email
    ) {
      return NextResponse.json(
        { error: 'Invalid service account JSON. Missing required fields.' },
        { status: 400 }
      )
    }

    // Save to database
    await execute(
      `UPDATE members SET vertex_ai_api_key = ?, updated_at = datetime('now') WHERE id = ?`,
      [apiKeyJson, userId]
    )

    // Get updated config
    const result = await execute<[string]>(
      `SELECT vertex_ai_api_key FROM members WHERE id = ?`,
      [userId]
    )

    const updatedApiKey = result[0][0]
    const updatedParsed = JSON.parse(updatedApiKey) as Record<string, unknown>

    return NextResponse.json({
      success: true,
      config: {
        configured: true,
        project_id: updatedParsed.project_id as string,
        client_email: updatedParsed.client_email as string
      }
    })
  } catch (error) {
    console.error('[AI Settings POST Error]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE - 設定を削除
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await execute(
      `UPDATE members SET vertex_ai_api_key = NULL, updated_at = datetime('now') WHERE id = ?`,
      [userId]
    )

    return NextResponse.json({
      success: true,
      config: { configured: false }
    })
  } catch (error) {
    console.error('[AI Settings DELETE Error]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
