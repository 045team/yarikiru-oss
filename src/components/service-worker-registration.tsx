'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.workbox !== undefined
    ) {
      const wb = window.workbox

      // アップデート available イベント
      wb.addEventListener('installed', (event) => {
        console.log('[SW] Event received:', event)
        if (event.isUpdate) {
          // 新しいコンテンツが利用可能
          console.log('[SW] New content is available; please refresh.')
        } else {
          // コンテンツがキャッシュにインストールされた
          console.log('[SW] Content is cached for offline use.')
        }
      })

      // アップデート準備完了
      wb.addEventListener('controlling', (event) => {
        console.log('[SW] Controlling event received:', event)
        // 新しいサービスワーカーがページを制御し始めた
        window.location.reload()
      })

      // PWA インストールプロンプト
      window.addEventListener('beforeinstallprompt', (event) => {
        console.log('[SW] Before install prompt event received')
        // デフォルトのプロンプトを防止
        event.preventDefault()
        // イベントを保存して後で使用
        window.deferredPrompt = event
      })

      // サービスワーカーを登録
      wb.register()
    } else if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // workbox がない場合は直接登録
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[SW] Service Worker registered:', registration)

          // アップデートチェック
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // 新しいサービスワーカーが利用可能
                  console.log('[SW] New service worker available')
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('[SW] Service Worker registration failed:', error)
        })
    }
  }, [])

  return null
}

// TypeScript 型定義拡張
declare global {
  interface Window {
    workbox?: any
    deferredPrompt?: any
  }
}
