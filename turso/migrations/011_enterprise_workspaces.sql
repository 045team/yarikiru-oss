-- ============================================
-- Migration: 011_enterprise_workspaces
-- Description: Adds multi-tenant group sharing support for Enterprise plans.
-- ============================================

-- 1. Workspaces (Companies/Groups)
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Workspace Members (Mapping users to workspaces with roles)
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (workspace_id, user_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);

-- 3. Add workspace_id to Projects (NULL means it's a personal project)
ALTER TABLE yarikiru_projects ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_yarikiru_projects_workspace ON yarikiru_projects(workspace_id);

-- 4. Add workspace_id to Learnings (allowing shared know-how)
ALTER TABLE yarikiru_learnings ADD COLUMN workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_yarikiru_learnings_workspace ON yarikiru_learnings(workspace_id);

-- Triggers for workspace updated_at
CREATE TRIGGER IF NOT EXISTS update_workspaces_updated_at
AFTER UPDATE ON workspaces FOR EACH ROW
BEGIN
  UPDATE workspaces SET updated_at = datetime('now') WHERE id = NEW.id;
END;
