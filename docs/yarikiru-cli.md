# YARIKIRU CLI

MCP経由での操作が Cursor で 400 エラーになる場合、CLI で直接 DB を操作できます。

## セットアップ

`.env.local` に `TURSO_DATABASE_URL` と `TURSO_AUTH_TOKEN` を設定してください。

## 使い方

```bash
npm run yarikiru:cli -- <command> [options]
```

### コマンド

| コマンド | 説明 |
|---------|------|
| `list-goals --userId <userId>` | 目標一覧 |
| `create-goal --userId <userId> --title <title>` | 目標作成 |
| `create-tasks --goalId <goalId> --tasks <JSON>` | タスク追加 |
| `get-goal --goalId <goalId>` | 目標とタスク詳細 |
| `get-stats --userId <userId>` | 統計 |

### 例

```bash
# 目標一覧（userId は goals テーブルの user_id）
npm run yarikiru:cli -- list-goals --userId user_demo

# タスク追加（JSON はシングルクォートで囲む）
npm run yarikiru:cli -- create-tasks --goalId goal_demo_001 --tasks '[{"title":"新タスク","estimatedMinutes":15,"priority":"high"}]'

# 目標の詳細確認
npm run yarikiru:cli -- get-goal --goalId goal_demo_001
```

### アプリにタスクを表示するには

- **ダッシュボード**: 目標の `user_id` がログイン中の userId と一致する必要があります
- **/goals/[id] ページ**: URL で直接アクセス（例: `/goals/goal_demo_001`）すれば、その目標のタスクが表示されます
- CLI で追加したタスクは即座に DB に保存されるため、ページをリロードすれば反映されます
