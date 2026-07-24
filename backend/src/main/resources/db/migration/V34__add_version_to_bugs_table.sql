-- Ensure version column exists on bugs table for JPA @Version optimistic locking
SET @dbname = DATABASE();
SET @tablename = 'bugs';
SET @columnname = 'version';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  'ALTER TABLE bugs ADD COLUMN version BIGINT NOT NULL DEFAULT 0'
));
PREPARE addVersionColumn FROM @preparedStatement;
EXECUTE addVersionColumn;
DEALLOCATE PREPARE addVersionColumn;
