'use client';

import React, { useState } from 'react';
import { Package, PackageType } from '@revenuecat/purchases-js';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { getRevenueCat } from '@/lib/revenuecat';
import { User, Cpu, Sparkles, Check, Star } from 'lucide-react';

type PlanDuration = 'monthly' | 'yearly';

export default function RevenueCatSdkPaywall() {
    const { offerings, isPro, loading, error, refreshCustomerInfo } = useRevenueCat();
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [duration, setDuration] = useState<PlanDuration>('yearly');

    const activeOffering = offerings?.current;

    const handlePurchase = async (tierId: string) => {
        try {
            setPurchasing(tierId);

            // Find the right package based on the duration and tier
            // Usually, RC default offerings have monthly and annual packages for your main "Pro" tier.
            // If you have multiple tiers, you'd match identifiers like "pro_monthly", "max_annual".
            // Here, we try to match by PackageType first if it's the Pro tier, otherwise by identifier.
            let pkgToBuy: Package | undefined = undefined;

            if (activeOffering) {
                if (tierId === 'pro') {
                    pkgToBuy = activeOffering.availablePackages.find(p =>
                        duration === 'yearly' ? p.packageType === PackageType.Annual : p.packageType === PackageType.Monthly
                    );
                } else if (tierId === 'max') {
                    // Fallback to specific identifiers if "Max" tier logic is configured
                    const targetId = duration === 'yearly' ? 'max_annual' : 'max_monthly';
                    pkgToBuy = activeOffering.availablePackages.find(p => p.identifier.includes(targetId) || p.packageType === PackageType.Custom);
                }
            }

            if (!pkgToBuy) {
                // If the package is not found in the current offering, we alert the user.
                alert('現在このプランはRevenueCatダッシュボードに設定されていません。');
                return;
            }

            const purchases = getRevenueCat();
            await purchases.purchasePackage(pkgToBuy);
            await refreshCustomerInfo();
            alert('アップグレードが完了しました！');
        } catch (e: any) {
            if (!e.userCancelled) {
                console.error('Purchase failed:', e);
                alert(`購入処理に失敗しました: ${e.message}`);
            }
        } finally {
            setPurchasing(null);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <svg className="h-8 w-8 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-sm text-gray-500">プラン情報を読み込み中...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
                <p className="font-semibold text-red-600">料金プランの読み込みに失敗しました。</p>
                <p className="mt-2 text-sm text-red-500">{error.message}</p>
            </div>
        );
    }

    const plans = [
        {
            id: 'free',
            name: 'Free',
            icon: <User className="h-5 w-5 mb-1" />,
            monthlyPrice: 0,
            yearlyPrice: 0,
            popular: false,
            subtitle: '個人の目標管理を始めたい方向け',
            highlightUsage: 'Yarikiruの基本機能',
            features: [
                '中目標 3件まで',
                'AIタスク分解 10回/月',
                '進捗可視化・カレンダー',
                '基本的なMCP連携',
            ],
            buttonText: '現在のプラン',
            buttonVariant: 'outline',
            disabled: true,
        },
        {
            id: 'pro',
            name: 'Pro',
            icon: <Cpu className="h-5 w-5 mb-1" />,
            monthlyPrice: 4,
            yearlyPrice: 2,
            popular: true,
            subtitle: 'やりきりたい本気の方へ',
            highlightUsage: 'AIフル活用・時間トラッキング',
            features: [
                '中目標 無制限作成',
                'AIタスク分解・予測 無制限',
                '時間計測・フォーカスモード',
                'URLラーニング機能',
                'フルMCP連携 (コードレビュー等)'
            ],
            buttonText: purchasing === 'pro' ? '処理中...' : 'アップグレード',
            buttonVariant: 'solid',
            disabled: purchasing !== null || isPro,
        },
        {
            id: 'max',
            name: 'Max',
            icon: <Sparkles className="h-5 w-5 mb-1 text-amber-500" />,
            monthlyPrice: 12,
            yearlyPrice: 8,
            popular: false,
            isMax: true,
            subtitle: 'チームやパーソナルアシスタントを求める方へ',
            highlightUsage: 'パーソナライズ＆高度な学習支援',
            features: [
                'Proプランのすべての機能',
                'チーム共有・共同管理機能',
                'パーソナライズされた学習提案',
                '個別スキル開発のアドバイス',
                '優先的な新機能アクセス',
            ],
            buttonText: purchasing === 'max' ? '処理中...' : 'アップグレード',
            buttonVariant: 'gold',
            disabled: purchasing !== null || isPro,
        },
    ];

    return (
        <section id="pricing" className="bg-[#111111] py-24 text-gray-100 font-sans rounded-3xl overflow-hidden">
            <div className="mx-auto max-w-6xl px-4 lg:px-8">
                <div className="mb-12 text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-4">
                        シンプルな料金プラン
                    </h2>
                    <p className="text-gray-400">
                        あなたのスタイルに合った期間でアップグレード。
                    </p>
                </div>

                {/* Toggle */}
                <div className="mb-16 flex justify-center">
                    <div className="relative inline-flex items-center rounded-full bg-[#1A1A1A] p-1 ring-1 ring-white/10">
                        <button
                            onClick={() => setDuration('monthly')}
                            className={`relative z-10 rounded-full px-6 py-2 text-sm font-medium transition-colors ${duration === 'monthly' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setDuration('yearly')}
                            className={`relative z-10 flex items-center rounded-full px-6 py-2 text-sm font-medium transition-colors ${duration === 'yearly' ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            Yearly
                            <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs text-amber-500">
                                -50%
                            </span>
                        </button>

                        <div
                            className={`absolute top-1 bottom-1 w-1/2 rounded-full bg-[#2A2A2A] transition-transform duration-300 ease-in-out ${duration === 'yearly' ? 'translate-x-[calc(100%-8px)] w-[120px]' : 'translate-x-0 w-[95px]'
                                }`}
                        />
                    </div>
                </div>

                {/* Cards */}
                <div className="grid gap-6 md:grid-cols-3 md:items-stretch">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`relative flex flex-col rounded-2xl p-8 transition-transform hover:-translate-y-1 ${plan.popular
                                ? 'bg-gradient-to-b from-[#252836] to-[#1F1D2B] ring-1 ring-sky-500/50'
                                : plan.isMax
                                    ? 'bg-gradient-to-b from-[#2A2315] to-[#1A1813] ring-1 ring-amber-500/20'
                                    : 'bg-[#1A1C23] ring-1 ring-white/5'
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-400 to-sky-600 px-3 py-1 text-xs font-bold text-white shadow-lg flex items-center gap-1">
                                    Popular <Star className="w-3 h-3 fill-current" />
                                </div>
                            )}
                            {plan.isMax && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-3 py-1 text-xs font-bold text-gray-900 shadow-lg flex items-center gap-1">
                                    Max Usage <Star className="w-3 h-3 fill-current text-white" />
                                </div>
                            )}

                            <div className="mb-6 flex items-center gap-2 text-xl font-medium text-gray-200">
                                {plan.icon}
                                {plan.name}
                            </div>

                            <div className="mb-6">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold tracking-tight text-white">
                                        ${duration === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice}
                                    </span>
                                    <span className="text-sm font-medium text-gray-400">
                                        / month
                                    </span>
                                </div>
                                {plan.yearlyPrice > 0 && duration === 'yearly' && (
                                    <p className="mt-2 text-xs text-gray-500">
                                        Billed ${plan.yearlyPrice * 12} yearly
                                    </p>
                                )}
                                {(plan.yearlyPrice === 0 || duration === 'monthly') && (
                                    <p className="mt-2 text-xs text-transparent select-none"> Spacer </p>
                                )}
                            </div>

                            <button
                                onClick={() => plan.id !== 'free' && handlePurchase(plan.id)}
                                disabled={plan.disabled}
                                className={`mb-8 block w-full rounded-xl px-4 py-3 text-center text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${plan.buttonVariant === 'solid'
                                    ? 'bg-white text-gray-900 hover:bg-gray-100'
                                    : plan.buttonVariant === 'gold'
                                        ? 'bg-gradient-to-r from-amber-200 to-amber-400 text-amber-950 hover:from-amber-300 hover:to-amber-500'
                                        : 'bg-white/5 text-gray-300'
                                    }`}
                            >
                                {isPro && plan.id !== 'free' ? '加入済み' : plan.buttonText}
                            </button>

                            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-200">
                                <Sparkles className={`h-4 w-4 ${plan.isMax ? 'text-amber-500' : 'text-gray-400'}`} />
                                {plan.highlightUsage}
                            </div>
                            <div className="mb-6 h-[1px] w-full bg-white/10" />

                            <ul className="flex-1 space-y-4">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-3 text-sm text-gray-400">
                                        <Check className="h-4 w-4 shrink-0 text-gray-500" />
                                        <span className="leading-tight">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
