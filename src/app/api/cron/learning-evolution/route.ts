import { NextResponse } from 'next/server'
import { getTursoClient as createClient } from '../../../../lib/turso/client'

// Use OpenAI for summarization if available
async function summarizeRepo(description: string, url: string) {
    if (!process.env.OPENAI_API_KEY) {
        return {
            what: description || 'No description available for this trending repository.',
            how: `Explore the source code and documentation at: ${url}`,
            impact: 'Review this popular repository to learn advanced patterns and explore its potential impact on modern web development.',
        }
    }

    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{
                    role: 'system',
                    content: 'You are an expert developer assistant. Summarize the following GitHub repository description into 3 succinct parts: "What it is", "How to use it or How it works", and "Why it matters (Impact)". Answer in Japanese. Make it compelling for developers looking to learn new technologies.'
                }, {
                    role: 'user',
                    content: `Repo URL: ${url}\nDescription: ${description}`
                }],
                tools: [
                    {
                        type: 'function',
                        function: {
                            name: 'return_summary',
                            description: 'Return the summarized repository info',
                            parameters: {
                                type: 'object',
                                properties: {
                                    what: { type: 'string', description: 'What this repository is (Japanese)' },
                                    how: { type: 'string', description: 'How to use it or how it works (Japanese)' },
                                    impact: { type: 'string', description: 'Why it matters or its impact, e.g. "It simplifies state management" (Japanese)' }
                                },
                                required: ['what', 'how', 'impact']
                            }
                        }
                    }
                ],
                tool_choice: { type: 'function', function: { name: 'return_summary' } }
            })
        })

        const data = await res.json()
        const argsText = data.choices[0].message.tool_calls[0].function.arguments
        return JSON.parse(argsText)
    } catch (error) {
        console.error('AI Summarize Error:', error)
        return {
            what: description,
            how: `Read more at ${url}`,
            impact: 'View repo for details.'
        }
    }
}

/**
 * GET /api/cron/learning-evolution
 * Vercel Cron Job: Fetch top 3 trending TypeScript/JavaScript repos created recently, AI-summarize, and add to systemic learning items.
 */
export async function GET(request: Request) {
    // Authorize via Vercel Cron Secret
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const db = createClient({
            url: process.env.TURSO_DATABASE_URL!,
            authToken: process.env.TURSO_AUTH_TOKEN!,
        })

        // Repos created in the last 7 days to get truly "new and trending"
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const query = `language:typescript created:>${weekAgo} sort:stars-desc`

        const ghRes = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=3`, {
            headers: {
                'User-Agent': 'Yarikiru-Cron-Job'
            }
        })

        if (!ghRes.ok) throw new Error(`GitHub API failed: ${ghRes.statusText}`)

        const data = await ghRes.json()
        const repos = data.items || []

        const inserted = []

        for (const repo of repos) {
            const { html_url, name, description } = repo

            // Check if already exists in recommended learnings
            const checkRes = await db.execute({
                sql: `SELECT id FROM yarikiru_learning_items WHERE url = ? AND user_id = 'system_recommendation'`,
                args: [html_url]
            })
            if (checkRes.rows.length > 0) continue;

            const summary = await summarizeRepo(description || name, html_url)

            const id = `li_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
            await db.execute({
                sql: `
          INSERT INTO yarikiru_learning_items (id, user_id, url, title, what, how, impact, status)
          VALUES (?, 'system_recommendation', ?, ?, ?, ?, ?, 'unread')
        `,
                args: [
                    id,
                    html_url,
                    `[GitHub Trending] ${name}`,
                    summary.what,
                    summary.how,
                    summary.impact
                ]
            })

            inserted.push(name)
        }

        return NextResponse.json({ success: true, processed: repos.length, inserted })
    } catch (err: any) {
        console.error('Cron Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
