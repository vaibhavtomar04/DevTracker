package com.devtrack.api.model.achievement;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.devtrack.api.model.User;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Current recognition score and quality metrics per user (1 row per user).
 * Historical deltas live in {@link RecognitionEvent}.
 * Ranking fields are populated by the leaderboard snapshot job — never live-ranked.
 */
@Entity
@Table(name = "recognition_score")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class RecognitionScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "total_score", nullable = false)
    private int totalScore = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_level_id")
    private RecognitionLevel currentLevel;

    /** 0–100 composite quality score (weighted blend of the factors in §12). */
    @Column(name = "quality_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal qualityScore = BigDecimal.ZERO;

    /** First-pass code approval rate: approved_first_time / total_cr_count * 100. */
    @Column(name = "approval_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal approvalRate = BigDecimal.ZERO;

    /** (successful_deployments / total_deployments) * 100. */
    @Column(name = "deployment_success_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal deploymentSuccessRate = BigDecimal.ZERO;

    /** (sprints_completed_on_time / total_sprints) * 100. */
    @Column(name = "sprint_success_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal sprintSuccessRate = BigDecimal.ZERO;

    /**
     * Production-escaped defects only (spec §13 — never penalise testing catches).
     * (escaped_prod_bugs / total_cr_count) * 100.
     */
    @Column(name = "escaped_defect_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal escapedDefectRate = BigDecimal.ZERO;

    /** (reopened_bugs / total_bugs) * 100. */
    @Column(name = "reopen_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal reopenRate = BigDecimal.ZERO;

    /** Populated by the leaderboard snapshot job; NULL until first snapshot. */
    @Column(name = "monthly_rank")
    private Integer monthlyRank;

    /** Populated by the leaderboard snapshot job; NULL until first snapshot. */
    @Column(name = "overall_rank")
    private Integer overallRank;

    /**
     * PRIVATE — score hidden from all leaderboards (default, spec §16)
     * TEAM    — visible within the user's team
     * PUBLIC  — visible on all leaderboards
     */
    @Column(name = "score_visibility", nullable = false, length = 20)
    private String scoreVisibility = "PRIVATE";

    @Column(name = "last_recalculated")
    private LocalDateTime lastRecalculated;

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
