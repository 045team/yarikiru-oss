---
description: Capture idea or task as todo from current conversation context
argument-hint: "<todo description>"
---

# /gsd:add-todo — Antigravity 版

> GSD 本体（`get-shit-done/workflows/add-todo.md`）を `gsd-tools` CLI なしで実行できる手順。

---

## Step 1: TODO 内容取得

引数からTODO説明を取得。空の場合はユーザーに確認。

---

## Step 2: TODO ファイル作成

```bash
mkdir -p .planning/todos/pending
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
```

`.planning/todos/pending/<TIMESTAMP>-<slug>.md` を作成:

```markdown
---
status: pending
created: <ISO timestamp>
priority: normal
---

# <TODO説明>

## Context
<現在の会話コンテキストから抽出した背景>

## When to address
<どのフェーズで対応すべきか、または「随時」>
```

---

## Step 3: STATE.md 更新（オプション）

`.planning/STATE.md` に Pending Todos のカウントを更新（存在する場合）。

---

## Step 4: 確認

```
✅ TODO を記録しました: <説明>
ファイル: .planning/todos/pending/<TIMESTAMP>-<slug>.md

確認: /gsd:check-todos
```

---

## 完了条件チェックリスト

- [ ] TODO内容取得
- [ ] .planning/todos/pending/ ディレクトリ確認・作成
- [ ] タイムスタンプ付きTODOファイル作成
- [ ] 確認メッセージ表示
