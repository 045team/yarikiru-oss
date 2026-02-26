---
description: Git Worktree Parallelization Strategy for Multi-Agent Development
---

# Git Worktree 並列開発戦略

## 概要
`git worktree` を使い、同一リポジトリの複数ブランチを同時にチェックアウトして並列作業する。
エージェントチームやユーザー自身が、互いのワーキングディレクトリを干渉させずに開発を進められる。

## セットアップ

```bash
# メインリポジトリ（既存）
cd ~/yarikiru

# 新しい worktree を追加（別ブランチ）
git worktree add ../yarikiru-feature-x feature/new-dashboard-ui
git worktree add ../yarikiru-bugfix bugfix/cli-local-db

# 一覧確認
git worktree list
```

## エージェントチーム運用例

| Worktree Path | Branch | 担当 | 役割 |
|---|---|---|---|
| `~/yarikiru` | `main` | ユーザー | メインの開発・レビュー |
| `~/yarikiru-ui` | `feature/oss-ui` | Agent A | フロントエンドUI開発 |
| `~/yarikiru-api` | `feature/oss-api` | Agent B | バックエンドAPI開発 |
| `~/yarikiru-test` | `feature/e2e-tests` | Agent C | テスト・品質保証 |

## ルール
1. **同一ブランチの二重チェックアウト禁止**: `git worktree` は同じブランチを複数worktreeで開けない。
2. **merge前にrebase**: 各worktreeのブランチは、PRを出す前に `git rebase main` を行う。
3. **ロック機構**: 長期離脱するworktreeは `git worktree lock` でロックする。
4. **クリーンアップ**: 終了したworktreeは `git worktree remove <path>` で削除する。

## Yarikiru GSD との統合
- 各 worktree のブランチ名を GSD のフェーズ名と対応させる
  - 例: `feature/v5-oss-extraction` → `.planning/phases/v5-oss-extraction/`
- エージェントが作業を開始したら `yarikiru start <goalId>` で時間計測を開始
- ブランチがmergeされたら `yarikiru done <goalId>` で完了マーク

## よく使うコマンド
```bash
# worktree 追加
git worktree add <path> <branch>

# worktree 一覧
git worktree list

# worktree 削除
git worktree remove <path>

# worktree ロック（長期離脱時）
git worktree lock <path>
```
