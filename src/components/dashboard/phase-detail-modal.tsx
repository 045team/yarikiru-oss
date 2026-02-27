'use client'

import { useState, useEffect } from 'react'
import { X, FileText, CheckCircle2, Clipboard } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { normalizeGsdContentForMarkdown } from '@/lib/gsd/normalize-content'

interface PhaseDetailModalProps {
  isOpen: boolean
  onClose: () => void
  phaseIdPrefix: string
  phaseTitle: string
  planningPath?: string | null
  /** Import 時: API 不要で直接表示 */
  initialContent?: { plan?: string; summary?: string; verification?: string } | null
}

export function PhaseDetailModal({
  isOpen,
  onClose,
  phaseIdPrefix,
  phaseTitle,
  planningPath,
  initialContent,
}: PhaseDetailModalProps) {
  const [plan, setPlan] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [verification, setVerification] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'summary' | 'plan' | 'verification'>('summary')

  useEffect(() => {
    if (!isOpen) return
    // Import 時（planningPath なし）は API を呼ばず initialContent を使用
    const useLocal = !planningPath || initialContent
    if (useLocal && initialContent) {
      setPlan(initialContent.plan ?? null)
      setSummary(initialContent.summary ?? null)
      setVerification(initialContent.verification ?? null)
      setLoading(false)
      setError(null)
      return
    }
    if (!phaseIdPrefix || !planningPath) return
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (planningPath) params.set('planningPath', planningPath)
    fetch(`/api/planning/phase/${encodeURIComponent(phaseIdPrefix)}?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'フェーズが見つかりません' : '取得に失敗しました')
        return r.json()
      })
      .then((data) => {
        setPlan(data.plan || null)
        setSummary(data.summary || null)
        setVerification(data.verification || null)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'エラー'))
      .finally(() => setLoading(false))
  }, [isOpen, phaseIdPrefix, planningPath, initialContent])

  if (!isOpen) return null

  const tabs = [
    { id: 'summary' as const, label: 'Summary', icon: CheckCircle2 },
    { id: 'plan' as const, label: 'Plan', icon: FileText },
    { id: 'verification' as const, label: 'Verification', icon: Clipboard },
  ]

  const rawContent =
    activeTab === 'summary' ? summary : activeTab === 'plan' ? plan : verification
  const content = rawContent ? normalizeGsdContentForMarkdown(rawContent) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 truncate pr-4">{phaseTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-gray-100 shrink-0">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'text-[#d97756] border-b-2 border-[#d97756] bg-[#d97756]/5'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <span className="animate-pulse">読み込み中...</span>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-amber-600">{error}</div>
          ) : content ? (
            <div className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:mt-6 prose-headings:mb-3 first:prose-headings:mt-0 prose-p:leading-relaxed prose-li:marker:text-[#d97756] prose-ul:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400 text-sm">
              {activeTab === 'summary' && 'Summary がありません'}
              {activeTab === 'plan' && 'Plan がありません'}
              {activeTab === 'verification' && 'Verification がありません'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
