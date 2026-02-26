---
description: List pending todos and select one to work on
argument-hint: ""
---

# /gsd:check-todos — Antigravity 版

> GSD 本体（`get-shit-done/workflows/check-todos.md`）を `gsd-tools` CLI なしで実行できる手順。

---

## Step 1: TODO 一覧取得

```bash
ls .planning/todos/pending/ 2>/dev/null
```

存在しない場合: 「保留中のTODOはありません」

---

## Step 2: TODO 内容の表示

各ファイルを読んでリスト表示:

```
## 保留中のTODO

| # | 説明 | 優先度 | 作成日 |
|---|------|--------|--------|
| 1 | <説明> | normal | <date> |
| 2 | <説明> | high | <date> |

対応するTODOの番号を入力するか、「skip」でスキップ:
```

---

## Step 3: 選択したTODOへのルーティング

ユーザーが番号を選択:
- 実装が必要なTODO → `/gsd:quick <説明>` を提案
- フェーズへの追加が必要なTODO → `/gsd:add-phase <説明>` を提案
- 情報収集が必要なTODO → 直接対話

選択されたTODOを `done/` に移動（または削除）:
```bash
mv .planning/todos/pending/<file> .planning/todos/done/<file>
```

---

## 完了条件チェックリスト

- [ ] pending/ ディレクトリのTODOを全て読み込み
- [ ] TODOリストをテーブルで表示
- [ ] ユーザーの選択に応じた次のアクションを提案
- [ ] 対応済みTODOをdone/へ移動
