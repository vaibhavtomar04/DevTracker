-- V9__add_bug_details.sql
-- Add fields to store all information provided by tester during bug raising

ALTER TABLE bugs ADD COLUMN reason VARCHAR(2000) NULL;
ALTER TABLE bugs ADD COLUMN steps_to_reproduce VARCHAR(2000) NULL;
ALTER TABLE bugs ADD COLUMN expected_result VARCHAR(2000) NULL;
ALTER TABLE bugs ADD COLUMN actual_result VARCHAR(2000) NULL;
