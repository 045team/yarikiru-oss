'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { MoreVertical, Edit2, Trash2, Eye } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Member, MemberRole, MemberStatus, MemberSubscriptionPlan } from '@/types/turso'

interface MemberTableProps {
  members: Member[]
  loading: boolean
  onEdit?: (member: Member) => void
  onDelete?: (memberId: string) => void
}

const roleLabels: Record<MemberRole, string> = {
  admin: '管理者',
  moderator: 'モデレーター',
  member: 'メンバー',
}

const statusLabels: Record<MemberStatus, string> = {
  active: 'アクティブ',
  suspended: '停止中',
  deleted: '削除済み',
}

const statusVariants: Record<MemberStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  suspended: 'secondary',
  deleted: 'destructive',
}

const planLabels: Record<MemberSubscriptionPlan, string> = {
  free: '無料',
  basic: 'ベーシック',
  pro: 'プロ',
}

const roleBadgeColors: Record<MemberRole, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  moderator: 'bg-blue-100 text-blue-700 border-blue-200',
  member: 'bg-gray-100 text-gray-700 border-gray-200',
}

export function MemberTable({ members, loading, onEdit, onDelete }: MemberTableProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ja })
    } catch {
      return '-'
    }
  }

  const handleRowClick = (member: Member) => {
    setSelectedMember(member)
    setMenuOpen(null)
  }

  const handleAction = (
    e: React.MouseEvent,
    member: Member,
    action: 'edit' | 'delete'
  ) => {
    e.stopPropagation()
    setMenuOpen(null)

    if (action === 'edit' && onEdit) {
      onEdit(member)
    } else if (action === 'delete' && onDelete) {
      onDelete(member.id)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
        <p className="text-sm font-light text-gray-400">会員が見つかりません</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-gray-100">
                <TableHead className="font-medium text-gray-500 text-xs">メールアドレス</TableHead>
                <TableHead className="font-medium text-gray-500 text-xs">名前</TableHead>
                <TableHead className="font-medium text-gray-500 text-xs">ロール</TableHead>
                <TableHead className="font-medium text-gray-500 text-xs">ステータス</TableHead>
                <TableHead className="font-medium text-gray-500 text-xs">プラン</TableHead>
                <TableHead className="font-medium text-gray-500 text-xs">最終アクティブ</TableHead>
                <TableHead className="font-medium text-gray-500 text-xs text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow
                  key={member.id}
                  className="cursor-pointer hover:bg-gray-50/50 border-gray-100 transition-colors"
                  onClick={() => handleRowClick(member)}
                >
                  <TableCell className="py-4">
                    <span className="text-sm text-gray-900">{member.email}</span>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="text-sm text-gray-700">
                      {member.full_name || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge
                      variant="outline"
                      className={roleBadgeColors[member.role as MemberRole]}
                    >
                      {roleLabels[member.role as MemberRole]}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant={statusVariants[member.status as MemberStatus]}>
                      {statusLabels[member.status as MemberStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="text-sm text-gray-600">
                      {planLabels[member.subscription_plan as MemberSubscriptionPlan]}
                    </span>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="text-xs text-gray-400">
                      {formatDate(member.last_active_at)}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <div className="relative inline-block">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpen(menuOpen === member.id ? null : member.id)
                        }}
                      >
                        <MoreVertical size={14} strokeWidth={1.5} />
                      </Button>

                      {menuOpen === member.id && (
                        <div
                          className="absolute right-0 top-full z-10 mt-1 w-32 rounded-lg border border-gray-200 bg-white shadow-lg py-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => {
                              setSelectedMember(member)
                              setMenuOpen(null)
                            }}
                          >
                            <Eye size={14} strokeWidth={1.5} />
                            詳細
                          </button>
                          <button
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={(e) => handleAction(e, member, 'edit')}
                          >
                            <Edit2 size={14} strokeWidth={1.5} />
                            編集
                          </button>
                          <button
                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                            onClick={(e) => handleAction(e, member, 'delete')}
                          >
                            <Trash2 size={14} strokeWidth={1.5} />
                            削除
                          </button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Member Detail Dialog */}
      <Dialog
        open={!!selectedMember}
        onOpenChange={(open) => {
          if (!open) setSelectedMember(null)
        }}
      >
        <DialogContent className="max-w-md">
          {selectedMember && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-light">会員詳細</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#d97756]/20 to-[#d97756]/5 flex items-center justify-center">
                    <span className="text-lg font-medium text-[#d97756]">
                      {selectedMember.full_name?.[0] || selectedMember.email[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {selectedMember.full_name || '未設定'}
                    </p>
                    <p className="text-sm text-gray-500">{selectedMember.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">ロール</p>
                    <Badge
                      variant="outline"
                      className={roleBadgeColors[selectedMember.role as MemberRole]}
                    >
                      {roleLabels[selectedMember.role as MemberRole]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">ステータス</p>
                    <Badge variant={statusVariants[selectedMember.status as MemberStatus]}>
                      {statusLabels[selectedMember.status as MemberStatus]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">サブスクリプション</p>
                    <p className="text-gray-700">
                      {planLabels[selectedMember.subscription_plan as MemberSubscriptionPlan]}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">最終アクティブ</p>
                    <p className="text-gray-700">{formatDate(selectedMember.last_active_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">登録日</p>
                    <p className="text-gray-700">{formatDate(selectedMember.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">最終ログイン</p>
                    <p className="text-gray-700">{formatDate(selectedMember.last_sign_in_at)}</p>
                  </div>
                </div>

                {selectedMember.company_name && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">会社名</p>
                    <p className="text-sm text-gray-700">{selectedMember.company_name}</p>
                  </div>
                )}

                {selectedMember.industry && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">業界</p>
                    <p className="text-sm text-gray-700">{selectedMember.industry}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      onEdit?.(selectedMember)
                      setSelectedMember(null)
                    }}
                  >
                    編集
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      onDelete?.(selectedMember.id)
                      setSelectedMember(null)
                    }}
                  >
                    削除
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
