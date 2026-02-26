-- 思いつき（Quick Capture）テーブル
CREATE TABLE IF NOT EXISTS ideas (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft', -- draft, registered, archived
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_ideas_user ON ideas(user_id);
CREATE INDEX idx_ideas_status ON ideas(user_id, status);
CREATE INDEX idx_ideas_created ON ideas(user_id, created_at DESC);

-- 既存のLocalStorageデータを移行するためのビュー（オプション）
-- CREATE VIEW ideas_with_user AS
-- SELECT i.*, u.username
-- FROM ideas i
-- JOIN users u ON i.user_id = u.id;
