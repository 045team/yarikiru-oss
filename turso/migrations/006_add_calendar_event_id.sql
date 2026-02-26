-- ============================================
-- Migration: Add Calendar Event ID to Tasks
-- ============================================
-- This migration adds calendar_event_id to generated_tasks
-- to track the corresponding Google Calendar event

-- Add calendar_event_id column to generated_tasks
ALTER TABLE generated_tasks ADD COLUMN calendar_event_id TEXT;

-- Create index for calendar event lookups
CREATE INDEX IF NOT EXISTS idx_generated_tasks_calendar_event ON generated_tasks(calendar_event_id);
