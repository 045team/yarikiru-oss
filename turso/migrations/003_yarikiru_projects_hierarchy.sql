-- ============================================
-- Migration: Yarikiru Projects Hierarchy
-- 大目標(Project) > 中目標(Goal) > 小目標(SubTask)
-- ============================================
-- 新デザインの階層構造に対応

-- ============================================
-- 1. 大目標 (Projects)
-- ============================================
CREATE TABLE IF NOT EXISTS yarikiru_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_yarikiru_projects_user ON yarikiru_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_yarikiru_projects_created ON yarikiru_projects(created_at DESC);

-- ============================================
-- 2. 中目標 (Goals) - project に属する
-- ============================================
CREATE TABLE IF NOT EXISTS yarikiru_goals (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 30,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES yarikiru_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_yarikiru_goals_project ON yarikiru_goals(project_id);
CREATE INDEX IF NOT EXISTS idx_yarikiru_goals_sort ON yarikiru_goals(project_id, sort_order);

-- ============================================
-- 3. 小目標 (SubTasks) - goal に属する
-- ============================================
CREATE TABLE IF NOT EXISTS yarikiru_sub_tasks (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  label TEXT NOT NULL,
  is_done INTEGER NOT NULL DEFAULT 0 CHECK(is_done IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (goal_id) REFERENCES yarikiru_goals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_yarikiru_sub_tasks_goal ON yarikiru_sub_tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_yarikiru_sub_tasks_sort ON yarikiru_sub_tasks(goal_id, sort_order);

-- ============================================
-- 4. 学習したいこと (Learnings)
-- ============================================
CREATE TABLE IF NOT EXISTS yarikiru_learnings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Extracted',
  source_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_yarikiru_learnings_user ON yarikiru_learnings(user_id);
CREATE INDEX IF NOT EXISTS idx_yarikiru_learnings_created ON yarikiru_learnings(created_at DESC);

-- ============================================
-- 5. カレンダーブロック (枠組み)
-- ============================================
CREATE TABLE IF NOT EXISTS yarikiru_calendar_blocks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  timeframe TEXT NOT NULL CHECK(timeframe IN ('today', 'week', 'month')),
  time_label TEXT NOT NULL,
  title TEXT NOT NULL,
  block_type TEXT NOT NULL DEFAULT 'focus' CHECK(block_type IN ('planning', 'focus', 'empty')),
  is_current INTEGER NOT NULL DEFAULT 0 CHECK(is_current IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_yarikiru_calendar_user_timeframe ON yarikiru_calendar_blocks(user_id, timeframe);
CREATE INDEX IF NOT EXISTS idx_yarikiru_calendar_sort ON yarikiru_calendar_blocks(user_id, timeframe, sort_order);

-- ============================================
-- Triggers
-- ============================================
CREATE TRIGGER IF NOT EXISTS update_yarikiru_projects_updated_at
AFTER UPDATE ON yarikiru_projects FOR EACH ROW
BEGIN
  UPDATE yarikiru_projects SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_yarikiru_goals_updated_at
AFTER UPDATE ON yarikiru_goals FOR EACH ROW
BEGIN
  UPDATE yarikiru_goals SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_yarikiru_sub_tasks_updated_at
AFTER UPDATE ON yarikiru_sub_tasks FOR EACH ROW
BEGIN
  UPDATE yarikiru_sub_tasks SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_yarikiru_learnings_updated_at
AFTER UPDATE ON yarikiru_learnings FOR EACH ROW
BEGIN
  UPDATE yarikiru_learnings SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_yarikiru_calendar_blocks_updated_at
AFTER UPDATE ON yarikiru_calendar_blocks FOR EACH ROW
BEGIN
  UPDATE yarikiru_calendar_blocks SET updated_at = datetime('now') WHERE id = NEW.id;
END;
