-- ============================================================
-- DevTrack 2.0 — Idempotent Catch-Up Migration
-- Guarantee presence of all DevOps & deployment columns on tasks table
-- ============================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deployment_note TEXT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS server_path TEXT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS items_to_deploy TEXT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS expected_sit_deployment_date DATE NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS expected_uat_deployment_date DATE NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rollback_count INT DEFAULT 0;
