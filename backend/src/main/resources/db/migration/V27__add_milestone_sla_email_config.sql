-- Dynamic configuration for Milestone SLA Email dispatch
INSERT IGNORE INTO app_configs (config_key, config_value, description) VALUES 
('MILESTONE_SLA_EMAIL_ENABLED', 'true', 'Enable or disable milestone SLA email notifications (true/false)');
