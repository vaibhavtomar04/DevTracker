-- V39: Race-free JTrack ID generation + hard uniqueness for bug identifiers.
-- Part of the BugController release-blocker set (replaces count()+201 generation).

-- 1) Hard uniqueness backstop on the human-readable bug identifier
--    (Bug.jtrackId maps to column bug_id). If pre-existing duplicates exist this
--    migration fails loudly BY DESIGN so the data issue is surfaced and fixed
--    before release. MySQL UNIQUE permits multiple NULLs, so legacy null ids
--    (if any) do not block the constraint.
ALTER TABLE bugs ADD CONSTRAINT uq_bugs_bug_id UNIQUE (bug_id);

-- 2) Atomic counter table used by JtrackIdSequenceService to mint sequential ids.
CREATE TABLE IF NOT EXISTS id_sequence (
    seq_name   VARCHAR(64) NOT NULL,
    next_value BIGINT      NOT NULL,
    PRIMARY KEY (seq_name)
);

-- 3) Seed the BUG counter to the highest existing numeric suffix (the last-used
--    value), defaulting to 200 so the first generated id remains BUG-201 on a
--    fresh database. next_value stores the last value handed out; the generator
--    increments before returning.
INSERT INTO id_sequence (seq_name, next_value)
SELECT 'BUG_JTRACK', COALESCE(MAX(CAST(SUBSTRING(bug_id, 5) AS UNSIGNED)), 200)
FROM bugs
WHERE bug_id LIKE 'BUG-%';
