---
description: Research how to implement a phase (standalone)
argument-hint: "<phase-number>"
---

# /gsd:research-phase — Antigravity 版

> `plan-phase` の調査フェーズを単独実行する（通常は `plan-phase` に含まれる）。

---

## Step 1: フェーズ情報確認

ROADMAP.md から対象フェーズの Goal を読む。
関連するコードファイルを確認して現状を把握。

---

## Step 2: リサーチ実施

以下の観点で調査:

| 観点 | 確認事項 |
|------|---------|
| Stack | 必要なライブラリ・バージョン |
| Patterns | 既存コードベースのパターン |
| Architecture | 変更の影響範囲 |
| Pitfalls | よくある落とし穴・注意事項 |

---

## Step 3: RESEARCH.md 作成

`.planning/phases/<NN>-*/<NN>-RESEARCH.md` を作成:

```markdown
# Phase <NN> Research

## Technical Requirements
- <必要な技術・ライブラリ（バージョン付き）>

## Existing Patterns
- <現在のコードベースで使われているパターン>

## Recommended Approach
- <推奨する実装方針>

## Architecture Impact
- <変更が影響するファイル・コンポーネント>

## Watch Out For
- <落とし穴・注意点>

## Confidence
- Stack: High/Medium/Low
- Approach: High/Medium/Low
```

```bash
git add .planning/phases/<NN>-*/<NN>-RESEARCH.md
git commit -m "docs(phase-<NN>): add phase research"
```

---

## 完了条件チェックリスト

- [ ] フェーズ情報（ROADMAP.md の Goal）確認
- [ ] 4観点（Stack/Patterns/Architecture/Pitfalls）で調査
- [ ] RESEARCH.md 作成・コミット
- [ ] 次のコマンド提示（`/gsd:plan-phase <NN>`）
