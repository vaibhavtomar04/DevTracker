-- V5__enterprise_cr_workflow_bugs.sql
-- Upgrade schema for enterprise CR management, multi-stage workflow engine, bug attachments, and MS OAuth configuration

-- 1. Extend tasks table for enterprise CR details
ALTER TABLE tasks ADD COLUMN project VARCHAR(100) NULL;
ALTER TABLE tasks ADD COLUMN sprint_id BIGINT NULL;
ALTER TABLE tasks ADD COLUMN branch_creation_date DATE NULL;
ALTER TABLE tasks ADD COLUMN branch_merge_date DATE NULL;
ALTER TABLE tasks ADD COLUMN labels VARCHAR(255) NULL;
ALTER TABLE tasks ADD COLUMN module VARCHAR(100) NULL;
ALTER TABLE tasks ADD COLUMN due_date DATE NULL;
ALTER TABLE tasks ADD COLUMN brd_document_id BIGINT NULL;

-- 2. Audit trail for strict 13-stage workflow transitions
CREATE TABLE IF NOT EXISTS task_workflow_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT NOT NULL,
    from_status VARCHAR(50) NULL,
    to_status VARCHAR(50) NOT NULL,
    transitioned_by_id BIGINT NULL,
    remarks TEXT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_twh_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- 3. Bug attachments linking table
CREATE TABLE IF NOT EXISTS bug_attachments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bug_id BIGINT NOT NULL,
    document_id BIGINT NULL,
    file_name VARCHAR(255) NULL,
    file_type VARCHAR(100) NULL,
    file_size VARCHAR(50) NULL,
    CONSTRAINT fk_ba_bug FOREIGN KEY (bug_id) REFERENCES bugs(id) ON DELETE CASCADE
);

-- 4. Dynamic app configurations for Microsoft SSO Integration
INSERT IGNORE INTO app_configs (config_key, config_value, description) VALUES 
('ms_login_enabled', 'true', 'Enable Microsoft Entra ID SSO Sign-In'),
('ms_client_id', 'demo-entra-client-id-devtrack', 'Microsoft Entra ID Client Application ID'),
('ms_tenant_id', 'common', 'Microsoft Entra ID Tenant Directory ID');
