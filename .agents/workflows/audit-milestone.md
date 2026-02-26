---
description: Audit milestone completion against original intent before archiving
argument-hint: ""
---

# /gsd:audit-milestone — Antigravity 版

> GSD 本体（`get-shit-done/workflows/audit-milestone.md`）を `gsd-tools` CLI なしで実行できる手順。
> アーカイブ前に、完成したものが最初の意図と一致しているか確認する。

---

## Step 1: コンテキスト読み込み

```bash
cat .planning/ROADMAP.md
cat .planning/PROJECT.md
ls .planning/phases/*/*-SUMMARY.md
```

---

## Step 2: 達成度チェック

PROJECT.md の Requirements と各フェーズ SUMMARY.md を比較:

| 要件 | 達成状況 | フェーズ | 証拠 |
|------|---------|---------|------|
| <要件1> | ✅ 達成 | Phase 01 | <何で確認したか> |
| <要件2> | ⚠️ 部分達成 | Phase 03 | <詳細> |
| <要件3> | ❌ 未達成 | - | <理由> |

---

## Step 3: ギャップ分析

未達成・部分達成の要件について:
- 意図的にスコープ外にしたものか？
- 実装漏れか？
- 次のマイルストーンで対応すべきか？

---

## Step 4: 監査レポート表示

```
## Milestone Audit Report

**達成率:** <N>/<total> 要件達成

### ✅ 完全達成
- <要件>: <根拠>

### ⚠️ 部分達成・懸念
- <要件>: <状況>

### ❌ 未達成
- <要件>: <理由>

### 推奨事項
- アーカイブ可能: <yes/no + 理由>
- 次マイルストーンで対応: <リスト>
```

---

## Step 5: 次のアクション提案

| 状況 | 推奨 |
|------|------|
| 全要件達成 | `/gsd:complete-milestone` |
| ギャップあり | `/gsd:plan-milestone-gaps` でギャップを計画 |
| 重大な未達成 | 追加フェーズを先に実行 |

---

## 完了条件チェックリスト

- [ ] PROJECT.md の Requirements 全件を確認
- [ ] 各要件に対してSUMMARY.md で達成状況を確認
- [ ] ギャップ分析（意図的 vs 実装漏れ）
- [ ] 監査レポートを表示
- [ ] 次のアクションを提案
