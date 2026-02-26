// YARIKIRU Service Worker
// PWA対応：キャッシュ戦略、オフライン対応、バックグラウンド同期

const CACHE_NAME = 'yarikiru-v1'
const STATIC_CACHE = 'yarikiru-static-v1'
const DYNAMIC_CACHE = 'yarikiru-dynamic-v1'

// キャッシュするアセット
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/logo.png',
  // グローバルCSSと主要なスクリプトはビルド時に自動的に含まれます
]

// インストール時：静的アセットをキャッシュ
self.addEventListener('install', (event) => {
  console.log('[SW] Install event')

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    })
  )

  // 新しいサービスワーカーを即座にアクティベート
  self.skipWaiting()
})

// アクティベート時：古いキャッシュを削除
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event')

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return (
              cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== CACHE_NAME
            )
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          })
      )
    })
  )

  // 即座にクライアントを制御
  return self.clients.claim()
})

// フェッチ時：ネットワークファースト戦略（API呼び出し）
// キャッシュファースト戦略（静的アセット）
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // APIリクエストはネットワークファースト
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request))
    return
  }

  // 静的アセットはキャッシュファースト
  if (STATIC_ASSETS.some((asset) => url.pathname === new URL(asset, self.location.origin).pathname)) {
    event.respondWith(cacheFirstStrategy(request))
    return
  }

  // その他はネットワークファースト、フォールバックでキャッシュ
  event.respondWith(networkFirstStrategy(request))
})

// ネットワークファースト戦略
async function networkFirstStrategy(request) {
  try {
    // ネットワークから取得
    const networkResponse = await fetch(request)

    // 成功したらキャッシュに保存（GETリクエストのみ）
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url)

    // ネットワーク失敗時はキャッシュを返す
    const cachedResponse = await caches.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    // キャッシュにもない場合はオフラインページ
    if (request.destination === 'document') {
      return caches.match('/offline') || new Response('Offline - No cache available', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'Content-Type': 'text/plain' })
      })
    }

    throw error
  }
}

// キャッシュファースト戦略
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request)

  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.log('[SW] Cache and network failed:', request.url)
    throw error
  }
}

// バックグラウンド同期（プッシュ通知の準備）
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)

  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks())
  }
})

// タスク同期処理
async function syncTasks() {
  try {
    // ここでオフライン時の変更をサーバーに同期する処理を実装
    console.log('[SW] Syncing tasks...')
    // TODO: 実際の同期ロジックを実装
  } catch (error) {
    console.error('[SW] Sync failed:', error)
  }
}

// プッシュ通知受信
self.addEventListener('push', (event) => {
  console.log('[SW] Push received')

  let data = {
    title: 'YARIKIRU',
    body: '新しい通知があります',
    icon: '/logo.png',
  }

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() }
    } catch (error) {
      console.error('[SW] Failed to parse push data:', error)
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: '/logo.png',
      tag: 'yarikiru-notification',
      renotify: true,
    })
  )
})

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked')

  event.notification.close()

  event.waitUntil(
    clients.openWindow('/dashboard').then((windowClient) => {
      // 通知をクリックしたウィンドウにフォーカス
      if (windowClient) {
        return windowClient.focus()
      }
    })
  )
}

console.log('[SW] Service Worker loaded')
