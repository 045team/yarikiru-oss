# GSD .planning 同期 実装チェックリスト

> 目標: GSD で作成された ROADMAP.md や phases を sync で連携し、UI で進行管理できるようにする

---

## 前提・現状

- `yarikiru sync` は存在し、.planning → DB 同期は動作する（手動実行）
- UI は DB からプロジェクト・ゴールを取得して表示
- `.planning` の自動監視は未実装
- sync は `process.cwd()` の `.planning` を読む（GSD プロジェクトのルートで実行必須）

---

## 実装チェックリスト

### Phase 1: コア機能強化

- [x] **1.1** `chokidar` を依存関係に追加
- [x] **1.2** `.planning` 読み込みロジックを共通化（`src/lib/gsd/read-planning.ts`）
- [x] **1.3** CLI `yarikiru sync --watch` を実装（chokidar で .planning 監視 → 変更時に自動 sync）
- [x] **1.4** デバウンス処理（800ms）

### Phase 2: API 追加

- [x] **2.1** `POST /api/planning/sync` を追加
  - Body: `{ planningPath?: string }`（省略時は `YARIKIRU_PLANNING_PATH` env）
- [x] **2.2** 認証: `auth()` で userId 取得、local-oss-user 対応
- [x] **2.3** レスポンス: `{ success, projectId, goalsCount, error? }`

### Phase 3: UI 連携

- [x] **3.1** ダッシュボードに「GSD Sync」ボタンを追加
- [x] **3.2** Sync 実行中はローディング表示
- [x] **3.3** 成功時: プロジェクト一覧を再取得（refreshProjects）
- [x] **3.4** 失敗時: エラーメッセージ表示

### Phase 4: 設定・紐づけ（任意・将来）

- [ ] **4.1** プロジェクト設定に「Planning パス」を保存する DB カラム追加
- [ ] **4.2** UI でプロジェクトごとに planning パスを設定可能に
- [ ] **4.3** Sync 時に該当プロジェクトのパスを使用

---

## 実装順序

1. **1.1** → chokidar 追加
2. **1.2** → 読み込みロジック共通化（CLI と API で再利用）
3. **1.3** → **1.4** → `--watch` 実装
4. **2.1** → **2.2** → **2.3** → API 実装
5. **3.1** → **3.2** → **3.3** → **3.4** → UI ボタン

---

## 補足

### OSS での planning パス

- **CLI**: `yarikiru sync` は GSD プロジェクトのルート（`cwd`）で実行する前提
- **API/UI**: サーバーは任意のパスにアクセスできないため、`.env.local` に `YARIKIRU_PLANNING_PATH` を設定
  ```bash
  # .env.local
  YARIKIRU_PLANNING_PATH=/Users/me/my-gsd-project
  ```
- 例: `YARIKIRU_PLANNING_PATH=/Users/me/my-gsd-project` → `/Users/me/my-gsd-project/.planning` を読む
