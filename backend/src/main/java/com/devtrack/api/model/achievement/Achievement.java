package com.devtrack.api.model.achievement;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "achievement")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Achievement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private AchievementCategory category;

    @Column(nullable = false, unique = true, length = 100)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    /**
     * COMMON | RARE | EPIC | LEGENDARY
     * Maps to design token accent colours defined in §6 of the spec.
     */
    @Column(nullable = false, length = 20)
    private String rarity = "COMMON";

    @Column(name = "point_value", nullable = false)
    private int pointValue;

    @Column(name = "icon_key", length = 100)
    private String iconKey;

    /**
     * Key into the scoring metrics registry (e.g. "successful_cr_count").
     * The engine reads this to resolve live progress from {@link AchievementProgress}.
     */
    @Column(name = "progress_metric", length = 100)
    private String progressMetric;

    /** Numeric target for the progress_metric. Null = admin-grant only. */
    @Column(name = "progress_target")
    private Integer progressTarget;

    /** If 1, this achievement is also displayed on the Milestones page. */
    @Column(name = "is_milestone", nullable = false)
    private int isMilestone = 0;

    @Column(name = "display_order", nullable = false)
    private int displayOrder = 0;

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
