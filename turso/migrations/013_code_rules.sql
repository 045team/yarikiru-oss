-- ============================================
-- Migration: 013_code_rules
-- Description: Adds tables for code quality rules and review history.
-- ============================================

-- User-specific custom rule settings
CREATE TABLE IF NOT EXISTS yarikiru_code_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  is_enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_yarikiru_code_rules_user ON yarikiru_code_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_yarikiru_code_rules_rule_id ON yarikiru_code_rules(rule_id);

-- Review history for tracking code quality over time
CREATE TABLE IF NOT EXISTS yarikiru_review_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  goal_id TEXT,
  review_date TEXT NOT NULL DEFAULT (datetime('now')),
  rules_passed INTEGER DEFAULT 0,
  rules_failed INTEGER DEFAULT 0,
  findings TEXT, -- JSON array of findings
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_yarikiru_review_history_user ON yarikiru_review_history(user_id);
CREATE INDEX IF NOT EXISTS idx_yarikiru_review_history_goal ON yarikiru_review_history(goal_id);
CREATE INDEX IF NOT EXISTS idx_yarikiru_review_history_date ON yarikiru_review_history(review_date);
