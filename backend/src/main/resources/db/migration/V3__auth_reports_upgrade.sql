-- ============================================================
-- DevTrack 2.0 — Enterprise Architectural Upgrades Migration
-- Additive Flyway script for Report Jobs, OAuth2, and Lockouts
-- Database: devtrack (MySQL 8.0 utf8mb4)
-- ============================================================

-- ── 1. Report Jobs Table (Async Exporter) ─────────────────────
CREATE TABLE IF NOT EXISTS report_jobs (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    job_id          VARCHAR(64)   NOT NULL UNIQUE,
    requester_id    BIGINT        NOT NULL COMMENT 'FK to users.id',
    report_type     VARCHAR(64)   NOT NULL,
    status          ENUM('QUEUED', 'RUNNING', 'READY', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    download_token  VARCHAR(128)  DEFAULT NULL UNIQUE,
    file_path       VARCHAR(1024) DEFAULT NULL,
    file_name       VARCHAR(512)  DEFAULT NULL,
    error_reason    TEXT          DEFAULT NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at      DATETIME      DEFAULT NULL,

    PRIMARY KEY (id),
    INDEX idx_report_job_id (job_id),
    INDEX idx_report_status (status),
    CONSTRAINT fk_report_requester FOREIGN KEY (requester_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. OAuth2 Identity Links (Microsoft Entra ID) ────────────
CREATE TABLE IF NOT EXISTS oauth2_identity_links (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    user_id         BIGINT        NOT NULL COMMENT 'FK to users.id',
    provider        VARCHAR(32)   NOT NULL COMMENT 'AZURE_AD',
    provider_id     VARCHAR(256)  NOT NULL COMMENT 'Microsoft OIDC Subject ID / OID',
    email           VARCHAR(256)  NOT NULL,
    linked_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uk_provider_id (provider, provider_id),
    CONSTRAINT fk_oauth2_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 3. ShedLock Table for Multi-Instance Job Safety ──────────
CREATE TABLE IF NOT EXISTS shedlock (
    name       VARCHAR(64)  NOT NULL,
    lock_until DATETIME(3)  NOT NULL,
    locked_at  DATETIME(3)  NOT NULL,
    locked_by  VARCHAR(255) NOT NULL,
    PRIMARY KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. Add User Lockout and Forced Reset Columns ─────────────
ALTER TABLE users ADD COLUMN failed_login_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN account_locked TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN lock_time DATETIME DEFAULT NULL;
ALTER TABLE users ADD COLUMN password_reset_required TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN temp_password_expires_at DATETIME DEFAULT NULL;
