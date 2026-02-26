---
description: Configure GSD workflow toggles and model profile
---

# /gsd:settings — Antigravity 版

> `.planning/config.json` 設定の確認と変更。

---

## 現在の設定確認

```bash
cat .planning/config.json 2>/dev/null || echo "設定ファイルなし"
```

---

## 設定項目

| 項目 | デフォルト | 説明 |
|------|----------|------|
| `mode` | `interactive` | `yolo`（自動承認）または `interactive`（確認あり） |
| `depth` | `standard` | `quick` / `standard` / `comprehensive` |
| `parallelization` | `true` | 複数プランの並列実行 |
| `commit_docs` | `true` | docs の git コミット |
| `workflow.research` | `true` | plan-phase 時にリサーチを実施 |
| `workflow.plan_check` | `true` | 計画の品質チェックを実施 |
| `workflow.verifier` | `true` | execute-phase 後に検証を実施 |

---

## 設定変更

変更したい項目をユーザーが指定したら `.planning/config.json` を更新:

```json
{
  "mode": "interactive",
  "depth": "standard",
  "parallelization": true,
  "commit_docs": true,
  "workflow": {
    "research": true,
    "plan_check": true,
    "verifier": true
  }
}
```

```bash
git add .planning/config.json
git commit -m "chore: update GSD settings"
```

---

## 完了条件チェックリスト

- [ ] 現在の設定を表示
- [ ] ユーザーの変更意図を確認
- [ ] config.json を更新
- [ ] git commit（commit_docs が true の場合）
