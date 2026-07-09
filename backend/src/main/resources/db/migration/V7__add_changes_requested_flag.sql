-- ============================================================
-- DevTrack 2.0 -- Add Changes Requested Flag for CR Workflow
-- Adds flags to track when a Change Request has been sent back by admin for changes
-- ============================================================

-- 1. Add changes requested flag and timestamp to tasks table
ALTER TABLE tasks ADD COLUMN changes_requested TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN changes_requested_date DATETIME NULL;

-- Optional: Add index for faster querying of change requests
ALTER TABLE tasks ADD INDEX idx_changes_requested (changes_requested);

-- ============================================================
-- VERIFY AFTER MIGRATION
-- SHOW CREATE TABLE tasks;
-- ============================================================
