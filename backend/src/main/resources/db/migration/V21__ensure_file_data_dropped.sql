-- ============================================================
-- DevTrack 2.0 — Drop file_data column from document_content
-- Drops 'file_data' column if it exists in the 'document_content' table.
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
