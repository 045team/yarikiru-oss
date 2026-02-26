/**
 * MembersTable - 会員一覧テーブルコンポーネント
 */
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { MemberEditDialog } from './member-edit-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { Member } from '@/types/turso'

interface MembersTableProps {
  members: Member[]
  currentAdminEmail?: string
  onUpdateMember: (memberId: string, data: Partial<Member>) => Promise<void>
  onDeleteMember: (memberId: string) => Promise<void>
  onRefresh?: () => Promise<void>
}

const ROLE_LABELS: Record<string, string> = {
  admin: '管理者',
  moderator: 'モデレーター',
  member: 'メンバー',
}

const STATUS_LABELS: Record<string, string> = {
  active: '有効',
  suspended: '停止',
  deleted: '削除',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-yellow-100 text-yellow-800',
  deleted: 'bg-red-100 text-red-800',
}

const PLAN_LABELS: Record<string, string> = {
  free: '無料',
  basic: 'ベーシック',
  pro: 'プロ',
}

export function MembersTable({
  members,
  currentAdminEmail,
  onUpdateMember,
  onDeleteMember,
  onRefresh,
}: MembersTableProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredMembers = members.filter(
    (member) =>
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.full_name && member.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      member.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleRowClick = (member: Member) => {
    setSelectedMember(member)
    setDialogOpen(true)
  }

  const handleUpdateMember = async (memberId: string, data: Partial<Member>) => {
    const response = await fetch(`/api/admin/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '更新に失敗しました')
    }

    const result = await response.json()
    onRefresh?.()
    return result.data.member
  }

  const handleDeleteMember = async (memberId: string) => {
    const response = await fetch(`/api/admin/members/${memberId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '削除に失敗しました')
    }

    onRefresh?.()
  }

  return (
    <div className="space-y-4">
      {/* 検索バー */}
      <div className="flex items-center justify-between">
        <Input
          placeholder="メールアドレス、氏名、会社名で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        {onRefresh && (
          <Button variant="outline" onClick={onRefresh}>
            更新
          </Button>
        )}
      </div>

      {/* テーブル */}
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">メールアドレス</th>
                <th className="px-4 py-3 text-left font-medium">氏名</th>
                <th className="px-4 py-3 text-left font-medium">役割</th>
                <th className="px-4 py-3 text-left font-medium">ステータス</th>
                <th className="px-4 py-3 text-left font-medium">プラン</th>
                <th className="px-4 py-3 text-left font-medium">会社名</th>
                <th className="px-4 py-3 text-left font-medium">最終アクティブ</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    {searchQuery ? '検索結果がありません' : '会員がいません'}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="border-t cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleRowClick(member)}
                  >
                    <td className="px-4 py-3">{member.email}</td>
                    <td className="px-4 py-3">{member.full_name || '-'}</td>
                    <td className="px-4 py-3">{ROLE_LABELS[member.role]}</td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_COLORS[member.status]}>
                        {STATUS_LABELS[member.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{PLAN_LABELS[member.subscription_plan]}</td>
                    <td className="px-4 py-3">{member.company_name || '-'}</td>
                    <td className="px-4 py-3">
                      {member.last_active_at
                        ? new Date(member.last_active_at).toLocaleDateString('ja-JP')
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 編集ダイアログ */}
      <MemberEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        member={selectedMember}
        onUpdateMember={handleUpdateMember}
        onDeleteMember={handleDeleteMember}
        currentAdminEmail={currentAdminEmail}
      />
    </div>
  )
}
