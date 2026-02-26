# YARIKIRU OSS インストールガイド

## 推奨インストール方法

### 方法1: クローンでインストール（最も安定・推奨）

```bash
git clone https://github.com/045team/yarikiru-oss.git
cd yarikiru-oss
npm install
npm run dev   # または yarikiru init → yarikiru ui
```

グローバルインストールで `TAR_ENTRY_ERROR` や `better-sqlite3` のビルドエラーが出る場合は、この方法を使うと確実です。

### 方法2: npm グローバルインストール（GitHub から）

```bash
npm install -g https://github.com/045team/yarikiru-oss.git
```

### 方法3: tgz からのインストール（安定版）

リリースされた `.tgz` がある場合:

```bash
npm install -g ./yarikiru-oss-5.1.0.tgz
```

### 方法4: npx で都度実行（インストール不要）

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

### グローバルインストールでエラーが出る場合

グローバルインストール（`npm install -g`）は Next.js やネイティブアドオン（better-sqlite3）をインストールするため、npm の既知の問題で失敗することがあります。**確実に動かしたい場合は、方法1（クローンでインストール）を推奨します。**

### TAR_ENTRY_ERROR または ENOTEMPTY が発生する場合

```
npm warn tar TAR_ENTRY_ERROR ENOENT: no such file or directory...
npm error ENOTEMPTY: directory not empty, rename ...
```

**対処手順**:

```bash
# 1. 既存インストールを完全に削除
npm uninstall -g yarikiru-oss
rm -rf $(npm root -g)/yarikiru-oss

# 2. npm キャッシュをクリア
npm cache clean --force

# 3. 再度インストール
npm install -g https://github.com/045team/yarikiru-oss.git
```

それでも解消しない場合は、**クローンでインストール**に切り替えてください。

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

### better-sqlite3 の spawn sh ENOENT / ビルド失敗

```
npm error enoent spawn sh ENOENT
npm error This is related to npm not being able to find a file.
```

**原因**: better-sqlite3 はネイティブアドオンで、インストール時に C++ をビルドします。グローバルインストールの環境によっては、ビルドスクリプトがシェル（sh）を見つけられないことがあります。

**対処**:
1. **クローンでインストール**（推奨）: ローカルでの `npm install` は通常問題なく動作します
2. Node.js / npm を最新にする: `nvm install latest && npm install -g npm@latest`
3. macOS: Xcode Command Line Tools が入っているか確認: `xcode-select -p`

### その他のエラー

- Node.js のバージョンが 18 未満の場合は、18 以上にアップデートしてください
