'use client'

import { useState } from 'react'
import {
    CheckCircle2,
    Circle,
    Clock,
    Plus,
    ArrowRight,
    Check,
    Copy,
    ChevronDown,
} from 'lucide-react'
import { UrgentTaskCard } from './urgent-task-card'
import { SystemStateCard } from './system-state-card'
import { Project, Goal, SubTask } from '@/types/dashboard'
import RotatingText from '@/components/RotatingText'
import { fireTaskEffect, fireGoalEffect } from '@/lib/utils/completion-effects'
import { useGlossary } from '@/contexts/display-context'
import { CopyablePrompt } from '@/components/ui/copyable-prompt'

// --- ゴールIDコピーボタン ---
function GoalCopyButton({ goalId, title }: { goalId: string; title: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation()
        const text = `Goal: ${goalId}\nTitle: ${title}\n\n完了コマンド: /yarikiru ${goalId}`
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <button
            type="button"
            onClick={handleCopy}
            title="ゴールIDとタイトルをコピー"
            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-gray-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-600"
        >
            {copied ? (
                <Check size={12} className="text-green-500" />
            ) : (
                <Copy size={12} />
            )}
        </button>
    )
}

// --- ステータスバッジ ---
function StatusBadge({ status }: { status?: string }) {
    if (!status || status === 'todo') return null
    const map: Record<string, { label: string; className: string }> = {
        in_progress: { label: '進行中', className: 'bg-blue-50 text-blue-500 border-blue-200' },
        done: { label: '完了', className: 'bg-green-50 text-green-600 border-green-200' },
        blocked: { label: 'ブロック', className: 'bg-red-50 text-red-500 border-red-200' },
    }
    const cfg = map[status]
    if (!cfg) return null
    return (
        <span className={`inline-block rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-widest ${cfg.className}`}>
            {cfg.label}
        </span>
    )
}

// --- サブタスク ---
function SubTaskItem({
    sub,
    onToggle,
    onAddToCalendar,
    showAddToCalendar,
}: {
    sub: SubTask
    onToggle: (id: string, isDone: boolean) => void
    onAddToCalendar?: (label: string) => Promise<void>
    showAddToCalendar?: boolean
}) {
    const [adding, setAdding] = useState(false)
    const handleAdd = () => {
        if (!onAddToCalendar || sub.isDone) return
        setAdding(true)
        onAddToCalendar(sub.label).finally(() => setAdding(false))
    }

    return (
        <div className={`flex items-center justify-between gap-2 group/item ${sub.isDone ? 'opacity-40' : 'opacity-100'}`}>
            <button
                type="button"
                onClick={(e) => {
                    if (!sub.isDone) {
                        fireTaskEffect(e);
                    }
                    onToggle(sub.id, !sub.isDone);
                }}
                className="flex cursor-pointer items-center min-w-0"
            >
                {sub.isDone ? (
                    <CheckCircle2 size={14} strokeWidth={1.5} className="mr-4 shrink-0 text-gray-400" aria-hidden />
                ) : (
                    <Circle
                        size={14}
                        strokeWidth={1.5}
                        className="mr-4 shrink-0 text-gray-300 transition-colors group-hover/item:text-gray-500"
                        aria-hidden
                    />
                )}
                <span
                    className={`text-sm font-light text-left ${sub.isDone ? 'text-gray-400 line-through' : 'text-gray-600'}`}
                >
                    {sub.label}
                </span>
            </button>
            {showAddToCalendar && !sub.isDone && (
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={adding}
                    className="shrink-0 rounded-full border border-[#d97756]/50 bg-[#d97756]/5 px-2.5 py-1 text-[10px] font-light uppercase tracking-widest text-[#d97756] transition-colors hover:bg-[#d97756]/15 disabled:opacity-50"
                >
                    {adding ? '...' : '＋追加'}
                </button>
            )}
        </div>
    )
}

// --- アクティブな目標 ---
export function GoalsContent({
    projects,
    isLoading,
    googleConnected,
    onStartFocus,
    onSubTaskToggle,
    onAddToCalendar,
    onScheduleTomorrow,
    onRefresh,
    onCompleteGoal,
    onUndoGoal,
    onOpenPlanModal,
    onArchiveProject,
}: {
    projects: Project[]
    isLoading: boolean
    googleConnected: boolean
    onStartFocus: (goal: Goal) => void
    onSubTaskToggle: (id: string, isDone: boolean) => Promise<void>
    onAddToCalendar: (title: string) => Promise<void>
    onScheduleTomorrow: () => Promise<void>
    onRefresh: () => void
    onCompleteGoal: (goalId: string, goalTitle: string) => void
    onUndoGoal: (goalId: string) => Promise<void>
    onOpenPlanModal: () => void
    onArchiveProject: (projectId: string) => Promise<void>
}) {
    const { getDisplayTerm } = useGlossary()
    const [scheduling, setScheduling] = useState(false)
    const [openDoneMap, setOpenDoneMap] = useState<Record<string, boolean>>({})

    const toggleDone = (projectId: string) =>
        setOpenDoneMap(prev => ({ ...prev, [projectId]: !prev[projectId] }))

    const urgentGoal = projects.flatMap(p => p.goals).find(g => g.isUrgent) ?? null

    return (
        <div className="flex flex-1 flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="mb-6 md:mb-12">
                <h2 className="mb-3 md:mb-4 font-japanese-display text-2xl md:text-4xl font-bold text-gray-900 tracking-tight">
                    ただ、これを終わらせる。
                </h2>
                <div className="font-japanese-body text-xs md:text-sm text-gray-400 leading-relaxed font-medium flex h-6">
                    <RotatingText
                        texts={[
                            "千里の道も一歩から by 老子",
                            "A journey of a thousand miles begins with a single step. by Lao Tzu",
                            "象を食べるなら一口ずつ by デズモンド・ツツ",
                            "Eat the elephant one bite at a time. by Desmond Tutu",
                            "目は星に向け、足は地につけよ by セオドア・ルーズベルト",
                            "Keep your eyes on the stars, and your feet on the ground. by Theodore Roosevelt",
                            "少しずつ進めば、どんなことも簡単だ 作者不明",
                            "Inch by inch, it's a cinch. by Unknown",
                            "雨垂れ石を穿つ 故事成語より",
                            "Constant dropping wears away a stone. from Proverb",
                            "ローマは一日にして成らず by ジョン・ヘイウッド",
                            "Rome was not built in a day. by John Heywood",
                            "小さな斧のひと振りも、繰り返せば大木を倒す by ベンジャミン・フランクリン",
                            "Little strokes fell great oaks. by Benjamin Franklin",
                            "階段を一番上まで見る必要はない。まずは一段目を上りなさい by マーティン・ルーサー・キング・ジュニア",
                            "You don't have to see the whole staircase, just take the first step. by Martin Luther King Jr."
                        ]}
                        staggerFrom="first"
                        staggerDuration={0.02}
                        rotationInterval={5000}
                        splitLevelClassName="overflow-hidden"
                        transition={{ type: "spring", damping: 30, stiffness: 400 }}
                    />
                </div>
            </header>

            <div className="mb-8 md:mb-12">
                {/* Quick Captureへの誘導 */}
                <div className="text-center">
                    <p className="text-sm text-gray-500 mb-4">
                        ふと浮かんだアイデアは？
                    </p>
                    <button
                        onClick={() => window.location.href = '/capture'}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-[#d97756] to-[#b45309] text-white px-6 py-3 rounded-full font-medium hover:shadow-lg transition-all"
                    >
                        <Plus size={20} />
                        思いつきをキャプチャー
                    </button>
                    <p className="mt-3 text-xs text-gray-400">
                        携帯でメモ → PCで登録 → タスク分解
                    </p>
                </div>
            </div>

            {projects.length > 0 && projects[0].systemStateMd && (
                <SystemStateCard
                    projectTitle={projects[0].title}
                    systemStateMd={projects[0].systemStateMd}
                />
            )}

            {urgentGoal && (
                <div className="mb-8 md:mb-16">
                    <UrgentTaskCard urgentGoal={urgentGoal} onStartFocus={onStartFocus} />
                </div>
            )}

            <div className="flex flex-1 flex-col space-y-8 md:space-y-16 pb-24">
                {isLoading ? (
                    <div className="py-12 text-center text-sm text-gray-400">読込中...</div>
                ) : projects.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-400">
                        {getDisplayTerm('リポジトリ', 'Repository')}を上の入力欄から追加してください
                    </div>
                ) : null}
            </div>
        </div>
    )
}
