-- GitHubアカウント連携テーブル
CREATE TABLE IF NOT EXISTS github_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    github_user_id INTEGER NOT NULL,
    github_login TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TEXT,
    scope TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_github_accounts_user ON github_accounts(user_id);
CREATE INDEX idx_github_accounts_github_id ON github_accounts(github_user_id);

-- GitHubリポジトリテーブル
CREATE TABLE IF NOT EXISTS github_repositories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    github_account_id TEXT,
    github_id INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    owner_login TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    language TEXT,
    stargazers_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (github_account_id) REFERENCES github_accounts(id) ON DELETE SET NULL
);

CREATE INDEX idx_github_repos_user ON github_repositories(user_id);
CREATE INDEX idx_github_repos_active ON github_repositories(user_id, is_active);
CREATE INDEX idx_github_repos_github_id ON github_repositories(github_id);

-- goals テーブルにGitHub関連カラムを追加
ALTER TABLE goals ADD COLUMN github_issue_id INTEGER;
ALTER TABLE goals ADD COLUMN github_issue_number INTEGER;
ALTER TABLE goals ADD COLUMN github_repository_id TEXT;
ALTER TABLE goals ADD COLUMN github_state TEXT DEFAULT 'open';
ALTER TABLE goals ADD COLUMN github_updated_at TEXT;

CREATE INDEX idx_goals_github_issue ON goals(github_issue_id);
CREATE INDEX idx_goals_github_repo ON goals(github_repository_id);
CREATE INDEX idx_goals_github_state ON goals(github_state);

-- GitHub同期ログテーブル
CREATE TABLE IF NOT EXISTS github_sync_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    repository_id TEXT NOT NULL,
    sync_type TEXT NOT NULL, -- 'full', 'incremental'
    status TEXT NOT NULL, -- 'pending', 'success', 'error'
    issues_created INTEGER DEFAULT 0,
    issues_updated INTEGER DEFAULT 0,
    issues_closed INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (repository_id) REFERENCES github_repositories(id) ON DELETE CASCADE
);

CREATE INDEX idx_github_sync_logs_user ON github_sync_logs(user_id);
CREATE INDEX idx_github_sync_logs_repo ON github_sync_logs(repository_id);
CREATE INDEX idx_github_sync_logs_status ON github_sync_logs(status);
