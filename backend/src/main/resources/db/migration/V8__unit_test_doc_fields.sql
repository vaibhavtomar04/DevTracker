-- V8__unit_test_doc_fields.sql
-- Add unit testing document storage fields to tasks table

ALTER TABLE tasks
    ADD COLUMN unit_test_doc_url    LONGTEXT    NULL COMMENT 'Base64-encoded unit testing document uploaded by developer on UAT push',
    ADD COLUMN unit_test_doc_name   VARCHAR(512) NULL COMMENT 'Original filename of the unit testing document';
