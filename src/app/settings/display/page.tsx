'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Info } from 'lucide-react'

type DisplayMode = 'beginner' | 'standard'

export default function DisplaySettingsPage() {
  const [mode, setMode] = useState<DisplayMode>('standard')
  const [showGlossary, setShowGlossary] = useState(true)
  const [saved, setSaved] = useState(false)

  // ローカルストレージから設定を読み込み
  useEffect(() => {
    const savedMode = localStorage.getItem('yarikiru_display_mode') as DisplayMode | null
    const savedGlossary = localStorage.getItem('yarikiru_show_glossary')
    if (savedMode) setMode(savedMode)
    if (savedGlossary) setShowGlossary(savedGlossary === 'true')
  }, [])

  const handleSave = () => {
    localStorage.setItem('yarikiru_display_mode', mode)
    localStorage.setItem('yarikiru_show_glossary', showGlossary.toString())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="mx-auto max-w-2xl py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-2 text-foreground">表示設定</h1>
      <p className="text-muted-foreground mb-8">
        初心者モードや用語表示を設定します
      </p>

      <div className="space-y-6">
        {/* モード選択 */}
        <div className="bg-card text-card-foreground shadow-sm rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5" />
            表示モード
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors">
              <div className="flex-1">
                <div className="font-medium">初心者モード</div>
                <p className="text-sm text-muted-foreground mt-1">
                  GitHub用語にカッコをつけて表示。学習をサポートします。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMode('beginner')}
                className={`ml-4 px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'beginner'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {mode === 'beginner' ? '選択中' : '選択'}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors">
              <div className="flex-1">
                <div className="font-medium">標準モード</div>
                <p className="text-sm text-muted-foreground mt-1">
                  シンプルな表示。慣れている方向けです。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMode('standard')}
                className={`ml-4 px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'standard'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {mode === 'standard' ? '選択中' : '選択'}
              </button>
            </div>
          </div>

          <div className="mt-4 p-4 bg-muted/50 rounded-lg flex gap-2">
            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              初心者モードでは、GitHub用語に英語のカッコ付きで表示されます。
            </p>
          </div>
        </div>

        {/* 用語カッコ表示 */}
        <div className="bg-card text-card-foreground shadow-sm rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">用語の表示</h2>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex-1">
              <div className="font-medium">カッコ付き表示</div>
              <p className="text-sm text-muted-foreground mt-1">
                初心者モード時、用語に英語の補助を表示します
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowGlossary(!showGlossary)}
              className={`ml-4 px-4 py-2 rounded-lg font-medium transition-colors ${
                showGlossary
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {showGlossary ? 'オン' : 'オフ'}
            </button>
          </div>

          {/* プレビュー */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <div className="text-xs text-muted-foreground mb-2">プレビュー</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span>リポジトリ</span>
                {mode === 'beginner' && showGlossary && (
                  <span className="text-xs text-muted-foreground">(Repository)</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>目標</span>
                {mode === 'beginner' && showGlossary && (
                  <span className="text-xs text-muted-foreground">(Issue)</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>タスク</span>
                {mode === 'beginner' && showGlossary && (
                  <span className="text-xs text-muted-foreground">(Task)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 保存ボタン */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setMode('standard')
              setShowGlossary(true)
            }}
            className="px-4 py-2 rounded-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            リセット
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saved}
            className="rounded-lg bg-primary px-6 py-2 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saved ? '保存しました！' : '保存する'}
          </button>
        </div>
      </div>
    </div>
  )
}
