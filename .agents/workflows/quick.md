---
description: Execute a quick task with GSD guarantees (atomic commits, state tracking)
argument-hint: "<task description> [--full]"
---

# /gsd:quick — Antigravity 版

> GSD 本体（`get-shit-done/workflows/quick.md`）を `gsd-tools` CLI なしで実行できる手順。
> 小規模なアドホックタスクを GSD 保証付き（原子コミット・状態追跡）で実行する。

---

## Step 1: タスク説明の取得

引数からタスク説明を取得。空の場合はユーザーに確認:
```
「何をしたいですか？」
```

`--full` フラグがある場合: プラン検証 + 実行後検証を追加

---

## Step 2: ディレクトリ準備

```bash
# 既存のquickタスク数を数えて次の番号を決定
ls .planning/quick/ 2>/dev/null | grep -E "^[0-9]+" | wc -l
# → 次の番号 = 現在数 + 1（3桁ゼロ埋め: 001, 002...）

mkdir -p ".planning/quick/<NNN>-<slug>"
```

スラッグ生成: タスク説明を小文字・ハイフン区切り・40文字以内に変換

---

## Step 3: PLAN.md 作成

`.planning/quick/<NNN>-<slug>/<NNN>-PLAN.md` を作成:

```markdown
---
type: quick
description: "<タスク説明>"
must_haves:
  - truth: "<達成すべき成果>"
    artifacts: ["<確認ファイル>"]
---

# Quick Task <NNN>: <説明>

## Objective
<タスク説明と期待成果>

## Tasks

<task number="1" type="auto">
### <タスク名>
**Files:** `<対象ファイル>`
**Action:** <具体的な実装内容>
**Verify:** <完了確認方法>
**Done:** <完了条件>
</task>
```

タスクは1〜3個に絞る（quickタスクの原則）。

---

## Step 4: 実装

各タスクを実行し、タスクごとに原子コミット:

```bash
git add <specific files>
git commit -m "feat(quick-<NNN>): <description>"
```

---

## Step 5: SUMMARY.md 作成

`.planning/quick/<NNN>-<slug>/<NNN>-SUMMARY.md` を作成:

```markdown
# Quick Task <NNN>: <説明> — Summary

<タスクでやったこと（具体的に）>

## Completed
- [タスク1] → commit: <hash>

## Deviations
None

## Issues Encountered
None
```

---

## Step 6: STATE.md 更新

`.planning/STATE.md` の「Quick Tasks Completed」テーブルに記録:

```markdown
### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| <NNN> | <説明> | <date> | <hash> | [<NNN>-<slug>](.planning/quick/<NNN>-<slug>/) |
```

---

## Step 7: 最終コミットと完了報告

```bash
git add .planning/quick/<NNN>-<slug>/<NNN>-PLAN.md
git add .planning/quick/<NNN>-<slug>/<NNN>-SUMMARY.md
git add .planning/STATE.md
git commit -m "docs(quick-<NNN>): <description>"
```

```
✅ Quick Task <NNN> 完了

Summary: .planning/quick/<NNN>-<slug>/<NNN>-SUMMARY.md
Commit: <hash>
```

---

## 完了条件チェックリスト

- [ ] タスク説明を取得
- [ ] ディレクトリ作成（次番号 + スラッグ）
- [ ] PLAN.md 作成（1〜3タスク）
- [ ] 各タスクを実装し原子コミット
- [ ] SUMMARY.md 作成
- [ ] STATE.md の Quick Tasks テーブルに記録
- [ ] 最終コミット
- [ ] 完了報告
