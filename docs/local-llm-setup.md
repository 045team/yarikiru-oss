# Local LLM Setup Guide for YARIKIRU

YARIKIRU はローカルLLM（Ollama、LM Studioなど）と直接通信して、タスク分解機能を提供します。APIキーは不要で、全ての処理がローカルで完結します。

## 対応しているLLM

| LLM | プロバイダーID | デフォルトURL |
|-----|--------------|--------------|
| Ollama | `ollama` | http://localhost:11434 |
| LM Studio | `lm-studio` | http://localhost:1234/v1 |
| OpenAI-Compatible | `openai-compatible` | ユーザー設定 |

## セットアップ手順

### オプション1: Ollama（推奨）

1. **Ollamaのインストール**

```bash
# macOS
brew install ollama

# または公式サイトからダウンロード
# https://ollama.ai
```

2. **モデルのダウンロード**

```bash
# 日本語対応モデルの推奨
ollama pull llama3.3

# または軽量モデル
ollama pull llama3.2

# 利用可能なモデルを確認
ollama list
```

3. **Ollamaサーバーの起動**

```bash
ollama serve
```

4. **環境変数の設定**

```bash
# .env.local
LLM_PROVIDER=ollama
LLM_OLLAMA_BASE_URL=http://localhost:11434
LLM_OLLAMA_MODEL=llama3.3
```

### オプション2: LM Studio

1. **LM Studioのインストール**

https://lmstudio.ai/ からダウンロードしてインストール

2. **モデルのダウンロード**

- LM Studioを起動
- 左側の検索バーでモデルを検索（例: `Llama 3.3`）
- Downloadボタンをクリック

3. **ローカルサーバーの起動**

- 左側のメニューで [💬] アイコン（Chat）をクリック
- [Start Server] ボタンをクリック
- ポート番号を確認（デフォルト: 1234）

4. **環境変数の設定**

```bash
# .env.local
LLM_PROVIDER=lm-studio
LLM_LM_STUDIO_BASE_URL=http://localhost:1234/v1
LLM_LM_STUDIO_MODEL=local-model
```

### オプション3: その他のOpenAI互換サーバー

text-generation-webui、vLLM、LocalAIなど、OpenAI互換APIを提供するサーバーを使用できます。

```bash
# .env.local
LLM_PROVIDER=openai-compatible
LLM_OPENAI_COMPATIBLE_BASE_URL=http://localhost:8080/v1
LLM_OPENAI_COMPATIBLE_MODEL=model-name
```

## 動作確認

```bash
# YARIKIRU開発サーバー起動
npm run dev

# ブラウザでアクセス
open http://localhost:3000
```

タスク作成画面で「AIでタスク分解」ボタンをクリックして、LLMが動作しているか確認してください。

## トラブルシューティング

### "LLMサーバーに接続できません" というエラー

1. LLMサーバーが起動しているか確認
2. ポート番号が正しいか確認
3. ファイアウォールの設定を確認

### Ollamaで "model not found" エラー

```bash
# モデルを確認
ollama list

# モデルをダウンロード
ollama pull llama3.3
```

### レスポンスが遅い

- より小さいモデルを使用してください（例: llama3.2）
- GPUアクセラレーションが有効になっているか確認してください

## 日本語対応モデルの推奨

| モデル | サイズ | 推論速度 | 日本語 |
|--------|--------|----------|--------|
| llama3.3 | 4.7GB | 中 | ○ |
| llama3.2 | 2.0GB | 快 | ○ |
| qwen2.5 | 4.6GB | 中 | ◎ |

## プライバシーについて

- 全ての処理がローカルで行われます
- タスクデータが外部に送信されることはありません
- インターネット接続がなくても動作します
