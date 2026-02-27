'use client'

import React, { useState, useEffect } from 'react'
import { MapPin, Zap, CheckCircle2, Clock, FileText, Check, Circle, Database, Server, Bot, Layout, Rocket, Copy, ChevronDown, History, FileSearch } from 'lucide-react'
import { PhaseDetailModal } from './phase-detail-modal'

// API から返るフェーズ型 / Import 時の goals から構築する型
export interface GSDPhase {
  id: string
  phaseNum: number
  phaseIdPrefix: string
  title: string
  hasContext: boolean
  hasPlan: boolean
  hasSummary: boolean
  hasVerification: boolean
  isCompleted: boolean
  suggestedCommand: string
  suggestedLabel: string
  altCommand?: { cmd: string; label: string } | null
  tasks: { label: string; completed: boolean }[]
  /** Import 時: Plan/Summary/Verification の内容（API フェッチ不要） */
  initialContent?: { plan?: string; summary?: string; verification?: string } | null
}

const IconMap: Record<string, JSX.Element> = {
  Database: <Database className="w-5 h-5 md:w-6 md:h-6" />,
  Server: <Server className="w-5 h-5 md:w-6 md:h-6" />,
  Bot: <Bot className="w-5 h-5 md:w-6 md:h-6" />,
  Layout: <Layout className="w-5 h-5 md:w-6 md:h-6" />,
  FileText: <FileText className="w-5 h-5 md:w-6 md:h-6" />,
  Rocket: <Rocket className="w-5 h-5 md:w-6 md:h-6" />,
}

function guessIcon(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('db') || t.includes('database') || t.includes('スキーマ')) return 'Database'
  if (t.includes('api') || t.includes('server') || t.includes('route')) return 'Server'
  if (t.includes('bot') || t.includes('ai') || t.includes('mcp') || t.includes('agent')) return 'Bot'
  if (t.includes('ui') || t.includes('frontend') || t.includes('dashboard')) return 'Layout'
  if (t.includes('next') || t.includes('future') || t.includes('oss')) return 'Rocket'
  return 'FileText'
}

function GSDCopyButton({
  command,
  label,
}: { command: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`コピー: ${command}`}
      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-[#d97756]/50 hover:bg-[#d97756]/5 text-gray-500 hover:text-[#d97756] transition-all shadow-sm text-[10px] sm:text-xs font-bold tracking-wider"
    >
      {copied ? <Check size={14} className="text-[#5b8767]" /> : <Copy size={14} />}
      {copied ? <span className="text-[#5b8767]">Copied!</span> : <span>{label}</span>}
    </button>
  )
}

function PhaseItem({
  phase,
  planningPath,
  onDetail,
  compact,
}: {
  phase: GSDPhase
  planningPath?: string | null
  onDetail: (phase: GSDPhase) => void
  compact?: boolean
}) {
  const isCompleted = phase.isCompleted
  const icon = guessIcon(phase.title)

  return (
    <div className={compact ? 'pt-3' : 'relative pl-8 md:pl-10'}>
      {!compact && (
        <div className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white ${isCompleted ? 'bg-[#5b8767]' : 'bg-[#d97756] shadow-[0_0_15px_rgba(217,119,86,0.3)]'}`}>
          {isCompleted ? <Check className="w-4 h-4 text-white" strokeWidth={3} /> : <Clock className="w-4 h-4 text-white" />}
        </div>
      )}
      <div className={`rounded-2xl border p-5 transition-all ${isCompleted ? 'bg-gradient-to-br from-[#5b8767]/5 to-[#5b8767]/0 border-[#5b8767]/20' : 'bg-gray-50/50 border-[#d97756]/20 bg-orange-50/30'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 flex-wrap">
          <div className={`p-2.5 rounded-xl shrink-0 ${isCompleted ? 'bg-[#5b8767]/10 text-[#5b8767]' : 'bg-[#d97756]/10 text-[#d97756]'}`}>
            {IconMap[icon] || IconMap['FileText']}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-extrabold text-gray-900 font-japanese-display">{phase.title}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${isCompleted ? 'bg-[#5b8767]/10 text-[#5b8767]' : 'bg-[#d97756]/10 text-[#d97756]'}`}>
                {isCompleted ? '完了' : phase.hasPlan ? '実行待ち' : '計画待ち'}
              </span>
              {phase.tasks.length > 0 && (
                <span className="text-[10px] text-gray-400 font-medium">
                  {phase.tasks.filter(t => t.completed).length}/{phase.tasks.length} タスク
                </span>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDetail(phase); }}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:border-[#d97756]/50 hover:bg-[#d97756]/5 text-gray-500 hover:text-[#d97756] text-[10px] font-bold transition-colors"
                title="Plan / Summary / Verification を表示"
              >
                <FileSearch size={12} />
                詳細
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {phase.altCommand && (
              <GSDCopyButton command={phase.altCommand.cmd} label={phase.altCommand.label} />
            )}
            <GSDCopyButton command={phase.suggestedCommand} label={phase.suggestedLabel} />
          </div>
        </div>
        {phase.tasks.length > 0 && (
          <ul className="space-y-2 ml-0 sm:ml-9">
            {phase.tasks.map((task, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">
                  {task.completed ? <CheckCircle2 className="w-4 h-4 text-[#5b8767]" strokeWidth={2} /> : <Circle className="w-4 h-4 text-gray-300" strokeWidth={2} />}
                </div>
                <span className={`text-[13px] leading-relaxed ${task.completed ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-700 font-medium'}`}>
                  {task.label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// 完了フェーズは折りたたみ
function CompletedPhasesAccordion({
  phases,
  planningPath,
  onDetail,
}: { phases: GSDPhase[]; planningPath?: string | null; onDetail: (p: GSDPhase) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const completed = phases.filter(p => p.isCompleted)
  if (completed.length === 0) return null

  return (
    <div className="relative pl-8 md:pl-10 mb-10">
      <div className="absolute -left-[17px] top-4 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white bg-[#5b8767]">
        <Check className="w-4 h-4 text-white" strokeWidth={3} />
      </div>
      <div className="bg-gradient-to-br from-[#5b8767]/5 to-[#5b8767]/0 rounded-2xl border border-[#5b8767]/20 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex flex-col sm:flex-row sm:items-center gap-3 p-5 text-left hover:bg-white/30 transition-colors"
        >
          <div className="p-2.5 rounded-xl shrink-0 bg-[#5b8767]/10 text-[#5b8767]">
            <History className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-extrabold text-gray-700 font-japanese-display">完了済みフェーズ</h3>
            <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#5b8767]/10 text-[#5b8767]">
              {completed.length} フェーズ
            </span>
          </div>
          <div className={`p-1.5 rounded-lg bg-white/50 border border-[#5b8767]/20 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronDown size={16} className="text-[#5b8767]/70" />
          </div>
        </button>
        {isOpen && (
          <div className="px-5 pb-5 border-t border-[#5b8767]/10 bg-white/30 space-y-4">
            {completed.map((phase) => (
              <PhaseItem key={phase.id} phase={phase} planningPath={planningPath} onDetail={onDetail} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function goalsToPhases(
  goals: Array<{ id: string; title: string; status?: string; subTasks?: Array<{ label: string; isDone: boolean }> }>,
  phaseContents: Record<string, { plan?: string; summary?: string; verification?: string }> | null | undefined
): GSDPhase[] {
  const pcMap = phaseContents ?? {}
  return goals.map((g, idx) => {
    const numMatch = g.title.match(/^(\d+)/)
    const phaseNum = numMatch ? parseInt(numMatch[1], 10) : idx + 1
    const prefix = numMatch ? numMatch[1] : String(phaseNum)
    const pc = pcMap[g.title] ?? {}
    const hasPlan = !!pc.plan || (g.subTasks && g.subTasks.length > 0)
    const hasSummary = !!pc.summary
    const hasVerification = !!pc.verification
    const isCompleted = hasVerification
    const tasks = (g.subTasks ?? []).map(s => ({ label: s.label, completed: s.isDone }))
    const suggestedCommand = !hasPlan ? `/gsd:plan-phase ${phaseNum}` : !hasSummary ? `/gsd:execute-phase ${phaseNum}` : !hasVerification ? `/gsd:verify-work ${phaseNum}` : `/gsd:execute-phase ${phaseNum}`
    const suggestedLabel = !hasPlan ? '計画' : !hasSummary ? '実行' : !hasVerification ? '検証' : '再実行'
    return {
      id: g.id,
      phaseNum,
      phaseIdPrefix: prefix,
      title: g.title,
      hasContext: false,
      hasPlan,
      hasSummary,
      hasVerification,
      isCompleted,
      suggestedCommand,
      suggestedLabel,
      altCommand: null,
      tasks,
      // Import 時は API を呼ばないよう常に initialContent を渡す（空でも可）
      initialContent: { plan: pc.plan ?? '', summary: pc.summary ?? '', verification: pc.verification ?? '' },
    }
  })
}

export function GSDPhasesCard({
  projectTitle,
  planningPath,
  goals,
  phaseContents,
}: {
  projectTitle: string
  planningPath?: string | null
  /** Import 時: goals + phaseContents でフェーズを構築（planningPath なしでも表示） */
  goals?: Array<{ id: string; title: string; status?: string; subTasks?: Array<{ label: string; isDone: boolean }> }>
  phaseContents?: Record<string, { plan?: string; summary?: string; verification?: string }> | null
}) {
  const [phases, setPhases] = useState<GSDPhase[]>([])
  const [loading, setLoading] = useState(true)
  const [phaseDetail, setPhaseDetail] = useState<GSDPhase | null>(null)

  const useImportMode = !planningPath && !!goals && goals.length > 0

  useEffect(() => {
    if (useImportMode && goals) {
      setPhases(goalsToPhases(goals, phaseContents ?? {}))
      setLoading(false)
      return
    }
    if (!planningPath) {
      setPhases([])
      setLoading(false)
      return
    }
    setLoading(true)
    const params = new URLSearchParams({ planningPath })
    fetch(`/api/planning/phases?${params}`)
      .then((r) => r.json())
      .then((data) => setPhases(data.phases || []))
      .catch(() => setPhases([]))
      .finally(() => setLoading(false))
  }, [planningPath, useImportMode, goals, phaseContents])

  if (!planningPath && !useImportMode) return null
  if (loading) {
    return (
      <div className="relative mb-12 rounded-3xl border border-gray-200 bg-white p-8">
        <div className="animate-pulse text-gray-400 text-sm">フェーズを読み込み中...</div>
      </div>
    )
  }
  if (phases.length === 0) return null

  const activePhases = phases.filter(p => !p.isCompleted)

  return (
    <div className="relative mb-12 md:mb-16 font-japanese-body animate-in fade-in duration-500">
      <div className="absolute -top-3 left-4 md:-top-4 md:left-6 rounded-full bg-[#d97756] px-4 py-1 flex items-center gap-1.5 md:px-5 md:py-1.5 text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-white shadow-md z-10">
        <Zap size={12} strokeWidth={2.5} className="text-amber-100" />
        GSD ロードマップ
      </div>
      <div className="relative rounded-3xl border border-gray-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#d97756]/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 z-0" />
        <div className="p-6 md:p-8 relative z-10">
          <h3 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight font-japanese-display mb-6">
            {projectTitle}
          </h3>
          <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#d97756] mb-6">
            <MapPin size={13} />
            フェーズ一覧（.planning/phases）
          </h4>
          <div className="relative border-l-2 border-gray-100 ml-4 space-y-10 pb-4">
            <CompletedPhasesAccordion phases={phases} planningPath={planningPath} onDetail={setPhaseDetail} />
            {activePhases.map((phase) => (
              <PhaseItem key={phase.id} phase={phase} planningPath={planningPath} onDetail={setPhaseDetail} />
            ))}
          </div>
        </div>
      </div>
      {phaseDetail && (
        <PhaseDetailModal
          isOpen={!!phaseDetail}
          onClose={() => setPhaseDetail(null)}
          phaseIdPrefix={phaseDetail.phaseIdPrefix}
          phaseTitle={phaseDetail.title}
          planningPath={planningPath}
          initialContent={phaseDetail.initialContent}
        />
      )}
    </div>
  )
}
