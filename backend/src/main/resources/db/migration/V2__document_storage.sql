-- ============================================================
-- DevTrack 2.0 — Document Storage Migration
-- Run once against your MySQL schema.
-- MySQL max_allowed_packet MUST be >= 64MB (set in my.cnf):
--   [mysqld]
--   max_allowed_packet = 64M
-- ============================================================

-- ── 1. Document metadata table ────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
    id               BIGINT          NOT NULL AUTO_INCREMENT,
    cr_id            BIGINT          NOT NULL COMMENT 'FK to tasks.id (Change Request)',
    filename         VARCHAR(512)    NOT NULL,
    content_type     VARCHAR(128)    NOT NULL COMMENT 'Validated MIME type',
    size_bytes       BIGINT          NOT NULL,
    doc_type         ENUM('BRD','API_DOC','DESIGN','SUPPORT') NOT NULL,
    version          INT             NOT NULL DEFAULT 1
        COMMENT 'Auto-incremented per (cr_id, doc_type, filename)',
    checksum_sha256  CHAR(64)        NOT NULL COMMENT 'SHA-256 hex of raw bytes',
    uploaded_by      BIGINT          NOT NULL COMMENT 'FK to users.id',
    uploaded_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted          TINYINT(1)      NOT NULL DEFAULT 0,
    deleted_at       DATETIME                 DEFAULT NULL,
    deleted_by       BIGINT                   DEFAULT NULL COMMENT 'FK to users.id',

    PRIMARY KEY (id),
    INDEX  idx_doc_cr_id        (cr_id),
    INDEX  idx_doc_cr_doc_type  (cr_id, doc_type),
    INDEX  idx_doc_version      (cr_id, doc_type, filename, version),

    CONSTRAINT fk_doc_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id),
    CONSTRAINT fk_doc_deleted_by  FOREIGN KEY (deleted_by)  REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Document metadata — heavy bytes live in document_content';

-- ── 2. Document binary content table ─────────────────────────
-- Separated from metadata so that list/detail queries NEVER load blobs.
-- ON DELETE CASCADE ties the lifespan of content to metadata.
CREATE TABLE IF NOT EXISTS document_content (
    document_id  BIGINT    NOT NULL,
    data         LONGBLOB  NOT NULL COMMENT 'Raw file bytes — never base64',

    PRIMARY KEY (document_id),
    CONSTRAINT fk_doc_content_id FOREIGN KEY (document_id)
        REFERENCES documents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Document binary payload — LAZY-loaded, never joined to documents in list queries';

-- ── 3. Audit log extension ────────────────────────────────────
-- The existing audit_logs table uses entity_type VARCHAR.
-- Add 'DOCUMENT' as a valid value by extending the existing column
-- (no DDL change needed — it's already VARCHAR, just note it here).

-- ── FUTURE OBJECT STORAGE MIGRATION PATH ─────────────────────
-- When migrating to S3/GCS/Azure Blob:
--   1. Add columns: storage_backend ENUM('DB','S3'), object_key VARCHAR(1024)
--   2. DocumentService checks storage_backend; if S3 → generate presigned URL
--   3. Frontend API contract is UNCHANGED — still calls /api/documents/{id}/download
--   4. Drain old rows: backfill object_key, set storage_backend='S3', truncate document_content
--   The documents table (metadata) always remains the source of truth.

-- ── VERIFY AFTER MIGRATION ────────────────────────────────────
-- SHOW CREATE TABLE documents;
-- SHOW CREATE TABLE document_content;
-- SELECT TABLE_NAME, ENGINE, TABLE_COLLATION FROM information_schema.TABLES
--   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('documents','document_content');
