# YARIKIRU OSS v5.1.0

> 「未完了の天才を完了させる凡人に変える」 - Local-First GSD Tool

YARIKIRU OSSは、完全ローカルで動作するタスク管理ツールです。AIを使って目標を具体的なタスクに分解し、実行をサポートします。

## 🌟 特徴

- **完全ローカル動作**: データはSQLiteに保存、クラウド依存なし
- **AIタスク分解**: 目標を15分で完了できる具体的なタスクに自動分解
- **執行優先ワークフロー**: GSD (Get-Shit-Done) メソッド実装
- **進捗可視化**: タスク完了状況をプログレスバーで表示
- **レスポンシブデザイン**: デスクトップ・モバイルどちらでも快適に操作
- **MCP統合**: Claude Code から直接操作可能

## 🚀 クイックスタート

### インストール

```bash
npm install -g https://github.com/045team/yarikiru-oss.git
```

`TAR_ENTRY_ERROR` や `better-sqlite3` のビルドエラーが出る場合は、クローンでインストールする方法が確実です:

```bash
git clone https://github.com/045team/yarikiru-oss.git && cd yarikiru-oss
npm install
npm run dev
```

詳しくは [docs/INSTALL.md](docs/INSTALL.md) を参照してください。

### 初期化

```bash
yarikiru init
```

### ステータス確認

```bash
yarikiru status
```

### UIの起動

```bash
yarikiru ui
```

http://localhost:3000 にアクセスしてください。

## 📁 CLIコマンド

```bash
# ステータス確認
yarikiru status

# プロジェクト・目標一覧
yarikiru list

# 学習URLの追加
yarikiru learn https://example.com -t "タイトル"

# GSDプランニング同期
yarikiru sync
```

## 🛠️ 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **データベース**: SQLite (better-sqlite3)
- **UI**: Tailwind CSS + shadcn/ui
- **AI**: Anthropic Claude API (オプション)
- **言語**: TypeScript

## 📦 開発

```bash
# リポジトリのクローン
git clone https://github.com/045team/yarikiru-oss.git
cd yarikiru-oss

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# CLIテスト
npx yarikiru status
```

## 🤖 MCPサーバー

YARIKIRU OSSにはMCP（Model Context Protocol）サーバーが含まれており、Claude Codeから直接操作できます。

### MCPサーバーの設定

Claude Codeの設定ファイル（`~/.config/claude-code/config.json`）に以下を追加：

```json
{
  "mcpServers": {
    "yarikiru": {
      "command": "node",
      "args": ["/path/to/yarikiru-oss/src/mcp-server/index.mjs", "--transport=stdio"]
    },
    "yarikiru-sse": {
      "command": "node",
      "args": ["/path/to/yarikiru-oss/src/mcp-server/index.mjs", "--transport=sse", "--port=3100"]
    }
  }
}
```

デフォルトは `stdio` トランスポートです。
ネットワーク経由で接続する場合は `--transport=sse` を指定し、必要に応じて `--port=3100` のようにポートを指定できます（デフォルトで3100〜3110番の空きポートを自動探索します）。

### 利用可能なMCPツール

- `list_projects`: プロジェクト一覧を取得
- `start_goal_work`: 目標の作業を開始（タイマー開始）
- `complete_goal_work`: 目標を完了（タイマー終了+学び記録）
- `decompose_goal`: AIタスク分解
- `sync_planning`: GSDプランニング同期

## 📝 ライセンス

MIT

## 🤝 貢献

Contributions, issues and feature requests are welcome!

## 📚 ドキュメント

- [GSDワークフロー](https://github.com/get-shit-done-workflow/GSD)
- [MCPプロトコル](https://modelcontextprotocol.io/)
