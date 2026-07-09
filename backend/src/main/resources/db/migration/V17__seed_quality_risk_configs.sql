INSERT IGNORE INTO app_configs (config_key, config_value, description) VALUES 
('quality_risk.threshold.bugs', '3', 'Max accepted bugs allowed on a CR before flagging Quality Risk'),
('quality_risk.threshold.retests', '2', 'Max retests/reopens allowed on a CR before flagging Quality Risk'),
('quality_risk.threshold.rejected_bugs', '2', 'Max rejected bugs allowed on a CR before flagging Quality Risk'),
('quality_risk.threshold.challenge_rate', '0.30', 'Max challenge rate allowed on a CR before flagging Quality Risk (percentage as ratio)');
