'use client'

import { useState } from 'react'
import { Lightbulb, BookOpen, Wrench, Sparkles } from 'lucide-react'

// テンプレート定義
const templates = [
    {
        id: 'solution',
        label: '解決策',
        icon: <Wrench size={14} />,
        placeholder: '〇〇の方法がわかった / 〇〇で解決した',
    },
    {
        id: 'challenge',
        label: 'ハマりポイント',
        icon: <Lightbulb size={14} />,
        placeholder: '〇〇でつまづいた / 〇〇に注意が必要',
    },
    {
        id: 'discovery',
        label: '新発見',
        icon: <Sparkles size={14} />,
        placeholder: '〇〇が役に立った / 〇〇を知らなかった',
    },
    {
        id: 'custom',
        label: '自由入力',
        icon: <BookOpen size={14} />,
        placeholder: '自由に学びを記録してください',
    },
]

export function LearningModal({
    goalTitle,
    onConfirm,
    onSkip,
    onCancel,
}: {
    goalTitle: string
    onConfirm: (learning: string) => void
    onSkip: () => void
    onCancel?: () => void
}) {
    const [text, setText] = useState('')
    const [selectedTemplate, setSelectedTemplate] = useState(templates[3].id) // デフォルトは自由入力

    const handleTemplateClick = (templateId: string) => {
        setSelectedTemplate(templateId)
        const template = templates.find(t => t.id === templateId)
        if (template && templateId !== 'custom') {
            setText(template.placeholder)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => onCancel?.()}>
            <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300 rounded-3xl bg-[#faf9f5] border border-gray-100 shadow-2xl p-10" onClick={e => e.stopPropagation()}>
                <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-gray-400">完了 🎉</p>
                <h3 className="mb-2 text-xl font-light text-gray-900 leading-relaxed">{goalTitle}</h3>
                <p className="mb-6 text-sm text-gray-400">何か学びはありましたか？<span className="text-gray-300">（任意）</span></p>

                {/* テンプレート選択 */}
                <div className="mb-4 grid grid-cols-2 gap-2">
                    {templates.map((template) => (
                        <button
                            key={template.id}
                            type="button"
                            onClick={() => handleTemplateClick(template.id)}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-light transition-all ${
                                selectedTemplate === template.id
                                    ? 'border-[#d97756] bg-[#d97756]/5 text-[#d97756]'
                                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                            }`}
                        >
                            {template.icon}
                            <span>{template.label}</span>
                        </button>
                    ))}
                </div>

                <textarea
                    autoFocus
                    className="w-full resize-none rounded-2xl border border-gray-200 bg-white p-4 text-sm font-light text-gray-700 placeholder-gray-300 focus:border-[#d97756] focus:outline-none"
                    rows={3}
                    placeholder={templates.find(t => t.id === selectedTemplate)?.placeholder || '自由に学びを記録してください'}
                    value={text}
                    onChange={e => setText(e.target.value)}
                />
                <div className="mt-6 flex items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={onSkip}
                        className="text-xs font-light uppercase tracking-widest text-gray-300 hover:text-gray-500 transition-colors"
                    >
                        今はなし
                    </button>
                    <button
                        type="button"
                        onClick={() => onConfirm(text.trim())}
                        className="rounded-full bg-[#d97756] px-6 py-2.5 text-sm font-light uppercase tracking-widest text-white transition-all hover:bg-[#c06644]"
                    >
                        記録して完了
                    </button>
                </div>
            </div>
        </div>
    )
}
