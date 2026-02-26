/**
 * AppNav - 共通ナビゲーションバー
 * YARIKIRU デザインシステム: Flat SaaS, Teal + Orange CTA
 */
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignOutButton } from '@/lib/auth-stub'
import { Target, LayoutDashboard, ListTodo, LogOut, Settings } from 'lucide-react'

export function AppNav() {
  const pathname = usePathname()
  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 transition-opacity duration-200 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
              aria-label="YARIKIRU ダッシュボード"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Target className="h-6 w-6 text-primary-foreground" aria-hidden />
              </div>
              <span className="text-xl font-bold text-foreground">YARIKIRU</span>
            </Link>
            <div className="hidden items-center gap-1 sm:flex">
              <NavLink href="/dashboard" icon={LayoutDashboard} isActive={pathname === '/dashboard'}>
                ダッシュボード
              </NavLink>
              <NavLink href="/goals" icon={ListTodo} isActive={pathname?.startsWith('/goals') ?? false}>
                目標一覧
              </NavLink>
              <NavLink href="/settings" icon={Settings} isActive={pathname?.startsWith('/settings') ?? false}>
                設定
              </NavLink>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-sm text-muted-foreground">
              やりきる人に
            </span>
            <SignOutButton>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-border bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                aria-label="サインアウト"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                サインアウト
              </button>
            </SignOutButton>
          </div>
        </div>
      </div>
    </nav>
  )
}

function NavLink({
  href,
  icon: Icon,
  isActive,
  children,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  isActive?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
        }`}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {children}
    </Link>
  )
}
