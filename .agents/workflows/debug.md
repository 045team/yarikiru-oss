---
description: Systematic debugging with persistent state across context resets
argument-hint: "[issue description]"
---

# /gsd:debug — Antigravity 版

> 問題を体系的にデバッグし、セッションをまたいで状態を保持する。

---

## Step 1: デバッグセッション初期化

```bash
mkdir -p .planning/debug/
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DEBUG_FILE=".planning/debug/${TIMESTAMP}-<slug>.md"
```

`.planning/debug/<timestamp>-<slug>.md` を作成:

```markdown
---
status: active
created: <ISO timestamp>
updated: <ISO timestamp>
issue: "<問題の説明>"
---

# Debug: <問題の説明>

## Symptoms
<観察された症状・エラーメッセージ>

## Hypotheses
- [ ] <仮説1>
- [ ] <仮説2>

## Investigation Log

### <timestamp>
<調査内容・結果>

## Root Cause
[TBD]

## Fix
[TBD]
```

---

## Step 2: 仮説の立案

問題を分析して仮説をリスト:
1. 最も可能性が高いもの順に並べる
2. 各仮説に対して確認方法を明示

---

## Step 3: 体系的な調査

各仮説を検証:

```bash
# 関連ファイル・ログを確認
cat <relevant-file>
git log --oneline -10
```

調査結果をデバッグファイルに記録（status が `active` の間は継続）。

---

## Step 4: 根本原因の特定と修正

根本原因が判明したら:
1. デバッグファイルの `Root Cause` を記述
2. 修正を実施
3. 修正内容を `Fix` に記録
4. status を `resolved` に更新

```bash
git add <fixed-files>
git commit -m "fix: <問題の説明>"
```

---

## セッション再開時

```bash
ls .planning/debug/ | grep -v resolved
cat .planning/debug/<active-session>.md
```

→ Investigation Log から続きの調査を再開

---

## 完了条件チェックリスト

- [ ] デバッグファイル作成（問題・症状を記録）
- [ ] 仮説をリスト（可能性順）
- [ ] 各仮説を体系的に検証
- [ ] 根本原因を特定
- [ ] 修正を実施・コミット
- [ ] デバッグファイルを resolved に更新
