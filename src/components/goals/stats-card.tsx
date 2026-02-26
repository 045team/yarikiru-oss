/**
 * StatsCard - 統計表示カードコンポーネント
 */
'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
  Target,
  CheckCircle2,
  Clock,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  Target,
  CheckCircle2,
  Clock,
  TrendingUp,
}

interface StatsCardProps {
  title: string
  value: string | number
  iconName: 'Target' | 'CheckCircle2' | 'Clock' | 'TrendingUp'
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function StatsCard({ title, value, iconName, description, trend }: StatsCardProps) {
  const Icon = ICON_MAP[iconName] ?? Target
  return (
    <Card className="transition-colors duration-200 hover:border-primary/30">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
            {trend && (
              <p className={`mt-2 text-xs ${trend.isPositive ? 'text-teal-600' : 'text-destructive'}`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </p>
            )}
          </div>
          <div className="ml-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-6 w-6 text-primary" aria-hidden />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * StatsGrid - 複数の統計カードを表示するグリッド
 */
interface StatsGridProps {
  stats: Array<{
    title: string
    value: string | number
    iconName: 'Target' | 'CheckCircle2' | 'Clock' | 'TrendingUp'
    description?: string
    trend?: {
      value: number
      isPositive: boolean
    }
  }>
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <StatsCard key={index} {...stat} />
      ))}
    </div>
  )
}
