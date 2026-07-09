-- ============================================================
-- DevTrack 2.0 — Centralized Email Framework Migration
-- Additive Flyway script for Email Audit Logs & User Preferences
-- Database: devtrack (MySQL 8.0 utf8mb4)
-- ============================================================

-- ── 1. User Notification Preferences Table ───────────────────
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id                      BIGINT      NOT NULL AUTO_INCREMENT,
    user_id                 BIGINT      NOT NULL UNIQUE COMMENT 'FK to users.id',
    sprint_notifications    TINYINT(1)  NOT NULL DEFAULT 1,
    bug_notifications       TINYINT(1)  NOT NULL DEFAULT 1,
    deployment_notifications TINYINT(1) NOT NULL DEFAULT 1,
    summary_notifications   TINYINT(1)  NOT NULL DEFAULT 1,
    updated_at              DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_pref_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 2. Email Audit Logs Table ────────────────────────────────
CREATE TABLE IF NOT EXISTS email_audit_logs (
    id                  BIGINT        NOT NULL AUTO_INCREMENT,
    notification_type   VARCHAR(64)   NOT NULL,
    recipient_to        TEXT          NOT NULL,
    recipient_cc        TEXT          DEFAULT NULL,
    subject             VARCHAR(512)  NOT NULL,
    status              VARCHAR(32)   NOT NULL COMMENT 'SENT, FAILED, RETRYING, DISCARDED',
    smtp_message_id     VARCHAR(256)  DEFAULT NULL,
    retry_count         INT           NOT NULL DEFAULT 0,
    failure_reason      TEXT          DEFAULT NULL,
    created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_email_type (notification_type),
    INDEX idx_email_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
