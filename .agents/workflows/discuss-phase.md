---
description: Gather phase context through adaptive questioning before planning
argument-hint: "<phase-number>"
---

# /gsd:discuss-phase — Antigravity 版

> GSD 本体（`get-shit-done/workflows/discuss-phase.md`）を `gsd-tools` CLI なしで実行できる手順。
> CONTEXT.md を作成し、計画前にユーザーの意図を深く理解する。

---

## Step 1: フェーズ情報の確認

```bash
ls .planning/phases/ | grep "^<NN>-"
```

ROADMAP.md から当該フェーズの Goal を読む。
既存の CONTEXT.md がある場合は内容を確認。

---

## Step 2: 質問セッション

フェーズの Goal を提示して、ユーザーに設計意図を深掘り:

**基本質問:**
1. このフェーズで最も重要なことは何ですか？
2. ユーザーはどんな体験を期待していますか？
3. 技術的な制約や好みはありますか？
4. 「これだけは絶対避けたい」ものはありますか？

**追加質問（回答に応じて選択）:**
- 似たサービスで好きなUX/APIはありますか？
- 将来の拡張を考慮する必要がありますか？
- パフォーマンス・セキュリティの優先度は？

十分な情報が集まったらStep 3へ。

---

## Step 3: CONTEXT.md 作成

`.planning/phases/<NN>-*/<NN>-CONTEXT.md` を作成:

```markdown
# Phase <NN> Context

## User Intent
<ユーザーが最も重視すること>

## Design Preferences
- <UX/技術的な好み>
- <避けたいこと>

## Key Constraints
- <制約1>
- <制約2>

## Open Questions
- <まだ決まっていない事項>（なければ「None」）

## Inspiration / References
- <参考にするサービス・実装>（なければ省略）
```

```bash
git add .planning/phases/<NN>-*/<NN>-CONTEXT.md
git commit -m "docs(phase-<NN>): add phase context"
```

---

## Step 4: 完了報告

```
✅ Phase <NN> のコンテキストを収集しました

## ▶ Next Up

/gsd:plan-phase <NN>
```

---

## 完了条件チェックリスト

- [ ] フェーズ情報（ROADMAP.md の Goal）を確認
- [ ] 設計意図について深掘り質問
- [ ] CONTEXT.md 作成（Intent/Preferences/Constraints）
- [ ] git commit
- [ ] 完了報告（次のコマンド提示）
