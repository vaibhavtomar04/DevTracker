-- ============================================================
-- DevTrack 2.0 — Add DevOps UAT deployment notes persist fields
-- ============================================================

ALTER TABLE tasks ADD COLUMN deployment_note TEXT NULL;
ALTER TABLE tasks ADD COLUMN server_path TEXT NULL;
ALTER TABLE tasks ADD COLUMN items_to_deploy TEXT NULL;
