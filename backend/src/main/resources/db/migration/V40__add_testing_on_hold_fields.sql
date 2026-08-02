-- V40: Add testing on-hold fields to tasks table
-- Allows testers to put CR testing on hold with a reason, pausing the SLA clock

ALTER TABLE tasks
    ADD COLUMN testing_on_hold BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN testing_hold_reason VARCHAR(1000) NULL,
    ADD COLUMN testing_hold_start_date DATETIME NULL;
