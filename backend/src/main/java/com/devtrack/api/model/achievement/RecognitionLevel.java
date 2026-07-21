package com.devtrack.api.model.achievement;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "recognition_level")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecognitionLevel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "level_number", nullable = false, unique = true)
    private int levelNumber;

    @Column(nullable = false, length = 100)
    private String title;

    /** Admin-configurable point threshold. Default values seeded in migration. */
    @Column(name = "min_points", nullable = false)
    private int minPoints;

    @Column(name = "badge_icon_key", length = 100)
    private String badgeIconKey;

    /** e.g. "emerald-500", "copper-400" — maps to the design token palette. */
    @Column(name = "color_token", length = 50)
    private String colorToken;

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
