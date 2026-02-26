-- ============================================
-- Migration 017: Extend Vector Search to Goals and Tasks
-- Created: 2026-02-22
-- ============================================
--
-- This migration extends vector search support to:
-- - yarikiru_goals (中目標)
-- - yarikiru_sub_tasks (小目標)
-- - yarikiru_work_logs (作業ログ)
--
-- Each table gets an `embedding` BLOB column to store
-- vector embeddings for semantic search.

-- ============================================
-- 1. Goals (中目標) - Embed title + description
-- ============================================
ALTER TABLE yarikiru_goals ADD COLUMN embedding BLOB;

-- ============================================
-- 2. Sub Tasks (小目標) - Embed label
-- ============================================
ALTER TABLE yarikiru_sub_tasks ADD COLUMN embedding BLOB;

-- ============================================
-- 3. Work Logs (作業ログ) - Embed notes + approach + learning
-- ============================================
ALTER TABLE yarikiru_work_logs ADD COLUMN embedding BLOB;

-- ============================================
-- Indexes for efficient querying
-- ============================================
CREATE INDEX IF NOT EXISTS idx_goals_embedding ON yarikiru_goals(id) WHERE embedding IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sub_tasks_embedding ON yarikiru_sub_tasks(id) WHERE embedding IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_logs_embedding ON yarikiru_work_logs(id) WHERE embedding IS NOT NULL;
