'use client'

import Link from 'next/link'
import { Key, Brain, CreditCard, ChevronRight, Eye } from 'lucide-react'

const settingsSections = [
    {
        title: '表示設定',
        description: '初心者モードや用語表示を設定します',
        href: '/settings/display',
        icon: Eye,
        comingSoon: false
    },
    {
        title: 'AI設定',
        description: 'Vertex AIサービスアウントを設定して、ベクトル検索機能を有効にします',
        href: '/settings/ai',
        icon: Brain,
        comingSoon: false
    },
    {
        title: 'APIキー',
        description: 'MCP/SaaS用のAPIキーを管理します',
        href: '/settings/api-keys',
        icon: Key,
        comingSoon: false
    },
    {
        title: '料金プラン',
        description: 'プランと利用料金を確認・変更します',
        href: '/settings/billing',
        icon: CreditCard,
        comingSoon: false
    }
]

export default function SettingsPage() {
    return (
        <div className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold mb-2 text-foreground">設定</h1>
            <p className="text-muted-foreground mb-8">
                アプリケーションの設定を管理します
            </p>

            <div className="space-y-4">
                {settingsSections.map((section) => {
                    const Icon = section.icon
                    return (
                        <Link
                            key={section.href}
                            href={section.href}
                            className="block group"
                        >
                            <div className="bg-card text-card-foreground shadow-sm rounded-lg border border-border p-6 hover:border-primary/50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                            <Icon className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                                                {section.title}
                                            </h2>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {section.description}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
