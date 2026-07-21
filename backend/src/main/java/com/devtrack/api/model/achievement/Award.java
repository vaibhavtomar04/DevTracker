package com.devtrack.api.model.achievement;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "award")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Award {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * MONTHLY — auto-calculated each month; admin approves before publishing.
     * SPECIAL — manually granted by Admin or Project Manager.
     */
    @Column(name = "award_type", nullable = false, length = 20)
    private String awardType = "SPECIAL";

    @Column(name = "icon_key", length = 100)
    private String iconKey;

    @Column(name = "point_value", nullable = false)
    private int pointValue = 0;

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
