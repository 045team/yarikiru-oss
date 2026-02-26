-- ============================================
-- Migration: 012_api_keys
-- Description: Adds personal access tokens (API Keys) for MCP server authentication.
-- ============================================

CREATE TABLE IF NOT EXISTS yarikiru_api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL, -- Hashed key to prevent plain text exposure
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_yarikiru_api_keys_user ON yarikiru_api_keys(user_id);
