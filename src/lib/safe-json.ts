/**
 * Safe JSON parsing from Response
 *
 * Avoids SyntaxError when API returns HTML (e.g., error pages, redirects)
 * instead of JSON.
 */
export async function safeResponseJson<T = unknown>(
  response: Response
): Promise<T | null> {
  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    const text = await response.text()
    console.error(
      '[safeResponseJson] Expected JSON but got:',
      contentType,
      text.slice(0, 200)
    )
    return null
  }

  try {
    return (await response.json()) as T
  } catch (e) {
    console.error('[safeResponseJson] JSON parse error:', e)
    return null
  }
}
