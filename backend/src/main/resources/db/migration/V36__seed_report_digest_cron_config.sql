-- V36__seed_report_digest_cron_config.sql
-- Seed dynamic cron configuration for ReportDigestService in app_configs table

INSERT INTO app_configs (config_key, config_value, description)
VALUES ('report.digest.cron', '0 0 9 * * MON', 'Cron expression for weekly report email digest execution')
ON DUPLICATE KEY UPDATE description = VALUES(description);
