// KPI Templates by Industry
//業種別KPIテンプレート定義

import type { KPIInsert } from '@/types/turso'

export interface KPITemplate {
  name: string
  description: string
  category: 'revenue' | 'customer' | 'operation' | 'other'
  unit: string
  period_type: 'daily' | 'weekly' | 'monthly'
  default_target: number
}

export type Industry =
  | 'restaurant'
  | 'ecommerce'
  | 'saas'
  | 'manufacturing'
  | 'retail'
  | 'consulting'
  | 'general'

export const KPI_TEMPLATES: Record<Industry, KPITemplate[]> = {
  restaurant: [
    {
      name: '月間売上高',
      description: '1ヶ月間の総売上を追跡',
      category: 'revenue',
      unit: '円',
      period_type: 'monthly',
      default_target: 3000000,
    },
    {
      name: '客数',
      description: '1日の来店客数を追跡',
      category: 'customer',
      unit: '人',
      period_type: 'daily',
      default_target: 50,
    },
    {
      name: '客単価',
      description: '1人あたりの平均注文額',
      category: 'revenue',
      unit: '円',
      period_type: 'daily',
      default_target: 1500,
    },
    {
      name: 'フードコスト率',
      description: '食材コストの売上に対する比率',
      category: 'operation',
      unit: '%',
      period_type: 'monthly',
      default_target: 30,
    },
  ],
  ecommerce: [
    {
      name: '月間GMV',
      description: '取引総額（Gross Merchandise Value）',
      category: 'revenue',
      unit: '円',
      period_type: 'monthly',
      default_target: 5000000,
    },
    {
      name: 'コンバージョン率',
      description: '訪問者から購入への転換率',
      category: 'operation',
      unit: '%',
      period_type: 'weekly',
      default_target: 3,
    },
    {
      name: '平均注文額（AOV）',
      description: '1注文あたりの平均金額',
      category: 'revenue',
      unit: '円',
      period_type: 'daily',
      default_target: 5000,
    },
    {
      name: '顧客獲得コスト（CAC）',
      description: '1顧客獲得あたりのコスト',
      category: 'operation',
      unit: '円',
      period_type: 'monthly',
      default_target: 3000,
    },
  ],
  saas: [
    {
      name: 'MRR',
      description: '月間経常収益',
      category: 'revenue',
      unit: '円',
      period_type: 'monthly',
      default_target: 1000000,
    },
    {
      name: 'チャーン率',
      description: '解約率',
      category: 'customer',
      unit: '%',
      period_type: 'monthly',
      default_target: 5,
    },
    {
      name: 'アクティブユーザー数（MAU）',
      description: '月間アクティブユーザー数',
      category: 'customer',
      unit: '人',
      period_type: 'monthly',
      default_target: 1000,
    },
  ],
  manufacturing: [
    {
      name: '生産数',
      description: '日次生産数量',
      category: 'operation',
      unit: '個',
      period_type: 'daily',
      default_target: 1000,
    },
    {
      name: '不良率',
      description: '不良品の発生率',
      category: 'operation',
      unit: '%',
      period_type: 'monthly',
      default_target: 2,
    },
  ],
  retail: [
    {
      name: '売上高',
      description: '日次売上高',
      category: 'revenue',
      unit: '円',
      period_type: 'daily',
      default_target: 500000,
    },
    {
      name: '来店客数',
      description: '日次来店者数',
      category: 'customer',
      unit: '人',
      period_type: 'daily',
      default_target: 200,
    },
  ],
  consulting: [
    {
      name: '稼働率',
      description: '有効時間の比率',
      category: 'operation',
      unit: '%',
      period_type: 'monthly',
      default_target: 80,
    },
    {
      name: 'プロジェクト完了数',
      description: '月間完了プロジェクト数',
      category: 'operation',
      unit: '件',
      period_type: 'monthly',
      default_target: 5,
    },
  ],
  general: [
    {
      name: '月間売上目標',
      description: '月間の売上目標',
      category: 'revenue',
      unit: '円',
      period_type: 'monthly',
      default_target: 1000000,
    },
    {
      name: '新規顧客数',
      description: '月間の新規顧客獲得数',
      category: 'customer',
      unit: '人',
      period_type: 'monthly',
      default_target: 10,
    },
  ],
}

export function getKpiTemplates(industry: Industry): KPITemplate[] {
  return KPI_TEMPLATES[industry] || KPI_TEMPLATES.general
}

export function getAllIndustries(): { id: Industry; name: string }[] {
  return [
    { id: 'restaurant', name: '飲食業' },
    { id: 'ecommerce', name: 'EC事業' },
    { id: 'saas', name: 'SaaS' },
    { id: 'manufacturing', name: '製造業' },
    { id: 'retail', name: '小売業' },
    { id: 'consulting', name: 'コンサルティング' },
    { id: 'general', name: '汎用' },
  ]
}

export function templateToKPIInput(
  template: KPITemplate,
  userId: string,
  startDate: Date,
  endDate: Date
): Omit<KPIInsert, 'user_id'> {
  return {
    name: template.name,
    description: template.description,
    category: template.category,
    target_value: template.default_target,
    current_value: 0,
    unit: template.unit,
    period_type: template.period_type,
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
  }
}
