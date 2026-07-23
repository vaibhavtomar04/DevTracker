-- ============================================================
-- DevTrack 2.0 — Add DevOps UAT deployment notes persist fields
-- ============================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deployment_note TEXT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS server_path TEXT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS items_to_deploy TEXT NULL;
