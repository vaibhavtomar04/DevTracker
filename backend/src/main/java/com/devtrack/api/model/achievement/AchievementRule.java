package com.devtrack.api.model.achievement;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "achievement_rule")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AchievementRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "achievement_id", nullable = false)
    private Achievement achievement;

    /**
     * COUNT_THRESHOLD — metric_key total >= threshold_value
     * RATE_THRESHOLD  — rate (0-100) >= threshold_value
     * STREAK          — consecutive streak >= threshold_value (grace_days respected)
     * ADMIN_GRANT     — requires manual grant via award/admin endpoint
     * PEER_NOMINATION — needs >= threshold_value distinct peer nominations
     * TENURE_DAYS     — user tenure in days >= threshold_value
     */
    @Column(name = "rule_type", nullable = false, length = 50)
    private String ruleType;

    /** Key into the metrics registry evaluated by the score engine. */
    @Column(name = "metric_key", nullable = false, length = 100)
    private String metricKey;

    /** Comparison operator: >=  >  ==  <= */
    @Column(nullable = false, length = 10)
    private String operator;

    @Column(name = "threshold_value", nullable = false, precision = 10, scale = 4)
    private BigDecimal thresholdValue;

    /**
     * Number of grace days for streak rules — approved leave days within
     * this window do not break the streak (spec §13: forgiving streaks).
     */
    @Column(name = "grace_days", nullable = false)
    private int graceDays = 0;

    /** If 1, the quality gate (min_quality_rate) must also pass before unlock. */
    @Column(name = "requires_quality_gate", nullable = false)
    private int requiresQualityGate = 0;

    /** Minimum first-pass approval rate (0-100) required as a quality gate. */
    @Column(name = "min_quality_rate", precision = 5, scale = 2)
    private BigDecimal minQualityRate;

    /** Rolling evaluation window in days. NULL = all-time. */
    @Column(name = "evaluation_window_days")
    private Integer evaluationWindowDays;

    /** Extensible JSON blob for future rule parameters. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "additional_config", columnDefinition = "JSON")
    private Map<String, Object> additionalConfig;

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
