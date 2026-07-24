-- V32__add_missing_performance_indexes.sql
-- Critical missing composite indexes for hot query paths.
-- These complement the single-column indexes added in V30.

-- 1. Composite: bugs filtered by task AND status
--    Fixes: DashboardController countActiveBugs, BugController dev-scoped queries
CREATE INDEX idx_bugs_task_status
    ON bugs (bug_task_id, status);

-- 2. Composite: bugs filtered by assigned developer AND status
--    Fixes: developer bug dashboard count queries
CREATE INDEX idx_bugs_dev_status
    ON bugs (assigned_developer_id, status);

-- 3. Composite: workflow history filtered by task AND to_status
--    Fixes: Recognition engine first-pass approval checks (N+1 scan on history table)
CREATE INDEX idx_twh_task_status
    ON task_workflow_history (task_id, to_status);

-- 4. Composite: notifications sorted by user, unread flag, and recency
--    Fixes: notification count queries and ordered list pulls
CREATE INDEX idx_notifications_user_unread_id
    ON notifications (user_id, unread, id DESC);

-- 5. FULLTEXT index on tasks for fast search
ALTER TABLE tasks ADD FULLTEXT INDEX ft_tasks_search (title, description, jtrack_id, branch_name);
