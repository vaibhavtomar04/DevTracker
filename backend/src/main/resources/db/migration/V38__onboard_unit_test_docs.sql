-- V38: move tasks.unit_test_doc_url (base64 data-URI) into the documents subsystem
ALTER TABLE documents MODIFY COLUMN doc_type ENUM('BRD','API_DOC','DESIGN','SUPPORT','UNIT_TEST') NOT NULL;

ALTER TABLE tasks ADD COLUMN unit_test_doc_id BIGINT NULL;

INSERT INTO documents
  (cr_id, filename, content_type, size_bytes, doc_type, version, checksum_sha256, uploaded_by, uploaded_at, deleted)
SELECT
  t.id,
  COALESCE(t.unit_test_doc_name, CONCAT('unit-test-', t.id)),
  CASE WHEN t.unit_test_doc_url LIKE 'data:%;base64,%'
       THEN SUBSTRING_INDEX(SUBSTRING_INDEX(t.unit_test_doc_url, ':', -1), ';', 1)
       ELSE 'application/octet-stream' END,
  LENGTH(FROM_BASE64(SUBSTRING_INDEX(t.unit_test_doc_url, 'base64,', -1))),
  'UNIT_TEST', 1,
  SHA2(FROM_BASE64(SUBSTRING_INDEX(t.unit_test_doc_url, 'base64,', -1)), 256),
  t.created_by_id,
  COALESCE(t.created_date, NOW()),
  0
FROM tasks t
WHERE t.unit_test_doc_url IS NOT NULL AND t.unit_test_doc_url <> '';

INSERT INTO document_content (document_id, data)
SELECT d.id, FROM_BASE64(SUBSTRING_INDEX(t.unit_test_doc_url, 'base64,', -1))
FROM documents d JOIN tasks t ON t.id = d.cr_id
WHERE d.doc_type = 'UNIT_TEST';

UPDATE tasks t JOIN documents d ON d.cr_id = t.id AND d.doc_type = 'UNIT_TEST'
SET t.unit_test_doc_id = d.id;

ALTER TABLE tasks DROP COLUMN unit_test_doc_url;
