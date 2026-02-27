-- Add planning_path to yarikiru_projects for multi-repo / multi-.planning support
-- Each project can be linked to a .planning directory path

ALTER TABLE yarikiru_projects ADD COLUMN planning_path TEXT;
