# Next.js 16 middleware → proxy 移行報告書

**実施日**: 2025年2月26日  
**対象**: yarikiru-oss v5.1.0  
**Next.js バージョン**: 16.1.6

---

## 1. 概要

Next.js 16 において `middleware` ファイル規約が非推奨（deprecated）となり、新しい `proxy` 規約への移行が推奨されています。本プロジェクトにおいて、この移行を実施しました。

### ビルド時の警告（移行前）

```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
```

---

## 2. 変更理由（Next.js 公式ドキュメントより）

- **用語の明確化**: 「middleware」は Express.js の middleware と混同されやすい
- **目的の明確化**: 「proxy」はネットワーク境界で動作するゲートウェイルーヤーであることをより正確に表現
- **誤用防止**: 限定的な用途であることを明示し、過度な使用を抑制

> *"The name Proxy clarifies what Middleware is capable of. The term "proxy" implies that it has a network boundary in front of the app."*
> — [Next.js middleware-to-proxy](https://nextjs.org/docs/messages/middleware-to-proxy)

---

## 3. 実施した変更

### 3.1 ファイル変更

| 操作 | パス |
|------|------|
| **削除** | `src/middleware.ts` |
| **新規作成** | `src/proxy.ts` |

### 3.2 コード変更内容

#### Before (middleware.ts)

```typescript
/**
 * Next.js middleware for Clerk authentication
 * ...
 */
export default clerkMiddleware(async (auth, req: NextRequest) => {
  // ...
})

export const config = { matcher: [...] }
```

#### After (proxy.ts)

```typescript
/**
 * Next.js proxy for Clerk authentication
 * ...
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 * @deprecated-middleware - Renamed from middleware to proxy in Next.js 16
 */
export const proxy = clerkMiddleware(async (auth, req: NextRequest) => {
  // ...（ロジックは同一）
})

export const config = { matcher: [...] }
```

### 3.3 主な差分

| 項目 | Before | After |
|------|--------|-------|
| ファイル名 | `middleware.ts` | `proxy.ts` |
| エクスポート形式 | `export default` | `export const proxy` |
| コメント | middleware 表記 | proxy 表記 + 公式ドキュメントリンク |

※ 認証ロジック・matcher 設定は変更なし

---

## 4. 互換性・影響範囲

- **API 互換性**: `NextRequest`, `NextResponse`, `config.matcher` はそのまま利用可能
- **Clerk / auth-stub**: `clerkMiddleware` の戻り値は同一の関数シグネチャのためそのまま利用可能
- **他ファイル**: `src/lib/auth.ts`, `src/app/dashboard/page.tsx` 等の「middleware」コメント表記は認証の概念説明であり、ファイル名変更の影響なし

---

## 5. 検証結果

### ビルド

```bash
npm run build
```

- ✅ 成功（exit code 0）
- ✅ middleware 非推奨警告が解消
- ✅ 出力に `ƒ Proxy (Middleware)` が表示され、proxy が正しく認識されていることを確認

### 動作

- ルート `/` からの `/dashboard` リダイレクト
- `/api/mcp`, `/api/webhooks` のバイパス
- その他認証フローは従来通り

---

## 6. 参考リンク

- [Proxy - Next.js Docs](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [middleware-to-proxy 移行メッセージ](https://nextjs.org/docs/messages/middleware-to-proxy)
- [Next.js 16 アップグレードガイド](https://nextjs.org/docs/app/guides/upgrading/version-16)

---

## 7. 今後の注意点

- `next.config` に `experimental.middlewarePrefetch` 等を利用している場合は、`experimental.proxyPrefetch` 等への変更を検討
- 本プロジェクトでは現時点で該当設定なし
