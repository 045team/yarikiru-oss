-- ============================================
-- Migration 014: Graph-Based Task Specification System
-- YARIKIRU v4.0 - Graph機能 Phase 1
-- Created: 2026-02-21
-- ============================================
--
-- このマイグレーションは、DAGベースのタスク仕様書システムを導入します。
-- 既存の yarikiru_sub_tasks テーブル（階層型リスト構造）との相互運用性を維持しつつ、
-- より柔軟な依存関係表現を可能にします。
--
-- 構造:
--   task_graphs (Graph全体のメタデータ)
--     ├── task_graph_nodes (ノード/タスク)
--     └── task_graph_edges (エッジ/依存関係)
--
-- 外部キー: task_graphs.goal_id → yarikiru_goals.id
-- ============================================

-- ============================================
-- 1. task_graphs テーブル
-- ============================================
-- Graph全体のメタデータを管理
CREATE TABLE IF NOT EXISTS task_graphs (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  graph_type TEXT NOT NULL DEFAULT 'dag' CHECK(graph_type IN (
    'dag',         -- 一般的なDAG（複雑な依存関係）
    'sequence',    -- 線形順序（順次実行）
    'hierarchy',   -- 階層構造（親子関係）
    'network',     -- ネットワーク（複数依存先）
    'conditional', -- 条件付き分岐
    'parallel'     -- 並列実行
  )),
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0, 1)),
  -- is_primary: 1 = このGraphがSubTasksのマスター
  --             0 = Graphは独立した仕様書
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (goal_id) REFERENCES yarikiru_goals(id) ON DELETE CASCADE
);

-- ============================================
-- 2. task_graph_nodes テーブル
-- ============================================
-- Graph内のノード（タスク）を管理
CREATE TABLE IF NOT EXISTS task_graph_nodes (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  -- node_id: グラフ内で一意な識別子（エッジから参照される）
  label TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  properties TEXT NOT NULL DEFAULT '{}',
  -- properties JSON schema:
  -- {
  --   "priority": "critical" | "high" | "medium" | "low",
  --   "estimated_minutes": integer,
  --   "status": "todo" | "in_progress" | "done" | "blocked",
  --   "assigned_to": "user_id",
  --   "tags": ["tag1", "tag2"],
  --   "color": "#hex",
  --   "icon": "emoji"
  -- }
  x REAL,
  y REAL,
  -- x, y: UI配置用座標（オプション）
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE
);

-- ============================================
-- 3. task_graph_edges テーブル
-- ============================================
-- Graph内のエッジ（依存関係）を管理
CREATE TABLE IF NOT EXISTS task_graph_edges (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL,
  from_node_id TEXT NOT NULL,
  to_node_id TEXT NOT NULL,
  -- from_node_id, to_node_id は task_graph_nodes.node_id を参照
  edge_type TEXT NOT NULL DEFAULT 'dependency' CHECK(edge_type IN (
    'dependency',  -- 一般的な依存関係
    'sequence',    -- 順序関係
    'conditional', -- 条件付き実行
    'blocking'     -- ブロッキング依存
  )),
  condition TEXT NOT NULL DEFAULT '{}',
  -- condition JSON schema:
  -- {
  --   "type": "completion" | "approval" | "manual" | "time_based" | "custom",
  --   "required_value": any,
  --   "expression": "status == 'approved'"
  -- }
  label TEXT,
  -- label: エッジに表示するラベル（オプション）
  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (graph_id) REFERENCES task_graphs(id) ON DELETE CASCADE
);

-- ============================================
-- 4. インデックス作成
-- ============================================

-- task_graphs インデックス
CREATE INDEX IF NOT EXISTS idx_task_graphs_goal ON task_graphs(goal_id);
CREATE INDEX IF NOT EXISTS idx_task_graphs_type ON task_graphs(graph_type);
CREATE INDEX IF NOT EXISTS idx_task_graphs_primary ON task_graphs(is_primary);

-- task_graph_nodes インデックス
CREATE INDEX IF NOT EXISTS idx_task_graph_nodes_graph ON task_graph_nodes(graph_id);
CREATE INDEX IF NOT EXISTS idx_task_graph_nodes_node_id ON task_graph_nodes(node_id);
CREATE INDEX IF NOT EXISTS idx_task_graph_nodes_sort ON task_graph_nodes(graph_id, sort_order);
-- ステータス別インデックス（JSON抽出）
CREATE INDEX IF NOT EXISTS idx_task_graph_nodes_status ON task_graph_nodes(
  graph_id,
  json_extract(properties, '$.status')
);

-- task_graph_edges インデックス
CREATE INDEX IF NOT EXISTS idx_task_graph_edges_graph ON task_graph_edges(graph_id);
CREATE INDEX IF NOT EXISTS idx_task_graph_edges_from ON task_graph_edges(graph_id, from_node_id);
CREATE INDEX IF NOT EXISTS idx_task_graph_edges_to ON task_graph_edges(graph_id, to_node_id);
-- 複合インデックス（双方向探索用）
CREATE INDEX IF NOT EXISTS idx_task_graph_edges_from_to ON task_graph_edges(
  graph_id,
  from_node_id,
  to_node_id
);

-- ============================================
-- 5. トリガー作成
-- ============================================

-- task_graphs updated_at 自動更新
CREATE TRIGGER IF NOT EXISTS update_task_graphs_updated_at
AFTER UPDATE ON task_graphs
FOR EACH ROW
BEGIN
  UPDATE task_graphs SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- task_graph_nodes updated_at 自動更新
-- ※ task_graph_nodes には updated_at がないため、graph_id を通じて親を更新
-- 必要に応じて task_graph_nodes にも updated_at を追加可能
CREATE TRIGGER IF NOT EXISTS update_task_graphs_timestamp_on_node_change
AFTER UPDATE ON task_graph_nodes
FOR EACH ROW
BEGIN
  UPDATE task_graphs SET updated_at = datetime('now')
  WHERE id = NEW.graph_id;
END;

CREATE TRIGGER IF NOT EXISTS update_task_graphs_timestamp_on_node_insert
AFTER INSERT ON task_graph_nodes
FOR EACH ROW
BEGIN
  UPDATE task_graphs SET updated_at = datetime('now')
  WHERE id = NEW.graph_id;
END;

CREATE TRIGGER IF NOT EXISTS update_task_graphs_timestamp_on_node_delete
AFTER DELETE ON task_graph_nodes
FOR EACH ROW
BEGIN
  UPDATE task_graphs SET updated_at = datetime('now')
  WHERE id = OLD.graph_id;
END;

CREATE TRIGGER IF NOT EXISTS update_task_graphs_timestamp_on_edge_change
AFTER UPDATE ON task_graph_edges
FOR EACH ROW
BEGIN
  UPDATE task_graphs SET updated_at = datetime('now')
  WHERE id = NEW.graph_id;
END;

CREATE TRIGGER IF NOT EXISTS update_task_graphs_timestamp_on_edge_insert
AFTER INSERT ON task_graph_edges
FOR EACH ROW
BEGIN
  UPDATE task_graphs SET updated_at = datetime('now')
  WHERE id = NEW.graph_id;
END;

CREATE TRIGGER IF NOT EXISTS update_task_graphs_timestamp_on_edge_delete
AFTER DELETE ON task_graph_edges
FOR EACH ROW
BEGIN
  UPDATE task_graphs SET updated_at = datetime('now')
  WHERE id = OLD.graph_id;
END;

-- ============================================
-- 6. 制約チェック用ビュー（オプション）
-- ============================================

-- 孤立ノード検出ビュー
CREATE VIEW IF NOT EXISTS v_orphan_nodes AS
SELECT
  n.id,
  n.graph_id,
  n.node_id,
  n.label,
  COUNT(e_in.id) as incoming_edges,
  COUNT(e_out.id) as outgoing_edges
FROM task_graph_nodes n
LEFT JOIN task_graph_edges e_in ON e_in.graph_id = n.graph_id AND e_in.to_node_id = n.node_id
LEFT JOIN task_graph_edges e_out ON e_out.graph_id = n.graph_id AND e_out.from_node_id = n.node_id
GROUP BY n.id
HAVING incoming_edges = 0 AND outgoing_edges = 0;

-- ============================================
-- 7. 既存データとの互換性確保
-- ============================================
--
-- SubTasks → Graph 変換用ヘルパー関数は
-- src/lib/turso/graphs.ts で実装
--
-- 変換ロジック概要:
-- 1. yarikiru_sub_tasks を goal_id で取得
-- 2. sort_order 順に node_id を生成 (node_1, node_2, ...)
-- 3. 直前のノードへの依存エッジを生成
-- 4. graph_type = 'sequence' として task_graphs に作成
-- 5. is_primary = 1 でマーク
--
-- Graph → SubTasks 変換:
-- 1. DAGをトポロジカルソート
-- 2. sort_order を再採番
-- 3. yarikiru_sub_tasks テーブルに同期
-- ============================================

-- ============================================
-- マイグレーション完了
-- ============================================
-- バージョン: 014
-- 作成日: 2026-02-21
-- 作成者: Claude (Backend Architect)
-- ============================================
