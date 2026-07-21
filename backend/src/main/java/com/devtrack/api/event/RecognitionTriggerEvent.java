package com.devtrack.api.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Domain event published whenever a business action that may trigger a
 * recognition reward completes. Published AFTER the originating transaction
 * commits so the recognition engine never sees partial data.
 *
 * <p>Supported event types:
 * <ul>
 *   <li>CR_COMPLETED         – CR reached PROD_COMPLETED or CLOSED</li>
 *   <li>DEPLOYMENT_SUCCESS   – clean prod deploy (no rollback)</li>
 *   <li>DEPLOYMENT_ROLLBACK  – rollback counted as penalty</li>
 *   <li>BUG_RESOLVED         – bug closed/resolved</li>
 *   <li>BUG_ESCAPED_PROD     – production-escaped defect (penalty)</li>
 *   <li>SPRINT_COMPLETED     – sprint marked complete</li>
 *   <li>CODE_APPROVED        – CR approved on first pass</li>
 *   <li>CODE_CHANGES_REQUESTED – code review returned (penalty signals)</li>
 *   <li>TESTING_COMPLETED    – testing sign-off done</li>
 *   <li>AWARD_GRANTED        – special/monthly award given by admin</li>
 *   <li>ADMIN_SCORE_ADJUSTMENT – admin override with audited reason</li>
 * </ul>
 */
@Getter
public class RecognitionTriggerEvent extends ApplicationEvent {

    /** One of the event type constants listed in the javadoc above. */
    private final String eventType;

    /** Database PK of the user receiving the recognition. */
    private final Long userId;

    /** Type of the originating entity (TASK, BUG, SPRINT, AWARD). */
    private final String sourceEntityType;

    /** PK of the originating entity. */
    private final Long sourceEntityId;

    /**
     * Actor who triggered the action (username or "SYSTEM").
     * Used for audit; never used to calculate scores.
     */
    private final String triggeredBy;

    /**
     * Optional additional context (e.g. CR priority, deployment environment).
     * The engine reads this to apply complexity/impact weights.
     * Encoded as a simple key=value map serialised to JSON when persisted.
     */
    private final java.util.Map<String, Object> metadata;

    public RecognitionTriggerEvent(
            Object source,
            String eventType,
            Long userId,
            String sourceEntityType,
            Long sourceEntityId,
            String triggeredBy,
            java.util.Map<String, Object> metadata) {
        super(source);
        this.eventType       = eventType;
        this.userId          = userId;
        this.sourceEntityType = sourceEntityType;
        this.sourceEntityId  = sourceEntityId;
        this.triggeredBy     = triggeredBy;
        this.metadata        = metadata != null ? metadata : java.util.Map.of();
    }

    /**
     * Deterministic idempotency key for this trigger.
     * Format: "{eventType}:{sourceEntityType}:{sourceEntityId}:{userId}"
     * A recognition_event row with this key can never be inserted twice.
     */
    public String idempotencyKey() {
        return String.format("%s:%s:%s:%s",
                eventType, sourceEntityType, sourceEntityId, userId);
    }
}
