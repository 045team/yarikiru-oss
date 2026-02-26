# データ移行ガイド

Google SheetsからTursoへのデータ移行スクリプトセット

## 概要

この移行ツールは、既存の施工管理技士データ（Google Sheets）をTursoデータベースに安全に移行するためのスクリプト群です。

- **export-google-sheets.ts**: Google Sheetsからデータをエクスポート
- **validate-source.ts**: ソースデータの整合性チェック
- **migrate-to-turso.ts**: Tursoへのデータ移行（dry-run対応）
- **rollback.ts**: 移行のロールバック

## 前提条件

### 1. 環境変数の設定

`.env.local`または`.env`ファイルに以下の環境変数を設定：

```bash
# Turso Database
TURSO_DATABASE_URL=your-database-url
TURSO_AUTH_TOKEN=your-auth-token

# Google Sheets API（移行のみ）
GOOGLE_SPREADSHEET_ID=your-sheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account-email
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 2. Google Sheets API認証の設定

Google Sheets APIにアクセスするためのサービスアカウントを作成：

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. Google Sheets APIを有効化
3. サービスアカウントを作成し、JSONキーをダウンロード
4. スプレッドシートをサービスアカウントと共有（編集権限）

### 3. パッケージのインストール

```bash
npm install google-spreadsheet @types/google-spreadsheet tsx
```

## 移行手順

### Step 1: シート構造の確認

利用可能なシートを確認：

```bash
npx tsx scripts/migration/export-google-sheets.ts --list-sheets
```

### Step 2: ソースデータの検証

エクスポートしたデータの整合性をチェック：

```bash
# エクスポート
npx tsx scripts/migration/export-google-sheets.ts > /tmp/source-data.json

# 整合性チェック
cat /tmp/source-data.json | npx tsx scripts/migration/validate-source.ts
```

期待される出力：
```
🔍 Validating source data...

📊 Validation Summary:

INDUSTRIES:
  Total: 1 rows
  Valid: 1 rows
  Invalid: 0 rows
  ✅ Validation passed

SCHEDULES:
  Total: 10 rows
  Valid: 10 rows
  Invalid: 0 rows
  ✅ Validation passed

TASKS:
  Total: 15 rows
  Valid: 15 rows
  Invalid: 0 rows
  ✅ Validation passed

✅ All source data is valid
```

### Step 3: Dry-runで移行内容を確認

実際の変更を加えずに移行内容をプレビュー：

```bash
cat /tmp/source-data.json | npx tsx scripts/migration/migrate-to-turso.ts --dry-run --verbose
```

期待される出力：
```
🔍 DRY RUN MODE - No changes will be made

📋 Step 1: Validating source data...
✅ All source data is valid

📋 Step 2: Mapping source data to Turso schema...
  - Industries: 1 rows mapped
  - Schedules: 10 rows mapped
  - Tasks: 15 rows mapped

📝 Dry-run complete. No changes made.

💡 Run without --dry-run to execute migration.
```

### Step 4: 移行の実行

Dry-runで問題がなければ、実際の移行を実行：

```bash
cat /tmp/source-data.json | npx tsx scripts/migration/migrate-to-turso.ts --verbose
```

期待される出力：
```
📋 Step 1: Validating source data...
✅ All source data is valid

📋 Step 2: Mapping source data to Turso schema...
  - Industries: 1 rows mapped
  - Schedules: 10 rows mapped
  - Tasks: 15 rows mapped

📋 Step 3: Importing data to Turso...
  ✅ Batch 1/1: 1 industries inserted
  ✅ Batch 1/1: 15 tasks inserted
  ✅ Batch 1/1: 10 schedules inserted

✅ Migration completed successfully

📋 Step 4: Validating Turso data...

✅ Turso data validation passed:
  - Industries: 1 rows
  - Tasks: 15 rows
  - Schedules: 10 rows
```

## ロールバック手順

移行後に問題が発生した場合、ロールバックを実行：

### Step 1: ロールバック内容の確認

```bash
npx tsx scripts/migration/rollback.ts --dry-run --verbose
```

期待される出力：
```
🔍 DRY RUN MODE - Previewing rollback

  [DRY RUN] Would delete schedules:
    SQL: DELETE FROM schedules WHERE industry_id IS NULL
    Affected rows: 10

  [DRY RUN] Would delete tasks:
    SQL: DELETE FROM tasks WHERE industry_id IS NULL
    Affected rows: 15

  [DRY RUN] Would delete industries:
    SQL: DELETE FROM industries WHERE industry = ?
    Params: ["施工管理技士"]
    Affected rows: 1

📝 Dry-run complete. No changes made.

💡 Run with --confirm to execute rollback.
```

### Step 2: ロールバックの実行

```bash
npx tsx scripts/migration/rollback.ts --confirm
```

**注意**: `--confirm`フラグがないとロールバックは実行されません。

## 一括実行コマンド

移行プロセス全体を1つのコマンドで実行：

```bash
# 完全移行（バリデーション → Dry-run → 移行）
npx tsx scripts/migration/export-google-sheets.ts \
  | tee /tmp/source-data.json \
  | npx tsx scripts/migration/validate-source.ts && \
cat /tmp/source-data.json \
  | npx tsx scripts/migration/migrate-to-turso.ts --verbose
```

## トラブルシューティング

### エラー: "GOOGLE_SPREADSHEET_ID is not defined"

**原因**: 環境変数が設定されていない

**解決策**:
```bash
# .env.localに環境変数を追加
echo "GOOGLE_SPREADSHEET_ID=your-sheet-id" >> .env.local
echo "GOOGLE_SERVICE_ACCOUNT_EMAIL=your-email" >> .env.local
echo "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\"" >> .env.local
```

### エラー: "Source data validation failed"

**原因**: ソースデータに必須フィールドが欠けている

**解決策**:
1. バリデーションエラーを確認
2. Google Sheetsのデータ形式を修正
3. 必須フィールドがすべて揃っているか確認

### エラー: "Sheet not found"

**原因**: スプレッドシートに指定されたシートが存在しない

**解決策**:
```bash
# 利用可能なシートを確認
npx tsx scripts/migration/export-google-sheets.ts --list-sheets
```

### エラー: "API error: The caller does not have permission"

**原因**: サービスアカウントにスプレッドシートへのアクセス権限がない

**解決策**:
1. スプレッドシートの共有設定を開く
2. サービスアカウントのメールアドレスを追加
3. 「編集者」権限を付与

### エラー: "No data found in Turso after migration"

**原因**: Tursoデータベース接続エラーまたは外部キー制約違反

**解決策**:
1. Turso接続設定を確認
2. 外部キー制約のエラーログを確認
3. Tursoダッシュボードでデータを直接確認

## スクリプト仕様

### export-google-sheets.ts

Google Sheets APIを使用してデータをエクスポートします。

**オプション**:
- `--list-sheets`: 利用可能なシート一覧を表示
- `--sheet <name>`: 特定シートのデータをエクスポート

**出力形式**: JSON

### validate-source.ts

ソースデータの整合性をチェックします。

**検証項目**:
- 必須フィールドの存在チェック
- データ型の検証
- 重複データの検出

**終了コード**:
- `0`: バリデーション成功
- `1`: バリデーション失敗

### migrate-to-turso.ts

Tursoデータベースにデータを移行します。

**オプション**:
- `--dry-run`: 移行内容のプレビュー（データ変更なし）
- `--validate`: 整合性チェックのみ実行
- `--verbose`: 詳細ログ出力

**機能**:
- MVCCトランザクション（BEGIN CONCURRENT）を使用
- バッチ処理でメモリ効率を向上
- 重複データは自動スキップ
- 移行後の整合性検証

### rollback.ts

移行データを削除してロールバックします。

**オプション**:
- `--dry-run`: 削除内容のプレビュー
- `--confirm`: ロールバックの実行（必須）
- `--verbose`: 詳細ログ出力

**安全機能**:
- `--confirm`フラグがないと実行されない
- 外部キー制約を考慮した削除順序
- MVCCトランザクションで安全なロールバック

## データベーススキーマ

移行先のTursoスキーマ：[turso/schema.sql](../../turso/schema.sql)

### テーブル構造

1. **industries**: 業種マスタ
2. **tasks**: タスク詳細
3. **schedules**: 週間スケジュール
4. **pain_points**: 疼痛点抽出結果
5. **ai_solutions**: AIソリューション提案
6. **marketing_assets**: マーケティング資料
7. **users**: ユーザー
8. **user_activity**: ユーザー行動ログ

## 注意事項

1. **バックアップ**: 移行前に既存データのバックアップを取得
2. **テスト**: 本番環境で実行前に開発環境でテスト
3. **dry-run**: 必ずdry-runモードで内容を確認
4. **確認**: 移行後にデータの整合性を検証
5. **ロールバック**: 問題発生時は即座にロールバックを実行

## サポート

問題が発生した場合は、以下を確認してください：

1. 環境変数が正しく設定されているか
2. Google Sheets APIの認証情報が有効か
3. Tursoデータベース接続が正常か
4. スプレッドシートの共有設定が正しいか

詳細なエラーログは各スクリプトの実行時に出力されます。
