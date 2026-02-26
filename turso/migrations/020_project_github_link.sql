-- プロジェクトとGitHubリポジトリの紐付けテーブル
CREATE TABLE IF NOT EXISTS project_github_repositories (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    github_repository_id TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (github_repository_id) REFERENCES github_repositories(id) ON DELETE CASCADE,
    UNIQUE(project_id, github_repository_id)
);

CREATE INDEX idx_project_github_repos_project ON project_github_repositories(project_id);
CREATE INDEX idx_project_github_repos_github ON project_github_repositories(github_repository_id);
CREATE INDEX idx_project_github_repos_primary ON project_github_repositories(project_id, is_primary);
