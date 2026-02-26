-- ============================================
-- Migration 008: URL Learning Agent
-- Created: 2026-02-20
-- ============================================

CREATE TABLE IF NOT EXISTS yarikiru_learning_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  what TEXT,
  how TEXT,
  impact TEXT,
  status TEXT NOT NULL DEFAULT 'unread' CHECK(status IN ('unread', 'summarized', 'articled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_learning_items_user ON yarikiru_learning_items(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_items_status ON yarikiru_learning_items(status);
