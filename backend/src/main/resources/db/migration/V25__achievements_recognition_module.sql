-- ============================================================
-- DevTrack 2.0 — Phase A1: Achievements & Recognition Module
-- 12 tables, standard audit columns, optimistic locking
-- Next migration after: V24
-- ============================================================

-- ─── Helper macro columns used in every table ──────────────
--   created_by         VARCHAR(255)
--   created_date       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
--   modified_by        VARCHAR(255)
--   modified_date      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
--   version            INT NOT NULL DEFAULT 0    (optimistic lock)
--   active_flag        TINYINT NOT NULL DEFAULT 1

-- ─── 1. achievement_category ───────────────────────────────
CREATE TABLE IF NOT EXISTS achievement_category (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    code         VARCHAR(50)  NOT NULL UNIQUE,
    name         VARCHAR(100) NOT NULL,
    description  TEXT,
    icon_key     VARCHAR(100),          -- maps to frontend icon registry
    display_order INT NOT NULL DEFAULT 0,
    created_by   VARCHAR(255),
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by  VARCHAR(255),
    modified_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version      INT NOT NULL DEFAULT 0,
    active_flag  TINYINT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 2. recognition_level ──────────────────────────────────
CREATE TABLE IF NOT EXISTS recognition_level (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    level_number      INT NOT NULL UNIQUE,          -- 1-8
    title             VARCHAR(100) NOT NULL,
    min_points        INT NOT NULL DEFAULT 0,       -- admin-configurable threshold
    badge_icon_key    VARCHAR(100),
    color_token       VARCHAR(50),                  -- e.g. "emerald-500"
    created_by        VARCHAR(255),
    created_date      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by       VARCHAR(255),
    modified_date     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version           INT NOT NULL DEFAULT 0,
    active_flag       TINYINT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 3. achievement ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievement (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    category_id         BIGINT NOT NULL,
    code                VARCHAR(100) NOT NULL UNIQUE,
    name                VARCHAR(200) NOT NULL,
    description         TEXT NOT NULL,
    rarity              VARCHAR(20)  NOT NULL DEFAULT 'COMMON',
    -- COMMON | RARE | EPIC | LEGENDARY
    point_value         INT NOT NULL DEFAULT 0,
    icon_key            VARCHAR(100),
    progress_metric     VARCHAR(100),               -- e.g. "successful_deployments"
    progress_target     INT,                        -- e.g. 50
    is_milestone        TINYINT NOT NULL DEFAULT 0, -- treat as Milestone if 1
    display_order       INT NOT NULL DEFAULT 0,
    created_by          VARCHAR(255),
    created_date        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by         VARCHAR(255),
    modified_date       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version             INT NOT NULL DEFAULT 0,
    active_flag         TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT fk_ach_category FOREIGN KEY (category_id) REFERENCES achievement_category(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 4. achievement_rule ───────────────────────────────────
-- Configurable unlock criteria — no code changes needed to add achievements
CREATE TABLE IF NOT EXISTS achievement_rule (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    achievement_id      BIGINT NOT NULL,
    rule_type           VARCHAR(50) NOT NULL,
    -- COUNT_THRESHOLD | RATE_THRESHOLD | STREAK | ADMIN_GRANT | PEER_NOMINATION | TENURE_DAYS
    metric_key          VARCHAR(100) NOT NULL,      -- e.g. "successful_cr_count"
    operator            VARCHAR(10)  NOT NULL,      -- >=  >  ==  <=
    threshold_value     DECIMAL(10,4) NOT NULL,
    grace_days          INT NOT NULL DEFAULT 0,     -- forgiving streaks
    requires_quality_gate TINYINT NOT NULL DEFAULT 0, -- 1 = approval-rate >= 70%
    min_quality_rate    DECIMAL(5,2),               -- e.g. 70.00 means 70%
    evaluation_window_days INT,                     -- rolling window; NULL = all-time
    additional_config   JSON,                       -- extensible config blob
    created_by          VARCHAR(255),
    created_date        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by         VARCHAR(255),
    modified_date       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version             INT NOT NULL DEFAULT 0,
    active_flag         TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT fk_ar_achievement FOREIGN KEY (achievement_id) REFERENCES achievement(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 5. user_achievement ───────────────────────────────────
-- Immutable unlocked state per user; never deleted, only active_flag
CREATE TABLE IF NOT EXISTS user_achievement (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT NOT NULL,
    achievement_id   BIGINT NOT NULL,
    unlock_date      DATETIME NOT NULL,
    source_event_id  VARCHAR(200),                  -- idempotency key from recognition_event
    unlock_reason    TEXT,
    points_awarded   INT NOT NULL DEFAULT 0,
    created_by       VARCHAR(255),
    created_date     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by      VARCHAR(255),
    modified_date    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version          INT NOT NULL DEFAULT 0,
    active_flag      TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT fk_ua_user        FOREIGN KEY (user_id)        REFERENCES users(id)       ON DELETE CASCADE,
    CONSTRAINT fk_ua_achievement FOREIGN KEY (achievement_id) REFERENCES achievement(id) ON DELETE CASCADE,
    CONSTRAINT uq_ua_user_achievement UNIQUE (user_id, achievement_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 6. achievement_progress ───────────────────────────────
-- Live progress toward locked achievements (upserted by background jobs)
CREATE TABLE IF NOT EXISTS achievement_progress (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT NOT NULL,
    achievement_id   BIGINT NOT NULL,
    current_value    DECIMAL(10,4) NOT NULL DEFAULT 0,
    target_value     DECIMAL(10,4) NOT NULL DEFAULT 0,
    percent_complete DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
    last_evaluated   DATETIME,
    created_by       VARCHAR(255),
    created_date     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by      VARCHAR(255),
    modified_date    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version          INT NOT NULL DEFAULT 0,
    active_flag      TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT fk_ap_user        FOREIGN KEY (user_id)        REFERENCES users(id)       ON DELETE CASCADE,
    CONSTRAINT fk_ap_achievement FOREIGN KEY (achievement_id) REFERENCES achievement(id) ON DELETE CASCADE,
    CONSTRAINT uq_ap_user_achievement UNIQUE (user_id, achievement_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 7. recognition_event ──────────────────────────────────
-- Immutable event ledger — source of all score deltas; never updated
CREATE TABLE IF NOT EXISTS recognition_event (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    idempotency_key  VARCHAR(255) NOT NULL UNIQUE,  -- prevents double-reward
    user_id          BIGINT NOT NULL,
    event_type       VARCHAR(100) NOT NULL,
    -- CR_COMPLETED | DEPLOYMENT_SUCCESS | BUG_RESOLVED | SPRINT_COMPLETED |
    -- CODE_APPROVED | TESTING_COMPLETED | ACHIEVEMENT_UNLOCKED | AWARD_GRANTED |
    -- LEVEL_UP | MILESTONE_REACHED | SCORE_ADJUSTMENT
    source_entity_type VARCHAR(50),                 -- TASK | BUG | SPRINT | AWARD
    source_entity_id   BIGINT,
    points_delta     INT NOT NULL DEFAULT 0,        -- positive or negative
    score_before     INT NOT NULL DEFAULT 0,
    score_after      INT NOT NULL DEFAULT 0,
    event_metadata   JSON,                          -- additional context
    event_date       DATETIME NOT NULL,
    triggered_by     VARCHAR(255),                  -- username / 'SYSTEM'
    is_reversed      TINYINT NOT NULL DEFAULT 0,    -- for erroneous-reward rollback
    reversed_by      VARCHAR(255),
    reversed_at      DATETIME,
    reversal_reason  TEXT,
    created_by       VARCHAR(255),
    created_date     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by      VARCHAR(255),
    modified_date    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version          INT NOT NULL DEFAULT 0,
    active_flag      TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT fk_re_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 8. recognition_score ──────────────────────────────────
-- Current + monthly snapshot; 1 row per user (upserted); history in recognition_event
CREATE TABLE IF NOT EXISTS recognition_score (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id              BIGINT NOT NULL UNIQUE,
    total_score          INT NOT NULL DEFAULT 0,
    current_level_id     BIGINT,
    quality_score        DECIMAL(5,2) NOT NULL DEFAULT 0.00,  -- 0-100 composite
    approval_rate        DECIMAL(5,2) NOT NULL DEFAULT 0.00,  -- first-pass %
    deployment_success_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    sprint_success_rate  DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    escaped_defect_rate  DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    reopen_rate          DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    monthly_rank         INT,
    overall_rank         INT,
    score_visibility     VARCHAR(20) NOT NULL DEFAULT 'PRIVATE',  -- PRIVATE | TEAM | PUBLIC
    last_recalculated    DATETIME,
    created_by           VARCHAR(255),
    created_date         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by          VARCHAR(255),
    modified_date        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version              INT NOT NULL DEFAULT 0,
    active_flag          TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT fk_rs_user  FOREIGN KEY (user_id)          REFERENCES users(id)            ON DELETE CASCADE,
    CONSTRAINT fk_rs_level FOREIGN KEY (current_level_id) REFERENCES recognition_level(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 9. award ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS award (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    code           VARCHAR(100) NOT NULL UNIQUE,
    name           VARCHAR(200) NOT NULL,
    description    TEXT,
    award_type     VARCHAR(20) NOT NULL DEFAULT 'SPECIAL',  -- MONTHLY | SPECIAL
    icon_key       VARCHAR(100),
    point_value    INT NOT NULL DEFAULT 0,
    created_by     VARCHAR(255),
    created_date   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by    VARCHAR(255),
    modified_date  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version        INT NOT NULL DEFAULT 0,
    active_flag    TINYINT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 10. award_history ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS award_history (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    award_id        BIGINT NOT NULL,
    recipient_id    BIGINT NOT NULL,
    awarded_by_id   BIGINT,
    award_date      DATETIME NOT NULL,
    period_month    TINYINT,                        -- 1-12 for monthly awards
    period_year     SMALLINT,
    reason          TEXT NOT NULL,
    comments        TEXT,
    is_published    TINYINT NOT NULL DEFAULT 0,     -- admin must publish monthly awards
    points_awarded  INT NOT NULL DEFAULT 0,
    source_event_id VARCHAR(200),
    created_by      VARCHAR(255),
    created_date    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by     VARCHAR(255),
    modified_date   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version         INT NOT NULL DEFAULT 0,
    active_flag     TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT fk_ah_award      FOREIGN KEY (award_id)      REFERENCES award(id)  ON DELETE RESTRICT,
    CONSTRAINT fk_ah_recipient  FOREIGN KEY (recipient_id)  REFERENCES users(id)  ON DELETE CASCADE,
    CONSTRAINT fk_ah_awarded_by FOREIGN KEY (awarded_by_id) REFERENCES users(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 11. leaderboard_snapshot ──────────────────────────────
-- Periodic ranked snapshots for fast reads; never live-queried per request
CREATE TABLE IF NOT EXISTS leaderboard_snapshot (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    snapshot_date    DATE NOT NULL,
    period_type      VARCHAR(20) NOT NULL,          -- DAILY | WEEKLY | MONTHLY | QUARTERLY | YEARLY
    user_id          BIGINT NOT NULL,
    rank_position    INT NOT NULL,
    total_score      INT NOT NULL DEFAULT 0,
    quality_score    DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    achievement_count INT NOT NULL DEFAULT 0,
    level_id         BIGINT,
    sprint_success_rate DECIMAL(5,2),
    deployment_success_rate DECIMAL(5,2),
    bug_count        INT NOT NULL DEFAULT 0,
    project_filter   VARCHAR(100),                  -- NULL = all-projects
    department_filter VARCHAR(100),
    created_by       VARCHAR(255),
    created_date     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by      VARCHAR(255),
    modified_date    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version          INT NOT NULL DEFAULT 0,
    active_flag      TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT fk_ls_user  FOREIGN KEY (user_id)  REFERENCES users(id)            ON DELETE CASCADE,
    CONSTRAINT fk_ls_level FOREIGN KEY (level_id) REFERENCES recognition_level(id) ON DELETE SET NULL,
    INDEX idx_ls_snapshot_date_period (snapshot_date, period_type),
    INDEX idx_ls_user_period (user_id, period_type, snapshot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 12. achievement_notification ──────────────────────────
CREATE TABLE IF NOT EXISTS achievement_notification (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT NOT NULL,
    notification_type   VARCHAR(50) NOT NULL,
    -- ACHIEVEMENT_UNLOCKED | LEVEL_UP | BADGE_EARNED | MILESTONE_REACHED |
    -- AWARD_GRANTED | CHALLENGE_COMPLETED
    reference_id        BIGINT,                     -- user_achievement.id | award_history.id
    reference_type      VARCHAR(50),                -- USER_ACHIEVEMENT | AWARD_HISTORY
    title               VARCHAR(255) NOT NULL,
    message             TEXT,
    points_delta        INT,
    is_read             TINYINT NOT NULL DEFAULT 0,
    is_email_sent       TINYINT NOT NULL DEFAULT 0,
    email_sent_at       DATETIME,
    created_by          VARCHAR(255),
    created_date        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by         VARCHAR(255),
    modified_date       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version             INT NOT NULL DEFAULT 0,
    active_flag         TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT fk_an_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- INDEXES (performance critical for event-driven queries)
-- ─────────────────────────────────────────────────────────────
CREATE INDEX idx_ach_rarity       ON achievement(rarity);
CREATE INDEX idx_ach_active_flag  ON achievement(active_flag);

CREATE INDEX idx_ar_rule_type      ON achievement_rule(rule_type);
CREATE INDEX idx_ar_metric_key     ON achievement_rule(metric_key);

CREATE INDEX idx_ua_unlock_date   ON user_achievement(unlock_date);
CREATE INDEX idx_ua_source_event  ON user_achievement(source_event_id);

CREATE INDEX idx_ap_last_evaluated ON achievement_progress(last_evaluated);

CREATE INDEX idx_re_idempotency_key ON recognition_event(idempotency_key);
CREATE INDEX idx_re_event_type      ON recognition_event(event_type);
CREATE INDEX idx_re_event_date      ON recognition_event(event_date);
CREATE INDEX idx_re_source_entity   ON recognition_event(source_entity_type, source_entity_id);
CREATE INDEX idx_re_is_reversed     ON recognition_event(is_reversed);

CREATE INDEX idx_rs_total_score   ON recognition_score(total_score);
CREATE INDEX idx_rs_monthly_rank  ON recognition_score(monthly_rank);
CREATE INDEX idx_rs_overall_rank  ON recognition_score(overall_rank);

CREATE INDEX idx_ah_award_date   ON award_history(award_date);
CREATE INDEX idx_ah_period       ON award_history(period_year, period_month);

CREATE INDEX idx_an_notification_type ON achievement_notification(notification_type);
CREATE INDEX idx_an_is_read         ON achievement_notification(is_read);
CREATE INDEX idx_an_created_date    ON achievement_notification(created_date);

-- ─────────────────────────────────────────────────────────────
-- SEED DATA: Recognition Levels (admin-configurable thresholds)
-- ─────────────────────────────────────────────────────────────
INSERT INTO recognition_level (level_number, title, min_points, badge_icon_key, color_token, created_by) VALUES
(1, 'Associate',              0,     'level-associate',    'graphite-500',  'SYSTEM'),
(2, 'Engineer',               750,   'level-engineer',     'graphite-400',  'SYSTEM'),
(3, 'Senior Engineer',        2000,  'level-senior',       'emerald-400',   'SYSTEM'),
(4, 'Specialist',             4500,  'level-specialist',   'emerald-500',   'SYSTEM'),
(5, 'Expert',                 9000,  'level-expert',       'emerald-600',   'SYSTEM'),
(6, 'Principal Engineer',     16000, 'level-principal',    'copper-400',    'SYSTEM'),
(7, 'Distinguished Engineer', 28000, 'level-distinguished','copper-500',    'SYSTEM'),
(8, 'Engineering Legend',     45000, 'level-legend',       'copper-600',    'SYSTEM');

-- ─────────────────────────────────────────────────────────────
-- SEED DATA: Achievement Categories
-- ─────────────────────────────────────────────────────────────
INSERT INTO achievement_category (code, name, description, icon_key, display_order, created_by) VALUES
('DEV_EXCELLENCE',   'Development Excellence', 'Achievements for quality CR delivery and deployments',    'code-2',          1, 'SYSTEM'),
('CODE_QUALITY',     'Code Quality',           'Achievements for clean, secure, maintainable code',       'shield-check',    2, 'SYSTEM'),
('DELIVERY',         'Delivery Excellence',    'Achievements for on-time, consistent sprint delivery',    'rocket',          3, 'SYSTEM'),
('TESTING',          'Testing Excellence',     'Achievements for thorough, quality-gated testing',        'bug',             4, 'SYSTEM'),
('COLLABORATION',    'Collaboration',          'Evidence-driven peer and team collaboration',             'users',           5, 'SYSTEM'),
('LEADERSHIP',       'Leadership',             'Mentoring, reviewing, and technical leadership',          'award',           6, 'SYSTEM'),
('INNOVATION',       'Innovation',             'Automation, optimisation, and improvement contributions', 'lightbulb',       7, 'SYSTEM'),
('LEARNING',         'Learning & Growth',      'Certifications, sessions, and personal development',      'graduation-cap',  8, 'SYSTEM');

-- ─────────────────────────────────────────────────────────────
-- SEED DATA: Achievements (all 8 categories, representative set)
-- ─────────────────────────────────────────────────────────────

-- ── Development Excellence ──
INSERT INTO achievement (category_id, code, name, description, rarity, point_value, icon_key, progress_metric, progress_target, is_milestone, display_order, created_by)
SELECT c.id, d.code, d.name, d.description, d.rarity, d.point_value, d.icon_key, d.progress_metric, d.progress_target, d.is_milestone, d.display_order, 'SYSTEM'
FROM achievement_category c,
(SELECT 'DEV_EXCELLENCE' cat, 'FIRST_CR_COMPLETED' code, 'First CR Completed' name, 'Completed your first Change Request successfully.' description, 'COMMON' rarity, 50 point_value, 'git-merge' icon_key, 'successful_cr_count' progress_metric, 1 progress_target, 1 is_milestone, 10 display_order UNION ALL
 SELECT 'DEV_EXCELLENCE','CR_10',                'CR Veteran',              'Completed 10 successful Change Requests.',                         'RARE',     150, 'layers',       'successful_cr_count',     10, 0, 20 UNION ALL
 SELECT 'DEV_EXCELLENCE','CR_50',                'CR Champion',             'Completed 50 successful Change Requests with quality gates passed.', 'EPIC',    400, 'trophy',       'successful_cr_count',     50, 0, 30 UNION ALL
 SELECT 'DEV_EXCELLENCE','CR_100',               '100 Successful CRs',      'Completed 100 successful CRs — a true engineering benchmark.',       'LEGENDARY',1000,'flame',      'successful_cr_count',     100,0, 40 UNION ALL
 SELECT 'DEV_EXCELLENCE','DEPLOYMENT_CHAMPION',  'Deployment Champion',     'Successfully deployed 50 CRs to production with no rollbacks.',      'EPIC',    500, 'server',       'prod_deployment_count',   50, 0, 50 UNION ALL
 SELECT 'DEV_EXCELLENCE','ZERO_PROD_BUGS',       'Zero Production Bugs',    'Completed a full sprint with zero escaped production defects.',      'EPIC',    300, 'shield',       'zero_escaped_defect_streak',3,0, 60 UNION ALL
 SELECT 'DEV_EXCELLENCE','BUG_FREE_SPRINT',      'Bug-Free Sprint',         'Delivered a sprint with zero bugs raised against your CRs.',        'RARE',    200, 'check-circle', 'bug_free_sprint_count',   1,  0, 70 UNION ALL
 SELECT 'DEV_EXCELLENCE','CRITICAL_FIX_HERO',    'Critical Fix Hero',       'Resolved 5 critical-priority bugs with first-time fix success.',     'EPIC',    350, 'zap',          'critical_fix_count',      5,  0, 80
) d WHERE c.code = d.cat;

-- ── Code Quality ──
INSERT INTO achievement (category_id, code, name, description, rarity, point_value, icon_key, progress_metric, progress_target, is_milestone, display_order, created_by)
SELECT c.id, d.code, d.name, d.description, d.rarity, d.point_value, d.icon_key, d.progress_metric, d.progress_target, d.is_milestone, d.display_order, 'SYSTEM'
FROM achievement_category c,
(SELECT 'CODE_QUALITY' cat, 'CLEAN_CODE' code, 'Clean Code Contributor' name, 'Maintained ≥ 90% first-pass code approval rate over 10 CRs.' description, 'RARE' rarity, 200 point_value, 'sparkles' icon_key, 'first_pass_approval_rate' progress_metric, 90 progress_target, 0 is_milestone, 10 display_order UNION ALL
 SELECT 'CODE_QUALITY','FIRST_TIME_APPROVAL',    'First-Time Approval',      'Your first CR approved without changes requested.',                  'COMMON',   75, 'thumbs-up',    'first_pass_cr_count',      1,  1, 20 UNION ALL
 SELECT 'CODE_QUALITY','NO_REWORK_10',           'No Rework Required',        'Completed 10 CRs in a row without CHANGES_REQUESTED.',              'EPIC',    400, 'repeat',       'no_rework_streak',         10, 0, 30 UNION ALL
 SELECT 'CODE_QUALITY','SECURE_CODING',          'Secure Coding Champion',    'Zero security-related bugs raised against your CRs for 3 sprints.', 'EPIC',    450, 'lock',         'security_clean_sprint_streak',3,0,40 UNION ALL
 SELECT 'CODE_QUALITY','MAINTAINABILITY',        'Maintainability Expert',    'Sustained documentation completion ≥ 80% across all CRs.',          'RARE',    250, 'book-open',    'doc_completion_rate',     80,  0, 50
) d WHERE c.code = d.cat;

-- ── Delivery Excellence ──
INSERT INTO achievement (category_id, code, name, description, rarity, point_value, icon_key, progress_metric, progress_target, is_milestone, display_order, created_by)
SELECT c.id, d.code, d.name, d.description, d.rarity, d.point_value, d.icon_key, d.progress_metric, d.progress_target, d.is_milestone, d.display_order, 'SYSTEM'
FROM achievement_category c,
(SELECT 'DELIVERY' cat, 'SPRINT_FINISHER' code, 'Sprint Finisher' name, 'Completed all assigned sprint items on time.' description, 'COMMON' rarity, 100 point_value, 'flag' icon_key, 'sprint_on_time_count' progress_metric, 1 progress_target, 0 is_milestone, 10 display_order UNION ALL
 SELECT 'DELIVERY','ON_TIME_10',           'On-Time Delivery ×10',    'Delivered to SIT or UAT on time across 10 separate sprints.',        'RARE',    300, 'clock',        'on_time_delivery_count',  10,  0, 20 UNION ALL
 SELECT 'DELIVERY','NEVER_MISSED_DEADLINE','Never Missed Deadline',    'Zero missed SIT or UAT deadlines across 20 consecutive deployments.','EPIC',    600, 'calendar-check','zero_deadline_miss_streak',20, 0, 30 UNION ALL
 SELECT 'DELIVERY','CONSISTENT_PERFORMER', 'Consistent Performer',     'Maintained > 80% sprint success rate over 6 consecutive sprints.',   'RARE',    350, 'trending-up',  'sprint_success_streak',    6,  0, 40 UNION ALL
 SELECT 'DELIVERY','FASTEST_DEPLOYMENT',   'Fastest Deployment',       'Achieved fastest SIT-to-PROD cycle time in team for a quarter.',     'LEGENDARY',500,'lightning',    'fastest_cycle_rank',       1,  0, 50
) d WHERE c.code = d.cat;

-- ── Testing Excellence ──
INSERT INTO achievement (category_id, code, name, description, rarity, point_value, icon_key, progress_metric, progress_target, is_milestone, display_order, created_by)
SELECT c.id, d.code, d.name, d.description, d.rarity, d.point_value, d.icon_key, d.progress_metric, d.progress_target, d.is_milestone, d.display_order, 'SYSTEM'
FROM achievement_category c,
(SELECT 'TESTING' cat, 'BUG_HUNTER' code, 'Bug Hunter' name, 'Raised and confirmed 50 valid bugs (non-rejected) in testing.' description, 'RARE' rarity, 200 point_value, 'crosshair' icon_key, 'valid_bug_count' progress_metric, 50 progress_target, 0 is_milestone, 10 display_order UNION ALL
 SELECT 'TESTING','REGRESSION_MASTER',     'Regression Master',       'Completed regression testing for 25 CRs with zero escaped defects.', 'EPIC',    400, 'refresh-cw',   'regression_cr_count',     25,  0, 20 UNION ALL
 SELECT 'TESTING','ZERO_ESCAPED_BUGS',     'Zero Escaped Bugs',       'Zero production defects traced to your test sign-offs over a quarter.','LEGENDARY',750,'shield-off', 'zero_escaped_quarter',     1,  0, 30 UNION ALL
 SELECT 'TESTING','EDGE_CASE_DETECTIVE',   'Edge Case Detective',     'Identified 20 edge-case bugs that developers considered non-obvious.', 'EPIC',   350, 'search',       'edge_case_bug_count',     20,  0, 40 UNION ALL
 SELECT 'TESTING','PERFECT_VALIDATION',    'Perfect Validation',      'All test cases passed on first run for 10 consecutive CRs.',          'RARE',   300, 'check-square', 'perfect_validation_streak',10, 0, 50
) d WHERE c.code = d.cat;

-- ── Collaboration ──
INSERT INTO achievement (category_id, code, name, description, rarity, point_value, icon_key, progress_metric, progress_target, is_milestone, display_order, created_by)
SELECT c.id, d.code, d.name, d.description, d.rarity, d.point_value, d.icon_key, d.progress_metric, d.progress_target, d.is_milestone, d.display_order, 'SYSTEM'
FROM achievement_category c,
(SELECT 'COLLABORATION' cat, 'TEAM_PLAYER' code, 'Team Player' name, 'Nominated by ≥ 3 peers for meaningful collaboration support.' description, 'RARE' rarity, 250 point_value, 'heart-handshake' icon_key, 'peer_nomination_count' progress_metric, 3 progress_target, 0 is_milestone, 10 display_order UNION ALL
 SELECT 'COLLABORATION','KNOWLEDGE_SHARER',     'Knowledge Sharer',        'Conducted or published 5 knowledge-sharing sessions or articles.',  'RARE',    300, 'share-2',      'knowledge_share_count',   5,  0, 20 UNION ALL
 SELECT 'COLLABORATION','DOC_CONTRIBUTOR',      'Documentation Contributor','Authored or substantially updated docs for 15 CRs.',               'COMMON',  150, 'file-text',    'doc_contribution_count',  15, 0, 30 UNION ALL
 SELECT 'COLLABORATION','CROSS_TEAM',           'Cross-Team Collaborator', 'Collaborated on CRs across 3 different projects.',                  'EPIC',    400, 'users',        'cross_project_cr_count',   3, 0, 40
) d WHERE c.code = d.cat;

-- ── Leadership ──
INSERT INTO achievement (category_id, code, name, description, rarity, point_value, icon_key, progress_metric, progress_target, is_milestone, display_order, created_by)
SELECT c.id, d.code, d.name, d.description, d.rarity, d.point_value, d.icon_key, d.progress_metric, d.progress_target, d.is_milestone, d.display_order, 'SYSTEM'
FROM achievement_category c,
(SELECT 'LEADERSHIP' cat, 'MENTOR' code, 'Mentor' name, 'Admin-verified mentoring of 2 or more junior team members.' description, 'EPIC' rarity, 500 point_value, 'graduation-cap' icon_key, 'admin_verified_mentor' progress_metric, 2 progress_target, 0 is_milestone, 10 display_order UNION ALL
 SELECT 'LEADERSHIP','TECH_REVIEWER',       'Technical Reviewer',      'Provided peer-rated useful code reviews for 30 CRs.',               'RARE',    300, 'git-pull-request','peer_rated_review_count', 30,0, 20 UNION ALL
 SELECT 'LEADERSHIP','RELEASE_CAPTAIN',     'Release Captain',         'Led deployment and coordination for 5 successful production releases.','EPIC',  450, 'anchor',       'release_captain_count',    5,  0, 30 UNION ALL
 SELECT 'LEADERSHIP','INCIDENT_COMMANDER',  'Incident Commander',      'Admin-verified leadership during a production incident resolution.',  'LEGENDARY',600,'alert-triangle','admin_verified_incident', 1, 0, 40
) d WHERE c.code = d.cat;

-- ── Innovation ──
INSERT INTO achievement (category_id, code, name, description, rarity, point_value, icon_key, progress_metric, progress_target, is_milestone, display_order, created_by)
SELECT c.id, d.code, d.name, d.description, d.rarity, d.point_value, d.icon_key, d.progress_metric, d.progress_target, d.is_milestone, d.display_order, 'SYSTEM'
FROM achievement_category c,
(SELECT 'INNOVATION' cat, 'AUTOMATION_CREATOR' code, 'Automation Creator' name, 'Admin-reviewed automation contribution reducing manual effort ≥ 20%.' description, 'EPIC' rarity, 500 point_value, 'cpu' icon_key, 'admin_verified_automation' progress_metric, 1 progress_target, 0 is_milestone, 10 display_order UNION ALL
 SELECT 'INNOVATION','PERFORMANCE_OPT',     'Performance Optimizer',   'Admin-accepted performance improvement with measurable impact.',       'EPIC',  450, 'zap',          'admin_verified_perf_opt',   1, 0, 20 UNION ALL
 SELECT 'INNOVATION','SECURITY_IMPROVEMENT','Security Improvement',     'Identified and resolved a security vulnerability accepted by admin.', 'LEGENDARY',700,'shield-plus', 'admin_verified_security',   1, 0, 30 UNION ALL
 SELECT 'INNOVATION','BEST_TECH_IDEA',      'Best Technical Idea',      'Innovation Award granted by admin for an outstanding technical idea.','LEGENDARY',800,'lightbulb',  'admin_granted_innovation',  1, 0, 40
) d WHERE c.code = d.cat;

-- ── Learning ──
INSERT INTO achievement (category_id, code, name, description, rarity, point_value, icon_key, progress_metric, progress_target, is_milestone, display_order, created_by)
SELECT c.id, d.code, d.name, d.description, d.rarity, d.point_value, d.icon_key, d.progress_metric, d.progress_target, d.is_milestone, d.display_order, 'SYSTEM'
FROM achievement_category c,
(SELECT 'LEARNING' cat, 'FIRST_CERTIFICATION' code, 'First Certification' name, 'Admin-verified first professional certification earned.' description, 'RARE' rarity, 300 point_value, 'badge' icon_key, 'admin_verified_cert' progress_metric, 1 progress_target, 1 is_milestone, 10 display_order UNION ALL
 SELECT 'LEARNING','SPRING_BOOT_EXPERT',    'Spring Boot Expert',       'Admin-verified Spring Boot certification or equivalent mastery.',    'EPIC',    500, 'coffee',       'admin_verified_sb_cert',    1, 0, 20 UNION ALL
 SELECT 'LEARNING','REACT_SPECIALIST',      'React Specialist',         'Admin-verified React certification or equivalent mastery.',          'EPIC',    500, 'code',         'admin_verified_react_cert', 1, 0, 30 UNION ALL
 SELECT 'LEARNING','SECURITY_TRAINING',     'Security Training Completed','Admin-verified completion of an accredited security training.',    'RARE',    250, 'lock',         'admin_verified_sec_training',1,0, 40 UNION ALL
 SELECT 'LEARNING','KNOWLEDGE_SESSION',     'Knowledge Session Conducted','Conducted 3 team knowledge sessions verified by admin or peers.',  'RARE',    200, 'mic',          'knowledge_session_count',   3, 0, 50
) d WHERE c.code = d.cat;

-- ─────────────────────────────────────────────────────────────
-- SEED DATA: Achievement Rules
-- (minimal set of COUNT_THRESHOLD rules to bootstrap the engine)
-- ─────────────────────────────────────────────────────────────
INSERT INTO achievement_rule (achievement_id, rule_type, metric_key, operator, threshold_value, grace_days, requires_quality_gate, min_quality_rate, created_by)
SELECT a.id, 'COUNT_THRESHOLD', a.progress_metric, '>=', a.progress_target, 0,
       CASE WHEN a.code IN ('CR_10','CR_50','CR_100','DEPLOYMENT_CHAMPION','CLEAN_CODE') THEN 1 ELSE 0 END,
       CASE WHEN a.code IN ('CR_10','CR_50','CR_100','DEPLOYMENT_CHAMPION','CLEAN_CODE') THEN 70.00 ELSE NULL END,
       'SYSTEM'
FROM achievement a
WHERE a.progress_metric IS NOT NULL
  AND a.progress_target IS NOT NULL;

-- Admin-grant rules for achievements that require human verification
INSERT INTO achievement_rule (achievement_id, rule_type, metric_key, operator, threshold_value, created_by)
SELECT a.id, 'ADMIN_GRANT', a.progress_metric, '>=', 1, 'SYSTEM'
FROM achievement a
WHERE a.progress_metric LIKE 'admin_verified%'
   OR a.progress_metric LIKE 'admin_granted%';

-- ─────────────────────────────────────────────────────────────
-- SEED DATA: Award definitions
-- ─────────────────────────────────────────────────────────────
INSERT INTO award (code, name, description, award_type, icon_key, point_value, created_by) VALUES
('TOP_DEVELOPER',      'Top Developer',           'Highest quality-adjusted development score for the month.',          'MONTHLY', 'code-2',          200, 'SYSTEM'),
('TOP_TESTER',         'Top Tester',              'Highest testing quality score with zero escaped defects.',           'MONTHLY', 'bug',             200, 'SYSTEM'),
('BEST_REVIEWER',      'Best Reviewer',           'Peer-rated most useful code reviewer of the month.',                 'MONTHLY', 'eye',             150, 'SYSTEM'),
('BEST_TEAM_PLAYER',   'Best Team Player',        'Most peer nominations for collaboration and support.',               'MONTHLY', 'heart-handshake', 150, 'SYSTEM'),
('HIGHEST_QUALITY',    'Highest Quality',         'Best overall quality score (approval rate + no escaped defects).',   'MONTHLY', 'award',           200, 'SYSTEM'),
('FASTEST_DELIVERY',   'Fastest Delivery',        'Shortest average SIT-to-PROD cycle time with quality gates passed.', 'MONTHLY', 'clock',           150, 'SYSTEM'),
('MONTHLY_INNOVATION', 'Innovation Award',        'Most impactful innovation or automation contribution of the month.', 'MONTHLY', 'lightbulb',       200, 'SYSTEM'),
('BEST_COLLABORATION', 'Best Collaboration',      'Most cross-functional collaboration impact verified this month.',     'MONTHLY', 'users',           150, 'SYSTEM'),
('EMP_OF_MONTH',       'Employee of the Month',   'Outstanding overall contribution across all dimensions.',            'SPECIAL', 'star',            500, 'SYSTEM'),
('ENG_EXCELLENCE',     'Engineering Excellence',  'Exceptional engineering quality and technical leadership.',           'SPECIAL', 'shield-check',    400, 'SYSTEM'),
('INNOVATION_SPECIAL', 'Innovation Award',        'Outstanding innovative contribution accepted by the team.',          'SPECIAL', 'cpu',             400, 'SYSTEM'),
('OUTSTANDING_PERF',   'Outstanding Performer',   'Recognised for sustained exceptional performance.',                  'SPECIAL', 'trending-up',     350, 'SYSTEM'),
('LEADERSHIP_AWARD',   'Leadership Award',        'Exemplary leadership, mentoring, or technical guidance.',            'SPECIAL', 'anchor',          400, 'SYSTEM'),
('BEST_MENTOR',        'Best Mentor',             'Verified impact on the growth of one or more junior team members.',  'SPECIAL', 'graduation-cap',  350, 'SYSTEM'),
('RELEASE_HERO',       'Release Hero',            'Exceptional contribution to a complex or critical release.',          'SPECIAL', 'rocket',          300, 'SYSTEM'),
('CUSTOMER_APPRECIATION','Customer Appreciation', 'Recognition for direct customer impact or feedback.',                'SPECIAL', 'heart',           300, 'SYSTEM');
