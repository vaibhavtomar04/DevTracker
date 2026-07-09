-- ALTER sprint_tasks table to add completion_rule column
ALTER TABLE sprint_tasks ADD COLUMN completion_rule VARCHAR(50) DEFAULT 'KEEP_OPEN';
