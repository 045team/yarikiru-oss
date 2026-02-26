'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type DisplayMode = 'beginner' | 'standard'

interface DisplayContextType {
  mode: DisplayMode
  showGlossary: boolean
  setMode: (mode: DisplayMode) => void
  setShowGlossary: (show: boolean) => void
}

const DisplayContext = createContext<DisplayContextType | undefined>(undefined)

export function DisplayProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<DisplayMode>('standard')
  const [showGlossary, setShowGlossaryState] = useState(true)

  useEffect(() => {
    // ローカルストレージから設定を読み込み
    const savedMode = localStorage.getItem('yarikiru_display_mode') as DisplayMode | null
    const savedGlossary = localStorage.getItem('yarikiru_show_glossary')
    if (savedMode) setModeState(savedMode)
    if (savedGlossary) setShowGlossaryState(savedGlossary === 'true')
  }, [])

  const setMode = (newMode: DisplayMode) => {
    setModeState(newMode)
    localStorage.setItem('yarikiru_display_mode', newMode)
  }

  const setShowGlossary = (show: boolean) => {
    setShowGlossaryState(show)
    localStorage.setItem('yarikiru_show_glossary', show.toString())
  }

  return (
    <DisplayContext.Provider value={{ mode, showGlossary, setMode, setShowGlossary }}>
      {children}
    </DisplayContext.Provider>
  )
}

export function useDisplay() {
  const context = useContext(DisplayContext)
  if (!context) {
    throw new Error('useDisplay must be used within DisplayProvider')
  }
  return context
}

// 用語変換ヘルパー
export function useGlossary() {
  const { mode, showGlossary } = useDisplay()

  const getDisplayTerm = (baseTerm: string, glossaryTerm?: string): string => {
    if (mode !== 'beginner' || !showGlossary) {
      return baseTerm
    }
    return glossaryTerm || baseTerm
  }

  return { mode, showGlossary, getDisplayTerm }
}
