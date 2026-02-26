---
description: Resume work from previous session with full context restoration
argument-hint: ""
---

# /gsd:resume-work — Antigravity 版

> GSD 本体（`get-shit-done/workflows/resume-project.md`）を `gsd-tools` CLI なしで実行できる手順。
> 「どこまでやったっけ？」に即座に完全な答えを出す。

---

## Step 1: .planning/ の存在確認

```bash
ls .planning/ 2>/dev/null
```

存在しない場合: 「`.planning/` が見つかりません。`/gsd:new-project` で初期化してください」

---

## Step 2: 状態読み込み

以下を読み込む（存在するもの全て）:
- `.planning/ROADMAP.md`
- `.planning/PROJECT.md`

---

## Step 3: 未完了作業の検出

```bash
# PLANに対するSUMMARYの欠如（未実行プラン）
for plan in .planning/phases/*/*-PLAN.md; do
  summary="${plan/PLAN/SUMMARY}"
  [ ! -f "$summary" ] && echo "未完了: $plan"
done 2>/dev/null

# continue-here ファイル（中断ポイント）
ls .planning/phases/*/.continue-here*.md 2>/dev/null
```

---

## Step 4: 状態表示

```
╔══════════════════════════════════════════════════════════════╗
║  プロジェクト状態                                             ║
╠══════════════════════════════════════════════════════════════╣
║  目標: <PROJECT.md の one-liner>                              ║
║                                                               ║
║  Phase: <N> of <total> — <phase name>                        ║
║  進捗: [██████░░░░] XX%                                      ║
║                                                               ║
║  最終更新: <最新SUMMARY.mdの日付>                             ║
╚══════════════════════════════════════════════════════════════╝

[未完了作業がある場合:]
⚠️  未完了の作業:
    - <未完了プランのパス>
```

---

## Step 5: 次のアクションを提案

状態に基づいてルーティング:

| 状態 | 提案 |
|------|------|
| 未実行プランがある | `/gsd:execute-phase <NN>` |
| フェーズ計画がない | `/gsd:plan-phase <NN>` |
| フェーズ完了・次フェーズあり | `/gsd:discuss-phase <NN+1>` |
| 全フェーズ完了 | `/gsd:complete-milestone` |

```
## ▶ 次のアクション

<アクション説明>

`/gsd:<command> <phase>`

`/clear` してから実行してください
```

---

## 完了条件チェックリスト

- [ ] .planning/ の存在確認
- [ ] ROADMAP.md・PROJECT.md の読み込み
- [ ] 未完了作業の検出（PLAN なのに SUMMARY なし）
- [ ] 状態をボックス形式で表示
- [ ] 状態に応じた次のアクションを提案
