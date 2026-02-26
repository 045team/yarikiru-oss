# YARIKIRU OSS インストールガイド

## 推奨インストール方法

### 方法1: npm グローバルインストール（GitHub から）

```bash
npm install -g https://github.com/045team/yarikiru-oss.git
```

### 方法2: tgz からのインストール（安定版）

リリースされた `.tgz` がある場合:

```bash
npm install -g ./yarikiru-oss-5.1.0.tgz
```

### 方法3: npx で都度実行（インストール不要）

```bash
npx yarikiru-oss init
npx yarikiru-oss ui
```

---

## 動作環境

- **Node.js**: 18.0.0 以上（`engines.node` で指定）
- **対応OS**: macOS, Linux

---

## トラブルシューティング

### TAR_ENTRY_ERROR ENOENT が発生する場合

`npm install -g` 実行中に次のような警告・エラーが出ることがあります:

```
npm warn tar TAR_ENTRY_ERROR ENOENT: no such file or directory...
```

**原因**: npm が依存パッケージを解凍する際の既知の挙動です。キャッシュ破損や同時実行などの影響で発生しやすくなります。

**対処手順**:

```bash
# 1. npm キャッシュをクリア
npm cache clean --force

# 2. 再度インストール
npm install -g https://github.com/045team/yarikiru-oss.git
```

それでも解消しない場合:

```bash
# node_modules を削除してから再試行（ローカル開発時）
rm -rf node_modules package-lock.json
npm install

# または Node.js / npm を最新版に更新
nvm install latest   # nvm 利用時
npm install -g npm@latest
```

### `yarikiru ui` で「ビルドが見つかりません」と表示される

GitHub からのインストールでは、`postinstall` スクリプトが自動でビルドを実行します。表示される場合は、postinstall のビルドが失敗している可能性があります。

**対処**:

```bash
# パッケージのインストール先へ移動して手動ビルド
cd $(npm root -g)/yarikiru-oss
npm run build
yarikiru ui
```

**補足**: `npm pack` で作成した `.tgz` にはビルド成果物（`.next/`）が含まれるため、`npm install -g ./yarikiru-oss-x.x.x.tgz` の場合はこの手順は不要です。

### その他のエラー

- Node.js のバージョンが 18 未満の場合は、18 以上にアップデートしてください。
- `better-sqlite3` のネイティブビルドで失敗する場合は、Python と build-essential が入っているか確認してください（多くの場合 `npm install` 時に自動でビルドされます）。
