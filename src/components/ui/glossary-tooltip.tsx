'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'

interface GlossaryTooltipProps {
  term: string
  explanation: string
  mode: 'beginner' | 'standard'
  showGlossary: boolean
  children: React.ReactNode
}

export function GlossaryTooltip({
  term,
  explanation,
  mode,
  showGlossary,
  children,
}: GlossaryTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  if (!showGlossary || mode !== 'beginner') {
    return <>{children}</>
  }

  return (
    <div className="relative inline-flex">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        {children}
      </div>

      {showTooltip && (
        <div className="absolute left-full ml-2 top-0 z-50 w-64 rounded-lg bg-white border border-gray-200 shadow-lg p-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle size={14} className="text-[#d97756]" />
            <span className="text-sm font-semibold text-gray-900">{term}</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{explanation}</p>
        </div>
      )}
    </div>
  )
}
