-- phase_contents: Import した .planning の PLAN/SUMMARY/VERIFICATION を保存
-- planningPath が null のプロジェクトでも Phase 詳細を表示するため

ALTER TABLE yarikiru_projects ADD COLUMN phase_contents TEXT;
