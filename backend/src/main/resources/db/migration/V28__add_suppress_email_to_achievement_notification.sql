-- Add suppress_email column to achievement_notification table
ALTER TABLE achievement_notification 
ADD COLUMN suppress_email INT NOT NULL DEFAULT 0 AFTER is_email_sent;
