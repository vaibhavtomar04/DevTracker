-- =========================================================================
-- DevTrack 2.0 — Production Database Clean Initialization Script
-- Run this script to purge development/test records and seed master data
-- =========================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Purge all transaction and transactional tracking tables
DELETE FROM tasks;
DELETE FROM bugs;
DELETE FROM task_workflow_history;
DELETE FROM comments;
DELETE FROM audit_logs;
DELETE FROM documents;
DELETE FROM document_content;
DELETE FROM bug_attachments;
DELETE FROM attachments;
DELETE FROM test_cases;
DELETE FROM mfa_backup_codes;
DELETE FROM mfa_trusted_devices;
DELETE FROM refresh_tokens;
DELETE FROM password_reset_tokens;
DELETE FROM report_jobs;

-- 2. Purge and seed core security accounts
DELETE FROM users;
DELETE FROM user_roles;

-- Seed default Admin account (Password: AdminPassword123!)
INSERT INTO users (id, username, password, full_name, email, mfa_enabled, must_change_password) VALUES
(1, 'admin', '$2b$12$85O7dZ.nAcJM8rrM8juVWucEjZBK8Ilp5yTqug1uvALNZc0mVfCTO', 'System Administrator', 'admin@devtrack.com', 0, 0);

-- Seed default Developer account (Password: DevPassword123!)
INSERT INTO users (id, username, password, full_name, email, mfa_enabled, must_change_password) VALUES
(2, 'developer', '$2b$12$qfDEqpBFjaFqid5ptOwZ1.iifR1gNZHwuzSGxpQthAb3ddgAI5zUi', 'Lead Developer', 'developer@devtrack.com', 0, 0);

-- Seed default Tester account (Password: TestPassword123!)
INSERT INTO users (id, username, password, full_name, email, mfa_enabled, must_change_password) VALUES
(3, 'tester', '$2b$12$exuQsMPKWMaqUIsAB3q8i.Pj5K3ZWT8QZKezqgnwzkPDkPiREAepO', 'QA Tester', 'tester@devtrack.com', 0, 0);

-- Map Roles to users
INSERT INTO user_roles (user_id, role) VALUES
(1, 'DEVADMIN'),
(1, 'CODEREVIEWER'),
(2, 'DEVELOPER'),
(3, 'TESTER');

SET FOREIGN_KEY_CHECKS = 1;
