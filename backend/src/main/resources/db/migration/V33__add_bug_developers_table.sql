-- V33__add_bug_developers_table.sql
-- Multi-developer bug assignment — mirrors the task_developers pattern.
-- A Bug can now have multiple assigned developers (many-to-many via join table).
-- The legacy bugs.assigned_developer_id column is kept as the PRIMARY SENTINEL
-- for backward compatibility; the pool is stored here.

CREATE TABLE IF NOT EXISTS bug_developers (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    bug_id              BIGINT       NOT NULL,
    developer_id        BIGINT       NOT NULL,
    assigned_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bug_devs_bug        FOREIGN KEY (bug_id)       REFERENCES bugs(id)  ON DELETE CASCADE,
    CONSTRAINT fk_bug_devs_developer  FOREIGN KEY (developer_id) REFERENCES users(id) ON DELETE CASCADE,
    -- Prevent the same developer from being linked to the same bug twice
    CONSTRAINT uq_bug_developer UNIQUE (bug_id, developer_id)
);

-- Index for the most common read path: "give me all bugs assigned to developer X"
CREATE INDEX idx_bug_developers_developer_id
    ON bug_developers (developer_id);

-- Index for "give me all developers on bug Y"
CREATE INDEX idx_bug_developers_bug_id
    ON bug_developers (bug_id);
