'use client'

import { useEffect, useState } from 'react'
import { Users, UserCheck, Shield, CreditCard, Activity } from 'lucide-react'

interface MemberStats {
  total_members: number
  active_members: number
  suspended_members: number
  deleted_members: number
  by_role: Record<string, number>
  by_subscription_plan: Record<string, number>
  today_active_members: number
}

interface StatsCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  color?: string
}

function StatsCard({ label, value, icon, color = 'text-[#d97756]' }: StatsCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 transition-all duration-200 hover:border-[#d97756]/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-2 text-[10px] uppercase tracking-widest text-gray-400">{label}</p>
          <p className="text-2xl font-light text-gray-900">{value}</p>
        </div>
        <div className={color}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export function MemberStats() {
  const [stats, setStats] = useState<MemberStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/stats', { credentials: 'same-origin' })
        if (!response.ok) {
          throw new Error('Failed to fetch stats')
        }
        const data = await response.json()
        setStats(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse rounded-2xl bg-gray-100 h-28" />
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="mb-10 rounded-2xl border border-red-100 bg-red-50 p-6">
        <p className="text-sm text-red-600">統計情報の読み込みに失敗しました</p>
      </div>
    )
  }

  return (
    <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-5">
      <StatsCard
        label="総会員数"
        value={stats.total_members}
        icon={<Users size={20} strokeWidth={1.5} />}
      />
      <StatsCard
        label="アクティブ"
        value={stats.active_members}
        icon={<UserCheck size={20} strokeWidth={1.5} />}
        color="text-green-600"
      />
      <StatsCard
        label="管理者"
        value={stats.by_role?.admin || 0}
        icon={<Shield size={20} strokeWidth={1.5} />}
        color="text-purple-600"
      />
      <StatsCard
        label="有料プラン"
        value={(stats.by_subscription_plan?.basic || 0) + (stats.by_subscription_plan?.pro || 0)}
        icon={<CreditCard size={20} strokeWidth={1.5} />}
        color="text-blue-600"
      />
      <StatsCard
        label="今日のアクティブ"
        value={stats.today_active_members}
        icon={<Activity size={20} strokeWidth={1.5} />}
        color="text-orange-500"
      />
    </div>
  )
}
