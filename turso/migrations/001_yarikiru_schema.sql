-- ============================================
-- YARIKIRU Task Management App Migration
-- Turso (SQLite) Database Schema
-- Migration: 001_yarikiru_schema
-- Created: 2026-02-19
-- ============================================

-- ============================================
-- 1. Goals Table
-- ============================================
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deadline DATE,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for goals
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON goals(deadline);
CREATE INDEX IF NOT EXISTS idx_goals_user_created ON goals(user_id, created_at DESC);

-- ============================================
-- 2. Generated Tasks Table
-- ============================================
CREATE TABLE IF NOT EXISTS generated_tasks (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  estimated_minutes INTEGER CHECK(estimated_minutes > 0),
  priority TEXT CHECK(priority IN ('high', 'medium', 'low')),
  is_completed BOOLEAN DEFAULT FALSE CHECK(is_completed IN (0, 1)),
  scheduled_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);

-- Indexes for generated_tasks
CREATE INDEX IF NOT EXISTS idx_generated_tasks_goal_completed ON generated_tasks(goal_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_scheduled_date ON generated_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_priority ON generated_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_goal_id ON generated_tasks(goal_id);

-- ============================================
-- 3. Focus Sessions Table
-- ============================================
CREATE TABLE IF NOT EXISTS focus_sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  started_at DATETIME,
  completed_at DATETIME,
  elapsed_minutes INTEGER CHECK(elapsed_minutes >= 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES generated_tasks(id) ON DELETE CASCADE
);

-- Indexes for focus_sessions
CREATE INDEX IF NOT EXISTS idx_focus_sessions_task_user ON focus_sessions(task_id, user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON focus_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);

-- ============================================
-- 4. Calendar Integrations Table
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_integrations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  calendar_id TEXT,
  provider TEXT CHECK(provider IN ('google', 'apple', 'outlook')),
  access_token TEXT,
  refresh_token TEXT,
  sync_enabled BOOLEAN DEFAULT TRUE CHECK(sync_enabled IN (0, 1)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for calendar_integrations
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user_id ON calendar_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_sync_enabled ON calendar_integrations(sync_enabled);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_provider ON calendar_integrations(provider);

-- ============================================
-- Triggers: Auto-update updated_at
-- ============================================

-- goals trigger
CREATE TRIGGER IF NOT EXISTS update_goals_updated_at
AFTER UPDATE ON goals
FOR EACH ROW
BEGIN
  UPDATE goals SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- generated_tasks trigger
CREATE TRIGGER IF NOT EXISTS update_generated_tasks_updated_at
AFTER UPDATE ON generated_tasks
FOR EACH ROW
BEGIN
  UPDATE generated_tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- calendar_integrations trigger
CREATE TRIGGER IF NOT EXISTS update_calendar_integrations_updated_at
AFTER UPDATE ON calendar_integrations
FOR EACH ROW
BEGIN
  UPDATE calendar_integrations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
