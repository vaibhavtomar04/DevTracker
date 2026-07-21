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
 * A single award grant — monthly (auto-calculated, admin-approved before publish)
 * or special (manually granted by Admin / PM). Fully audited, never deleted.
 */
@Entity
@Table(name = "award_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AwardHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "award_id", nullable = false)
    private Award award;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    /** Null for MONTHLY awards (auto-calculated by system). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "awarded_by_id")
    private User awardedBy;

    @Column(name = "award_date", nullable = false)
    private LocalDateTime awardDate;

    /** 1-12 for monthly awards; null for special. */
    @Column(name = "period_month")
    private Byte periodMonth;

    @Column(name = "period_year")
    private Short periodYear;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String comments;

    /**
     * Monthly awards are held in draft (0) until an admin explicitly publishes (1).
     * Special awards are published immediately on grant.
     */
    @Column(name = "is_published", nullable = false)
    private int isPublished = 0;

    @Column(name = "points_awarded", nullable = false)
    private int pointsAwarded = 0;

    /** Idempotency key linking to the recognition_event that credited the points. */
    @Column(name = "source_event_id", length = 200)
    private String sourceEventId;

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
