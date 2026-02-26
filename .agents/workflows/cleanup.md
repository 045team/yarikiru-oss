---
description: Archive accumulated phase directories from completed milestones
argument-hint: ""
---

# /gsd:cleanup — Antigravity 版

> 完了したマイルストーンのフェーズディレクトリを整理する。

---

## Step 1: 状態確認

```bash
ls .planning/phases/
ls .planning/archive/ 2>/dev/null
```

---

## Step 2: クリーンアップ対象の特定

**対象：** 全タスクが `[x]` になっているフェーズで、かつ SUMMARY.md が存在するもの

完了フェーズを一覧表示:
```
以下のフェーズがアーカイブ済みです:
- Phase 01: <name> (SUMMARY.md あり)
- Phase 02: <name> (SUMMARY.md あり)

クリーンアップしますか？ [yes/no]
```

---

## Step 3: 実行

```bash
# 完了フェーズをアーカイブディレクトリへ移動
mkdir -p .planning/archive/phases/
mv .planning/phases/<NN>-<slug>/ .planning/archive/phases/

git add .planning/
git commit -m "chore: archive completed phase directories"
```

---

## 完了条件チェックリスト

- [ ] 完了フェーズ（SUMMARY.md あり）を特定
- [ ] ユーザー確認取得
- [ ] アーカイブへ移動
- [ ] git commit
