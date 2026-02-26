/**
 * MemberEditDialog - 会員詳細編集モーダルコンポーネント
 */
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Member, MemberRole, MemberStatus, MemberSubscriptionPlan } from '@/types/turso'

interface MemberEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: Member | null
  onUpdateMember: (memberId: string, data: Partial<Member>) => Promise<void>
  onDeleteMember: (memberId: string) => Promise<void>
  currentAdminEmail?: string
}

type FormData = {
  full_name: string
  role: MemberRole
  status: MemberStatus
  subscription_plan: MemberSubscriptionPlan
  company_name: string
  industry: string
  bio: string
}

const ROLE_LABELS: Record<MemberRole, string> = {
  admin: '管理者',
  moderator: 'モデレーター',
  member: 'メンバー',
}

const STATUS_LABELS: Record<MemberStatus, string> = {
  active: '有効',
  suspended: '停止',
  deleted: '削除',
}

const PLAN_LABELS: Record<MemberSubscriptionPlan, string> = {
  free: '無料',
  basic: 'ベーシック',
  pro: 'プロ',
}

export function MemberEditDialog({
  open,
  onOpenChange,
  member,
  onUpdateMember,
  onDeleteMember,
  currentAdminEmail,
}: MemberEditDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    role: 'member',
    status: 'active',
    subscription_plan: 'free',
    company_name: '',
    industry: '',
    bio: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showRoleConfirm, setShowRoleConfirm] = useState(false)
  const [pendingRole, setPendingRole] = useState<MemberRole | null>(null)

  // メンバー情報が変更されたらフォームを更新
  useEffect(() => {
    if (member) {
      setFormData({
        full_name: member.full_name || '',
        role: member.role || 'member',
        status: member.status || 'active',
        subscription_plan: member.subscription_plan || 'free',
        company_name: member.company_name || '',
        industry: member.industry || '',
        bio: member.bio || '',
      })
    }
  }, [member])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!member) return

    // 必須項目のバリデーション
    if (!formData.full_name.trim()) {
      toast.error('氏名は必須です')
      return
    }

    setIsSubmitting(true)
    try {
      await onUpdateMember(member.id, formData)
      toast.success('会員情報を更新しました')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to update member:', error)
      toast.error(error instanceof Error ? error.message : '会員情報の更新に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRoleChange = (value: MemberRole) => {
    // 権限変更の確認ダイアログを表示
    if (value !== formData.role) {
      setPendingRole(value)
      setShowRoleConfirm(true)
    }
  }

  const confirmRoleChange = () => {
    if (pendingRole) {
      setFormData({ ...formData, role: pendingRole })
      setPendingRole(null)
    }
    setShowRoleConfirm(false)
  }

  const cancelRoleChange = () => {
    setPendingRole(null)
    setShowRoleConfirm(false)
  }

  const handleDeleteClick = () => {
    // 自分自身は削除できない
    if (member && currentAdminEmail && member.email === currentAdminEmail) {
      toast.error('自分自身のアカウントは削除できません')
      return
    }
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!member) return

    setIsDeleting(true)
    try {
      await onDeleteMember(member.id)
      toast.success('会員を削除しました')
      setShowDeleteConfirm(false)
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to delete member:', error)
      toast.error(error instanceof Error ? error.message : '会員の削除に失敗しました')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open || (!isSubmitting && !isDeleting)) {
      onOpenChange(open)
      setShowDeleteConfirm(false)
      setShowRoleConfirm(false)
      setPendingRole(null)
    }
  }

  if (!member) return null

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>会員詳細編集</DialogTitle>
              <DialogDescription>
                会員情報を編集・更新できます。 email は読み取り専用です。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Email (読み取り専用) */}
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={member.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* 氏名 */}
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  氏名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="full_name"
                  placeholder="山田 太郎"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              {/* 役割 & ステータス */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">役割</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(v: MemberRole) => handleRoleChange(v)}
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">ステータス</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v: MemberStatus) => setFormData({ ...formData, status: v })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* サブスクリプションプラン */}
              <div className="space-y-2">
                <Label htmlFor="subscription_plan">サブスクリプションプラン</Label>
                <Select
                  value={formData.subscription_plan}
                  onValueChange={(v: MemberSubscriptionPlan) =>
                    setFormData({ ...formData, subscription_plan: v })
                  }
                >
                  <SelectTrigger id="subscription_plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLAN_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 会社名 */}
              <div className="space-y-2">
                <Label htmlFor="company_name">会社名</Label>
                <Input
                  id="company_name"
                  placeholder="株式会社〇〇"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                />
              </div>

              {/* 業種 */}
              <div className="space-y-2">
                <Label htmlFor="industry">業種</Label>
                <Input
                  id="industry"
                  placeholder="IT / 製造 / サービス など"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                />
              </div>

              {/* 自己紹介 */}
              <div className="space-y-2">
                <Label htmlFor="bio">自己紹介</Label>
                <Textarea
                  id="bio"
                  placeholder="自己紹介やメモなどを入力..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                />
              </div>

              {/* メタデータ */}
              {(member.created_at || member.last_active_at) && (
                <div className="space-y-2 rounded-md bg-muted p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">登録日:</span>
                    <span>
                      {member.created_at
                        ? new Date(member.created_at).toLocaleDateString('ja-JP')
                        : '不明'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">最終アクティブ:</span>
                    <span>
                      {member.last_active_at
                        ? new Date(member.last_active_at).toLocaleDateString('ja-JP')
                        : '不明'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteClick}
                disabled={isSubmitting || isDeleting}
                className="w-full sm:w-auto"
              >
                削除
              </Button>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting || isDeleting}
                  className="flex-1 sm:flex-none"
                >
                  キャンセル
                </Button>
                <Button
                  variant="cta"
                  type="submit"
                  disabled={isSubmitting || isDeleting}
                  className="flex-1 sm:flex-none"
                >
                  {isSubmitting ? '更新中...' : '更新'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 権限変更確認ダイアログ */}
      <Dialog open={showRoleConfirm} onOpenChange={setShowRoleConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>権限の変更確認</DialogTitle>
            <DialogDescription>
              権限を {ROLE_LABELS[formData.role]} から {pendingRole && ROLE_LABELS[pendingRole]}{' '}
              に変更します。よろしいですか？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelRoleChange} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button onClick={confirmRoleChange} disabled={isSubmitting}>
              変更する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>会員の削除確認</DialogTitle>
            <DialogDescription>
              この会員を削除します。この操作は元に戻せません。本当によろしいですか？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              キャンセル
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? '削除中...' : '削除する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
