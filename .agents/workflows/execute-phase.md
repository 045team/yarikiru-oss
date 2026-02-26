---
description: Execute a phase end-to-end — verify implementation, create SUMMARY and VERIFICATION docs, update ROADMAP
argument-hint: "<phase-number>"
---

# /gsd:execute-phase — Antigravity 版

> GSD 本体（`get-shit-done/workflows/execute-phase.md` + `execute-plan.md`）の設計を忠実に反映。
> `gsd-tools` CLI の代わりに `view_file` / `grep_search` / `run_command` で同等の処理を行う。

---

## Step 1: 初期化 — Phase の特定

```bash
# フェーズディレクトリを特定（ゼロ埋め2桁）
ls .planning/phases/ | grep "^<NN>-"
```

読み込むファイル（優先度順）：
1. `.planning/phases/<NN>-*/<NN>-PLAN.md` — 実行計画
2. `.planning/ROADMAP.md` — フェーズ全体像
3. `.planning/PROJECT.md` — プロジェクト方針（存在する場合）
4. `CLAUDE.md` / `.agents/skills/` — プロジェクト固有ルール（存在する場合）

把握すること：
- **Goal**: フェーズ目的
- **Tasks**: `[ ]` / `[x]` 一覧 + Definition of Done
- **Plan Count**: `<NN>-NN-PLAN.md` がいくつあるか（複数の場合は wave 分割）

**エラー条件：**
- フェーズディレクトリが存在しない → エラーで終了
- PLAN.md が1つもない → エラーで終了

---

## Step 2: 実装確認 — タスクごとの検証

PLAN.md の各タスクに対して実際のコード・ファイルを確認する。

> **重要:** `[x]` になっていても、実装ファイルで実際にコードを確認すること。PLAN.md の記述と実際の実装が乖離していれば修正する。

**タスクごとの確認手順：**
1. タスクに関連するファイルパスを特定（PLAN.md の記述から推測）
2. `view_file` でコードを読む
3. 実装が正しければ `[x]` のまま。不足があればコードを修正して完了させる

**偏差（Deviation）のハンドリング：**

| カテゴリ | 対応 |
|---------|------|
| バグ・型エラー・セキュリティ問題 | 自動修正（Rule 1） |
| エラーハンドリング・バリデーション欠如 | 自動追加（Rule 2） |
| ブロッキング問題（依存解決等） | 自動修正（Rule 3） |
| アーキテクチャ変更（新テーブル・ライブラリ切替等） | **ユーザーに確認してから実施**（Rule 4） |

---

## Step 3: git commit — タスクごとの原子コミット

> GSD のコア原則：**タスク完了ごとに即座にコミット**する。

```bash
# 個別ファイルをステージ（git add . は使わない）
git add src/path/to/file.ts
git commit -m "feat(<NN>-<plan>): <description>"
```

**コミットタイプ:**

| type | 用途 |
|------|------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `docs` | ドキュメント |
| `refactor` | リファクタ |
| `chore` | 設定・依存 |

フォーマット: `{type}({phase}-{plan}): {description}`

---

## Step 4: `<NN>-SUMMARY.md` 作成 ⬅ 必須成果物

パス: `.planning/phases/<NN>-*/<NN>-SUMMARY.md`

```markdown
# <NN>-SUMMARY

## Completed Work
1. <具体的な実装内容（ファイル名・関数名を含む）>
   - 例: `src/lib/auth.ts` に `getCurrentMember()` を実装（localモードでモックユーザー返却）
2. ...

## Deviations from Plan
- [Rule N - Category] <タイトル> — <理由・対応内容>
- None（計画通り実装した場合）

## Architecture Decisions
- <設計上の判断とその理由>（なければ省略）

## Issues Encountered
- <問題と解決策>（なければ「None」）

## Next Steps
Phase <NN+1> (<次フェーズ名>) へ進む。
```

**SUMMARY の品質基準（GSD 準拠）:**
- ❌ 「認証を実装した」
- ✅ 「jose ライブラリを使った JWT 認証とリフレッシュローテーションを実装」

---

## Step 5: `<NN>-VERIFICATION.md` 作成 ⬅ 必須成果物

パス: `.planning/phases/<NN>-*/<NN>-VERIFICATION.md`

```markdown
# <NN>-VERIFICATION

## Verification Requirements
1. <PLAN.md の Definition of Done の各条件をそのまま転記>
2. ...

## Test Results
1. <検証コマンドまたは確認方法> → **成功** / **失敗**
   - 補足: <実際に確認した内容>
2. ...

## Gaps Found
- <未達成の条件があれば記載。なければ省略>

## Status
status: passed | gaps_found | human_needed
```

**Status の選択:**
- `passed` — 全条件達成
- `gaps_found` — 未達成条件あり → `/gsd:plan-phase <NN> --gaps` を提案
- `human_needed` — 手動確認が必要な項目あり → ユーザーに提示

---

## Step 6: ROADMAP.md 更新

`.planning/ROADMAP.md` の該当フェーズ:
1. 各タスクを `[x]` にマーク（実際の実装内容に合わせて説明文も修正してよい）
2. まだ未完タスクがあれば修正してから `[x]` にする

```bash
# コミット
git add .planning/ROADMAP.md .planning/phases/<NN>-*/<NN>-SUMMARY.md .planning/phases/<NN>-*/<NN>-VERIFICATION.md
git commit -m "docs(phase-<NN>): complete phase execution"
```

---

## Step 7: 完了報告

`notify_user` で以下を報告:

```
## Phase <NN>: <Name> 実行完了

| タスク | 実装内容 | 状態 |
|--------|---------|------|
| <NN>-01 | ... | ✅ |
| <NN>-02 | ... | ✅ |

**成果物:**
- [<NN>-SUMMARY.md](path)
- [<NN>-VERIFICATION.md](path)

**Verification:** passed / gaps_found / human_needed

**次フェーズ:** Phase <NN+1> (<Name>)
```

---

## Wave 実行（複数 PLAN ファイルがある場合）

フェーズに `<NN>-01-PLAN.md`, `<NN>-02-PLAN.md` のように複数ある場合：

1. 依存関係を分析して **Wave** にグループ化（依存なし → 同一 Wave で並列）
2. Wave 1 完了 → Wave 2 へ（順序保証）
3. 各 PLAN に対して Step 2〜5 を実行（個別 SUMMARY を作成）
4. 全 Wave 完了後に Phase レベルの VERIFICATION.md を作成

---

## 完了条件チェックリスト

- [ ] 全タスクをコードで実装確認
- [ ] 各タスクごとに原子 git commit 済み
- [ ] `<NN>-SUMMARY.md` 作成済み（具体的な実装内容を記載）
- [ ] `<NN>-VERIFICATION.md` 作成済み（status: passed | gaps_found | human_needed）
- [ ] `ROADMAP.md` の該当フェーズを全 `[x]` に更新
- [ ] docs commit 済み（SUMMARY + VERIFICATION + ROADMAP）
- [ ] ユーザーへの完了報告
