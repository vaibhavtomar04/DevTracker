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


ALTER TABLE tasks
  ADD COLUMN code_review_date   DATETIME NULL,
  ADD COLUMN sit_completed_date DATETIME NULL,
  ADD COLUMN uat_completed_date DATETIME NULL;

-- One-time historical backfill (the ONLY audit read anywhere; repairs the
-- status vs workflow_approve fieldName inconsistency by matching both).
UPDATE tasks t
JOIN (SELECT entity_id, MIN(changed_date) d FROM audit_logs
      WHERE entity_type='TASK' AND new_value='CODE_REVIEW'
        AND field_name IN ('status','workflow_approve') GROUP BY entity_id) a
  ON a.entity_id=t.id SET t.code_review_date=a.d WHERE t.code_review_date IS NULL;

UPDATE tasks t
JOIN (SELECT entity_id, MIN(changed_date) d FROM audit_logs
      WHERE entity_type='TASK' AND new_value='SIT_COMPLETED'
        AND field_name IN ('status','workflow_approve') GROUP BY entity_id) a
  ON a.entity_id=t.id SET t.sit_completed_date=a.d WHERE t.sit_completed_date IS NULL;

UPDATE tasks t
JOIN (SELECT entity_id, MIN(changed_date) d FROM audit_logs
      WHERE entity_type='TASK' AND new_value='UAT_COMPLETED'
        AND field_name IN ('status','workflow_approve') GROUP BY entity_id) a
  ON a.entity_id=t.id SET t.uat_completed_date=a.d WHERE t.uat_completed_date IS NULL;