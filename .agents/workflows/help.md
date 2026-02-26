---
description: Show available GSD commands and usage guide
---

# /gsd:help — Antigravity 版

---

## 🔵 コアワークフロー

| コマンド | 説明 |
|---------|------|
| `/gsd:progress` | 進捗確認と次のアクション提案 |
| `/gsd:plan-phase <N>` | フェーズの PLAN.md を作成 |
| `/gsd:execute-phase <N>` | フェーズを実行（SUMMARY + VERIFICATION 作成） |
| `/gsd:verify-work <N>` | UAT テスト実施 |
| `/gsd:quick <説明>` | 小さいタスクを即実行 |

## 🟢 プロジェクト管理

| コマンド | 説明 |
|---------|------|
| `/gsd:new-project` | 新プロジェクト初期化 |
| `/gsd:new-milestone` | 新マイルストーン開始 |
| `/gsd:complete-milestone` | マイルストーンをアーカイブ |
| `/gsd:audit-milestone` | マイルストーン達成度の監査 |

## 🟠 フェーズ管理

| コマンド | 説明 |
|---------|------|
| `/gsd:discuss-phase <N>` | フェーズの設計意図を収集（CONTEXT.md） |
| `/gsd:research-phase <N>` | フェーズの技術調査（RESEARCH.md） |
| `/gsd:add-phase <説明>` | マイルストーン末尾にフェーズ追加 |
| `/gsd:insert-phase <N> <説明>` | フェーズ間に緊急タスクを挿入 |
| `/gsd:remove-phase <N>` | 未実行フェーズを削除 |
| `/gsd:list-phase-assumptions <N>` | 実装前提を明示して確認 |
| `/gsd:plan-milestone-gaps` | ギャップクローズ用フェーズを計画 |

## 🟣 セッション管理

| コマンド | 説明 |
|---------|------|
| `/gsd:resume-work` | 作業を再開（状態復元） |
| `/gsd:pause-work` | 作業を一時停止（引継ぎファイル作成） |
| `/gsd:check-todos` | TODO一覧を確認 |
| `/gsd:add-todo <説明>` | TODOを記録 |
| `/gsd:health` | 計画ディレクトリの診断 |

## 🔴 ユーティリティ

| コマンド | 説明 |
|---------|------|
| `/gsd:advise <状況>` | 状況に応じた最適コマンドを提案 |
| `/gsd:map-codebase` | コードベースを分析・文書化 |
| `/gsd:cleanup` | 完了フェーズの整理 |
| `/gsd:debug <問題>` | 問題を体系的にデバッグ |
| `/gsd:settings` | 設定確認 |

---

## 典型的なワークフロー

```
新プロジェクト:
/gsd:new-project → /gsd:discuss-phase 1 → /gsd:plan-phase 1 → /gsd:execute-phase 1

セッション再開:
/gsd:resume-work → /gsd:progress → /gsd:execute-phase <N>

フェーズ完了後:
/gsd:verify-work <N> → /gsd:discuss-phase <N+1> → /gsd:plan-phase <N+1>
```
