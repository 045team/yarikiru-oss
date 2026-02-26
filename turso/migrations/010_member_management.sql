-- ============================================
-- YARIKIRU Member Management Migration
-- Turso (SQLite) Database Schema
-- Migration: 010_member_management
-- Created: 2026-02-21
-- ============================================

-- ============================================
-- 1. Members Table
-- ============================================
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'member' CHECK(role IN ('admin', 'moderator', 'member')),
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'deleted')),
  subscription_plan TEXT DEFAULT 'free' CHECK(subscription_plan IN ('free', 'basic', 'pro')),
  subscription_status TEXT DEFAULT 'active' CHECK(subscription_status IN ('active', 'canceled', 'expired')),
  subscription_start_date DATETIME,
  subscription_end_date DATETIME,
  company_name TEXT,
  industry TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  preferences TEXT, -- JSON string for user preferences
  last_active_at DATETIME,
  last_sign_in_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for members
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_subscription_plan ON members(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_members_last_active ON members(last_active_at DESC);

-- ============================================
-- 2. Member Activities Table
-- ============================================
CREATE TABLE IF NOT EXISTS member_activities (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK(activity_type IN (
    'page_view',
    'login',
    'logout',
    'project_created',
    'project_updated',
    'goal_completed',
    'task_completed',
    'subscription_updated',
    'profile_updated',
    'settings_changed',
    'export_download',
    'report_generated'
  )),
  activity_data TEXT, -- JSON string for additional activity data
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- Indexes for member_activities
CREATE INDEX IF NOT EXISTS idx_member_activities_member_id ON member_activities(member_id);
CREATE INDEX IF NOT EXISTS idx_member_activities_type ON member_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_member_activities_created_at ON member_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_activities_member_created ON member_activities(member_id, created_at DESC);

-- ============================================
-- 3. Member Sessions Table
-- ============================================
CREATE TABLE IF NOT EXISTS member_sessions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address TEXT,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

-- Indexes for member_sessions
CREATE INDEX IF NOT EXISTS idx_member_sessions_member_id ON member_sessions(member_id);
CREATE INDEX IF NOT EXISTS idx_member_sessions_token ON member_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_member_sessions_expires_at ON member_sessions(expires_at);

-- ============================================
-- Triggers: Auto-update updated_at
-- ============================================

-- members trigger
CREATE TRIGGER IF NOT EXISTS update_members_updated_at
AFTER UPDATE ON members
FOR EACH ROW
BEGIN
  UPDATE members SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
