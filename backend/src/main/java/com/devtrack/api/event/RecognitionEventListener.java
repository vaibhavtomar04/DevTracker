package com.devtrack.api.event;

import com.devtrack.api.services.achievement.AchievementEvaluationService;
import com.devtrack.api.services.achievement.AchievementNotificationService;
import com.devtrack.api.services.achievement.RecognitionEventService;
import com.devtrack.api.services.achievement.RecognitionScoreService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Map;

/**
 * Asynchronous listener that wires {@link RecognitionTriggerEvent} to the
 * recognition engine pipeline.
 *
 * <p><b>Threading:</b> every handler runs on the {@code taskExecutor} pool
 * (configured in {@link com.devtrack.api.config.AsyncConfig}) so the originating
 * HTTP request thread is never blocked.</p>
 *
 * <p><b>Transaction coupling:</b> {@code @TransactionalEventListener} with
 * {@code AFTER_COMMIT} ensures the engine only sees committed data — it can
 * never observe a partial transaction that later rolls back.</p>
 *
 * <p><b>Order of operations for each trigger:</b>
 * <ol>
 *   <li>Write the immutable event to the recognition_event ledger (idempotent).</li>
 *   <li>Apply the point delta to recognition_score + recalculate quality rates.</li>
 *   <li>Evaluate all achievement rules for the user.</li>
 *   <li>Send in-app + email notifications for any newly unlocked achievements
 *       or level changes (handled by AchievementNotificationService).</li>
 * </ol>
 * </p>
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class RecognitionEventListener {

    private final RecognitionEventService       eventService;
    private final RecognitionScoreService       scoreService;
    private final AchievementEvaluationService  evaluationService;
    private final AchievementNotificationService notificationService;

    // ── Point values by event type (anti-gaming: quality-gated by MetricsService) ──
    // Negative values = penalties.  Admin overrides bypass this table.
    private static final Map<String, Integer> BASE_POINTS = Map.ofEntries(
        Map.entry("CR_COMPLETED",            50),
        Map.entry("DEPLOYMENT_SUCCESS",      30),
        Map.entry("DEPLOYMENT_ROLLBACK",    -40),  // penalty
        Map.entry("BUG_RESOLVED",            10),
        Map.entry("BUG_ESCAPED_PROD",       -50),  // prod-only penalty, spec §13
        Map.entry("SPRINT_COMPLETED",        20),
        Map.entry("CODE_APPROVED",           15),
        Map.entry("CODE_CHANGES_REQUESTED", -10),  // mild rework signal
        Map.entry("TESTING_COMPLETED",       15),
        Map.entry("AWARD_GRANTED",            0),  // points set by award definition
        Map.entry("LEVEL_UP",                 0),  // no extra points for leveling up
        Map.entry("ACHIEVEMENT_UNLOCKED",     0),  // points set by achievement definition
        Map.entry("ADMIN_SCORE_ADJUSTMENT",   0)   // delta carried in metadata.points
    );

    // ─────────────────────────────────────────────────────────────────────
    // Main trigger handler
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Primary handler — runs AFTER the originating transaction commits.
     * Fires for all event types EXCEPT LEVEL_UP and ACHIEVEMENT_UNLOCKED
     * (those are published by the engine itself and handled by the
     * notification handler below).
     */
    @Async("taskExecutor")
    @EventListener
    public void onRecognitionTrigger(RecognitionTriggerEvent trigger) {
        String eventType = trigger.getEventType();

        // LEVEL_UP and ACHIEVEMENT_UNLOCKED are handled by the notification
        // handler; the engine re-publishes them internally — skip ledger entry.
        if ("LEVEL_UP".equals(eventType) || "ACHIEVEMENT_UNLOCKED".equals(eventType)) {
            return;
        }

        Long   userId      = trigger.getUserId();
        String triggeredBy = trigger.getTriggeredBy();

        log.debug("RecognitionTrigger received: type={} user={}", eventType, userId);

        try {
            // ── Step 1: Resolve point delta ───────────────────────────────
            int pointsDelta = resolvePoints(trigger);

            // ── Step 2: Write to immutable ledger (idempotent) ────────────
            var eventOpt = eventService.record(
                    trigger.idempotencyKey(),
                    userId,
                    eventType,
                    trigger.getSourceEntityType(),
                    trigger.getSourceEntityId(),
                    pointsDelta,
                    triggeredBy,
                    trigger.getMetadata()
            );

            if (eventOpt.isEmpty()) {
                log.debug("Duplicate trigger skipped: key={}", trigger.idempotencyKey());
                return; // already rewarded — idempotency guard
            }

            // ── Step 3: Recalculate score + quality rates ─────────────────
            scoreService.applyDeltaAndRecalculate(userId, triggeredBy);

            // ── Step 4: Evaluate achievement rules ────────────────────────
            evaluationService.evaluateForUser(userId, triggeredBy);

        } catch (Exception ex) {
            // Log and swallow — never let recognition failures propagate back
            // to the originating HTTP request (spec §18: background-only).
            log.error("Recognition engine error: type={} user={} msg={}",
                    eventType, userId, ex.getMessage(), ex);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Notification handler (LEVEL_UP + ACHIEVEMENT_UNLOCKED)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Handles LEVEL_UP and ACHIEVEMENT_UNLOCKED events published by the engine
     * itself. These run on the same async executor so the notification pipeline
     * is also non-blocking.
     */
    @Async("taskExecutor")
    @EventListener
    public void onRecognitionNotification(RecognitionTriggerEvent trigger) {
        String eventType = trigger.getEventType();
        if (!"LEVEL_UP".equals(eventType) && !"ACHIEVEMENT_UNLOCKED".equals(eventType)) {
            return;
        }

        try {
            notificationService.sendUnlockNotification(
                    trigger.getUserId(),
                    eventType,
                    trigger.getSourceEntityId(),
                    trigger.getSourceEntityType(),
                    trigger.getMetadata(),
                    trigger.getTriggeredBy()
            );
        } catch (Exception ex) {
            log.error("Notification delivery failed: type={} user={} msg={}",
                    eventType, trigger.getUserId(), ex.getMessage(), ex);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Resolves the point delta for a trigger.
     * Admin adjustments carry their own delta in metadata["points"].
     * Award grants carry points from the award definition (stored in metadata["pointValue"]).
     */
    private int resolvePoints(RecognitionTriggerEvent trigger) {
        Map<String, Object> meta = trigger.getMetadata();

        if (meta.containsKey("pointsOverride")) {
            Object p = meta.get("pointsOverride");
            return p instanceof Number n ? n.intValue() : 0;
        }
        if ("ADMIN_SCORE_ADJUSTMENT".equals(trigger.getEventType())) {
            Object p = meta.get("points");
            return p instanceof Number n ? n.intValue() : 0;
        }
        if ("AWARD_GRANTED".equals(trigger.getEventType())) {
            Object p = meta.get("pointValue");
            return p instanceof Number n ? n.intValue() : 0;
        }

        return BASE_POINTS.getOrDefault(trigger.getEventType(), 0);
    }
}
