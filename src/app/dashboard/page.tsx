import { auth } from '@/lib/auth-stub'

import { DashboardClient } from './dashboard-client'

export const dynamic = 'force-dynamic'

/**
 * Dashboard page - サーバーコンポーネント
 * 認証チェック後、新デザインのダッシュボードを表示
 */
export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    return null // auth middleware will redirect
  }

  return (
    <div className="min-h-screen bg-[#faf9f5] font-sans text-gray-800 selection:bg-[#d97756]/20">
      <DashboardClient />
    </div>
  )
}
