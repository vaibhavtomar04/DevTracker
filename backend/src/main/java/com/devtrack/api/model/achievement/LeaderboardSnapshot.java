package com.devtrack.api.model.achievement;

import com.devtrack.api.model.User;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Periodic ranked snapshots of the leaderboard computed by a background job.
 * Never live-queried per request — the frontend always reads the latest snapshot.
 * This keeps leaderboard reads O(1) and prevents score-ranking from running on
 * every page load.
 */
@Entity
@Table(name = "leaderboard_snapshot")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaderboardSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    /**
     * DAILY | WEEKLY | MONTHLY | QUARTERLY | YEARLY
     */
    @Column(name = "period_type", nullable = false, length = 20)
    private String periodType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "rank_position", nullable = false)
    private int rankPosition;

    @Column(name = "total_score", nullable = false)
    private int totalScore = 0;

    @Column(name = "quality_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal qualityScore = BigDecimal.ZERO;

    @Column(name = "achievement_count", nullable = false)
    private int achievementCount = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "level_id")
    private RecognitionLevel level;

    @Column(name = "sprint_success_rate", precision = 5, scale = 2)
    private BigDecimal sprintSuccessRate;

    @Column(name = "deployment_success_rate", precision = 5, scale = 2)
    private BigDecimal deploymentSuccessRate;

    @Column(name = "bug_count", nullable = false)
    private int bugCount = 0;

    /** NULL = all projects; non-null = filtered leaderboard. */
    @Column(name = "project_filter", length = 100)
    private String projectFilter;

    @Column(name = "department_filter", length = 100)
    private String departmentFilter;

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
