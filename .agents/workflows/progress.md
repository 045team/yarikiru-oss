---
description: Check project progress, show context, and route to next action
argument-hint: ""
---

# /gsd:progress — Antigravity 版

> GSD 本体（`get-shit-done/workflows/progress.md`）を `gsd-tools` CLI なしで実行できる手順。

---

## Step 1: コンテキスト読み込み

```bash
# .planning/ が存在するか確認
ls .planning/ 2>/dev/null
```

存在しない場合: 「`/gsd:new-project` でプロジェクトを初期化してください」

読み込むファイル:
- `.planning/ROADMAP.md`
- `.planning/PROJECT.md`（存在する場合）

---

## Step 2: 進捗集計

```bash
# 各フェーズのPLAN.md/SUMMARY.md を数える
for dir in .planning/phases/*/; do
  plans=$(ls "$dir"/*-PLAN.md 2>/dev/null | wc -l)
  summaries=$(ls "$dir"/*-SUMMARY.md 2>/dev/null | wc -l)
  echo "$dir: $plans plans, $summaries summaries"
done

# 最新のSUMMARY.mdを確認
ls -t .planning/phases/*/*-SUMMARY.md 2>/dev/null | head -3
```

---

## Step 3: 進捗レポート表示

```
# <Project Name>

**Progress:** [██████░░░░] XX% (<完了フェーズ>/<全フェーズ>)

## Recent Work
- Phase <N>, Plan <M>: <SUMMARY.md の one-liner>
- Phase <N>, Plan <M>: <SUMMARY.md の one-liner>

## Current Position
Phase <N> of <total>: <phase-name>
Plan <M> of <phase-total>: <status>

## What's Next
<次にすべきこと>
```

---

## Step 4: ルーティング

フェーズのファイル数を確認してルーティング:

| 状況 | ルーティング |
|------|------------|
| UAT gaps あり（`<NN>-UAT.md` status=diagnosed） | Route E: `/gsd:plan-phase <NN> --gaps` |
| PLAN < SUMMARY（未実行プランあり） | Route A: `/gsd:execute-phase <NN>` |
| PLAN = 0（フェーズ未計画） | Route B: `/gsd:plan-phase <NN>` |
| PLAN = SUMMARY（フェーズ完了）→ 次フェーズあり | Route C: 次フェーズへ |
| PLAN = SUMMARY（全フェーズ完了） | Route D: `/gsd:complete-milestone` |

**表示フォーマット:**
```
---

## ▶ Next Up

**<アクション>**

`/gsd:<command> <phase>`

`/clear` してから実行してください

---
```

---

## 完了条件チェックリスト

- [ ] .planning/ の存在確認
- [ ] ROADMAP.md から全フェーズを把握
- [ ] PLAN.md/SUMMARY.md の数を集計
- [ ] 進捗レポートを表示（Recent Work・Current Position・What's Next）
- [ ] 適切なルート（A/B/C/D/E）を判定して次のコマンドを提示
