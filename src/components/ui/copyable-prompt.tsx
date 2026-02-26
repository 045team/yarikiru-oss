'use client'

import { useState } from 'react'
import { Check, Copy, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CopyablePromptProps {
    prompt: string
    label?: string
    className?: string
}

export function CopyablePrompt({ prompt, label, className }: CopyablePromptProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            await navigator.clipboard.writeText(prompt)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy text', err)
        }
    }

    return (
        <div className={cn("flex flex-col gap-1.5 mt-3 mb-1", className)}>
            {label && (
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    <Terminal className="h-3 w-3" /> {label}
                </span>
            )}
            <div
                className="relative group rounded-md border bg-slate-50 dark:bg-slate-900 p-2.5 pr-10 text-xs sm:text-sm font-mono overflow-x-auto select-all cursor-text text-slate-800 dark:text-slate-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="whitespace-pre">{prompt}</div>
                <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white/50 dark:bg-black/50 hover:bg-white dark:hover:bg-black"
                    onClick={handleCopy}
                    title="コピー"
                >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
            </div>
        </div>
    )
}
