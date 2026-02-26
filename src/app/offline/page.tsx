import { WifiOff } from 'lucide-react'
import { ReloadButton } from './reload-button'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-gray-200 p-6">
            <WifiOff className="h-12 w-12 text-gray-500" />
          </div>
        </div>

        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          オフラインです
        </h1>

        <p className="mb-8 text-gray-600">
          インターネット接続がありません。キャッシュされたコンテンツは閲覧可能です。
        </p>

        <div className="space-y-4">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-900">
              🔍 キャッシュされたページを閲覧中
            </p>
            <p className="mt-1 text-xs text-gray-500">
              一部の機能は制限されています
            </p>
          </div>

          <ReloadButton />
        </div>

        <p className="mt-8 text-xs text-gray-400">
          YARIKIRU - オフライン対応済み
        </p>
      </div>
    </div>
  )
}
