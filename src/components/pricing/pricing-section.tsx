'use client';

import React, { useState } from 'react';
import { User, Cpu, Sparkles, Check, Star } from 'lucide-react';
import Link from 'next/link';

type PlanDuration = 'monthly' | 'yearly';

export function PricingSection() {
    const [duration, setDuration] = useState<PlanDuration>('yearly');

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
            buttonText: '無料で始める',
            buttonVariant: 'outline',
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
            buttonText: 'アップグレード',
            buttonVariant: 'solid',
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
            buttonText: 'アップグレード',
            buttonVariant: 'gold',
        },
    ];

    return (
        <section id="pricing" className="bg-[#111111] py-24 text-gray-100 font-sans">
            <div className="mx-auto max-w-6xl px-4">
                <div className="mb-12 text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-4">
                        シンプルな料金プラン
                    </h2>
                    <p className="text-gray-400">
                        まずは無料で試してください。本気になったときにアップグレード。
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

                        {/* Toggle Highlight */}
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
                            {/* Popular Badge */}
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

                            {/* Header */}
                            <div className="mb-6 flex items-center gap-2 text-xl font-medium text-gray-200">
                                {plan.icon}
                                {plan.name}
                            </div>

                            {/* Price */}
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

                            {/* CTA Button */}
                            <Link
                                href="/signup"
                                className={`mb-8 block rounded-xl px-4 py-3 text-center text-sm font-semibold transition-colors ${plan.buttonVariant === 'solid'
                                        ? 'bg-white text-gray-900 hover:bg-gray-100'
                                        : plan.buttonVariant === 'gold'
                                            ? 'bg-gradient-to-r from-amber-200 to-amber-400 text-amber-950 hover:from-amber-300 hover:to-amber-500'
                                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                    }`}
                            >
                                {plan.buttonText}
                            </Link>

                            {/* Usage Highlight */}
                            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-200">
                                <Sparkles className={`h-4 w-4 ${plan.isMax ? 'text-amber-500' : 'text-gray-400'}`} />
                                {plan.highlightUsage}
                            </div>
                            <div className="mb-6 h-[1px] w-full bg-white/10" />

                            {/* Features */}
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
