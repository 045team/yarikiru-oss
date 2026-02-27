/**
 * GSD の Summary / Plan / Verification コンテンツを
 * Markdown として正しくレンダリングできる形式に正規化する
 */

const SECTION_HEADERS = new Set([
  'completed work',
  'architecture decision',
  'next steps',
  'key decisions',
  'summary',
  'verification',
  'plan',
  'objective',
  'context',
  'success criteria',
  'completed',
  'work done',
  'decisions',
  'notes',
  'learnings',
])

/**
 * 行がセクションヘッダーとして扱うべきか判定
 */
function looksLikeSectionHeader(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed || trimmed.length > 80) return false
  // 既に markdown の場合はスキップ
  if (/^#{1,6}\s/.test(trimmed) || trimmed.startsWith('- ') || trimmed.startsWith('* ')) return false
  // NN-SUMMARY 形式 (02-SUMMARY, 01-PLAN 等)
  if (/^\d{2}-[A-Z_]+$/i.test(trimmed)) return true
  // 既知のセクション名
  if (SECTION_HEADERS.has(trimmed.toLowerCase())) return true
  // Title Case で 2〜50 文字（英数字とスペースのみ）
  if (/^[A-Z][A-Za-z0-9\s]{1,49}$/.test(trimmed) && trimmed.length >= 3) return true
  return false
}

/**
 * 行がリスト項目として扱うべきか（- がない場合に付与）
 */
function looksLikeListItem(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  // 既にリスト形式
  if (/^[-*]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) return false
  // セクションヘッダーはリストにしない
  if (looksLikeSectionHeader(line)) return false
  // ファイルパス、環境変数、技術用語で始まる行 → リスト項目とみなす
  if (/^(src\/|\.env|NEXT_|REACT_|process\.|import |export )/i.test(trimmed)) return true
  // 行末が — で続く説明（次の行に続く）はそのまま。単独で意味のある行のみ
  return false
}

/**
 * GSD 形式のプレーンテキストを Markdown に変換
 */
export function normalizeGsdContentForMarkdown(raw: string): string {
  if (!raw || typeof raw !== 'string') return ''
  const lines = raw.split('\n')
  const out: string[] = []
  let prevBlank = true

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      out.push('')
      prevBlank = true
      continue
    }

    if (looksLikeSectionHeader(line)) {
      if (!prevBlank) out.push('')
      out.push(`## ${trimmed}`)
      out.push('')
      prevBlank = true
      continue
    }

    if (looksLikeListItem(line) && !/^[-*]\s/.test(trimmed)) {
      out.push(`- ${trimmed}`)
      prevBlank = false
      continue
    }

    out.push(line)
    prevBlank = false
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
