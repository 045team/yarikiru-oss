---
description: Archive completed milestone and prepare for next version
argument-hint: "[vX.Y]"
---

# /gsd:complete-milestone — Antigravity 版

> GSD 本体（`get-shit-done/workflows/complete-milestone.md`）を `gsd-tools` CLI なしで実行できる手順。
> 全フェーズ完了後、マイルストーンをアーカイブして次のサイクルへ準備する。

---

## Step 1: 完了確認

```bash
# 全フェーズのPLAN/SUMMARY対応確認
for plan in .planning/phases/*/*-PLAN.md; do
  summary="${plan/PLAN/SUMMARY}"
  [ ! -f "$summary" ] && echo "未完了: $plan"
done
```

未完了のプランがある場合: 「未完了のフェーズがあります。先に実行してください」

---

## Step 2: バージョン番号決定

引数にバージョンが指定されていない場合は確認:
```
現在のマイルストーンのバージョン番号を教えてください（例: v1.0）:
```

---

## Step 3: MILESTONES.md 更新

`.planning/MILESTONES.md` に完了したマイルストーンを記録（存在しない場合は作成）:

```markdown
# Milestones

## <version>: <milestone description>
**Completed:** <date>

### Phases
- Phase 01: <name> — <one-liner from SUMMARY.md>
- Phase 02: <name> — <one-liner from SUMMARY.md>

### Key Achievements
- <主要な成果>

### Learnings
- <次回に活かすこと>
```

---

## Step 4: アーカイブ

```bash
# アーカイブディレクトリ作成
mkdir -p ".planning/archive/<version>"

# ROADMAP.mdをアーカイブ
cp .planning/ROADMAP.md ".planning/archive/<version>/ROADMAP.md"

# フェーズをアーカイブ
cp -r .planning/phases/ ".planning/archive/<version>/phases/"
```

---

## Step 5: 現在の .planning/ をリセット

```bash
# phaseディレクトリをクリア（ARCHIVEに保存済み）
rm -rf .planning/phases/
mkdir -p .planning/phases/

# ROADMAP.mdを削除（次のマイルストーンで新規作成）
rm .planning/ROADMAP.md
```

---

## Step 6: コミット

```bash
git add .planning/
git commit -m "docs(<version>): complete milestone and archive"
```

---

## Step 7: 完了報告

```
🎉 Milestone <version> 完了・アーカイブ

アーカイブ: .planning/archive/<version>/
MILESTONES.md: 更新済み

## ▶ Next Up

/gsd:new-milestone  （次のマイルストーンを計画）
```

---

## 完了条件チェックリスト

- [ ] 全フェーズの SUMMARY.md 存在確認
- [ ] バージョン番号決定
- [ ] MILESTONES.md 更新
- [ ] アーカイブ（.planning/archive/<version>/）
- [ ] .planning/phases/ と ROADMAP.md をクリア
- [ ] git commit
- [ ] 完了報告
