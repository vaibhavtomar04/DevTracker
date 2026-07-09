-- ============================================================
-- DevTrack 2.0 — Phase E1: Data Foundation Migration
-- ============================================================

-- 1. Sprint Tasks Table
CREATE TABLE IF NOT EXISTS sprint_tasks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sprint_id BIGINT,
    story_points INT,
    estimated_hours INT,
    priority VARCHAR(50),
    assigned_developer_id BIGINT,
    due_date DATE,
    status VARCHAR(50),
    created_by VARCHAR(255),
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by VARCHAR(255),
    modified_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version INT NOT NULL DEFAULT 1,
    active_flag TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT fk_st_sprint FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE SET NULL,
    CONSTRAINT fk_st_developer FOREIGN KEY (assigned_developer_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Sprint Task Dependencies Table
CREATE TABLE IF NOT EXISTS sprint_task_dependencies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT NOT NULL,
    depends_on_task_id BIGINT NOT NULL,
    dependency_type VARCHAR(50) NOT NULL,
    created_by VARCHAR(255),
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by VARCHAR(255),
    modified_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version INT NOT NULL DEFAULT 1,
    active_flag TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT fk_std_task FOREIGN KEY (task_id) REFERENCES sprint_tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_std_depends FOREIGN KEY (depends_on_task_id) REFERENCES sprint_tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. CR Sprint Task Link Table (Many-to-Many join table)
CREATE TABLE IF NOT EXISTS cr_sprint_task_link (
    cr_id BIGINT NOT NULL,
    sprint_task_id BIGINT NOT NULL,
    created_by VARCHAR(255),
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by VARCHAR(255),
    modified_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version INT NOT NULL DEFAULT 1,
    active_flag TINYINT NOT NULL DEFAULT 1,
    PRIMARY KEY (cr_id, sprint_task_id),
    CONSTRAINT fk_cstl_cr FOREIGN KEY (cr_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_cstl_task FOREIGN KEY (sprint_task_id) REFERENCES sprint_tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bug Review Table
CREATE TABLE IF NOT EXISTS bug_review (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cr_id BIGINT NOT NULL,
    raised_by_tester_id BIGINT,
    proposed_bug_payload JSON NOT NULL,
    developer_id BIGINT,
    review_status VARCHAR(50) NOT NULL,
    current_owner_role VARCHAR(50) NOT NULL,
    created_bug_id BIGINT,
    created_by VARCHAR(255),
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by VARCHAR(255),
    modified_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version INT NOT NULL DEFAULT 1,
    active_flag TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT fk_br_cr FOREIGN KEY (cr_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_br_tester FOREIGN KEY (raised_by_tester_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_br_developer FOREIGN KEY (developer_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bug Rejection Table
CREATE TABLE IF NOT EXISTS bug_rejection (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bug_review_id BIGINT NOT NULL,
    justification TEXT NOT NULL,
    root_cause VARCHAR(255),
    reason VARCHAR(255),
    evidence_note TEXT,
    created_by VARCHAR(255),
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by VARCHAR(255),
    modified_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version INT NOT NULL DEFAULT 1,
    active_flag TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT fk_brej_review FOREIGN KEY (bug_review_id) REFERENCES bug_review(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Bug Developer Fix Summary Table
CREATE TABLE IF NOT EXISTS bug_developer_fix_summary (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bug_id BIGINT,
    cr_id BIGINT,
    root_cause_analysis TEXT NOT NULL,
    fix_summary TEXT NOT NULL,
    files_modified TEXT,
    database_changes TEXT,
    api_changes TEXT,
    additional_notes TEXT,
    created_by VARCHAR(255),
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by VARCHAR(255),
    modified_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version INT NOT NULL DEFAULT 1,
    active_flag TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT fk_bdfs_bug FOREIGN KEY (bug_id) REFERENCES bugs(id) ON DELETE SET NULL,
    CONSTRAINT fk_bdfs_cr FOREIGN KEY (cr_id) REFERENCES tasks(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. CR Timeline Events Table
CREATE TABLE IF NOT EXISTS cr_timeline_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cr_id BIGINT NOT NULL,
    milestone_type VARCHAR(100) NOT NULL,
    event_status VARCHAR(50) NOT NULL,
    event_date DATETIME NOT NULL,
    duration_ms BIGINT,
    actor_id BIGINT,
    is_restart TINYINT DEFAULT 0,
    restart_reason VARCHAR(1000),
    superseded_event_id BIGINT,
    created_by VARCHAR(255),
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by VARCHAR(255),
    modified_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version INT NOT NULL DEFAULT 1,
    active_flag TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT fk_cte_cr FOREIGN KEY (cr_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_cte_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_cte_superseded FOREIGN KEY (superseded_event_id) REFERENCES cr_timeline_events(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Audit Group Table
CREATE TABLE IF NOT EXISTS audit_group (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT NOT NULL,
    group_key VARCHAR(100) NOT NULL,
    created_by VARCHAR(255),
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by VARCHAR(255),
    modified_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version INT NOT NULL DEFAULT 1,
    active_flag TINYINT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Quality Risk History Table
CREATE TABLE IF NOT EXISTS quality_risk_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cr_id BIGINT NOT NULL,
    risk_score DOUBLE NOT NULL,
    bug_count INT NOT NULL,
    retest_count INT NOT NULL,
    rejected_bug_count INT NOT NULL,
    challenge_rate DOUBLE NOT NULL,
    threshold_snapshot JSON,
    is_at_risk TINYINT DEFAULT 0,
    evaluated_at DATETIME NOT NULL,
    created_by VARCHAR(255),
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_by VARCHAR(255),
    modified_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version INT NOT NULL DEFAULT 1,
    active_flag TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT fk_qrh_cr FOREIGN KEY (cr_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Extend Existing Tables
ALTER TABLE tasks ADD COLUMN approver_id BIGINT NULL;
ALTER TABLE tasks ADD COLUMN deployment_owner_id BIGINT NULL;
ALTER TABLE tasks ADD COLUMN is_quality_risk TINYINT DEFAULT 0;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_deployment_owner FOREIGN KEY (deployment_owner_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE bugs ADD COLUMN source_bug_review_id BIGINT NULL;
ALTER TABLE bug_review ADD CONSTRAINT fk_br_bug FOREIGN KEY (created_bug_id) REFERENCES bugs(id) ON DELETE SET NULL;
ALTER TABLE bugs ADD CONSTRAINT fk_bugs_source_review FOREIGN KEY (source_bug_review_id) REFERENCES bug_review(id) ON DELETE SET NULL;

ALTER TABLE notifications ADD COLUMN is_pinned TINYINT DEFAULT 0;
ALTER TABLE notifications ADD COLUMN snoozed_until DATETIME NULL;

-- 11. Add Database Indexes
CREATE INDEX idx_st_sprint_id ON sprint_tasks(sprint_id);
CREATE INDEX idx_st_assigned_developer_id ON sprint_tasks(assigned_developer_id);
CREATE INDEX idx_st_active_flag ON sprint_tasks(active_flag);

CREATE INDEX idx_std_task_id ON sprint_task_dependencies(task_id);
CREATE INDEX idx_std_depends_on_task_id ON sprint_task_dependencies(depends_on_task_id);

CREATE INDEX idx_br_cr_id ON bug_review(cr_id);
CREATE INDEX idx_br_raised_by_tester_id ON bug_review(raised_by_tester_id);
CREATE INDEX idx_br_developer_id ON bug_review(developer_id);
CREATE INDEX idx_br_created_bug_id ON bug_review(created_bug_id);
CREATE INDEX idx_br_active_flag ON bug_review(active_flag);

CREATE INDEX idx_brej_review_id ON bug_rejection(bug_review_id);

CREATE INDEX idx_bdfs_bug_id ON bug_developer_fix_summary(bug_id);
CREATE INDEX idx_bdfs_cr_id ON bug_developer_fix_summary(cr_id);

CREATE INDEX idx_cte_cr_id ON cr_timeline_events(cr_id);
CREATE INDEX idx_cte_actor_id ON cr_timeline_events(actor_id);
CREATE INDEX idx_cte_superseded_event_id ON cr_timeline_events(superseded_event_id);
CREATE INDEX idx_cte_event_date ON cr_timeline_events(event_date);

CREATE INDEX idx_ag_entity ON audit_group(entity_type, entity_id);
CREATE INDEX idx_ag_group_key ON audit_group(group_key);

CREATE INDEX idx_qrh_cr_id ON quality_risk_history(cr_id);
CREATE INDEX idx_qrh_evaluated_at ON quality_risk_history(evaluated_at);

CREATE INDEX idx_tasks_approver_id ON tasks(approver_id);
CREATE INDEX idx_tasks_deployment_owner_id ON tasks(deployment_owner_id);

CREATE INDEX idx_bugs_source_bug_review_id ON bugs(source_bug_review_id);
