package com.devtrack.api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "quality_risk_history")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class QualityRiskHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cr_id", nullable = false)
    private Long crId;

    @Column(name = "risk_score", nullable = false)
    private Double riskScore;

    @Column(name = "bug_count", nullable = false)
    private Integer bugCount;

    @Column(name = "retest_count", nullable = false)
    private Integer retestCount;

    @Column(name = "rejected_bug_count", nullable = false)
    private Integer rejectedBugCount;

    @Column(name = "challenge_rate", nullable = false)
    private Double challengeRate;

    @Column(name = "threshold_snapshot", columnDefinition = "json")
    private String thresholdSnapshot;

    @Column(name = "is_at_risk")
    private Integer isAtRisk = 0;

    @Column(name = "evaluated_at", nullable = false)
    private LocalDateTime evaluatedAt;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_date", nullable = false, updatable = false)
    private LocalDateTime createdDate;

    @Column(name = "modified_by")
    private String modifiedBy;

    @Column(name = "modified_date", nullable = false)
    private LocalDateTime modifiedDate;

    @Version
    private Integer version = 1;

    @Column(name = "active_flag", nullable = false)
    private Integer activeFlag = 1;

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
        modifiedDate = LocalDateTime.now();
        if (version == null) {
            version = 1;
        }
        if (activeFlag == null) {
            activeFlag = 1;
        }
        if (isAtRisk == null) {
            isAtRisk = 0;
        }
        if (evaluatedAt == null) {
            evaluatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        modifiedDate = LocalDateTime.now();
    }
}
