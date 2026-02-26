-- ============================================
-- Migration 009: AI時間予測カラム追加
-- YARIKIRU v4.0 - AI Time Prediction
-- Created: 2026-02-20
-- ============================================

-- yarikiru_goals に AI予測時間カラムを追加
-- predict_goal_time が計算した結果をキャッシュする
ALTER TABLE yarikiru_goals ADD COLUMN ai_predicted_minutes INTEGER;

-- 予測精度確認のためのインデックス（done + actual_minutes がある行をすばやく検索）
CREATE INDEX IF NOT EXISTS idx_goals_done_actual ON yarikiru_goals(status, actual_minutes)
  WHERE status = 'done' AND actual_minutes IS NOT NULL;
