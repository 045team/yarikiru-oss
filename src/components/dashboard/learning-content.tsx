'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Link as LinkIcon, ArrowRight, X } from 'lucide-react'
import { Learning } from '@/types/dashboard'

// --- 学習アイテム詳細モーダル ---
export function LearningDetailModal({
    item,
    onClose,
    onStatusChange,
}: {
    item: Learning
    onClose: () => void
    onStatusChange: (id: string, status: string) => void
}) {
    const [copied, setCopied] = useState<string | null>(null)

    // 開いた瞬間に unread → summarized へ自動更新
    useEffect(() => {
        if (item.status === 'unread') {
            fetch(`/api/learnings/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ status: 'summarized' }),
            }).then(() => {
                onStatusChange(item.id, 'summarized')
            })
        }
    }, [item.id, item.status, onStatusChange])

    const title = item.title || item.url

    // AI アクション提案をコンテンツから自動生成
    const suggestions = [
        {
            id: 'implement',
            icon: '🚀',
            label: '実装依頼プロンプトをコピー',
            description: 'Claude Code への実装依頼として使えるプロンプトを生成',
            prompt: `以下の技術記事を参考に、現在のプロジェクトへの実装を行ってください。

タイトル: ${title}
ソース: ${item.url}

【What】${item.what || '（要約なし）'}
【How】${item.how || '（要約なし）'}
【Impact】${item.impact || '（要約なし）'}

上記を踏まえて、最小限の実装から始めてください。`,
        },
        {
            id: 'goal',
            icon: '🎯',
            label: 'ゴール作成プロンプトをコピー',
            description: 'この記事の内容をゴールとして追加する指示プロンプト',
            prompt: `yarikiru の現在のプロジェクトに、以下の内容を元にした新しいゴールを追加してください。

タイトル案: 「${title}」を試す・実装する
背景: ${item.what || ''}
アプローチ: ${item.how || ''}
期待効果: ${item.impact || ''}

適切なサブタスクも提案して、create_tasks ツールで登録してください。`,
        },
        {
            id: 'article',
            icon: '✍️',
            label: '記事ドラフト生成プロンプトをコピー',
            description: 'Zenn / Qiita 向けの技術記事ドラフトを生成する指示',
            prompt: `以下の学習内容を元に、Zenn掲載向けの技術ブログ記事（マークダウン）を書いてください。

元記事: ${item.url}
テーマ: ${title}

【What】${item.what || ''}
【How】${item.how || ''}
【Impact】${item.impact || ''}

構成案: 導入→背景→実装例→まとめ。コードブロックや図解も追加してください。`,
        },
    ]

    const handleCopy = (id: string, prompt: string) => {
        navigator.clipboard.writeText(prompt)
        setCopied(id)
        setTimeout(() => setCopied(null), 2000)
    }

    const currentStatus = item.status === 'unread' ? 'summarized' : item.status

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/20 backdrop-blur-sm p-8"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 rounded-3xl bg-[#faf9f5] border border-gray-100 shadow-2xl p-12 my-8"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-8 right-8 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                    <X size={16} />
                </button>

                <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-gray-400">
                    {currentStatus.toUpperCase()}
                </p>

                <h2 className="mb-4 text-2xl font-light leading-relaxed text-gray-900">
                    {title}
                </h2>

                <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-10 block truncate text-xs font-light text-[#d97756] hover:underline"
                >
                    {item.url}
                </a>

                {/* What / How / Impact */}
                <div className="space-y-8 mb-12">
                    {item.what && (
                        <section>
                            <h3 className="mb-2 text-[10px] uppercase tracking-[0.2em] text-gray-400">What</h3>
                            <p className="text-base font-light leading-relaxed text-gray-700">{item.what}</p>
                        </section>
                    )}
                    {item.how && (
                        <section>
                            <h3 className="mb-2 text-[10px] uppercase tracking-[0.2em] text-gray-400">How</h3>
                            <p className="text-base font-light leading-relaxed text-gray-700">{item.how}</p>
                        </section>
                    )}
                    {item.impact && (
                        <section>
                            <h3 className="mb-2 text-[10px] uppercase tracking-[0.2em] text-gray-400">Impact</h3>
                            <p className="text-base font-light leading-relaxed text-gray-700">{item.impact}</p>
                        </section>
                    )}
                </div>

                {/* AI アクション提案 */}
                <div>
                    <p className="mb-5 text-[10px] uppercase tracking-[0.2em] text-gray-400">AIアクション提案</p>
                    <div className="space-y-3">
                        {suggestions.map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => handleCopy(s.id, s.prompt)}
                                className="w-full text-left rounded-2xl border border-gray-100 bg-white p-5 transition-all duration-200 hover:border-[#d97756]/30 hover:shadow-sm group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{s.icon}</span>
                                        <div>
                                            <p className="text-sm font-medium text-gray-800 group-hover:text-[#d97756] transition-colors">{s.label}</p>
                                            <p className="text-xs font-light text-gray-400">{s.description}</p>
                                        </div>
                                    </div>
                                    <span className={`shrink-0 text-[10px] uppercase tracking-widest transition-all ${copied === s.id ? 'text-green-500' : 'text-gray-300 group-hover:text-[#d97756]'}`}>
                                        {copied === s.id ? '✓ コピー済み' : 'コピー →'}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- 学習したいこと ---
export function LearningContent({
    learnings,
    onAddUrl,
    onRefresh,
}: {
    learnings: Learning[]
    onAddUrl: (url: string) => Promise<void>
    onRefresh: () => void
}) {
    const [url, setUrl] = useState('')
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [selectedItem, setSelectedItem] = useState<Learning | null>(null)

    const handleUrlSubmit = async (e: React.KeyboardEvent) => {
        if (e.key !== 'Enter' || !url.trim()) return
        setIsAnalyzing(true)
        try {
            await onAddUrl(url.trim())
            setUrl('')
            onRefresh()
        } finally {
            setIsAnalyzing(false)
        }
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {selectedItem && (
                <LearningDetailModal
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onStatusChange={(id, status) => {
                        // ローカルステートも即時更新（ポーリング待ち不要）
                        setSelectedItem((prev) => prev ? { ...prev, status } : null)
                    }}
                />
            )}
            <header className="mb-16">
                <h2 className="mb-4 text-3xl font-light tracking-tight text-gray-900">知の貯蔵庫。</h2>
                <p className="text-sm font-light tracking-wide text-gray-400">
                    今は実行する時。新しい学びはここに留めておきます。
                </p>
            </header>

            <div className="mb-20">
                <div className="group relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        {isAnalyzing ? (
                            <Sparkles size={16} className="animate-pulse text-[#d97756]" aria-hidden />
                        ) : (
                            <LinkIcon
                                size={16}
                                className="text-gray-300 transition-colors group-focus-within:text-[#d97756]"
                                aria-hidden
                            />
                        )}
                    </div>
                    <input
                        type="text"
                        className="w-full border-b border-gray-200 bg-transparent py-4 pl-12 pr-4 text-base font-light text-gray-800 placeholder-gray-300 transition-colors focus:border-[#d97756] focus:outline-none"
                        placeholder="学習したいURLを入力してEnter (AIが3つの学習ステップに分解します)"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={handleUrlSubmit}
                        disabled={isAnalyzing}
                    />
                </div>
                {isAnalyzing && (
                    <p className="mt-3 animate-pulse font-light tracking-widest text-[11px] uppercase text-[#d97756]">
                        Extracting 3 core steps from URL...
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6">
                {learnings.map((item) => (
                    <div
                        key={item.id}
                        className={`cursor-pointer rounded-3xl border p-8 transition-all duration-300 hover:bg-white hover:shadow-[0_4px_20px_rgb(0,0,0,0.02)] ${item.status === 'unread'
                            ? 'border-[#d97756]/30 bg-white'
                            : 'border-gray-100 bg-white/50'
                            } group`}
                        title={item.url}
                        onClick={() => setSelectedItem(item)}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <span
                                    className={`mb-3 block text-[10px] uppercase tracking-[0.2em] ${item.status === 'unread' ? 'text-[#d97756]' : 'text-gray-400'
                                        }`}
                                >
                                    {item.status.toUpperCase()}
                                </span>
                                <h3 className="mb-2 text-lg font-light leading-relaxed text-gray-900 transition-colors group-hover:text-[#d97756]">
                                    {item.title || item.url}
                                </h3>
                                {item.what && <p className="text-sm font-light text-gray-500 mb-1"><strong>What:</strong> {item.what}</p>}
                                {item.how && <p className="text-sm font-light text-gray-500 mb-1"><strong>How:</strong> {item.how}</p>}
                                {item.impact && <p className="text-sm font-light text-gray-500"><strong>Impact:</strong> {item.impact}</p>}
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50/50 transition-colors group-hover:bg-[#d97756]/5">
                                <ArrowRight
                                    size={16}
                                    strokeWidth={1.5}
                                    className="-translate-x-2 text-gray-300 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-[#d97756] group-hover:opacity-100"
                                    aria-hidden
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
