-- ============================================
-- YARIKIRU v2.0 用語移行スクリプト
-- 作成日: 2026-02-22
-- ============================================
-- このスクリプトは既存のプロジェクトに「マニュアル」プレフィックスを追加し、
-- GitHub連携のリポジトリと区別できるようにします。

-- 既存プロジェクトに「マニュアル」プレフィックス追加
UPDATE yarikiru_projects
SET title = '【マニュアル】' || title
WHERE title NOT LIKE '【マニュアル】%'
  AND title NOT LIKE 'GitHub:%'
  AND title NOT LIKE 'github:%';

-- 以下は将来のGitHub連携時に使用する例（コメントアウト）
-- CREATE INDEX IF NOT EXISTS idx_repos_github ON yarikiru_projects(github_repository_id);
-- CREATE INDEX IF NOT EXISTS idx_goals_github_issue ON yarikiru_goals(github_issue_number);
