'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Product IDs must match those configured in RevenueCat dashboard
const REVENUECAT_PRODUCTS = {
    pro_monthly: 'yarikiru_pro_monthly',
    team_monthly: 'yarikiru_team_monthly',
}

interface Plan {
    id: string
    label: string
    price: string
    period: string
    description: string
    productId: string | null
    cta: string
    featured: boolean
    features: string[]
}

const plans: Plan[] = [
    {
        id: 'free',
        label: 'フリープラン',
        price: '¥0',
        period: '/ 月',
        description: '個人の目標管理を始めたい方向け',
        productId: null, // No payment needed
        cta: '無料で始める',
        featured: false,
        features: [
            '中目標 3件まで',
            'AIタスク分解 10回/月',
            '進捗可視化',
            'MCP連携（基本）',
        ],
    },
    {
        id: 'pro',
        label: 'Proプラン',
        price: '¥980',
        period: '/ 月',
        description: 'やりきりたい本気の方へ',
        productId: REVENUECAT_PRODUCTS.pro_monthly,
        cta: 'Proにアップグレード',
        featured: true,
        features: [
            '中目標 無制限',
            'AIタスク分解 無制限',
            '進捗可視化 + 時間追跡',
            'MCP連携（フル）',
            'URLラーニング機能',
            'コードレビュー AI',
        ],
    },
    {
        id: 'team',
        label: 'チームプラン',
        price: '¥2,980',
        period: '/ 月',
        description: 'チームで目標を達成したい方向け',
        productId: REVENUECAT_PRODUCTS.team_monthly,
        cta: 'チームで始める',
        featured: false,
        features: [
            'Proの全機能',
            'チームメンバー 無制限',
            '管理者ダッシュボード',
            '優先サポート',
        ],
    },
]

function CheckIcon() {
    return (
        <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
    )
}

interface PlanCardProps {
    plan: Plan
    currentPlan?: string
}

function PlanCard({ plan, currentPlan }: PlanCardProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isCurrent = currentPlan === plan.id

    const handleUpgrade = async () => {
        if (!plan.productId) {
            router.push('/signup')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const res = await fetch('/api/checkout/revenuecat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: plan.productId }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'チェックアウトセッションの作成に失敗しました')
            }

            // Redirect to RevenueCat Web Billing checkout
            window.location.href = data.checkoutUrl
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    return (
        <div
            className={`relative flex h-full flex-col rounded-2xl border p-8 shadow-sm transition-all duration-200 hover:shadow-lg ${plan.featured
                    ? 'border-[#0EA5E9] bg-[#0EA5E9] text-white'
                    : 'border-sky-100 bg-white text-[#0C4A6E]'
                }`}
        >
            {plan.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#F97316] px-4 py-1 text-xs font-bold text-white">
                    人気No.1
                </div>
            )}

            <div className="mb-6">
                <div className={`mb-1 text-sm font-semibold ${plan.featured ? 'text-sky-200' : 'text-[#0EA5E9]'}`}>
                    {plan.label}
                </div>
                <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className={`mb-1 text-sm ${plan.featured ? 'text-sky-200' : 'text-[#0C4A6E]/50'}`}>
                        {plan.period}
                    </span>
                </div>
                <p className={`mt-2 text-sm ${plan.featured ? 'text-sky-100' : 'text-[#0C4A6E]/60'}`}>
                    {plan.description}
                </p>
            </div>

            <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                        <span className={plan.featured ? 'text-sky-200 mt-0.5' : 'text-[#0EA5E9] mt-0.5'}>
                            <CheckIcon />
                        </span>
                        <span className={plan.featured ? 'text-sky-50' : 'text-[#0C4A6E]/80'}>{f}</span>
                    </li>
                ))}
            </ul>

            {error && (
                <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
            )}

            {isCurrent ? (
                <div
                    className={`rounded-xl px-6 py-3 text-center text-sm font-semibold ${plan.featured ? 'bg-white/20 text-white' : 'bg-[#F0F9FF] text-[#0C4A6E]/50'
                        }`}
                >
                    現在のプラン
                </div>
            ) : (
                <button
                    onClick={handleUpgrade}
                    disabled={loading}
                    className={`cursor-pointer rounded-xl px-6 py-3 text-center text-sm font-semibold transition-all duration-200 disabled:opacity-60 ${plan.featured
                            ? 'bg-[#F97316] text-white hover:bg-[#ea6c0b] hover:shadow-md'
                            : 'border border-sky-200 bg-[#F0F9FF] text-[#0EA5E9] hover:border-[#0EA5E9] hover:bg-white'
                        }`}
                    aria-label={`${plan.label}に申し込む`}
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            処理中...
                        </span>
                    ) : (
                        plan.cta
                    )}
                </button>
            )}
        </div>
    )
}

interface RevenueCatPaywallProps {
    currentPlan?: 'free' | 'pro' | 'team'
}

/**
 * RevenueCat Paywall Component
 * 
 * 使い方:
 * 1. RevenueCat ダッシュボードで Web Billing を有効にする
 *    → https://app.revenuecat.com
 * 2. .env.local に REVENUECAT_API_KEY と REVENUECAT_PROJECT_ID を設定
 * 3. このコンポーネントを任意のページに組み込む
 *    <RevenueCatPaywall currentPlan="free" />
 */
export function RevenueCatPaywall({ currentPlan = 'free' }: RevenueCatPaywallProps) {
    return (
        <section
            id="pricing"
            className="px-4 py-24"
            style={{ fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" }}
        >
            <div className="mx-auto max-w-6xl">
                <div className="mb-16 text-center">
                    <h2 className="text-3xl font-bold text-[#0C4A6E] md:text-4xl">シンプルな料金プラン</h2>
                    <p className="mt-4 text-lg text-[#0C4A6E]/60">
                        まずは無料で試してください。本気になったときにアップグレード。
                    </p>
                </div>

                <div className="grid gap-8 md:grid-cols-3">
                    {plans.map((plan) => (
                        <PlanCard key={plan.id} plan={plan} currentPlan={currentPlan} />
                    ))}
                </div>

                <p className="mt-8 text-center text-xs text-[#0C4A6E]/40">
                    決済は RevenueCat（Stripe） が処理します。クレジットカード情報は弊社サーバーに保存されません。
                    <Link href="/terms" className="underline hover:text-[#0EA5E9]">
                        利用規約
                    </Link>
                    をご確認ください。
                </p>
            </div>
        </section>
    )
}

export default RevenueCatPaywall
