-- ============================================================
-- DevTrack 2.0 — Fix document_content extra column
-- The table has both 'file_data' (extra, no default) and 'data' (correct).
-- JPA only inserts into 'data', but MySQL rejects the INSERT because
-- 'file_data' has no default value.
-- Solution: drop 'file_data' column if it exists.
-- ============================================================

SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'document_content'
      AND COLUMN_NAME  = 'file_data'
);

SET @sql = IF(
    @col_exists > 0,
    'ALTER TABLE document_content DROP COLUMN file_data',
    'SELECT ''Column file_data not found, nothing to drop'' AS info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

