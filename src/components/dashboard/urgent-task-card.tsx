'use client'

import { AlertTriangle, Check, Clock, ArrowRight } from 'lucide-react'
import { Goal } from '@/types/dashboard'
import { useGlossary } from '@/contexts/display-context'

export function UrgentTaskCard({
    urgentGoal,
    onStartFocus
}: {
    urgentGoal: Goal | null
    onStartFocus: (goal: Goal) => void
}) {
    const { getDisplayTerm } = useGlossary()
    if (!urgentGoal) return null

    // サブタスクの進捗を計算
    const completedSubTasks = urgentGoal.subTasks?.filter(st => st.isDone).length ?? 0
    const totalSubTasks = urgentGoal.subTasks?.length ?? 0
    const progress = totalSubTasks > 0 ? (completedSubTasks / totalSubTasks) * 100 : 0

    return (
        <div className="relative">
            {/* 通常タスクの上に重なる緊急タスク - 斜めにずれた後ろ配置のシミュレーション */}
            <div className="relative rounded-3xl border-2 border-[#d97706] bg-gradient-to-br from-[#d97706] to-[#b45309] p-10 shadow-2xl animate-in slide-in-from-right-8 duration-500">
                {/* 緊急マーク */}
                <div className="absolute -top-4 -right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg animate-pulse">
                    <AlertTriangle className="h-6 w-6 text-[#d97706]" fill="currentColor" />
                </div>

                <div className="relative z-10">
                    <div className="mb-4 flex items-center gap-2">
                        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
                            緊急の{getDisplayTerm('目標', 'Goal')}
                        </span>
                        <span className="text-xs font-medium uppercase tracking-widest text-white/80">
                            割り込み
                        </span>
                    </div>

                    <h3 className="mb-4 text-2xl font-light text-white">
                        {urgentGoal.title}
                    </h3>

                    {/* サブタスクの表示 */}
                    {urgentGoal.subTasks && urgentGoal.subTasks.length > 0 && (
                        <div className="mb-4 space-y-2">
                            {urgentGoal.subTasks.slice(0, 3).map((subTask) => (
                                <div key={subTask.id} className="flex items-center gap-3 text-white">
                                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${subTask.isDone ? 'bg-white/30 border-white' : 'border-white/50'}`}>
                                        {subTask.isDone && <Check size={12} className="text-white" />}
                                    </div>
                                    <span className={`text-sm font-light ${subTask.isDone ? 'line-through opacity-70' : ''}`}>
                                        {subTask.label}
                                    </span>
                                </div>
                            ))}
                            {urgentGoal.subTasks.length > 3 && (
                                <div className="text-xs text-white/60 pl-8">
                                    +{urgentGoal.subTasks.length - 3} つの{getDisplayTerm('タスク', 'Task')}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 進捗バー */}
                    {totalSubTasks > 0 && (
                        <div className="mb-6">
                            <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="mt-2 text-xs text-white/70 text-right">
                                {completedSubTasks} / {totalSubTasks} 完了
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-4">
                        <div className="flex items-center text-sm font-light text-white/80">
                            <Clock size={14} className="mr-2" />
                            <span>緊急 - 今すぐ</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => onStartFocus(urgentGoal)}
                            className="flex items-center rounded-full bg-white px-6 py-2 text-sm font-bold uppercase tracking-widest text-[#d97706] transition-all hover:bg-white/90 hover:scale-105"
                        >
                            <span>開始</span>
                            <ArrowRight size={14} className="ml-2" />
                        </button>
                    </div>
                </div>

                {/* 装用的な斜めライン - 「ずれている」効果を強調 */}
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                    <div className="absolute -right-20 -top-20 h-40 w-40 bg-white/5 rounded-full blur-2xl" />
                </div>
            </div>

            {/* 背後にずれる通常タスク（視覚効果） */}
            <div className="absolute top-4 left-4 right-4 -z-10 rounded-3xl border border-gray-200 bg-white/80 p-10 shadow-lg transform rotate-2 scale-95 blur-[1px]">
                <div className="text-sm text-gray-400 font-light">他のタスク</div>
            </div>
        </div>
    )
}
