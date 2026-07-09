package com.devtrack.api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "bug_review")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class BugReview {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cr_id", nullable = false)
    private Long crId;

    @ManyToOne
    @JoinColumn(name = "raised_by_tester_id")
    private User raisedByTester;

    @Column(name = "proposed_bug_payload", columnDefinition = "json", nullable = false)
    private String proposedBugPayload;

    @ManyToOne
    @JoinColumn(name = "developer_id")
    private User developer;

    @Column(name = "review_status", nullable = false)
    private String reviewStatus;

    @Column(name = "current_owner_role", nullable = false)
    private String currentOwnerRole;

    @ManyToOne
    @JoinColumn(name = "created_bug_id")
    private Bug createdBug;

    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinColumn(name = "bug_review_id", referencedColumnName = "id", insertable = false, updatable = false)
    private List<BugRejection> rejections = new java.util.ArrayList<>();

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
