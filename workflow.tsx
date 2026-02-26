'use client'

import React, { useState } from 'react';
import {
    Database, Server, Bot, Layout, FileText, Rocket,
    CheckCircle2, Circle, Clock, Check, PieChart,
    ListTree, Kanban as KanbanIcon, LayoutGrid, Target,
    CheckSquare
} from 'lucide-react';

// --- Data (Japanese Translated) ---
const phasesData = [
    {
        id: "p1",
        title: "フェーズ1: DBスキーマ拡張",
        status: "completed",
        icon: "Database",
        tasks: [
            { id: "t1-1", text: "007_goal_status_and_work_logs.sqlの作成と実行", completed: true },
            { id: "t1-2", text: "yarikiru_work_logsテーブルの作成確認", completed: true },
            { id: "t1-3", text: "yarikiru_projectsへのdescription/status追加確認", completed: true },
            { id: "t1-4", text: "yarikiru_goalsへのstatus/learning/actual_minutes/priority追加確認", completed: true }
        ]
    },
    {
        id: "p2",
        title: "フェーズ2: API統合アップデート",
        status: "completed",
        icon: "Server",
        tasks: [
            { id: "t2-1", text: "/api/projects/route.ts — status/learning/progressのハンドリング", completed: true },
            { id: "t2-2", text: "/api/goals/[goalId]/complete/route.ts — 学習記録と実時間の集計", completed: true },
            { id: "t2-3", text: "/api/work-logs/route.ts — 新規タイマーAPIの作成", completed: true }
        ]
    },
    {
        id: "p3a",
        title: "フェーズ3A: MCP + AI自動タイマーのフック",
        status: "completed",
        icon: "Bot",
        tasks: [
            { id: "t3a-1", text: "src/mcp-server/index.mjs — list_projects, start_goal_work, complete_goal_work追加", completed: true },
            { id: "t3a-2", text: ".claude/hooks/session-stop.sh — タイマー停止とSTATE.mdの自動更新", completed: true },
            { id: "t3a-3", text: ".claude/hooks/session-start.sh — STATE.mdからのコンテキスト注入と通知", completed: true },
            { id: "t3a-4", text: ".claude/settings.json — フックの登録", completed: true },
            { id: "t3a-5", text: "CLAUDE.md — 作業開始/完了ルールの強制", completed: true }
        ]
    },
    {
        id: "p3b",
        title: "フェーズ3B: Web UI機能強化",
        status: "completed",
        icon: "Layout",
        tasks: [
            { id: "t3b-1", text: "dashboard-client.tsx — StatusBadge, LearningModal, プログレスバー追加", completed: true },
            { id: "t3b-2", text: "dashboard-client.tsx — 完了済みの打ち消し線と学習成果の表示", completed: true },
            { id: "t3b-3", text: "TypeScript 型チェック — エラー0件を確認", completed: true }
        ]
    },
    {
        id: "p4",
        title: "フェーズ4: ドキュメント整理",
        status: "completed",
        icon: "FileText",
        tasks: [
            { id: "t4-1", text: ".planning/STATE.md — context.mdの統合とセクション分離", completed: true },
            { id: "t4-2", text: ".planning/ROADMAP.mdとPROJECT.mdの再構成", completed: true }
        ]
    },
    {
        id: "v4",
        title: "次の開発候補 (v4.0)",
        status: "in-progress",
        icon: "Rocket",
        tasks: [
            { id: "v4-1", text: "AI作業時間予測 (過去ログからの学習)", completed: true, note: "v4.0 完了 (2026-02-20)" },
            { id: "v4-2", text: "URL学習エージェント (What/How/Impact)", completed: false },
            { id: "v4-3", text: "ループ検知と週次振り返りレポート出力", completed: false },
            { id: "v4-4", text: "yarikiru init CLIコマンド実装", completed: false }
        ]
    }
];

const IconMap: Record<string, JSX.Element> = {
    Database: <Database className="w-6 h-6" />,
    Server: <Server className="w-6 h-6" />,
    Bot: <Bot className="w-6 h-6" />,
    Layout: <Layout className="w-6 h-6" />,
    FileText: <FileText className="w-6 h-6" />,
    Rocket: <Rocket className="w-6 h-6" />
};

const IconMapSmall: Record<string, JSX.Element> = {
    Database: <Database className="w-3.5 h-3.5" />,
    Server: <Server className="w-3.5 h-3.5" />,
    Bot: <Bot className="w-3.5 h-3.5" />,
    Layout: <Layout className="w-3.5 h-3.5" />,
    FileText: <FileText className="w-3.5 h-3.5" />,
    Rocket: <Rocket className="w-3.5 h-3.5" />
};

// --- Pattern 1: Timeline View ---
const TimelineView = ({ phases }: { phases: typeof phasesData }) => (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 font-japanese-body">
        <div className="relative border-l-2 border-gray-200 dark:border-gray-800 ml-4 md:ml-8 space-y-12 pb-8">
            {phases.map((phase) => (
                <div key={phase.id} className="relative pl-8 md:pl-12">
                    {/* Timeline Node */}
                    <div className={`absolute -left-[17px] md:-left-[19px] top-1 w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center border-4 border-gray-50 dark:border-gray-900 ${phase.status === 'completed' ? 'bg-[#5b8767]' : 'bg-[#d97756] shadow-[0_0_15px_rgba(217,119,86,0.3)]'}`}>
                        {phase.status === 'completed' ? <Check className="w-4 h-4 text-white" strokeWidth={3} /> : <Clock className="w-4 h-4 text-white" />}
                    </div>

                    {/* Phase Card */}
                    <div className={`bg-white dark:bg-gray-900 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border ${phase.status === 'completed' ? 'border-gray-100 dark:border-gray-800 opacity-80 hover:opacity-100' : 'border-[#d97756]/30 dark:border-[#d97756]/20 shadow-[#d97756]/5'} p-6 md:p-8 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]`}>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                            <div className={`p-3 rounded-2xl shrink-0 w-14 h-14 flex items-center justify-center ${phase.status === 'completed' ? 'bg-[#5b8767]/10 text-[#5b8767]' : 'bg-[#d97756]/10 text-[#d97756]'}`}>
                                {IconMap[phase.icon]}
                            </div>
                            <div>
                                <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 font-japanese-display">{phase.title}</h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full ${phase.status === 'completed' ? 'bg-[#5b8767]/10 text-[#5b8767]' : 'bg-[#d97756]/10 text-[#d97756]'}`}>
                                        {phase.status === 'completed' ? '完了済み' : '進行中'}
                                    </span>
                                    <span className="text-xs text-gray-400 font-medium">
                                        {phase.tasks.filter(t => t.completed).length}/{phase.tasks.length} タスク完了
                                    </span>
                                </div>
                            </div>
                        </div>

                        <ul className="space-y-4">
                            {phase.tasks.map(task => (
                                <li key={task.id} className="flex items-start gap-3 group">
                                    <div className="mt-0.5 shrink-0">
                                        {task.completed ?
                                            <CheckCircle2 className="w-5 h-5 text-[#5b8767]" strokeWidth={1.5} /> :
                                            <Circle className="w-5 h-5 text-gray-300 dark:text-gray-700 group-hover:text-[#d97756] transition-colors" strokeWidth={1.5} />
                                        }
                                    </div>
                                    <div>
                                        <span className={`text-[14px] leading-relaxed block ${task.completed ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-700 dark:text-gray-300 font-medium'}`}>
                                            {task.text}
                                        </span>
                                        {task.note && (
                                            <span className="inline-block mt-2 text-[10px] font-bold text-[#5b8767] bg-[#5b8767]/5 border border-[#5b8767]/20 px-2.5 py-1 rounded-md tracking-wider">
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
);

// --- Pattern 2: Kanban View ---
const KanbanCard = ({ task }: { task: any }) => (
    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all cursor-default group">
        <div className="flex items-start gap-3">
            {task.completed ?
                <CheckSquare className="w-5 h-5 text-[#5b8767] shrink-0 mt-0.5" strokeWidth={1.5} /> :
                <Circle className="w-5 h-5 text-gray-300 dark:text-gray-700 shrink-0 mt-0.5 group-hover:text-[#d97756] transition-colors" strokeWidth={1.5} />
            }
            <div className="flex-1 min-w-0">
                <p className={`text-sm leading-relaxed ${task.completed ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-200 font-medium'}`}>
                    {task.text}
                </p>
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 dark:bg-gray-800 text-[10px] font-bold text-gray-500 border border-gray-100 dark:border-gray-700">
                        {IconMapSmall[task.phaseIcon]}
                        <span className="truncate max-w-[160px] tracking-wider">{task.phaseTitle.split(':')[0]}</span>
                    </span>
                    {task.note && <span className="text-[10px] font-bold tracking-wider text-[#5b8767] bg-[#5b8767]/5 px-2.5 py-1 rounded-md border border-[#5b8767]/20">{task.note}</span>}
                </div>
            </div>
        </div>
    </div>
);

const KanbanView = ({ phases }: { phases: typeof phasesData }) => {
    const allTasks = phases.flatMap(p => p.tasks.map(t => ({ ...t, phaseTitle: p.title, phaseIcon: p.icon, phaseId: p.id })));
    const doneTasks = allTasks.filter(t => t.completed);
    const todoTasks = allTasks.filter(t => !t.completed);

    return (
        <div className="flex flex-col md:flex-row gap-6 max-w-6xl mx-auto items-start animate-in fade-in duration-500 font-japanese-body">
            {/* To Do Column */}
            <div className="flex-1 bg-gray-50/50 dark:bg-gray-800/20 rounded-3xl p-6 w-full border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-6 px-1 border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#d97756]"></div>
                        <h3 className="font-extrabold text-gray-800 dark:text-gray-200 tracking-wider">これから着手</h3>
                    </div>
                    <span className="bg-gray-200/50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold px-3 py-1 rounded-full">{todoTasks.length}</span>
                </div>
                <div className="space-y-4">
                    {todoTasks.map(task => <KanbanCard key={task.id} task={task} />)}
                </div>
            </div>

            {/* Done Column */}
            <div className="flex-1 bg-[#5b8767]/5 dark:bg-[#5b8767]/10 rounded-3xl p-6 w-full border border-[#5b8767]/10 dark:border-[#5b8767]/20">
                <div className="flex items-center justify-between mb-6 px-1 border-b border-[#5b8767]/10 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#5b8767]"></div>
                        <h3 className="font-extrabold text-gray-800 dark:text-gray-200 tracking-wider">完了済み</h3>
                    </div>
                    <span className="bg-[#5b8767]/10 text-[#5b8767] text-xs font-bold px-3 py-1 rounded-full">{doneTasks.length}</span>
                </div>
                <div className="space-y-4 opacity-80 hover:opacity-100 transition-opacity duration-300">
                    {doneTasks.map(task => <KanbanCard key={task.id} task={task} />)}
                </div>
            </div>
        </div>
    );
};

// --- Pattern 3: Dashboard View ---
const DashboardView = ({ phases }: { phases: typeof phasesData }) => {
    const totalTasks = phases.reduce((acc, p) => acc + p.tasks.length, 0);
    const completedTasks = phases.reduce((acc, p) => acc + p.tasks.filter(t => t.completed).length, 0);
    const progressPercent = Math.round((completedTasks / totalTasks) * 100);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 font-japanese-body">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100 dark:border-gray-800 flex items-center gap-8">
                    <div className="relative w-24 h-24 shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-100 dark:text-gray-800" />
                            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeLinecap="round" strokeWidth="6" fill="transparent" strokeDasharray={`${progressPercent * 2.51} 251`} className="text-[#d97756] transition-all duration-1000 ease-out" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl font-extrabold text-gray-800 dark:text-gray-100 font-japanese-display">{progressPercent}%</span>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">総進捗状況</h3>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white font-japanese-display">{completedTasks}</h2>
                            <span className="text-gray-400 font-medium text-sm">/ {totalTasks} タスク完了</span>
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden bg-gradient-to-br from-[#d97756] to-[#b45309] p-8 rounded-3xl shadow-[0_12px_40px_rgba(217,119,86,0.2)] text-white flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2.5 mb-3">
                            <Target className="w-5 h-5 text-orange-200" />
                            <h3 className="font-bold text-[10px] uppercase tracking-widest text-orange-100">現在のフォーカス</h3>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-extrabold leading-tight font-japanese-display">v4.0 開発機能の選定</h2>
                        <p className="text-orange-100 mt-3 text-sm font-medium leading-relaxed">URL学習エージェントの実装と週次レポートへの展開に着手します。</p>
                    </div>
                </div>
            </div>

            {/* Phase Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {phases.map(phase => {
                    const phaseTotal = phase.tasks.length;
                    const phaseDone = phase.tasks.filter(t => t.completed).length;
                    const phasePct = Math.round((phaseDone / phaseTotal) * 100);

                    return (
                        <div key={phase.id} className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100 dark:border-gray-800 flex flex-col h-full hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-4 rounded-2xl ${phase.status === 'completed' ? 'bg-[#5b8767]/10 text-[#5b8767]' : 'bg-[#d97756]/10 text-[#d97756]'}`}>
                                    {IconMap[phase.icon]}
                                </div>
                                <div className="text-right">
                                    <span className={`text-2xl font-extrabold font-japanese-display ${phasePct === 100 ? 'text-[#5b8767]' : 'text-[#d97756]'}`}>
                                        {phasePct}%
                                    </span>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{phaseDone}/{phaseTotal} 完了</p>
                                </div>
                            </div>

                            <h3 className="text-lg font-extrabold text-gray-800 dark:text-gray-100 mb-6 tracking-tight line-clamp-1">{phase.title}</h3>

                            <div className="mt-auto">
                                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-6 overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-1000 ${phasePct === 100 ? 'bg-[#5b8767]' : 'bg-[#d97756]'}`} style={{ width: `${phasePct}%` }}></div>
                                </div>

                                <div className="space-y-3">
                                    {phase.tasks.slice(0, 3).map(task => (
                                        <div key={task.id} className="flex items-start gap-3">
                                            {task.completed ? <Check className="w-4 h-4 text-[#5b8767] shrink-0 mt-0.5" strokeWidth={2} /> : <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0 mt-0.5" strokeWidth={2} />}
                                            <span className={`text-[13px] leading-relaxed line-clamp-2 ${task.completed ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300 font-medium'}`}>{task.text}</span>
                                        </div>
                                    ))}
                                    {phase.tasks.length > 3 && (
                                        <p className="text-[10px] font-bold text-gray-400 pl-7 pt-2 tracking-widest uppercase">
                                            他 {phase.tasks.length - 3} 件のタスク
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

// --- Main Application ---
export default function App() {
    const [view, setView] = useState('roadmap');

    return (
        <div className="min-h-screen bg-transparent py-8 px-4 font-sans transition-colors duration-200">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="mb-10 pl-6 border-l-4 border-[#d97756]">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight font-japanese-display">
                        Yarikiru 開発ロードマップ
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                        現在の実行フェーズと、v4.0に向けた開発・実験トラッキング。
                    </p>
                </div>

                {/* View Toggle */}
                <div className="flex mb-12 flex-wrap gap-2">
                    <button
                        onClick={() => setView('roadmap')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all ${view === 'roadmap' ? 'bg-[#d97756] text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        <ListTree className="w-4 h-4" /> タイムライン
                    </button>
                    <button
                        onClick={() => setView('kanban')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all ${view === 'kanban' ? 'bg-[#d97756] text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        <KanbanIcon className="w-4 h-4" /> カンバン
                    </button>
                    <button
                        onClick={() => setView('dashboard')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all ${view === 'dashboard' ? 'bg-[#d97756] text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                        <LayoutGrid className="w-4 h-4" /> ダッシュボード
                    </button>
                </div>

                {/* Content Area */}
                <div className="min-h-[500px]">
                    {view === 'roadmap' && <TimelineView phases={phasesData} />}
                    {view === 'kanban' && <KanbanView phases={phasesData} />}
                    {view === 'dashboard' && <DashboardView phases={phasesData} />}
                </div>

            </div>
        </div>
    );
}