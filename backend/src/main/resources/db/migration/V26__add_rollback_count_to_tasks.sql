-- V26__add_rollback_count_to_tasks.sql
-- Add rollback_count column to tasks table to track production/environment rollbacks for recognition metrics.

ALTER TABLE tasks ADD COLUMN rollback_count INT DEFAULT 0;
