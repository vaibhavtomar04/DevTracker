-- ============================================================
-- DevTrack 2.0 — Ensure document_content foreign key target
-- ============================================================

-- 1. Find and drop any foreign key referencing 'document_master'
SET @fk_name = (
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'document_content'
      AND REFERENCED_TABLE_NAME = 'document_master'
    LIMIT 1
);

SET @sql1 = IF(
    @fk_name IS NOT NULL,
    CONCAT('ALTER TABLE document_content DROP FOREIGN KEY ', @fk_name),
    'SELECT ''No foreign key referencing document_master exists'' AS info'
);

PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- 2. Drop constraint 'document_content_ibfk_1' explicitly if it exists
SET @fk_by_name = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'document_content'
      AND CONSTRAINT_NAME = 'document_content_ibfk_1'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @sql2 = IF(
    @fk_by_name > 0,
    'ALTER TABLE document_content DROP FOREIGN KEY document_content_ibfk_1',
    'SELECT ''FK document_content_ibfk_1 not found, skipping'' AS info'
);

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 3. Add correct foreign key pointing to documents(id) if not present
SET @fk_correct_exists = (
    SELECT COUNT(*)
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'document_content'
      AND REFERENCED_TABLE_NAME = 'documents'
);

SET @sql3 = IF(
    @fk_correct_exists = 0,
    'ALTER TABLE document_content ADD CONSTRAINT fk_doc_content_documents FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE',
    'SELECT ''Correct foreign key already exists'' AS info'
);

PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;
