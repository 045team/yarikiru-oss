-- Phase 3: Dashboard UI Refinement & STATE.md Integration
-- Add `system_state_md` column to store the raw or parsed markdown from `.planning/STATE.md`

ALTER TABLE yarikiru_projects ADD COLUMN system_state_md TEXT;
