ALTER TABLE tasks ADD COLUMN IF NOT EXISTS expected_sit_deployment_date DATE NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS expected_uat_deployment_date DATE NULL;

CREATE INDEX idx_tasks_expected_sit_date ON tasks(expected_sit_deployment_date);
CREATE INDEX idx_tasks_expected_uat_date ON tasks(expected_uat_deployment_date);
CREATE INDEX idx_tasks_sit_date ON tasks(sit_date);
CREATE INDEX idx_tasks_uat_date ON tasks(uat_date);
