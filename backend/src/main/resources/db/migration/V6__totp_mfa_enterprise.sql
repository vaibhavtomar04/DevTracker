-- V6__totp_mfa_enterprise.sql
-- Enterprise TOTP Multi-Factor Authentication schema upgrades

-- 1. Extend users table for MFA state and encrypted secret
ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(255) NULL;
ALTER TABLE users ADD COLUMN last_mfa_verified_at DATETIME NULL;
ALTER TABLE users ADD COLUMN failed_mfa_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN mfa_enabled_at DATETIME NULL;

-- 2. Child table for 10 single-use hashed backup codes
CREATE TABLE IF NOT EXISTS mfa_backup_codes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mbc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Child table for trusted devices (7 / 15 / 30 day windows)
CREATE TABLE IF NOT EXISTS mfa_trusted_devices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    device_fingerprint VARCHAR(255) NULL,
    label VARCHAR(100) NULL,
    ip VARCHAR(50) NULL,
    user_agent VARCHAR(255) NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mtd_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Dynamic MFA policy settings in app_configs
INSERT IGNORE INTO app_configs (config_key, config_value, description) VALUES 
('mfa_enforcement_policy', 'OPTIONAL', 'Enterprise MFA Policy: OPTIONAL, MANDATORY, or DISABLED'),
('mfa_trusted_device_days', '15', 'Default trusted device window duration in days'),
('mfa_max_failed_attempts', '5', 'Max failed OTP attempts before lockout');
