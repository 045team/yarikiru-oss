---
description: Switch model profile for GSD agents (quality/balanced/budget)
argument-hint: "<profile>"
---

# /gsd:set-profile — Antigravity 版

> モデルプロファイルを切り替えて `.planning/config.json` を更新する。

---

## プロファイル一覧

| プロファイル | 説明 |
|------------|------|
| `quality` | 最高品質・詳細な分析（時間・コスト増） |
| `balanced` | 品質とコストのバランス（推奨） |
| `budget` | 高速・低コスト（簡単なタスク向け） |

---

## 変更手順

引数に `quality` / `balanced` / `budget` のいずれかを指定:

```bash
cat .planning/config.json 2>/dev/null
```

`model_profile` フィールドを更新:

```json
{
  "model_profile": "<profile>"
}
```

```bash
git add .planning/config.json
git commit -m "chore: set model profile to <profile>"
```

---

## 完了条件チェックリスト

- [ ] 引数（プロファイル名）確認
- [ ] config.json の `model_profile` を更新
- [ ] git commit（commit_docs が true の場合）
- [ ] 変更内容を報告
