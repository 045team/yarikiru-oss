-- ============================================
-- YARIKIRU User Plans Migration
-- Turso (SQLite) Database Schema
-- Migration: 015_user_plans
-- ============================================

CREATE TABLE IF NOT EXISTS yarikiru_user_plans (
  user_id TEXT PRIMARY KEY,
  plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'plus', 'pro', 'max')),
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
