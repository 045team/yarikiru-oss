-- ============================================
-- Migration: Add Urgent Flag to Generated Tasks
-- ============================================
-- Adds is_urgent flag to generated_tasks table
-- for "emergency task interruption" feature

-- Add is_urgent column (default: 0 = not urgent)
ALTER TABLE generated_tasks ADD COLUMN is_urgent INTEGER NOT NULL DEFAULT 0;

-- Create index for urgent tasks queries
CREATE INDEX IF NOT EXISTS idx_generated_tasks_urgent ON generated_tasks(is_urgent);

-- Composite index for goal + urgent queries
CREATE INDEX IF NOT EXISTS idx_generated_tasks_goal_urgent ON generated_tasks(goal_id, is_urgent);

-- Trigger to update updated_at when is_urgent changes
CREATE TRIGGER IF NOT EXISTS update_generated_tasks_urgent_updated_at
AFTER UPDATE OF is_urgent ON generated_tasks
FOR EACH ROW
BEGIN
  UPDATE generated_tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
