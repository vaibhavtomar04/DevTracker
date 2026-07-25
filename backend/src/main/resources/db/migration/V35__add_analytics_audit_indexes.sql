-- Flyway Migration V35: Analytics & Audit Log Indexes
-- Adds indexes to support bounded analytics aggregations and fast audit log filtering.

CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_changed ON audit_logs (changed_date);
CREATE INDEX idx_tasks_status_created ON tasks (status, created_date);
CREATE INDEX idx_bugs_status_created ON bugs (status, created_date);
