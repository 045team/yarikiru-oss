---
description: Insert urgent work as decimal phase (e.g., 72.1) between existing phases
argument-hint: "<after-phase-number> <description>"
---

# /gsd:insert-phase — Antigravity 版

> GSD 本体（`get-shit-done/workflows/insert-phase.md`）を `gsd-tools` CLI なしで実行できる手順。
> 緊急タスクを既存フェーズ間に小数フェーズ（例: 2.1）として挿入する。

---

## Step 1: 引数確認

引数: `<after-phase-number> <description>`

例: `/gsd:insert-phase 2 Fix critical auth bug`
→ Phase 2.1 として挿入

---

## Step 2: 小数フェーズ番号の決定

```bash
# 対象フェーズ以降の小数フェーズを確認
ls .planning/phases/ | grep "^<N>\."
```

次の小数フェーズ番号 = `<N>.1`, `<N>.2`, ... の次

---

## Step 3: フェーズディレクトリ作成

```bash
SLUG=$(echo "<説明>" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')
mkdir -p ".planning/phases/<N.M>-${SLUG}"
```

---

## Step 4: ROADMAP.md に挿入

Phase `<N>` の直後（Phase `<N+1>` の前）に追記:

```markdown
---

## Phase <N.M>: <説明>

**Goal:** <緊急タスクの目的>
**Priority:** URGENT — inserted between Phase <N> and Phase <N+1>

### Tasks
- [ ] <N.M>-01: <タスク>
```

---

## Step 5: 完了報告

```
Phase <N.M> を Phase <N> と Phase <N+1> の間に挿入しました:
- 説明: <説明>
- ディレクトリ: .planning/phases/<N.M>-<slug>/

## ▶ Next Up

/gsd:plan-phase <N.M>
```

---

## 完了条件チェックリスト

- [ ] 引数（挿入位置・説明）確認
- [ ] 小数フェーズ番号決定（重複なし）
- [ ] フェーズディレクトリ作成
- [ ] ROADMAP.md の正しい位置に挿入
- [ ] 完了報告
