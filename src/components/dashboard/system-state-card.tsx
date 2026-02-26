'use client'

import React, { useState } from 'react'
import { Activity, MapPin, Zap, CheckCircle2, ChevronRight, PlayCircle, FileText, Check, Clock, Circle, Database, Server, Bot, Layout, Rocket, Copy, ChevronDown, History } from 'lucide-react'

// --- Types ---
interface Task {
    id: string;
    text: string;
    completed: boolean;
    note?: string;
}

interface Phase {
    id: string;
    title: string;
    status: 'completed' | 'in-progress' | 'pending';
    icon: string;
    tasks: Task[];
}

// Accordion component for all completed phases
function CompletedPhasesAccordion({ phases }: { phases: Phase[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const completedPhases = phases.filter(p => p.status === 'completed');

    if (completedPhases.length === 0) return null;

    return (
        <div className="relative pl-8 md:pl-10 mb-10">
            {/* Timeline Node */}
            <div className="absolute -left-[17px] top-4 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white bg-[#5b8767]">
                <Check className="w-4 h-4 text-white" strokeWidth={3} />
            </div>

            {/* Accordion Card */}
            <div className="bg-gradient-to-br from-[#5b8767]/5 to-[#5b8767]/0 rounded-2xl border border-[#5b8767]/20 overflow-hidden transition-all hover:shadow-md">
                {/* Header - Always Visible */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex flex-col sm:flex-row sm:items-center gap-3 p-5 text-left hover:bg-white/30 transition-colors"
                >
                    <div className="p-2.5 rounded-xl shrink-0 bg-[#5b8767]/10 text-[#5b8767]">
                        <History className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-extrabold text-gray-700 font-japanese-display">完了済みフェーズ</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#5b8767]/10 text-[#5b8767]">
                                {completedPhases.length} フェーズ完了
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">
                                {completedPhases.reduce((sum, p) => sum + p.tasks.filter(t => t.completed).length, 0)} / {completedPhases.reduce((sum, p) => sum + p.tasks.length, 0)} タスク完了
                            </span>
                        </div>
                    </div>
                    <div className={`p-1.5 rounded-lg bg-white/50 border border-[#5b8767]/20 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                        <ChevronDown size={16} className="text-[#5b8767]/70" />
                    </div>
                </button>

                {/* Expandable Content */}
                {isOpen && (
                    <div className="px-5 pb-5 border-t border-[#5b8767]/10 bg-white/30 space-y-4">
                        {completedPhases.map((phase) => (
                            <div key={phase.id} className="pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1.5 rounded-lg bg-[#5b8767]/10 text-[#5b8767]">
                                        {IconMap[phase.icon] || IconMap['FileText']}
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-600 font-japanese-display">{phase.title}</h4>
                                    <PhaseCopyButton phaseTitle={phase.title} />
                                </div>
                                <ul className="space-y-2 ml-9">
                                    {phase.tasks.map(task => (
                                        <li key={task.id} className="flex items-start gap-2 group">
                                            <div className="mt-0.5 shrink-0">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-[#5b8767]" strokeWidth={2} />
                                            </div>
                                            <div>
                                                <span className="text-[12px] leading-relaxed block text-gray-500 line-through decoration-gray-300">
                                                    {task.text}
                                                </span>
                                                {task.note && (
                                                    <span className="inline-block mt-0.5 text-[9px] font-bold text-[#5b8767] bg-[#5b8767]/5 border border-[#5b8767]/20 px-1.5 py-0.5 rounded tracking-wider">
                                                        ✨ {task.note}
                                                    </span>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function PhaseCopyButton({ phaseTitle }: { phaseTitle: string }) {
    const [copied, setCopied] = React.useState(false);
    const handleCopy = () => {
        const match = phaseTitle.match(/Phase\s*(\d+)/i) || phaseTitle.match(/フェーズ\s*(\d+)/i);
        const arg = match ? match[1] : `"${phaseTitle}"`;
        navigator.clipboard.writeText(`/gsd:execute-phase ${arg}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={handleCopy}
            className="ml-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-[#d97756]/50 hover:bg-[#d97756]/5 text-gray-500 hover:text-[#d97756] transition-all shadow-sm text-[10px] sm:text-xs font-bold tracking-wider"
            title="AI実行コマンドをコピー"
        >
            {copied ? <Check size={14} className="text-[#5b8767]" /> : <Copy size={14} />}
            {copied ? <span className="text-[#5b8767]">Copied!</span> : <span>Copy Command</span>}
        </button>
    );
}

interface ParsedState {
    currentPosition: {
        phase: string;
        plan: string;
        status: string;
        lastActivity: string;
    } | null;
    lastSession: {
        savedAt: string;
        activeGoal: string;
        whatWasDone: string;
    } | null;
    phases: Phase[];
}

const IconMap: Record<string, JSX.Element> = {
    Database: <Database className="w-5 h-5 md:w-6 md:h-6" />,
    Server: <Server className="w-5 h-5 md:w-6 md:h-6" />,
    Bot: <Bot className="w-5 h-5 md:w-6 md:h-6" />,
    Layout: <Layout className="w-5 h-5 md:w-6 md:h-6" />,
    FileText: <FileText className="w-5 h-5 md:w-6 md:h-6" />,
    Rocket: <Rocket className="w-5 h-5 md:w-6 md:h-6" />
};

function guessIconForTitle(title: string): string {
    const t = title.toLowerCase();
    if (t.includes('db') || t.includes('database') || t.includes('スキーマ')) return 'Database';
    if (t.includes('api') || t.includes('server') || t.includes('route')) return 'Server';
    if (t.includes('bot') || t.includes('ai') || t.includes('mcp') || t.includes('agent')) return 'Bot';
    if (t.includes('ui') || t.includes('frontend') || t.includes('layout') || t.includes('dashboard')) return 'Layout';
    if (t.includes('doc') || t.includes('file') || t.includes('ドキュメント')) return 'FileText';
    if (t.includes('next') || t.includes('v4') || t.includes('v5') || t.includes('v6') || t.includes('v7') || t.includes('future') || t.includes('候補') || t.includes('ロードマップ') || t.includes('oss') || t.includes('full')) return 'Rocket';
    return 'FileText'; // Default
}

function guessStatusFromTitle(title: string): 'completed' | 'in-progress' | 'pending' {
    const t = title.toLowerCase();
    if (t.includes('完了') || t.includes('completed') || t.includes('done')) return 'completed';
    if (t.includes('進行中') || t.includes('in-progress') || t.includes('in progress') || t.includes('wip')) return 'in-progress';
    if (t.includes('準備中') || t.includes('planned') || t.includes('planning')) return 'pending';
    return 'pending';
}

// --- Parsing Logic ---
function parseStateMd(md: string): ParsedState {
    const lines = md.split('\n')

    let currentPosition: any = { phase: '', plan: '', status: '', lastActivity: '' }
    let lastSession: any = { savedAt: '', activeGoal: '', whatWasDone: '' }
    let phases: Phase[] = [];

    let inPosition = false;
    let inSession = false;
    let inPhases = false;

    let currentPhase: Phase | null = null;
    let whatWasDoneBuffer: string[] = []

    for (let line of lines) {
        // Section Detectors
        if (line.startsWith('## Current Position')) {
            inPosition = true; inSession = false; inPhases = false; continue;
        } else if (line.startsWith('## 🔄 Last Session') || line.startsWith('## Last Session')) {
            inSession = true; inPosition = false; inPhases = false;
            if (currentPhase) { phases.push(currentPhase); currentPhase = null; }
            continue;
        } else if (line.startsWith('## ✅ Completed') || line.startsWith('## 📋 Next Candidates') || line.startsWith('## Completed') || line.startsWith('## Next') || line.startsWith('## ✅ 完了') || line.startsWith('## 📋 次期') || line.startsWith('## 📋 次の') || line.startsWith('## 📋 今後の')) {
            inPhases = true; inPosition = false; inSession = false;

            // if "Next Candidates", maybe add a special phase
            if (currentPhase) { phases.push(currentPhase); currentPhase = null; }

            // If it's a direct list without ###, we might need a dummy phase
            continue;
        } else if (line.startsWith('## ')) {
            inPosition = false; inSession = false; inPhases = false;
            if (currentPhase) { phases.push(currentPhase); currentPhase = null; }
            continue;
        }

        // Parse Current Position
        if (inPosition) {
            if (line.startsWith('Phase:')) currentPosition.phase = line.replace('Phase:', '').trim()
            if (line.startsWith('Plan:')) currentPosition.plan = line.replace('Plan:', '').trim()
            if (line.startsWith('Status:')) currentPosition.status = line.replace('Status:', '').trim()
            if (line.startsWith('Last activity:')) currentPosition.lastActivity = line.replace('Last activity:', '').trim()
        }

        // Parse Last Session
        if (inSession) {
            if (line.startsWith('>')) continue;
            if (line.startsWith('Saved at:')) { lastSession.savedAt = line.replace('Saved at:', '').trim(); continue; }
            if (line.startsWith('Active Goal:')) { lastSession.activeGoal = line.replace('Active Goal:', '').trim(); continue; }
            if (line.startsWith('What was done:')) continue;
            if (line.startsWith('Changed files:')) {
                lastSession.whatWasDone = whatWasDoneBuffer.join('\n').trim();
                inSession = false;
                continue;
            }
            if (line.trim() !== '') {
                whatWasDoneBuffer.push(line.trim());
            }
        }

        // Parse Phases & Tasks
        if (inPhases) {
            if (line.startsWith('### ')) {
                // Save previous phase
                if (currentPhase) phases.push(currentPhase);

                const title = line.replace('### ', '').trim();
                currentPhase = {
                    id: Math.random().toString(36).substr(2, 9),
                    title: title,
                    status: guessStatusFromTitle(title),
                    icon: guessIconForTitle(title),
                    tasks: []
                };
            } else if (line.startsWith('- [ ] ') || line.startsWith('- [x] ') || line.startsWith('- [/] ') || line.trim().startsWith('- [ ] ') || line.trim().startsWith('- [x] ') || line.trim().startsWith('-  ')) {
                // Handle both checkbox tasks and plain subtasks (indented with hyphen)
                // If we don't have a phase yet (e.g. Next Candidates directly under ##)
                if (!currentPhase) {
                    currentPhase = {
                        id: 'next-candidates',
                        title: '今後のロードマップ',
                        status: 'in-progress',
                        icon: 'Rocket',
                        tasks: []
                    };
                }

                const trimmedLine = line.trim();
                const isCompleted = trimmedLine.startsWith('- [x] ');
                const taskTextMatch = trimmedLine.match(/- \[[ |x|\/]\] (.*)/);
                const plainTaskMatch = trimmedLine.match(/^-  (.*)/);

                if (taskTextMatch || plainTaskMatch) {
                    let rawText = taskTextMatch ? taskTextMatch[1] : plainTaskMatch![1];
                    let note = undefined;

                    // Extract note if present "<- **Note**"
                    if (rawText.includes('<-')) {
                        const parts = rawText.split('<-');
                        rawText = parts[0].trim();
                        note = parts[1].replace(/\*\*/g, '').trim();
                    }

                    currentPhase.tasks.push({
                        id: Math.random().toString(36).substr(2, 9),
                        text: rawText,
                        completed: isCompleted,
                        note: note
                    });
                }
            }
        }
    }

    // Flush buffers
    if (inSession && whatWasDoneBuffer.length > 0) {
        lastSession.whatWasDone = whatWasDoneBuffer.join('\n').trim();
    }
    if (currentPhase) {
        phases.push(currentPhase);
    }

    // Re-evaluate Phase status based on tasks
    phases.forEach(p => {
        if (p.tasks.length > 0) {
            const allDone = p.tasks.every(t => t.completed);
            const noneDone = p.tasks.every(t => !t.completed);

            if (p.id === 'next-candidates') {
                p.title = '次期開発ロードマップ';
                // Automatically handle status based on tasks, don't force 'in-progress'
                if (allDone) p.status = 'completed';
                else if (noneDone) p.status = 'pending';
                else p.status = 'in-progress';
            } else {
                if (allDone) p.status = 'completed';
                else if (noneDone) p.status = 'pending';
                else p.status = 'in-progress';
            }
        }
    });

    return {
        currentPosition: currentPosition.phase || currentPosition.status ? currentPosition : null,
        lastSession: lastSession.savedAt || lastSession.whatWasDone ? lastSession : null,
        phases: phases
    }
}

// --- Component ---
export function SystemStateCard({ projectTitle, systemStateMd }: { projectTitle: string, systemStateMd: string | null | undefined }) {
    if (!systemStateMd) return null;

    const parsed = parseStateMd(systemStateMd);

    return (
        <div className="relative mb-12 md:mb-16 font-japanese-body animate-in fade-in duration-500">
            <div className="absolute -top-3 left-4 md:-top-4 md:left-6 rounded-full bg-[#d97756] px-4 py-1 flex items-center gap-1.5 md:px-5 md:py-1.5 text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-white shadow-md z-10">
                <Zap size={12} strokeWidth={2.5} className="text-amber-100" />
                現在のプロジェクト状態
            </div>

            <div className="relative rounded-3xl border border-gray-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#d97756]/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 z-0" />

                {/* Header Section */}
                <div className="p-6 md:p-8 relative z-10 border-b border-gray-100">
                    <h3 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight font-japanese-display mb-4">
                        {projectTitle} の開発ロードマップ
                    </h3>

                    {parsed.currentPosition && (
                        <div className="flex flex-col md:flex-row md:items-center gap-4 text-sm">
                            <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                <PlayCircle size={14} className="text-blue-500" />
                                <span className="font-bold text-[11px] tracking-wider">PHASE</span>
                                <span className="font-medium">{parsed.currentPosition.phase || '進行中'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                <CheckCircle2 size={14} className="text-green-500" />
                                <span className="font-bold text-[11px] tracking-wider">STATUS</span>
                                <span className="font-medium line-clamp-1">{parsed.currentPosition.status || '不明'}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 md:p-8 relative z-10">
                    <div className="w-full space-y-6">
                        <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#d97756] mb-6">
                            <MapPin size={13} />
                            ロードマップ進捗
                        </h4>

                        <div className="relative border-l-2 border-gray-100 ml-4 space-y-10 pb-4">
                            {/* Completed Phases Accordion */}
                            <CompletedPhasesAccordion phases={parsed.phases} />

                            {/* Active Phases */}
                            {parsed.phases.filter(p => p.status !== 'completed').map((phase) => (
                                <div key={phase.id} className="relative pl-8 md:pl-10">
                                    {/* Timeline Node */}
                                    <div className="absolute -left-[17px] top-1 w-8 h-8 rounded-full flex items-center justify-center border-4 border-white bg-[#d97756] shadow-[0_0_15px_rgba(217,119,86,0.3)]">
                                        <Clock className="w-4 h-4 text-white" />
                                    </div>

                                    {/* Phase Card */}
                                    <div className="bg-gray-50/50 rounded-2xl border border-[#d97756]/20 bg-orange-50/30 p-5 transition-all">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                                            <div className="p-2.5 rounded-xl shrink-0 bg-[#d97756]/10 text-[#d97756]">
                                                {IconMap[phase.icon] || IconMap['FileText']}
                                            </div>
                                            <div>
                                                <h3 className="text-base font-extrabold text-gray-900 font-japanese-display">{phase.title}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#d97756]/10 text-[#d97756]">
                                                        {phase.status === 'in-progress' ? '進行中' : '準備中'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-medium">
                                                        {phase.tasks.filter(t => t.completed).length}/{phase.tasks.length} タスク完了
                                                    </span>
                                                </div>
                                            </div>
                                            <PhaseCopyButton phaseTitle={phase.title} />
                                        </div>

                                        <ul className="space-y-3">
                                            {phase.tasks.map(task => (
                                                <li key={task.id} className="flex items-start gap-2.5 group">
                                                    <div className="mt-0.5 shrink-0">
                                                        {task.completed ?
                                                            <CheckCircle2 className="w-4 h-4 text-[#5b8767]" strokeWidth={2} /> :
                                                            <Circle className="w-4 h-4 text-gray-300 group-hover:text-[#d97756] transition-colors" strokeWidth={2} />
                                                        }
                                                    </div>
                                                    <div>
                                                        <span className={`text-[13px] leading-relaxed block ${task.completed ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-700 font-medium'}`}>
                                                            {task.text}
                                                        </span>
                                                        {task.note && (
                                                            <span className="inline-block mt-1 text-[10px] font-bold text-[#5b8767] bg-[#5b8767]/5 border border-[#5b8767]/20 px-2 py-0.5 rounded-md tracking-wider">
                                                                ✨ {task.note}
                                                            </span>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
