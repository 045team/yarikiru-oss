---
description: Analyze codebase with parallel mapper agents to produce .planning/codebase/ documents
argument-hint: ""
---

# /gsd:map-codebase — Antigravity 版

> コードベースの全体構造を分析して `.planning/codebase/` に文書化する。
> 既存プロジェクトへの参入時や大規模リファクタリング前に実行する。

---

## Step 1: 事前確認

```bash
ls .planning/codebase/ 2>/dev/null
# 既存のマップがあれば内容を確認して上書きするか確認
```

---

## Step 2: コードベース全体スキャン

```bash
# ディレクトリ構造の把握
find . -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" 2>/dev/null | grep -v node_modules | grep -v .next | head -100

# package.json の依存関係
cat package.json 2>/dev/null

# 設定ファイルの確認
ls *.config.* tsconfig.json .env.example 2>/dev/null
```

---

## Step 3: 分析ドキュメント作成

```bash
mkdir -p .planning/codebase/
```

**ARCHITECTURE.md:**
```markdown
# Codebase Architecture

## Overview
<システム全体の説明>

## Key Components
| Component | Path | Responsibility |
|-----------|------|----------------|
| <名前> | `src/...` | <役割> |

## Data Flow
<データの流れをテキストで図示>

## External Dependencies
<主要な外部サービス・API>
```

**STACK.md:**
```markdown
# Tech Stack

## Runtime
- <言語・バージョン>

## Framework
- <フレームワーク・バージョン>

## Key Libraries
| Library | Version | Purpose |
|---------|---------|---------|
| <名前> | <ver> | <用途> |
```

---

## Step 4: コミット

```bash
git add .planning/codebase/
git commit -m "docs: add codebase map"
```

---

## 完了条件チェックリスト

- [ ] ディレクトリ構造・ファイル数を把握
- [ ] package.json から依存関係を把握
- [ ] ARCHITECTURE.md 作成（コンポーネント・データフロー）
- [ ] STACK.md 作成（言語・フレームワーク・主要ライブラリ）
- [ ] git commit
- [ ] 完了報告（`/gsd:new-project` または `plan-phase` への誘導）
