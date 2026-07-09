-- V10__tester_assignment_fields.sql
-- Add tester assignment metrics, retesting columns and reassignment audit columns to tasks table

ALTER TABLE tasks
    ADD COLUMN testing_started_date DATETIME NULL,
    ADD COLUMN testing_completed_date DATETIME NULL,
    ADD COLUMN testing_duration VARCHAR(255) NULL,
    ADD COLUMN testing_comments VARCHAR(2000) NULL,
    ADD COLUMN total_bugs_raised INT DEFAULT 0,
    ADD COLUMN total_retests INT DEFAULT 0,
    ADD COLUMN reassignment_reason VARCHAR(2000) NULL,
    ADD COLUMN reassignment_date DATETIME NULL,
    ADD COLUMN previous_tester_id BIGINT NULL,
    ADD COLUMN reassigned_by_id BIGINT NULL;

ALTER TABLE tasks ADD CONSTRAINT fk_tasks_previous_tester FOREIGN KEY (previous_tester_id) REFERENCES users(id);
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_reassigned_by FOREIGN KEY (reassigned_by_id) REFERENCES users(id);
