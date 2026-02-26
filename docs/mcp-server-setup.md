# YARIKIRU MCP Server Setup

YARIKIRU MCPサーバーを使用すると、Claude Codeから直接YARIKIRUのデータベースにアクセスして、タスクの作成・分解・管理ができます。

## セットアップ手順

### 1. 環境変数の設定

`.env.local` ファイルを作成して、Tursoデータベースの認証情報を設定します：

```bash
TURSO_DATABASE_URL=libsql://yarikiru-045team.aws-ap-northeast-1.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

### 2. Claude CodeのMCP設定

Claude CodeのMCP設定ファイルにYARIKIRUサーバーを追加します。

**macOS/Linuxの場合:**
```bash
# MCP設定ディレクトリ
mkdir -p ~/.config/claude
```

**~/.config/claude/mcp_settings.json** に以下を追加：

```json
{
  "mcpServers": {
    "yarikiru": {
      "command": "node",
      "args": ["/Users/kitamuratatsuhiko/yarikiru/src/mcp-server/index.js"],
      "env": {
        "TURSO_DATABASE_URL": "libsql://yarikiru-045team.aws-ap-northeast-1.turso.io",
        "TURSO_AUTH_TOKEN": "your-auth-token-here"
      }
    }
  }
}
```

**注意**: `TURSO_AUTH_TOKEN` は実際のトークンに置き換えてください。

### 3. Claude Codeを再起動

Claude Codeを再起動して、MCPサーバーが認識されることを確認します。

## 利用可能なツール

| ツール名 | 説明 |
|---------|------|
| `list_goals` | ユーザーの全ゴールを取得 |
| `get_goal` | 特定のゴールと関連タスクを取得 |
| `create_goal` | 新しいゴールを作成 |
| `create_tasks` | ゴールに対してタスクを作成（AI分解結果） |
| `update_task_status` | タスクの完了状態を更新 |
| `get_stats` | ユーザーの統計情報を取得 |

## 使用例

### ゴールの一覧表示

```
ユーザー: list_goalsツールでuserId "user_123" のゴールを一覧表示して
```

### Claudeによるタスク分解

```
ユーザー: 私のゴール「YARIKIRUの開発」を15分単位のタスクに分解して、
        create_tasksツールでデータベースに登録して
```

### 統計情報の確認

```
ユーザー: get_statsで現在の進捗状況を確認して
```

## Pencil.devとの類似点

- **ローカルMCPサーバー**: YARIKIRUもPencil.devと同様、ローカルでMCPサーバーを起動
- **Claude Code連携**: Claude Codeから直接データ操作が可能
- **stdio通信**: 標準入出力経由でClaudeと通信
- **プライバシー**: 全てローカルで完結、データは外部に送信されない

## トラブルシューティング

### MCPサーバーが起動しない

```bash
# 手動でテスト
cd /Users/kitamuratatsuhiko/yarikiru
npm run mcp
```

### データベース接続エラー

- `.env.local` の認証情報が正しいか確認
- Tursoデータベースが作成されているか確認

## データベーススキーマ

```sql
-- goals テーブル
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deadline DATE,
  status TEXT DEFAULT 'active'
);

-- generated_tasks テーブル
CREATE TABLE generated_tasks (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  estimated_minutes INTEGER,
  priority TEXT,
  is_completed BOOLEAN DEFAULT 0,
  FOREIGN KEY (goal_id) REFERENCES goals(id)
);
```
