---
description: Create context handoff when pausing work mid-phase
argument-hint: ""
---

# /gsd:pause-work — Antigravity 版

> GSD 本体（`get-shit-done/workflows/pause-work.md`）を `gsd-tools` CLI なしで実行できる手順。

---

## Step 1: 現在の状態収集

読み込む:
- `.planning/ROADMAP.md` — 現在のフェーズ・タスク状況
- 実行中のフェーズの PLAN.md

```bash
# 未完了タスクの確認
for plan in .planning/phases/*/*-PLAN.md; do
  summary="${plan/PLAN/SUMMARY}"
  [ ! -f "$summary" ] && echo "未完了: $plan"
done 2>/dev/null
```

---

## Step 2: PAUSE.md 作成

`.planning/phases/<NN>-*/.continue-here-<timestamp>.md` を作成:

```markdown
---
paused_at: <ISO timestamp>
phase: <NN>
---

# Pause Point — Phase <NN>: <Name>

## Where We Left Off
<現在どのタスクまで完了しているか>

## Next Action
<再開時に最初にすべきこと（具体的に）>

## Completed Since Last Commit
- <完了したタスク>

## In Progress
- <途中のタスク・ファイル>

## Context Notes
<再開時に重要な情報>

## Commands to Resume
```bash
/gsd:resume-work
```
```

---

## Step 3: 変更のコミット

```bash
# 未コミットの変更を確認
git status

# 途中のファイルをコミット（WIPとして）
git add <変更ファイル>
git commit -m "wip(phase-<NN>): pause at <現在のタスク>"
```

---

## Step 4: 完了報告

```
✅ 作業を一時停止しました

再開方法: /gsd:resume-work

Pause ファイル: .planning/phases/<NN>-.continue-here-<timestamp>.md
```

---

## 完了条件チェックリスト

- [ ] 現在の進捗状況を把握
- [ ] .continue-here ファイル作成（次のアクションを明記）
- [ ] 変更をWIPコミット
- [ ] 再開方法を表示
