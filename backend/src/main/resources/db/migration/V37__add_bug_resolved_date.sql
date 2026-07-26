SET @dbname = DATABASE();
SET @tablename = "bugs";
SET @columnname = "resolved_date";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE bugs ADD COLUMN resolved_date DATETIME NULL;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- One-time historical backfill: earliest transition into any resolution state.
-- Covers RESOLVED-first bugs AND bugs that jumped straight to VERIFIED/CLOSED.
UPDATE bugs b
JOIN (SELECT entity_id, MIN(changed_date) d FROM audit_logs
      WHERE entity_type='BUG' AND field_name='status'
        AND (new_value LIKE '%RESOLVED%' OR new_value LIKE '%VERIFIED%' OR new_value LIKE '%CLOSED%')
      GROUP BY entity_id) a
  ON a.entity_id = b.id
SET b.resolved_date = a.d
WHERE b.resolved_date IS NULL;
