package com.devtrack.api.services;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Race-free generator for human-readable JTrack IDs ("BUG-<n>").
 *
 * <p>Backed by the {@code id_sequence} counter table (see Flyway V39). Each call
 * atomically increments the counter row under a row lock, so two concurrent bug
 * creations can never mint the same identifier — replacing the previous
 * {@code count() + 201} + read-then-check loop, which was a classic TOCTOU race.</p>
 *
 * <p>Runs in its own {@code REQUIRES_NEW} transaction so the reserved number is
 * committed immediately and the row lock is released without waiting for the
 * (potentially long) outer bug-creation transaction. Gaps on rollback are
 * acceptable; uniqueness is what matters and is additionally backstopped by the
 * {@code uq_bugs_bug_id} unique constraint.</p>
 */
@Service
public class JtrackIdSequenceService {

    private static final String BUG_SEQ = "BUG_JTRACK";

    @PersistenceContext
    private EntityManager entityManager;

    /** Reserve and return the next JTrack ID for a bug, e.g. "BUG-201". */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String nextBugJtrackId() {
        return "BUG-" + nextValue(BUG_SEQ);
    }

    /**
     * Atomically increment and return the counter for the given sequence name.
     * The UPDATE takes a row lock; the subsequent SELECT reads this transaction's
     * own written value, so concurrent callers serialize and each receives a
     * distinct, monotonically increasing number.
     */
    private long nextValue(String seqName) {
        entityManager.createNativeQuery(
                "UPDATE id_sequence SET next_value = next_value + 1 WHERE seq_name = :name")
                .setParameter("name", seqName)
                .executeUpdate();
        Object value = entityManager.createNativeQuery(
                "SELECT next_value FROM id_sequence WHERE seq_name = :name")
                .setParameter("name", seqName)
                .getSingleResult();
        return ((Number) value).longValue();
    }
}
