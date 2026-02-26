---
description: Create phases to close all gaps identified by milestone audit
argument-hint: ""
---

# /gsd:plan-milestone-gaps — Antigravity 版

> `/gsd:audit-milestone` で発見されたギャップを埋めるフェーズを計画する。

---

## Step 1: ギャップの確認

`/gsd:audit-milestone` の結果（または VERIFICATION.md・UAT.md）からギャップを収集:

```bash
grep -h "status: failed\|status: gaps_found" .planning/phases/*/*-VERIFICATION.md .planning/phases/*/*-UAT.md 2>/dev/null
```

---

## Step 2: ギャップのグループ化

ギャップをカテゴリに整理:

| カテゴリ | ギャップ | 優先度 |
|---------|---------|--------|
| バグ | <説明> | high |
| 機能不足 | <説明> | medium |
| UX問題 | <説明> | low |

---

## Step 3: ギャップクローズ用フェーズの計画

各カテゴリ（または関連するギャップのグループ）に対して PLAN.md を作成:

PLAN.md ファイル名: `.planning/phases/<NN>-*/<NN>-gap-<description>-PLAN.md`

```markdown
---
phase: <NN>
type: gap_closure
gaps_from: [<UAT.md or VERIFICATION.md のパス>]
---

# Gap Closure Plan: <説明>

## Gaps Being Addressed
<ギャップの一覧>

## Tasks
<各ギャップの修正タスク>
```

---

## Step 4: 完了報告

```
## Gap Closure Plans 作成完了

<N> 件のギャップに対して <M> 件のプランを作成しました。

## ▶ Next Up

/gsd:execute-phase <NN>
```

---

## 完了条件チェックリスト

- [ ] ギャップの収集（VERIFICATION.md・UAT.md から）
- [ ] ギャップをカテゴリ・優先度でグループ化
- [ ] 各グループに対してギャップクローズ用 PLAN.md 作成
- [ ] 完了報告（次のコマンド提示）
