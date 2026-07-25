-- Flyway Migration V35: Analytics & Audit Log Indexes
-- Idempotent index creation supporting bounded analytics aggregations and fast audit log filtering.

SET @exist := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'audit_logs' AND index_name = 'idx_audit_logs_entity');
SET @sqlstmt := IF(@exist > 0, 'SELECT ''index idx_audit_logs_entity exists''', 'CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id)');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'audit_logs' AND index_name = 'idx_audit_logs_changed');
SET @sqlstmt := IF(@exist > 0, 'SELECT ''index idx_audit_logs_changed exists''', 'CREATE INDEX idx_audit_logs_changed ON audit_logs (changed_date)');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'tasks' AND index_name = 'idx_tasks_status_created');
SET @sqlstmt := IF(@exist > 0, 'SELECT ''index idx_tasks_status_created exists''', 'CREATE INDEX idx_tasks_status_created ON tasks (status, created_date)');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'bugs' AND index_name = 'idx_bugs_status_created');
SET @sqlstmt := IF(@exist > 0, 'SELECT ''index idx_bugs_status_created exists''', 'CREATE INDEX idx_bugs_status_created ON bugs (status, created_date)');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
