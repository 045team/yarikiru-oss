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
    RefreshCw,
    FolderPlus,
} from 'lucide-react'
import { UrgentTaskCard } from './urgent-task-card'
import { SystemStateCard } from './system-state-card'
import { GSDPhasesCard } from './gsd-phases-card'
import { Minus, AlertTriangle, X } from 'lucide-react'
import { Project, Goal, SubTask } from '@/types/dashboard'
import RotatingText from '@/components/RotatingText'
import { fireTaskEffect, fireGoalEffect } from '@/lib/utils/completion-effects'
import { useGlossary } from '@/contexts/display-context'
import { CopyablePrompt } from '@/components/ui/copyable-prompt'

// --- プロジェクト追加セクション（フォルダ選択ボタン） ---
function AddProjectSection({
    onSelectFolder,
    addLoading,
    addError,
}: {
    onSelectFolder: () => Promise<void>
    addLoading: boolean
    addError: string | null
}) {
    return (
        <div className="text-center">
            <p className="text-sm text-gray-500 mb-4">
                プロジェクトのフォルダを選択
            </p>
            <button
                type="button"
                onClick={onSelectFolder}
                disabled={addLoading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#d97756] hover:bg-[#d97756]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors shadow-sm"
            >
                {addLoading ? <RefreshCw size={20} className="animate-spin" /> : <FolderPlus size={20} />}
                {addLoading ? '追加中...' : 'フォルダを選択'}
            </button>
            {addError && (
                <p className="mt-2 text-xs text-amber-600 max-w-xl mx-auto">
                    {addError}
                </p>
            )}
            <p className="mt-3 text-xs text-gray-400">
                Finder で GSD プロジェクトのルートフォルダを選んでください
            </p>
        </div>
    )
}

// --- 削除確認モーダル ---
function DeleteConfirmModal({
    isOpen,
    projectTitle,
    onConfirm,
    onCancel,
    isDeleting,
}: {
    isOpen: boolean
    projectTitle: string
    onConfirm: () => void
    onCancel: () => void
    isDeleting: boolean
}) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-full bg-red-100">
                            <AlertTriangle size={24} className="text-red-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">プロジェクトを削除</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                        <span className="font-semibold text-gray-900">{projectTitle}</span> を削除しますか？
                    </p>
                    <p className="text-xs text-gray-400">
                        プロジェクト自体は削除されず、ダッシュボードから除外されるだけです。
                    </p>
                </div>
                <div className="flex border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="flex-1 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        キャンセル
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex-1 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors border-l border-gray-100 disabled:opacity-50"
                    >
                        {isDeleting ? '削除中...' : '削除する'}
                    </button>
                </div>
            </div>
        </div>
    )
}

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
    onGsdSync,
    gsdSyncLoading,
    gsdSyncError,
    onSelectFolder,
    addProjectLoading,
    addProjectError,
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
    onGsdSync?: () => Promise<void>
    gsdSyncLoading?: boolean
    gsdSyncError?: string | null
    onSelectFolder?: () => Promise<void>
    addProjectLoading?: boolean
    addProjectError?: string | null
}) {
    const { getDisplayTerm } = useGlossary()
    const [scheduling, setScheduling] = useState(false)
    const [openDoneMap, setOpenDoneMap] = useState<Record<string, boolean>>({})

    const toggleDone = (projectId: string) =>
        setOpenDoneMap(prev => ({ ...prev, [projectId]: !prev[projectId] }))

    const urgentGoal = projects.flatMap(p => p.goals).find(g => g.isUrgent) ?? null

    // 削除モーダル用state
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        try {
            await onArchiveProject(deleteTarget.id)
            setDeleteTarget(null)
        } finally {
            setIsDeleting(false)
        }
    }

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

            {/* 目標コンテンツ（GSDフェーズ・緊急タスク）をプロジェクトより上に配置 */}
            {urgentGoal && (
                <div className="mb-8 md:mb-16">
                    <UrgentTaskCard urgentGoal={urgentGoal} onStartFocus={onStartFocus} />
                </div>
            )}

            {projects.length > 0 && projects.map((project) =>
                project.planningPath ? (
                    <GSDPhasesCard
                        key={project.id}
                        projectTitle={project.title}
                        planningPath={project.planningPath}
                    />
                ) : (project.goals?.length ?? 0) > 0 ? (
                    <GSDPhasesCard
                        key={project.id}
                        projectTitle={project.title}
                        goals={project.goals}
                        phaseContents={project.phaseContents ?? undefined}
                    />
                ) : project.systemStateMd ? (
                    <SystemStateCard
                        key={project.id}
                        projectTitle={project.title}
                        systemStateMd={project.systemStateMd}
                        planningPath={null}
                    />
                ) : null
            )}

            <div className="mb-8 md:mb-12">
                {/* プロジェクトを追加 - フォルダパスで .planning を検出し追加 */}
                {onSelectFolder && (
                    <AddProjectSection
                        onSelectFolder={onSelectFolder}
                        addLoading={addProjectLoading ?? false}
                        addError={addProjectError ?? null}
                    />
                )}
            </div>

            {/* プロジェクト一覧（シンプル表示） */}
            {projects.length > 0 && (
                <div className="mb-8 space-y-3">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">プロジェクト一覧</h3>
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            className="group relative flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-2 h-2 rounded-full bg-[#d97756] shrink-0" />
                                <span className="font-medium text-gray-800 truncate">{project.title}</span>
                                {project.planningPath && (
                                    <span className="text-xs text-gray-400 truncate max-w-[200px]">{project.planningPath}</span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: project.id, title: project.title }); }}
                                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                                title="プロジェクトを削除"
                            >
                                <Minus size={16} strokeWidth={2} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* GSD Sync ボタン */}
            {onGsdSync && (
                <div className="mb-6 flex items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={onGsdSync}
                        disabled={gsdSyncLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw size={14} className={gsdSyncLoading ? 'animate-spin' : ''} />
                        {gsdSyncLoading ? '同期中...' : 'GSD Sync'}
                    </button>
                    {gsdSyncError && (
                        <span className="text-xs text-amber-600 max-w-[200px] truncate" title={gsdSyncError}>
                            {gsdSyncError}
                        </span>
                    )}
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

            {/* 削除確認モーダル */}
            <DeleteConfirmModal
                isOpen={!!deleteTarget}
                projectTitle={deleteTarget?.title || ''}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteTarget(null)}
                isDeleting={isDeleting}
            />
        </div>
    )
}
