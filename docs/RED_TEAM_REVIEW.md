# Red Team セキュリティレビュー

**対象コミット**: `2d77a92` (feat: Next.js proxy移行 + NPMパッケージ最適化)  
**レビュー日**: 2025-02-26

---

## エグゼクティブサマリ

今回の変更（proxy 移行、NPM パッケージ最適化、postinstall）は、既存のセキュリティモデルを維持しています。一方で、**既存コードベース**に複数の潜在的な脆弱性と改善点が存在します。本変更によって新たに導入されたリスクは限定的です。

---

## 1. 今回の変更に関連するリスク

### 1.1 postinstall スクリプト（中リスク）

**場所**: `scripts/postinstall.mjs`

```javascript
spawnSync('npm', ['run', 'build'], { stdio: 'inherit', cwd: pkgRoot });
```

**懸念**: npm の `postinstall` は信頼境界上でのコード実行タイミングです。攻撃者がこのパッケージの依存関係を悪用（サプライチェーン攻撃）する可能性があります。

**緩和要因**:
- 引数は配列で渡しており、シェル経由のコマンドインジェクションのリスクは低い
- 実行内容は `npm run build`（package.json の既知スクリプト）に限定
- 依存関係は既存のもので、新規追加なし

**推奨**: 将来的に `prepare` や `postinstall` の必要性を見直し、可能であればビルド済み tgz の配布に一本化することを検討してください。

---

### 1.2 CLI の pkgRoot 表示（低リスク）

**場所**: `cli/index.mjs` エラーメッセージ

```javascript
console.error(chalk.cyan('  $ cd ' + pkgRoot));
```

**懸念**: グローバルインストール時のパス（例: `/Users/xxx/.nvm/.../node_modules/yarikiru-oss`）が表示され、ユーザー名や環境構成の情報が漏れる可能性があります。

**判定**: 実害は小さく、トラブルシュート用途として妥当。現状のままで許容可能です。

---

### 1.3 proxy による認証バイパス（設計通り）

**場所**: `src/proxy.ts`

```typescript
if (req.nextUrl.pathname.startsWith('/api/mcp')) return NextResponse.next();
if (req.nextUrl.pathname.startsWith('/api/webhooks')) return NextResponse.next();
```

**判定**: `/api/mcp` と `/api/webhooks` は proxy をバイパスし、各ルートで独自認証を行う設計です。変更による新規リスクはありません。

---

## 2. 既存コードベースの指摘事項

### 2.1 Cron エンドポイントの認証欠如（高リスク）

**場所**: `src/app/api/cron/learning-evolution/route.ts:72-74`

```typescript
if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**問題**: `CRON_SECRET` が未設定の場合、この条件は false となり、誰でも `GET /api/cron/learning-evolution` を呼び出せます。

**影響**:
- 未認証で GitHub API 呼び出し、OpenAI API 呼び出し、DB 書き込みが可能
- 攻撃者による API 利用や DB 汚染のリスク

**対応済み**: 本番では `CRON_SECRET` 必須に変更。開発環境では従来どおりのバイパスを維持。

---

### 2.2 MCP API の開発用バイパス（中リスク）

**場所**: `src/app/api/mcp/route.ts:104-120`

```typescript
if (isDev && devApiKey && authHeader === `Bearer ${devApiKey}`) {
    // Bypass with hardcoded userId
    const result = await operations[operation](db, args || {}, 'user_39sGQ4PcU2NitBLghsqblRKuUr2')
```

**懸念**:
- `NODE_ENV !== 'production'` かつ `DEV_API_KEY` 設定時に認証バイパスが有効
- 本番での誤設定（`NODE_ENV` や `DEV_API_KEY`）で、実質的なバックドアになる可能性
- ハードコードされた `user_39sGQ4PcU2NitBLghsqblRKuUr2` が情報漏洩の原因になりうる

**推奨**:
- 本番用ビルドでは、このバイパスを無効化するか、条件を厳格化する
- `user_39sGQ4PcU2NitBLghsqblRKuUr2` を環境変数化するか、開発専用の明示的な設定に限定する

---

### 2.3 /api/webhooks の将来リスク（低リスク）

**状況**: proxy は `/api/webhooks` をバイパスしますが、現時点で該当ルートは存在しません。

**懸念**: 将来 webhook エンドポイントを追加する際、署名検証などを怠ると、認証のないエンドポイントが公開される可能性があります。

**推奨**: webhook を実装する際は、シグネチャ検証（Stripe、GitHub など）の実装を必須チェックリストに含めてください。

---

## 3. パッケージング・配布に関する確認

| 項目 | 結果 |
|------|------|
| `.npmignore` による `.env` 除外 | 適切に除外 |
| `files` に secrets を含むパス | なし |
| postinstall の実行内容 | `npm run build` に限定 |

---

## 4. 総合評価と推奨アクション

| 優先度 | 項目 | アクション |
|--------|------|------------|
| 高 | Cron 認証ロジック | ✅ 対応済み（本番で CRON_SECRET 必須） |
| 中 | MCP 開発バイパス | 本番無効化または条件の厳格化を検討 |
| 中 | postinstall | 将来的に tgz 配布への集約を検討 |
| 低 | webhooks 将来対応 | webhook 実装時にセキュリティチェックを実施 |

---

## 5. 免責

本レビューは、該当コミットとその周辺コードを対象としたもので、フルスコープのセキュリティ監査ではありません。本番運用前に、必要に応じて専門家によるペネトレーションテストを実施することを推奨します。
