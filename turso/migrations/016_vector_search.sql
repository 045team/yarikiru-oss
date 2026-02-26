-- ============================================
-- Migration 016: Vector Search & Embeddings
-- Created: 2026-02-22
-- ============================================

-- members テーブルに Vertex AI API キー保存用カラムを追加
-- 各ユーザーが自分の GCP サービスアカウントキーを設定できるように
ALTER TABLE members ADD COLUMN vertex_ai_api_key TEXT;

-- yarikiru_learning_items テーブルに埋め込みベクトル保存用カラムを追加
-- BLOB 型で 768 次元の float32 ベクトル（約 3KB）を保存
ALTER TABLE yarikiru_learning_items ADD COLUMN embedding BLOB;

-- ユーザーごとの埋め込み生成クォータ管理テーブル
CREATE TABLE IF NOT EXISTS user_embeddings_quota (
  user_id TEXT NOT NULL PRIMARY KEY,
  month_count INTEGER NOT NULL DEFAULT 0,
  month_limit INTEGER NOT NULL DEFAULT 10000,
  day_count INTEGER NOT NULL DEFAULT 0,
  day_limit INTEGER NOT NULL DEFAULT 500,
  last_reset TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES members(id) ON DELETE CASCADE
);
