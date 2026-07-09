package com.devtrack.api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "bug_rejection")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class BugRejection {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bug_review_id", nullable = false)
    private Long bugReviewId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String justification;

    @Column(name = "root_cause")
    private String rootCause;

    private String reason;

    @Column(name = "evidence_note", columnDefinition = "TEXT")
    private String evidenceNote;

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
    }

    @PreUpdate
    protected void onUpdate() {
        modifiedDate = LocalDateTime.now();
    }
}
