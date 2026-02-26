# Turso Refine Data Provider

このデータプロバイダーは、[Refine](https://refine.dev) フレームワークと [Turso](https://turso.tech) データベースを接続するためのアダプターです。

## 特徴

- **完全なRefineデータプロバイダー実装**: `getList`, `getOne`, `create`, `update`, `deleteOne`, `getMany`, `updateMany`, `deleteMany` をサポート
- **MVCCトランザクション対応**: Tursoの `BEGIN CONCURRENT` を使用した安全なデータ更新
- **クライアントサイド処理**: フィルタリング、ソート、ページネーションをクライアント側で実装
- **型安全**: TypeScriptの完全な型定義とサポート
- **カスタムアクション**: 特殊なデータ操作やリレーション取得のためのカスタムエンドポイント

## サポートされているリソース

| Refineリソース名 | Tursoテーブル | 説明 |
|---|---|---|
| `goals` | `projects` | ユーザーの目標/プロジェクト |
| `generated_tasks` | `project_tasks` | AI生成されたタスク |
| `focus_sessions` | `project_tasks` | フォーカスセッション（タスクとして扱う） |
| `projects` | `projects` | プロジェクト |
| `tasks` | `project_tasks` | プロジェクトタスク |
| `milestones` | `milestones` | マイルストーン |
| `kpis` | `kpis` | KPI指標 |

## インストール

```bash
npm install @refinedev/core @libsql/client
```

## 使用方法

### 基本的な設定

```tsx
import { Refine } from '@refinedev/core'
import dataProvider from '@/lib/turso-refine'

function App() {
  return (
    <Refine
      dataProvider={dataProvider}
      resources={[
        {
          name: 'projects',
          list: '/projects',
          create: '/projects/create',
          edit: '/projects/edit/:id',
          show: '/projects/show/:id',
        },
        {
          name: 'tasks',
          list: '/tasks',
          create: '/tasks/create',
          edit: '/tasks/edit/:id',
        },
      ]}
    >
      {/* 你的应用 */}
    </Refine>
  )
}
```

### ユーザーIDの指定

リストを取得する際に、`meta` 経由でユーザーIDを指定できます：

```tsx
import { useList } from '@refinedev/core'

function ProjectList() {
  const { data, isLoading } = useList({
    resource: 'projects',
    meta: {
      userId: 'user-123', // 現在のユーザーID
    },
  })

  // ...
}
```

### プロジェクトIDの指定

タスクやマイルストーンを取得する際に、プロジェクトIDを指定できます：

```tsx
import { useList } from '@refinedev/core'

function TaskList({ projectId }) {
  const { data, isLoading } = useList({
    resource: 'tasks',
    meta: {
      projectId: projectId, // 特定のプロジェクトのタスクを取得
    },
  })

  // ...
}
```

### フィルタリング

```tsx
const { data } = useList({
  resource: 'projects',
  filters: [
    {
      field: 'status',
      operator: 'eq',
      value: 'active',
    },
  ],
})
```

### ソート

```tsx
const { data } = useList({
  resource: 'projects',
  sorters: [
    {
      field: 'created_at',
      order: 'desc',
    },
  ],
})
```

### ページネーション

```tsx
const { data, pagination } = useList({
  resource: 'projects',
  pagination: {
    current: 1,
    pageSize: 10,
  },
})
```

### カスタムアクションの使用

サブタスクの取得：

```tsx
import { useCustom } from '@refinedev/core'

const { data } = useCustom({
  resource: 'tasks',
  action: 'getSubTasks',
  meta: {
    parentTaskId: 'task-123',
  },
})
```

KPI履歴の取得：

```tsx
const { data } = useCustom({
  resource: 'kpis',
  action: 'getKPIHistory',
  meta: {
    kpiId: 'kpi-123',
    limit: 100,
  },
})
```

KPI値の記録：

```tsx
import { useCustomMutation } from '@refinedev/core'

const { mutate } = useCustomMutation()

mutate({
  resource: 'kpis',
  action: 'recordKPIValue',
  meta: {
    kpiId: 'kpi-123',
  },
  payload: {
    value: 85,
  },
})
```

## APIリファレンス

### データプロバイダーメソッド

#### `getList`

リソースのリストを取得します。

```typescript
async getList<TData extends BaseRecord = BaseRecord>({
  resource,
  filters?,
  sorters?,
  pagination?,
  meta?,
}): Promise<GetListResponse<TData>>
```

**パラメータ:**
- `resource`: リソース名
- `filters`: フィルタ条件の配列
- `sorters`: ソート条件の配列
- `pagination`: ページネーション設定
- `meta`: メタデータ（`userId`、`projectId` など）

#### `getOne`

単一のレコードを取得します。

```typescript
async getOne<TData extends BaseRecord = BaseRecord>({
  resource,
  id,
  meta?,
}): Promise<GetOneResponse<TData>>
```

#### `create`

新しいレコードを作成します。

```typescript
async create<TData extends BaseRecord = BaseRecord, TVariables = {}>({
  resource,
  variables,
  meta?,
}): Promise<CreateResponse<TData>>
```

#### `update`

レコードを更新します。

```typescript
async update<TData extends BaseRecord = BaseRecord, TVariables = {}>({
  resource,
  id,
  variables,
  meta?,
}): Promise<UpdateResponse<TData>>
```

#### `deleteOne`

レコードを削除します。

```typescript
async deleteOne<TData extends BaseRecord = BaseRecord, TVariables = {}>({
  resource,
  id,
  meta?,
}): Promise<DeleteOneResponse<TData>>
```

#### `getMany`

複数のレコードを取得します。

```typescript
async getMany<TData extends BaseRecord = BaseRecord>({
  resource,
  ids,
  meta?,
}): Promise<GetManyResponse<TData>>
```

#### `updateMany`

複数のレコードを更新します。

```typescript
async updateMany<TData extends BaseRecord = BaseRecord, TVariables = {}>({
  resource,
  ids,
  variables,
  meta?,
}): Promise<UpdateManyResponse<TData>>
```

#### `deleteMany`

複数のレコードを削除します。

```typescript
async deleteMany<TData extends BaseRecord = BaseRecord, TVariables = {}>({
  resource,
  ids,
  meta?,
}): Promise<DeleteManyResponse<TData>>
```

#### `custom`

カスタムアクションを実行します。

```typescript
async custom<TData extends BaseRecord = BaseRecord, TQuery = unknown, TPayload = unknown>({
  resource,
  action,
  meta?,
  payload?,
}): Promise<CustomResponse<TData>>
```

**利用可能なカスタムアクション:**
- `getSubTasks`: サブタスクの取得（`meta.parentTaskId`が必要）
- `getProjectTasks`: プロジェクトの全タスク取得（`meta.projectId`が必要）
- `getProjectMilestones`: プロジェクトのマイルストーン取得（`meta.projectId`が必要）
- `getKPIHistory`: KPIの履歴取得（`meta.kpiId`が必要、オプションで`meta.limit`）
- `recordKPIValue`: KPI値の記録（`meta.kpiId`と`payload.value`が必要）

## エラーハンドリング

すべてのデータプロバイダーメソッドは、エラーが発生した場合に例外をスローします。適切なエラーハンドリングを実装してください：

```tsx
import { useList } from '@refinedev/core'

function MyComponent() {
  const { data, isLoading, error } = useList({
    resource: 'projects',
  })

  if (error) {
    return <div>エラーが発生しました: {error.message}</div>
  }

  // ...
}
```

## 型定義

このデータプロバイダーは以下の型をエクスポートします：

```typescript
import type {
  Project,
  ProjectInsert,
  ProjectUpdate,
  ProjectTask,
  ProjectTaskInsert,
  ProjectTaskUpdate,
  KPI,
  KPIInsert,
  KPIUpdate,
  Milestone,
  MilestoneInsert,
  MilestoneUpdate,
} from '@/types/turso'
```

## 制限事項

1. **クライアントサイド処理**: 現在の実装では、フィルタリング、ソート、ページネーションがクライアントサイドで行われます。大規模なデータセットではパフォーマンスの問題が発生する可能性があります。

2. **同時実行制御**: TursoのMVCCトランザクションを使用していますが、高度な同時実行シナリオでは追加のロック機構が必要になる場合があります。

3. **リソースマッピング**: 一部のリソース名は既存のテーブルにマッピングされています（例: `goals` → `projects`）。必要に応じてマッピングを調整してください。

## ライセンス

このデータプロバイダーはプロジェクトの一部として開発されました。

## サポート

問題やバグを見つけた場合は、プロジェクトのIssueトラッカーに報告してください。
