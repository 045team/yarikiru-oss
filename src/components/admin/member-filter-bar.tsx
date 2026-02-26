'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MemberRole, MemberStatus, MemberSubscriptionPlan } from '@/types/turso'

interface MemberFilterBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  statusFilter: MemberStatus | 'all'
  onStatusChange: (value: MemberStatus | 'all') => void
  roleFilter: MemberRole | 'all'
  onRoleChange: (value: MemberRole | 'all') => void
  planFilter: MemberSubscriptionPlan | 'all'
  onPlanChange: (value: MemberSubscriptionPlan | 'all') => void
  sortBy: 'created_at' | 'last_active_at' | 'email'
  onSortChange: (value: 'created_at' | 'last_active_at' | 'email') => void
}

export function MemberFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  roleFilter,
  onRoleChange,
  planFilter,
  onPlanChange,
  sortBy,
  onSortChange,
}: MemberFilterBarProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 md:flex-row md:items-center md:justify-between">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={16}
          strokeWidth={1.5}
        />
        <Input
          type="text"
          placeholder="メールアドレスまたは名前で検索..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-9 border-gray-200 text-sm"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={statusFilter}
          onValueChange={(value) => onStatusChange(value as MemberStatus | 'all')}
        >
          <SelectTrigger className="h-9 w-[130px] border-gray-200 text-sm">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="active">アクティブ</SelectItem>
            <SelectItem value="suspended">停止中</SelectItem>
            <SelectItem value="deleted">削除済み</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={roleFilter}
          onValueChange={(value) => onRoleChange(value as MemberRole | 'all')}
        >
          <SelectTrigger className="h-9 w-[130px] border-gray-200 text-sm">
            <SelectValue placeholder="ロール" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="admin">管理者</SelectItem>
            <SelectItem value="moderator">モデレーター</SelectItem>
            <SelectItem value="member">メンバー</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={planFilter}
          onValueChange={(value) => onPlanChange(value as MemberSubscriptionPlan | 'all')}
        >
          <SelectTrigger className="h-9 w-[130px] border-gray-200 text-sm">
            <SelectValue placeholder="プラン" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="free">無料</SelectItem>
            <SelectItem value="basic">ベーシック</SelectItem>
            <SelectItem value="pro">プロ</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value) => onSortChange(value as typeof sortBy)}>
          <SelectTrigger className="h-9 w-[130px] border-gray-200 text-sm">
            <SelectValue placeholder="並び替え" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">作成日順</SelectItem>
            <SelectItem value="last_active_at">最終アクティブ</SelectItem>
            <SelectItem value="email">メールアドレス</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
