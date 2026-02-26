---
description: Initialize a new project with deep context gathering and PROJECT.md
argument-hint: "[--auto <idea>]"
---

# /gsd:new-project — Antigravity 版

> GSD 本体（`get-shit-done/workflows/new-project.md`）を `gsd-tools` CLI なしで実行できる手順。

---

## Step 1: 事前チェック

```bash
ls .planning/ 2>/dev/null
```

`.planning/` が既に存在する場合: 「既にプロジェクトが初期化されています。`/gsd:progress` を使ってください」

```bash
# gitが初期化されているか確認
ls .git/ 2>/dev/null || git init
```

---

## Step 2: 何を作るか（深掘り質問）

`--auto` フラグがある場合は提供されたドキュメントから自動で把握してStep 4へ。

インタラクティブモード:
「**何を作りたいですか？**」

回答を受け取り、以下について掘り下げ質問:
- 解決したい問題は何か
- ユーザーはだれか
- 既存の類似サービスとの違いは
- 絶対に必要な機能 vs あったらいいな
- 技術的な制約はあるか

「PROJECT.md を作成する準備ができました」と判断したらStep 4へ。

---

## Step 3: 設定確認

ユーザーに確認（または `--auto` ならデフォルト使用）:

| 項目 | 選択肢 | デフォルト |
|------|--------|---------|
| 作業深度 | quick / standard / comprehensive | standard |
| 並列実行 | yes / no | yes |
| Gitへのdoc追跡 | yes / no | yes |

---

## Step 4: PROJECT.md 作成

`.planning/PROJECT.md` を作成:

```markdown
# <Project Name>

## What This Is
<1〜2文でプロジェクトの本質>

## Core Value
<ユーザーに提供する一番大切な価値>

## Target Users
<想定するユーザー像>

## Requirements

### Active
- [ ] <必須機能1>
- [ ] <必須機能2>

### Out of Scope
- <除外する機能> — <理由>

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------| 
| <決定事項> | <理由> | — Pending |

## Constraints
- <技術的制約>
- <時間的制約>

---
*Last updated: <date> after initialization*
```

```bash
mkdir -p .planning
git add .planning/PROJECT.md
git commit -m "docs: initialize project"
```

---

## Step 5: ROADMAP.md 作成

PROJECT.md の内容から初期ロードマップを設計:

`.planning/ROADMAP.md` を作成:
```markdown
# <Project Name> Roadmap

## Phase 01: <基盤構築>

**Goal:** <最初に達成すべきこと>

### Tasks
- [ ] 01-01: <タスク>
- [ ] 01-02: <タスク>

---

## Phase 02: <次のフェーズ>
...
```

```bash
git add .planning/ROADMAP.md
git commit -m "docs: add initial roadmap"
```

---

## Step 6: 完了報告

```
✅ プロジェクト初期化完了

作成ファイル:
- .planning/PROJECT.md
- .planning/ROADMAP.md

## ▶ Next Up

/gsd:discuss-phase 01  （Phase 01 の詳細を設計）
または
/gsd:plan-phase 01      （すぐ計画を作成）
```

---

## 完了条件チェックリスト

- [ ] .planning/ の未存在を確認
- [ ] git の初期化（未初期化の場合）
- [ ] プロジェクトの詳細をヒアリング
- [ ] PROJECT.md 作成・コミット
- [ ] ROADMAP.md 作成（初期フェーズ）・コミット
- [ ] 完了報告（次のコマンド提示）
