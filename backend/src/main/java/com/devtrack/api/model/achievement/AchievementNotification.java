package com.devtrack.api.model.achievement;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.devtrack.api.model.User;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

/**
 * In-app notification record for every recognition event.
 * Written by the AchievementNotificationService on every unlock, level-up,
 * badge earn, milestone, award, or challenge completion.
 * Toast + confetti + bell + email + timeline entry all originate from this record.
 */
@Entity
@Table(name = "achievement_notification")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AchievementNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * ACHIEVEMENT_UNLOCKED | LEVEL_UP | BADGE_EARNED | MILESTONE_REACHED |
     * AWARD_GRANTED | CHALLENGE_COMPLETED
     */
    @Column(name = "notification_type", nullable = false, length = 50)
    private String notificationType;

    /** FK to user_achievement.id or award_history.id depending on reference_type. */
    @Column(name = "reference_id")
    private Long referenceId;

    /** USER_ACHIEVEMENT | AWARD_HISTORY */
    @Column(name = "reference_type", length = 50)
    private String referenceType;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    /** Points earned (+) or adjusted (−) by this event. */
    @Column(name = "points_delta")
    private Integer pointsDelta;

    @Column(name = "is_read", nullable = false)
    private int isRead = 0;

    @Column(name = "is_email_sent", nullable = false)
    private int isEmailSent = 0;

    @Column(name = "email_sent_at")
    private LocalDateTime emailSentAt;

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
