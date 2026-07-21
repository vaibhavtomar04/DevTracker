package com.devtrack.api.model.achievement;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.devtrack.api.model.User;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Immutable event ledger — the single source of truth for all score deltas.
 * Every reward is keyed on idempotency_key so replays can never double-reward.
 * Entries are never deleted; erroneous entries are reversed via is_reversed flag.
 */
@Entity
@Table(name = "recognition_event")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class RecognitionEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Globally unique idempotency key — typically:
     *   "{eventType}:{sourceEntityType}:{sourceEntityId}:{userId}"
     * Enforced UNIQUE in DB; insert-ignore pattern in service.
     */
    @Column(name = "idempotency_key", nullable = false, unique = true, length = 255)
    private String idempotencyKey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * CR_COMPLETED | DEPLOYMENT_SUCCESS | BUG_RESOLVED | SPRINT_COMPLETED |
     * CODE_APPROVED | TESTING_COMPLETED | ACHIEVEMENT_UNLOCKED | AWARD_GRANTED |
     * LEVEL_UP | MILESTONE_REACHED | SCORE_ADJUSTMENT
     */
    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    /** e.g. TASK | BUG | SPRINT | AWARD */
    @Column(name = "source_entity_type", length = 50)
    private String sourceEntityType;

    @Column(name = "source_entity_id")
    private Long sourceEntityId;

    /** Positive = earned, negative = penalty. */
    @Column(name = "points_delta", nullable = false)
    private int pointsDelta;

    @Column(name = "score_before", nullable = false)
    private int scoreBefore;

    @Column(name = "score_after", nullable = false)
    private int scoreAfter;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "event_metadata", columnDefinition = "JSON")
    private Map<String, Object> eventMetadata;

    @Column(name = "event_date", nullable = false)
    private LocalDateTime eventDate;

    /** Username or "SYSTEM" that triggered this event. */
    @Column(name = "triggered_by", length = 255)
    private String triggeredBy;

    /** Set to 1 by an admin reversal; original record preserved for full audit. */
    @Column(name = "is_reversed", nullable = false)
    private int isReversed = 0;

    @Column(name = "reversed_by", length = 255)
    private String reversedBy;

    @Column(name = "reversed_at")
    private LocalDateTime reversedAt;

    @Column(name = "reversal_reason", columnDefinition = "TEXT")
    private String reversalReason;

    @Column(name = "created_by", length = 255)
    private String createdBy;

    @CreationTimestamp
    @Column(name = "created_date", nullable = false, updatable = false)
    private LocalDateTime createdDate;

    @Column(name = "modified_by", length = 255)
    private String modifiedBy;

    @UpdateTimestamp
    @Column(name = "modified_date", nullable = false)
    private LocalDateTime modifiedDate;

    @Version
    @Column(nullable = false)
    private int version = 0;

    @Column(name = "active_flag", nullable = false)
    private int activeFlag = 1;
}
