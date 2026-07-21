package com.devtrack.api.services.achievement;

import com.devtrack.api.model.User;
import com.devtrack.api.model.achievement.RecognitionEvent;
import com.devtrack.api.repository.UserRepository;
import com.devtrack.api.repository.achievement.RecognitionEventRepository;
import com.devtrack.api.repository.achievement.RecognitionScoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

/**
 * Writes immutable entries to the recognition_event ledger.
 *
 * <p><b>Idempotency contract:</b> every call checks the idempotency_key
 * before inserting. If the key already exists the insert is skipped silently —
 * this is the primary guard against double-reward when events replay.</p>
 *
 * <p><b>Reversal contract:</b> erroneous entries are never deleted; they are
 * marked {@code is_reversed = 1} and a compensating negative-delta event is
 * inserted so the ledger always balances.</p>
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class RecognitionEventService {

    private final RecognitionEventRepository eventRepo;
    private final RecognitionScoreRepository scoreRepo;
    private final UserRepository userRepo;

    // ─────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Records a recognition event in the ledger.
     *
     * @param idempotencyKey  globally unique key — duplicate calls are no-ops
     * @param userId          recipient user PK
     * @param eventType       one of the RecognitionTriggerEvent type constants
     * @param sourceEntityType TASK | BUG | SPRINT | AWARD | null
     * @param sourceEntityId  PK of source entity, nullable
     * @param pointsDelta     positive = earn, negative = penalty
     * @param triggeredBy     username or "SYSTEM"
     * @param metadata        optional context blob
     * @return the persisted event, or empty if duplicate key (already rewarded)
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<RecognitionEvent> record(
            String idempotencyKey,
            Long userId,
            String eventType,
            String sourceEntityType,
            Long sourceEntityId,
            int pointsDelta,
            String triggeredBy,
            Map<String, Object> metadata) {

        // ── Idempotency guard ─────────────────────────────────────────────
        if (eventRepo.existsByIdempotencyKey(idempotencyKey)) {
            log.debug("Recognition event skipped — already recorded. key={}", idempotencyKey);
            return Optional.empty();
        }

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        int scoreBefore = scoreRepo.findByUserId(userId)
                .map(rs -> rs.getTotalScore())
                .orElse(0);
        int scoreAfter  = scoreBefore + pointsDelta;

        RecognitionEvent event = new RecognitionEvent();
        event.setIdempotencyKey(idempotencyKey);
        event.setUser(user);
        event.setEventType(eventType);
        event.setSourceEntityType(sourceEntityType);
        event.setSourceEntityId(sourceEntityId);
        event.setPointsDelta(pointsDelta);
        event.setScoreBefore(scoreBefore);
        event.setScoreAfter(scoreAfter);
        event.setEventMetadata(metadata);
        event.setEventDate(LocalDateTime.now());
        event.setTriggeredBy(triggeredBy);
        event.setIsReversed(0);
        event.setCreatedBy(triggeredBy);

        try {
            RecognitionEvent saved = eventRepo.save(event);
            log.info("Recognition event recorded: type={} user={} delta={} key={}",
                    eventType, userId, pointsDelta, idempotencyKey);
            return Optional.of(saved);
        } catch (DataIntegrityViolationException ex) {
            // Race-condition duplicate — treat as idempotent no-op
            log.warn("Race duplicate on recognition_event key={} — ignoring", idempotencyKey);
            return Optional.empty();
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Reversal (admin-initiated, fully audited)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Reverses an erroneous event.
     * <ol>
     *   <li>Marks the original event {@code is_reversed = 1}.</li>
     *   <li>Inserts a compensating negative-delta event so the score ledger
     *       re-balances without deleting history.</li>
     * </ol>
     *
     * @param eventId       PK of the event to reverse
     * @param reversedBy    admin username performing the reversal
     * @param reason        mandatory reason for audit log
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void reverseEvent(Long eventId, String reversedBy, String reason) {
        RecognitionEvent original = eventRepo.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("RecognitionEvent not found: " + eventId));

        if (original.getIsReversed() == 1) {
            throw new IllegalStateException("Event " + eventId + " is already reversed.");
        }

        // Mark original as reversed
        original.setIsReversed(1);
        original.setReversedBy(reversedBy);
        original.setReversedAt(LocalDateTime.now());
        original.setReversalReason(reason);
        original.setModifiedBy(reversedBy);
        eventRepo.save(original);

        // Insert compensating event
        String compensatingKey = "REVERSAL:" + original.getIdempotencyKey();
        if (!eventRepo.existsByIdempotencyKey(compensatingKey)) {
            record(
                compensatingKey,
                original.getUser().getId(),
                "SCORE_ADJUSTMENT",
                original.getSourceEntityType(),
                original.getSourceEntityId(),
                -original.getPointsDelta(),   // inverse of original delta
                reversedBy,
                Map.of(
                    "reversalOf",  eventId,
                    "reason",      reason,
                    "originalKey", original.getIdempotencyKey()
                )
            );
        }

        log.info("RecognitionEvent {} reversed by {} — reason: {}", eventId, reversedBy, reason);
    }
}
