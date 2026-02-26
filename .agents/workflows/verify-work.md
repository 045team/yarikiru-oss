---
description: Validate built features through conversational UAT
argument-hint: "<phase-number>"
---

# /gsd:verify-work — Antigravity 版

> GSD 本体（`get-shit-done/workflows/verify-work.md`）を `gsd-tools` CLI なしで実行できる手順。
> 哲学：「期待動作を提示して、現実と一致するか確認する」

---

## Step 1: セッション確認

既存の UAT ファイルを確認:
```bash
find .planning/phases -name "*-UAT.md" 2>/dev/null
```

- 既存セッションがあれば再開するか確認
- セッションがなく引数もない場合: 「フェーズ番号を指定してください」

---

## Step 2: テスト対象の抽出

該当フェーズの SUMMARY.md を読む:
```bash
ls .planning/phases/<NN>-*/*-SUMMARY.md
```

各 SUMMARY.md から **ユーザーが体験できる成果** を抽出:
- ✅ 対象: UI変更・機能追加・API動作
- ❌ 除外: リファクタ・型変更・内部実装

---

## Step 3: UAT.md 作成

`.planning/phases/<NN>-*/<NN>-UAT.md` を作成:

```markdown
---
status: testing
phase: <NN>-<name>
source: [<SUMMARY.md一覧>]
started: <ISO timestamp>
updated: <ISO timestamp>
---

## Current Test
number: 1
name: <最初のテスト名>
expected: |
  <ユーザーが見るべき動作>
awaiting: user response

## Tests

### 1. <テスト名>
expected: <観測可能な動作>
result: [pending]

### 2. <テスト名>
expected: <観測可能な動作>
result: [pending]

## Summary
total: <N>
passed: 0
issues: 0
pending: <N>
skipped: 0

## Gaps

[none yet]
```

---

## Step 4: テストを1件ずつ提示

```
╔══════════════════════════════════════════════════════════════╗
║  確認テスト {N}/{total}                                       ║
╚══════════════════════════════════════════════════════════════╝

**テスト {N}: {name}**

{expected}

──────────────────────────────────────────────────────────────
→ 「pass」または問題の説明を入力してください
──────────────────────────────────────────────────────────────
```

**レスポンス処理:**
- `pass` / `yes` / `y` / 空 → `result: pass`
- `skip` / `n/a` → `result: skipped`
- その他 → `result: issue` として記録、深刻度を推測

**深刻度の推測:**
| ユーザーの言葉 | 深刻度 |
|-------------|--------|
| クラッシュ・エラー・使えない | blocker |
| 動かない・間違ってる・欠如 | major |
| 遅い・変・小さい問題 | minor |
| 色・フォント・ズレ | cosmetic |

→ 全テスト完了後 Step 5 へ

---

## Step 5: 完了処理

UAT.md を更新:
```yaml
status: complete
updated: <now>
```

```bash
git add .planning/phases/<NN>-*/<NN>-UAT.md
git commit -m "test(<NN>): complete UAT - {passed} passed, {issues} issues"
```

**Issues が 0 の場合:**
```
✅ 全テスト通過

次のステップ:
- /gsd:execute-phase <NN+1>
- /gsd:plan-phase <NN+1>
```

**Issues がある場合:** Step 6 へ

---

## Step 6: 問題の診断（Issues がある場合）

各 issue について:
1. 関連するコードファイルを確認
2. 根本原因を特定
3. UAT.md の Gaps セクションに記録:

```yaml
- truth: "<期待される動作>"
  status: failed
  reason: "User reported: <ユーザーの報告>"
  severity: <blocker|major|minor|cosmetic>
  root_cause: "<根本原因>"
  fix_approach: "<修正方針>"
```

診断完了後:
```
{N} 件の問題が診断されました。

修正プランを作成します:
/gsd:plan-phase <NN> --gaps
```

---

## 完了条件チェックリスト

- [ ] 既存 UAT セッションを確認
- [ ] SUMMARY.md からテスト項目を抽出
- [ ] UAT.md を作成
- [ ] テストを1件ずつ提示・記録
- [ ] 深刻度を推測（聞かない）
- [ ] 完了時に git commit
- [ ] Issues がある場合: 根本原因を診断し Gaps に記録
