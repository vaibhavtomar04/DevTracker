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
 * Live progress toward locked achievements, upserted by background jobs.
 * Never rendered from page-load; the frontend reads snapshots only.
 */
@Entity
@Table(
    name = "achievement_progress",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_ap_user_achievement",
        columnNames = {"user_id", "achievement_id"}
    )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AchievementProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "achievement_id", nullable = false)
    private Achievement achievement;

    @Column(name = "current_value", nullable = false, precision = 10, scale = 4)
    private BigDecimal currentValue = BigDecimal.ZERO;

    @Column(name = "target_value", nullable = false, precision = 10, scale = 4)
    private BigDecimal targetValue = BigDecimal.ZERO;

    /** 0.00 – 100.00. Computed by engine: (currentValue / targetValue) * 100. */
    @Column(name = "percent_complete", nullable = false, precision = 5, scale = 2)
    private BigDecimal percentComplete = BigDecimal.ZERO;

    @Column(name = "last_evaluated")
    private LocalDateTime lastEvaluated;

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
