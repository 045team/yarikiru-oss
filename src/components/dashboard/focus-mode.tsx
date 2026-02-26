'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, ArrowLeft, Circle, Zap, Clock } from 'lucide-react'
import { Goal } from '@/types/dashboard'
import { fireTaskEffect } from '@/lib/utils/completion-effects'
import { AnimatedCheckmark } from '@/components/ui/animated-checkmark'
import { useGlossary } from '@/contexts/display-context'

export function FocusMode({
    task,
    onExit,
    onSubTaskToggle,
    onMarkComplete,
    onStartUrgentNow
}: {
    task: Goal
    onExit: () => void
    onSubTaskToggle?: (id: string, isDone: boolean) => Promise<void>
    onMarkComplete?: (goalId: string) => Promise<void>
    onStartUrgentNow?: (goal: Goal) => Promise<void>
}) {
    const { getDisplayTerm } = useGlossary()
    const [isEscaping, setIsEscaping] = useState(false)
    const [isCompleted, setIsCompleted] = useState(false)
    const [isStarting, setIsStarting] = useState(false)

    // Timer State
    const [logId, setLogId] = useState<string | null>(null)
    const [startTime, setStartTime] = useState<number | null>(null)
    const [elapsedSeconds, setElapsedSeconds] = useState(0)

    useEffect(() => {
        const handleBlur = () => setIsEscaping(true)
        const handleFocus = () => setTimeout(() => setIsEscaping(false), 2000)
        window.addEventListener('blur', handleBlur)
        window.addEventListener('focus', handleFocus)
        return () => {
            window.removeEventListener('blur', handleBlur)
            window.removeEventListener('focus', handleFocus)
        }
    }, [])

    useEffect(() => {
        let active = true
        async function startTimer() {
            try {
                const res = await fetch('/api/work-logs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ goalId: task.id })
                })
                if (res.ok) {
                    const data = await res.json()
                    if (active) {
                        setLogId(data.log.id)
                        setStartTime(new Date(data.log.startedAt).getTime())
                    }
                }
            } catch (e) {
                console.error('Failed to start work log', e)
            }
        }
        startTimer()
        return () => { active = false }
    }, [task.id])

    useEffect(() => {
        if (!startTime || isCompleted) return
        const interval = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000))
        }, 1000)
        return () => clearInterval(interval)
    }, [startTime, isCompleted])

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600)
        const m = Math.floor((totalSeconds % 3600) / 60)
        const s = totalSeconds % 60
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    const stopTimer = async () => {
        if (!logId) return
        try {
            await fetch('/api/work-logs', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logId })
            })
        } catch (e) {
            console.error('Failed to stop work log', e)
        }
    }

    const handleGiveUp = async () => {
        await stopTimer()
        onExit()
    }

    const handleComplete = async (e?: React.MouseEvent) => {
        setIsCompleted(true)
        await stopTimer()

        if (e) {
            fireTaskEffect(e)
        } else {
            fireTaskEffect()
        }

        if (onMarkComplete) {
            await onMarkComplete(task.id)
        }
        setTimeout(() => onExit(), 2000)
    }

    const handleStartUrgentNow = async () => {
        setIsStarting(true)
        try {
            await onStartUrgentNow?.(task)
        } finally {
            setIsStarting(false)
        }
    }

    const isUrgent = task.isUrgent

    return (
        <div
            className={`relative flex min-h-screen flex-col items-center justify-center transition-colors duration-700 ${isEscaping ? 'bg-red-50/50' : 'bg-[#faf9f5]'
                }`}
        >
            <div
                className={`absolute top-12 flex items-center text-[#d97756] transition-opacity duration-500 ${isEscaping ? 'opacity-100' : 'opacity-0'
                    }`}
            >
                <AlertTriangle size={16} className="mr-3" aria-hidden />
                <span className="text-sm font-light uppercase tracking-widest">
                    Focus Lost. Return immediately.
                </span>
            </div>

            {isUrgent && (
                <div className="absolute top-12 flex items-center gap-2 bg-[#d97706] text-white px-4 py-2 rounded-full animate-pulse">
                    <AlertTriangle size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">緊急の{getDisplayTerm('目標', 'Goal')}</span>
                </div>
            )}

            <button
                type="button"
                onClick={handleGiveUp}
                className="absolute top-12 left-12 flex items-center gap-2 text-gray-400 transition-colors hover:text-gray-600"
            >
                <ArrowLeft size={16} aria-hidden />
                <span className="text-xs font-light uppercase tracking-widest">Dashboard</span>
            </button>

            <div
                className={`max-w-xl w-full px-8 transition-all duration-1000 ${isCompleted ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
                    }`}
            >
                <div className="mb-16 text-center">
                    <div className="mb-8 flex flex-col items-center gap-3">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-[#d97756]">Current Focus</p>
                        {startTime && !isCompleted && (
                            <div className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-gray-100 shadow-sm text-gray-500 font-mono text-sm">
                                <Clock size={14} className="text-[#d97756]" />
                                {formatTime(elapsedSeconds)}
                            </div>
                        )}
                    </div>
                    <h2 className="whitespace-pre-wrap text-3xl font-light leading-relaxed text-gray-900">
                        {task.title}
                    </h2>
                </div>

                <div className="mb-24 space-y-6">
                    {task.subTasks
                        .filter((st) => !st.isDone)
                        .map((sub) => (
                            <button
                                key={sub.id}
                                type="button"
                                onClick={() => onSubTaskToggle?.(sub.id, true)}
                                className="flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
                            >
                                <Circle size={12} strokeWidth={1.5} className="mr-4 text-gray-300" aria-hidden />
                                <span className="text-base font-light text-gray-600">{sub.label}</span>
                            </button>
                        ))}
                </div>

                <div className="flex flex-col items-center">
                    {isUrgent && onStartUrgentNow ? (
                        <div className="flex flex-col items-center gap-4">
                            <button
                                type="button"
                                onClick={handleStartUrgentNow}
                                disabled={isStarting}
                                className="group relative flex h-24 w-48 items-center justify-center rounded-full bg-[#d97706] text-white transition-all duration-500 hover:bg-[#b45309] disabled:opacity-50"
                            >
                                {isStarting ? (
                                    <span className="text-sm font-light uppercase tracking-widest">挿入中...</span>
                                ) : (
                                    <>
                                        <Zap size={20} className="mr-2" />
                                        <span className="text-sm font-bold uppercase tracking-widest">今すぐ開始</span>
                                    </>
                                )}
                                <div className="absolute inset-0 rounded-full border border-[#d97706] animate-ping opacity-20 group-hover:hidden" />
                            </button>
                            <button
                                type="button"
                                onClick={handleComplete}
                                className="text-xs font-light uppercase tracking-widest text-gray-400 hover:text-gray-600"
                            >
                                または通常完了 →
                            </button>
                        </div>
                    ) : isCompleted ? (
                        <div className="flex h-24 w-24 items-center justify-center">
                            <AnimatedCheckmark className="w-16 h-16 text-[#22c55e]" />
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={handleComplete}
                            className="group relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#d97756] text-[#d97756] transition-all duration-500 hover:bg-[#d97756] hover:text-white"
                        >
                            <span className="text-sm font-light uppercase tracking-widest">Done</span>
                            <div className="absolute inset-0 rounded-full border border-[#d97756] animate-ping opacity-20 group-hover:hidden" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleGiveUp}
                        className="mt-16 text-[10px] font-light uppercase tracking-widest text-gray-300 transition-colors hover:text-gray-500"
                    >
                        Give Up & Stop Timer
                    </button>
                </div>
            </div>
        </div>
    )
}
