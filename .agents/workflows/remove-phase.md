---
description: Remove a future phase from roadmap and renumber subsequent phases
argument-hint: "<phase-number>"
---

# /gsd:remove-phase — Antigravity 版

> GSD 本体（`get-shit-done/workflows/remove-phase.md`）を `gsd-tools` CLI なしで実行できる手順。

---

## Step 1: 引数確認・安全チェック

```bash
ls .planning/phases/ | grep "^<NN>-"
```

**実行前の安全チェック:**
- 対象フェーズの SUMMARY.md が存在する場合（実行済み）: **削除不可**、エラーを表示
- PLAN.md のみ存在する場合: 確認を取ってから削除

---

## Step 2: ユーザー確認

```
⚠️  Phase <NN> (<名前>) を削除しようとしています。

- ディレクトリ: .planning/phases/<NN>-<slug>/ を削除（内容ごと）
- ROADMAP.md: Phase <NN> のエントリを削除

続けますか？ [yes/no]
```

---

## Step 3: 削除実行（yesの場合）

```bash
# ディレクトリ削除
rm -rf .planning/phases/<NN>-<slug>/
```

ROADMAP.md から Phase `<NN>` のセクションを削除。

---

## Step 4: 完了報告

```bash
git add .planning/ROADMAP.md
git commit -m "docs: remove phase <NN>"
```

```
Phase <NN> を削除しました。

現在のロードマップ:
<残りのフェーズ一覧>
```

---

## 完了条件チェックリスト

- [ ] 対象フェーズの存在確認
- [ ] 実行済み（SUMMARY.md あり）フェーズは削除拒否
- [ ] ユーザー確認取得
- [ ] ディレクトリ削除
- [ ] ROADMAP.md からエントリ削除
- [ ] git commit・完了報告
