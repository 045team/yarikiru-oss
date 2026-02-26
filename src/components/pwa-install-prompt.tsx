'use client'

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      // デフォルトのプロンプトを防止
      e.preventDefault()
      // イベントを保存して後で使用
      setDeferredPrompt(e)
      // カスタムプロンプトを表示
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // すでにインストール済みかチェック
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(false)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return
    }

    // インストールプロンプトを表示
    deferredPrompt.prompt()

    // ユーザーの選択を待機
    const { outcome } = await deferredPrompt.userChoice

    console.log(`[PWA] Install prompt ${outcome}`)

    // 遅延プロンプトをリセット
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // ローカルストレージに保存して、再度表示しないようにする
    if (typeof window !== 'undefined') {
      localStorage.setItem('pwa-install-dismissed', 'true')
    }
  }

  // すでに拒否されている場合は表示しない
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (dismissed === 'true') {
        setShowPrompt(false)
      }
    }
  }, [])

  if (!showPrompt || !deferredPrompt) {
    return null
  }

  return (
    <div className="pwa-install-prompt fixed bottom-4 left-4 right-4 z-50 md:hidden">
      <div className="rounded-lg bg-white p-4 shadow-lg ring-1 ring-gray-900/5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Download className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">ホーム画面に追加</p>
              <p className="text-sm text-gray-500">
                すぐにアクセスできるようになります
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          {deferredPrompt ? (
            <button
              onClick={handleInstall}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              追加
            </button>
          ) : null}
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
          >
            後で
          </button>
        </div>
      </div>
    </div>
  )
}
