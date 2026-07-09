-- V11__sprints_table.sql
-- Create sprints table and map it to tasks table

CREATE TABLE IF NOT EXISTS sprints (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    goal TEXT NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    status VARCHAR(100) NOT NULL DEFAULT 'FUTURE',
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint to tasks.sprint_id
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_sprint FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE SET NULL;

-- Seed default initial sprints matching existing dashboard references
INSERT INTO sprints (name, goal, start_date, end_date, status) VALUES
('Sprint 17', 'Core Authentication & Onboarding', '2026-06-01', '2026-06-15', 'COMPLETED'),
('Sprint 18', 'Billing Platform Integration & Taxes', '2026-06-16', '2026-06-30', 'ACTIVE'),
('Sprint 19', 'Analytics & Reporting Enhancements', '2026-07-01', '2026-07-15', 'FUTURE');
