-- ============================================
-- Migration: Add Goals and Generated Tasks
-- ============================================
-- This migration adds support for AI-powered goal decomposition
-- and task management

-- ============================================
-- Goals Table
-- ============================================

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  deadline TEXT NOT NULL,
  available_hours_per_day REAL NOT NULL,
  context TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  decomposition_metadata TEXT, -- JSON
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- Generated Tasks Table
-- ============================================

CREATE TABLE IF NOT EXISTS generated_tasks (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL CHECK(priority IN ('high', 'medium', 'low')),
  order_index INTEGER NOT NULL,
  estimated_minutes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
  subtasks TEXT NOT NULL DEFAULT '[]', -- JSON array of subtasks
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);

-- ============================================
-- Indexes
-- ============================================

-- Goals indexes
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_created ON goals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON goals(deadline);

-- Generated tasks indexes
CREATE INDEX IF NOT EXISTS idx_generated_tasks_goal ON generated_tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_priority ON generated_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_status ON generated_tasks(status);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_order ON generated_tasks(order_index);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_goals_user_created ON goals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_goal_order ON generated_tasks(goal_id, order_index);

-- ============================================
-- Triggers
-- ============================================

-- Goals updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_goals_updated_at
AFTER UPDATE ON goals
FOR EACH ROW
BEGIN
  UPDATE goals SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Generated tasks updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_generated_tasks_updated_at
AFTER UPDATE ON generated_tasks
FOR EACH ROW
BEGIN
  UPDATE generated_tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
