-- ============================================================
-- DevTrack 2.0 — Fix document_content foreign key target
-- The document_content table FK points to document_master.id
-- but the JPA Document entity saves to the 'documents' table.
-- Fix: drop the old FK and add a new one pointing to documents.id
-- ============================================================

-- Step 1: Drop the existing wrong FK (to document_master)
SET @fk_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA   = DATABASE()
      AND TABLE_NAME     = 'document_content'
      AND CONSTRAINT_NAME = 'document_content_ibfk_1'
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @sql1 = IF(
    @fk_exists > 0,
    'ALTER TABLE document_content DROP FOREIGN KEY document_content_ibfk_1',
    'SELECT ''FK document_content_ibfk_1 not found, skipping drop'' AS info'
);
PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

-- Step 2: Add correct FK pointing to documents.id
ALTER TABLE document_content
    ADD CONSTRAINT fk_doc_content_documents
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
