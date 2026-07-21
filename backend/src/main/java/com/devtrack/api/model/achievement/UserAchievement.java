package com.devtrack.api.model.achievement;

import com.devtrack.api.model.User;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

/**
 * Immutable record of an achievement unlocked by a user.
 * Never deleted — active_flag = 0 for erroneous grants.
 * The unique constraint on (user_id, achievement_id) enforces one unlock per user.
 */
@Entity
@Table(
    name = "user_achievement",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_ua_user_achievement",
        columnNames = {"user_id", "achievement_id"}
    )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserAchievement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "achievement_id", nullable = false)
    private Achievement achievement;

    @Column(name = "unlock_date", nullable = false)
    private LocalDateTime unlockDate;

    /**
     * Idempotency key linking back to the {@link RecognitionEvent} that triggered
     * this unlock. Prevents double-grants if the engine replays events.
     */
    @Column(name = "source_event_id", length = 200)
    private String sourceEventId;

    @Column(name = "unlock_reason", columnDefinition = "TEXT")
    private String unlockReason;

    @Column(name = "points_awarded", nullable = false)
    private int pointsAwarded;

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
