-- ============================================
-- Migration 007: ステータス管理・作業ログ・学習強化
-- YARIKIRU v3.0 - Execute-First Planning
-- Created: 2026-02-20
-- ============================================

-- ============================================
-- 1. yarikiru_projects に description 追加
-- ============================================
ALTER TABLE yarikiru_projects ADD COLUMN description TEXT;
ALTER TABLE yarikiru_projects ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived'));

-- ============================================
-- 2. yarikiru_goals にステータス・学び・時間トラッキング追加
-- ============================================
ALTER TABLE yarikiru_goals ADD COLUMN status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'done', 'blocked'));
ALTER TABLE yarikiru_goals ADD COLUMN description TEXT;
ALTER TABLE yarikiru_goals ADD COLUMN actual_minutes INTEGER;
ALTER TABLE yarikiru_goals ADD COLUMN started_at TEXT;
ALTER TABLE yarikiru_goals ADD COLUMN completed_at TEXT;
ALTER TABLE yarikiru_goals ADD COLUMN learning TEXT;
ALTER TABLE yarikiru_goals ADD COLUMN priority INTEGER NOT NULL DEFAULT 0;

-- ============================================
-- 3. yarikiru_sub_tasks にステータス強化
-- ============================================
ALTER TABLE yarikiru_sub_tasks ADD COLUMN started_at TEXT;
ALTER TABLE yarikiru_sub_tasks ADD COLUMN completed_at TEXT;

-- ============================================
-- 4. 作業ログテーブル（時間計測+アプローチ記録）
-- ============================================
CREATE TABLE IF NOT EXISTS yarikiru_work_logs (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_minutes INTEGER,
  notes TEXT,
  approach TEXT,
  effectiveness INTEGER CHECK(effectiveness BETWEEN 1 AND 5),
  loop_detected INTEGER NOT NULL DEFAULT 0 CHECK(loop_detected IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (goal_id) REFERENCES yarikiru_goals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_work_logs_goal ON yarikiru_work_logs(goal_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_user ON yarikiru_work_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_started ON yarikiru_work_logs(started_at DESC);

-- ============================================
-- 5. 学習リソースに要約・ステップ・効果フィールド追加
-- ============================================
ALTER TABLE yarikiru_learnings ADD COLUMN summary TEXT;
ALTER TABLE yarikiru_learnings ADD COLUMN steps TEXT;
ALTER TABLE yarikiru_learnings ADD COLUMN impact TEXT;
ALTER TABLE yarikiru_learnings ADD COLUMN related_goal_id TEXT REFERENCES yarikiru_goals(id);
