-- V31__seed_recognition_sanitizer_cron_config.sql
-- Seed dynamic cron configuration for RecognitionEngineSanitizer in app_configs table

INSERT INTO app_configs (config_key, config_value, description)
VALUES ('recognition.sanitizer.cron', '0 0 9 * * ?', 'Cron expression for RecognitionEngineSanitizer daily run (default 9:00 AM)')
ON DUPLICATE KEY UPDATE description = VALUES(description);
