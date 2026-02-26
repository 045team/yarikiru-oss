---
description: Add phase to end of current milestone in roadmap
argument-hint: "<phase description>"
---

# /gsd:add-phase — Antigravity 版

> GSD 本体（`get-shit-done/workflows/add-phase.md`）を `gsd-tools` CLI なしで実行できる手順。

---

## Step 1: 引数確認

引数（フェーズ説明）が空の場合:
```
エラー: フェーズ説明が必要です
使い方: /gsd:add-phase <説明>
例: /gsd:add-phase Add authentication system
```

---

## Step 2: 現在の最大フェーズ番号を確認

```bash
ls .planning/phases/ | grep -E "^[0-9]+" | sed 's/-.*//' | sort -n | tail -1
```

ROADMAP.md からも確認して最大フェーズ番号を特定。

次のフェーズ番号 = max + 1（2桁ゼロ埋め: 01, 02...）

---

## Step 3: フェーズディレクトリ作成

```bash
# スラッグ生成（説明を小文字・ハイフン区切り）
SLUG=$(echo "<説明>" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')
mkdir -p ".planning/phases/<NN>-${SLUG}"
```

---

## Step 4: ROADMAP.md に追記

ROADMAP.md の最後のフェーズの後に追加:

```markdown
---

## Phase <NN>: <説明>

**Goal:** <ユーザーの説明から目的を推測>

### Tasks
- [ ] <NN>-01: <最初のタスク（検討中）>
```

---

## Step 5: 完了報告

```
Phase <NN> をマイルストーンに追加しました:
- 説明: <説明>
- ディレクトリ: .planning/phases/<NN>-<slug>/
- ステータス: 未計画

---

## ▶ Next Up

/gsd:plan-phase <NN>
```

---

## 完了条件チェックリスト

- [ ] 引数（フェーズ説明）を確認
- [ ] 現在の最大フェーズ番号を確認
- [ ] フェーズディレクトリ作成
- [ ] ROADMAP.md に新フェーズエントリを追記
- [ ] 完了報告（次のコマンド提示）
