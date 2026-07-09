package com.devtrack.api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "bug_developer_fix_summary")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class BugDeveloperFixSummary {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "bug_id")
    private Bug bug;

    @Column(name = "cr_id")
    private Long crId;

    @Column(name = "root_cause_analysis", nullable = false, columnDefinition = "TEXT")
    private String rootCauseAnalysis;

    @Column(name = "fix_summary", nullable = false, columnDefinition = "TEXT")
    private String fixSummary;

    @Column(name = "files_modified", columnDefinition = "TEXT")
    private String filesModified;

    @Column(name = "database_changes", columnDefinition = "TEXT")
    private String databaseChanges;

    @Column(name = "api_changes", columnDefinition = "TEXT")
    private String apiChanges;

    @Column(name = "additional_notes", columnDefinition = "TEXT")
    private String additionalNotes;

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
