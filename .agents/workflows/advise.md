---
description: Consult Antigravity to determine the most appropriate GSD command for a given situation or task.
argument-hint: "<situation or task description>"
---

# /gsd:advise — Antigravity 版

状況を説明してください。最適な GSD コマンドを提案します。

---

## 判断フロー

状況の説明から以下を判断して最適なコマンドを提示:

| 状況 | 推奨コマンド |
|------|------------|
| プロジェクトが初期化されていない | `/gsd:new-project` |
| 「今どこ？」「次は何？」 | `/gsd:progress` |
| セッションを再開したい | `/gsd:resume-work` |
| フェーズを計画したい | `/gsd:plan-phase <N>` |
| フェーズを実行したい | `/gsd:execute-phase <N>` |
| 実装が正しいか確認したい | `/gsd:verify-work <N>` |
| 小さいタスクを今すぐやりたい | `/gsd:quick <説明>` |
| 設計方針を先に整理したい | `/gsd:discuss-phase <N>` |
| フェーズ間に緊急タスクを入れたい | `/gsd:insert-phase <N> <説明>` |
| マイルストーンが終わった | `/gsd:complete-milestone` |
| コードベースを把握したい | `/gsd:map-codebase` |

---

## 使い方

```
/gsd:advise セッションを再開したい
→ /gsd:resume-work を使ってください

/gsd:advise Phase 3 の実装が終わった気がする
→ /gsd:verify-work 3 で UAT テストを実行してください
```
