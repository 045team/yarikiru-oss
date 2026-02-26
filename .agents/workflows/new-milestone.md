---
description: Start a new milestone cycle — update PROJECT.md and route to requirements
argument-hint: "[milestone description]"
---

# /gsd:new-milestone — Antigravity 版

> 前のマイルストーン完了後、次のマイルストーンを計画する。

---

## Step 1: 前回マイルストーンの確認

```bash
ls .planning/archive/ 2>/dev/null
cat .planning/MILESTONES.md 2>/dev/null
cat .planning/PROJECT.md
```

ROADMAP.md が存在する場合: 「前のマイルストーンが完了していません。先に `/gsd:complete-milestone` を実行してください」

---

## Step 2: 次のマイルストーンを定義

ユーザーに確認:
```
「次のマイルストーンで何を達成したいですか？
前のマイルストーンから何が変わりましたか？」
```

---

## Step 3: PROJECT.md 更新

PROJECT.md の Requirements を更新:
- 前回 Validated → 引き継ぐ
- 新しい Active Requirements を追加
- 変化した Out of Scope を更新

```bash
git add .planning/PROJECT.md
git commit -m "docs: update project for new milestone"
```

---

## Step 4: 新 ROADMAP.md 作成

`.planning/ROADMAP.md` を新規作成（アーカイブ後は存在しない）:

```markdown
# <Project Name> Roadmap — <version>

## Phase 01: <最初のフェーズ>

**Goal:** <目的>

### Tasks
- [ ] 01-01: <タスク>
```

```bash
git add .planning/ROADMAP.md
git commit -m "docs: create new milestone roadmap"
```

---

## Step 5: 完了報告

```
✅ 新しいマイルストーンの準備完了

## ▶ Next Up

/gsd:discuss-phase 01
```

---

## 完了条件チェックリスト

- [ ] 前マイルストーンのアーカイブ確認
- [ ] 次のマイルストーン目標をヒアリング
- [ ] PROJECT.md の Requirements 更新
- [ ] 新 ROADMAP.md 作成
- [ ] git commit・完了報告
