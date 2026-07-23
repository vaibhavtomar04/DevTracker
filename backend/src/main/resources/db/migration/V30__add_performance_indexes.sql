-- V30__add_performance_indexes.sql
-- Performance Optimization: Add indexes on foreign keys and frequently filtered columns

-- 1. Index tasks table
CREATE INDEX idx_tasks_assigned_dev ON tasks (assigned_developer_id);
CREATE INDEX idx_tasks_tester ON tasks (tester_id);
CREATE INDEX idx_tasks_sprint ON tasks (sprint_id);
CREATE INDEX idx_tasks_status ON tasks (status);
CREATE INDEX idx_tasks_jtrack ON tasks (jtrack_id);
CREATE INDEX idx_tasks_created_by ON tasks (created_by_id);
CREATE INDEX idx_tasks_quality_risk ON tasks (is_quality_risk);

-- 2. Index task_developers table (multi-developer mapping)
CREATE INDEX idx_task_devs_task ON task_developers (task_id);
CREATE INDEX idx_task_devs_dev ON task_developers (developer_id);
CREATE INDEX idx_task_devs_composite ON task_developers (task_id, developer_id);

-- 3. Index bugs table
CREATE INDEX idx_bugs_task ON bugs (bug_task_id);
CREATE INDEX idx_bugs_assigned_dev ON bugs (assigned_developer_id);
CREATE INDEX idx_bugs_status ON bugs (status);
CREATE INDEX idx_bugs_raised_by ON bugs (raised_by_id);

-- 4. Index notifications table
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, unread);

-- 5. Index sprints table
CREATE INDEX idx_sprints_status ON sprints (status);
