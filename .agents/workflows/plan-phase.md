---
description: Create detailed phase plan (PLAN.md) with research and verification loop
argument-hint: "<phase-number> [--skip-research] [--gaps]"
---

# /gsd:plan-phase — Antigravity 版

> GSD 本体（`get-shit-done/workflows/plan-phase.md`）を `gsd-tools` CLI なしで実行できる手順。

---

## Step 1: フェーズの特定

```bash
ls .planning/phases/ | grep "^<NN>-"
ls .planning/phases/<NN>-*/*.md 2>/dev/null
```

読み込むファイル:
- `.planning/ROADMAP.md` — フェーズのGoal/Tasks確認
- `.planning/PROJECT.md` — プロジェクト方針
- `.planning/phases/<NN>-*/<NN>-CONTEXT.md` — ユーザー設計意図（存在する場合）
- `.planning/phases/<NN>-*/<NN>-RESEARCH.md` — 調査結果（存在する場合）
- `.planning/phases/<NN>-*/<NN>-VERIFICATION.md` — ギャップ情報（`--gaps` 時）

**CONTEXT.md が存在しない場合：** ユーザーに確認
```
「Phase {N} の CONTEXT.md が見つかりません。
設計方針を先に整理しますか？
→ /gsd:discuss-phase {N} を実行するか、このまま進むか選んでください」
```

---

## Step 2: リサーチ（`--skip-research` がなければ実施）

`--gaps` フラグがある場合はスキップ。既存 RESEARCH.md がある場合もスキップ（`--research` フラグで強制再実施）。

自分でリサーチを実施:
1. フェーズのGoalから実装に必要な技術要件を調査
2. ROADMAP.md・PROJECT.md から制約を把握
3. コードベースの現状（関連ファイル）を確認

**RESEARCH.md 作成:**
```markdown
# Phase <NN> Research

## Technical Requirements
- <実装に必要な技術・ライブラリ>

## Key Findings
- <重要な発見・制約>

## Recommended Approach
- <推奨する実装方針>

## Watch Out For
- <落とし穴・注意事項>
```

---

## Step 3: PLAN.md 作成

フォーマット: `.planning/phases/<NN>-*/<NN>-PLAN.md`

```markdown
---
phase: <NN>
plan: <NN>-<MM>
wave: 1
autonomous: true
objective: "<フェーズのGoalを1文で>  "
files_modified: []
dependencies: []
---

# Phase <NN>: <Name> — Plan <MM>: <Plan Name>

## Objective
<何を実現するか、なぜ必要か>

## Context
<CONTEXT.md / RESEARCH.md から抽出した重要な設計方針>

## Tasks

<task number="1" type="auto">
### <タスク名>
**Files:** `<対象ファイル>`
**Action:** <具体的な実装内容>
**Verify:** <完了確認方法>
**Done:** <完了条件>
</task>

<task number="2" type="auto">
...
</task>

## Verification
- [ ] <Definition of Done の各条件>

## must_haves
- truth: "<達成すべき成果>"
  artifacts: ["<確認ファイル>"]
```

---

## Step 4: PLAN.md の品質チェック

自己レビュー:
- [ ] 全タスクにファイル・アクション・完了条件が明示されている
- [ ] タスクは独立した原子単位になっている
- [ ] ROADMAP.md の Goal に直結している
- [ ] `must_haves` が Goal から逆算されている
- [ ] フェーズの依存関係が反映されている

問題があれば修正してから次へ。

---

## Step 5: 完了報告

```
## Phase <NN>: <Name> PLANNED ✓

**Plan:** <NN>-PLAN.md
**Tasks:** <N> タスク

## ▶ Next Up

/gsd:execute-phase <NN>
```

---

## 完了条件チェックリスト

- [ ] ROADMAP.md で該当フェーズのGoal・Tasksを確認
- [ ] CONTEXT.md を確認（なければユーザーに通知）
- [ ] リサーチ実施（または既存RESEARCH.mdを確認）
- [ ] PLAN.md 作成（frontmatter + Tasks + must_haves）
- [ ] 品質チェック通過
- [ ] 完了報告（次のコマンド提示）
