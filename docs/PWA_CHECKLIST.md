# YARIKIRU PWA 監査チェックリスト

## ✅ 実装済みPWA機能

### 1. PWA マニフェスト
- ✅ `public/manifest.json` を作成
  - アプリ名、短縮名を設定
  - アイコンを指定（192x192, 512x512）
  - テーマカラーを設定（#3b82f6）
  - 表示モードを standalone に設定
  - スコープを設定（/）

### 2. サービスワーカー
- ✅ `public/sw.js` を作成
  - インストール時の静的キャッシュ
  - アクティベート時の古いキャッシュ削除
  - ネットワークファースト戦略（APIリクエスト）
  - キャッシュファースト戦略（静的アセット）
  - オフラインフォールバック

### 3. サービスワーカー登録
- ✅ `src/components/service-worker-registration.tsx` を作成
  - クライアントサイドでのサービスワーカー登録
  - アップデート検出
  - beforeinstallprompt イベントの処理

### 4. メタタグ
- ✅ `src/app/layout.tsx` に追加
  - manifest リンク
  - Apple Touch Icon
  - theme-color
  - mobile-web-app-capable
  - apple-mobile-web-app-capable
  - viewport 設定

### 5. レスポンシブ最適化
- ✅ タッチターゲットサイズ（44px以上）を確保
- ✅ モバイルファーストのCSS
- ✅ 安全エリア対応（ノッチ対応）

### 6. オフライン対応
- ✅ オフラインページ作成（`src/app/offline/page.tsx`）
- ✅ サービスワーカーでのオフラインフォールバック

### 7. インストールプロンプト
- ✅ カスタムインストールプロンプト実装
- ✅ beforeinstallprompt イベント処理
- ✅ ローカルストレージで拒否を記録

## 📋 Lighthouse監査手順

1. **開発サーバーを起動**
   ```bash
   npm run dev
   ```

2. **Chrome DevToolsを開く**
   - `Cmd + Option + I`（Mac）
   - `F12`（Windows/Linux）

3. **Lighthouseタブを開く**
   - DevTools > Lighthouse

4. **監査設定**
   - Desktop / Mobile: **Mobile**（PWAはモバイルで監査）
   - Categories: **Progressive Web App** + **Performance**
   - throttling: **No throttling**（ローカル開発用）

5. **監査実行**
   - 「Analyze page load」ボタンをクリック

6. **スコア確認**
   - PWA スコア: 目標 **90+**
   - Performance スコア: 目標 **80+**

## 🎯 期待されるPWA監査項目

### 必須項目（すべて✅のはず）

- ✅ **Registers a service worker**
  - サービスワーカーが登録されている

- ✅ **Has a manifest**
  - マニフェストファイルが存在する

- ✅ **Contains display mode**
  - display プロパティが設定されている

- ✅ **Contains icons with sizes**
  - アイコンが設定されている

- ✅ **Set a theme color**
  - theme-color が設定されている

- ✅ **Has a <meta name="viewport"> tag**
  - viewport タグが設定されている

### 推奨項目

- ⚠️ **Contains an apple-touch-icon**
  - Apple Touch Icon を設定（既存の logo.png を使用）

- ⚠️ **Splash screen**
  - スプラッシュスクリーン用のアイコンが理想的

- ⚠️ **Installable**
  - インストール可能な状態（HTTPS + Service Worker + Manifest）

- ⚠️ **Works offline**
  - オフラインで動作確認

## 🔧 追加の改善点（オプション）

### 本番環境向け
1. **HTTPS の設定**（必須）
2. **正方形のアイコン作成**（192x192, 512x512）
3. **スプラッシュスクリーン用アイコン**
4. **プッシュ通知実装**（タスク#9）
5. **バックグラウンド同期実装**

### アイコン改善
```bash
# 理想的なアイコンサイズ
public/icons/icon-72x72.png
public/icons/icon-96x96.png
public/icons/icon-128x128.png
public/icons/icon-144x144.png
public/icons/icon-152x152.png
public/icons/icon-192x192.png
public/icons/icon-384x384.png
public/icons/icon-512x512.png
public/icons/maskable-icon-512x512.png
```

## 📊 現在の実装状況

- **PWA Core**: ✅ 完全実装
- **Offline Support**: ✅ 実装済み
- **Installability**: ✅ 実装済み
- **Push Notifications**: ⏭️ スキップ（オプション）
- **Background Sync**: ⏭️ スキップ（オプション）

## 🚀 本番デプロイ時の確認事項

1. **HTTPS** が有効になっていること
2. **Service Worker** が本番環境で動作していること
3. **Manifest** が正しく配信されていること
4. **Lighthouse PWA スコア** が 90+ であること

---

**作成日**: 2026-02-22
**バージョン**: 1.0
