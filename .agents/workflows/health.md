---
description: Diagnose planning directory health and optionally repair issues
argument-hint: ""
---

# /gsd:health — Antigravity 版

> GSD 本体（`get-shit-done/workflows/health.md`）を `gsd-tools` CLI なしで実行できる手順。

---

## Step 1: 構造チェック

```bash
# 必須ファイル・ディレクトリの確認
ls .planning/ 2>/dev/null
ls .planning/ROADMAP.md 2>/dev/null
ls .planning/PROJECT.md 2>/dev/null
ls .planning/phases/ 2>/dev/null
```

---

## Step 2: フェーズ整合性チェック

```bash
# PLANとSUMMARYの対応確認
for dir in .planning/phases/*/; do
  phase=$(basename "$dir")
  plans=$(ls "$dir"*-PLAN.md 2>/dev/null | wc -l | tr -d ' ')
  summaries=$(ls "$dir"*-SUMMARY.md 2>/dev/null | wc -l | tr -d ' ')
  echo "$phase: $plans plans, $summaries summaries"
done

# ROADMAP.mdに記載があるが、ディレクトリがないフェーズを確認
grep -E "^## Phase" .planning/ROADMAP.md 2>/dev/null
```

---

## Step 3: 診断レポート表示

```
## 🏥 Planning Health Report

### ファイル状態
- PROJECT.md: ✅ / ❌
- ROADMAP.md: ✅ / ❌
- phases/: ✅ / ❌

### フェーズ整合性
| Phase | Plans | Summaries | Status |
|-------|-------|-----------|--------|
| 01-xxx | 2 | 2 | ✅ Complete |
| 02-xxx | 1 | 0 | ⚠️  In Progress |
| 03-xxx | 0 | 0 | 📋 Not Started |

### 問題
- <問題があれば記載>
- なければ「問題なし」

### 全体ステータス
✅ Healthy / ⚠️ Issues Found / ❌ Critical
```

---

## Step 4: 修復提案（問題があれば）

| 問題 | 修復方法 |
|------|---------|
| PLAN なし SUMMARY あり | SUMMARY を確認してPLANを再構築するか削除 |
| ROADMAP に記載なし・ディレクトリあり | ROADMAP.md に追記 |
| 空のフェーズディレクトリ | `/gsd:plan-phase <N>` で計画 |

修復が必要な場合は実行前にユーザー確認を取る。

---

## 完了条件チェックリスト

- [ ] 必須ファイル・ディレクトリの存在確認
- [ ] 各フェーズのPLAN/SUMMARY整合性チェック
- [ ] ROADMAPとディレクトリの整合性チェック
- [ ] 診断レポートを表示
- [ ] 問題があれば修復提案（実行前に確認）
