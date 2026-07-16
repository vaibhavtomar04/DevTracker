package com.devtrack.api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "tasks")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "jtrack_id")
    private String jtrackId;
    private String title;
    
    @Column(length = 2000)
    private String description;
    
    @ManyToOne
    @JoinColumn(name = "task_type_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private TaskType type;
    
    private String project;

    @Column(name = "sprint_id")
    private Long sprintId;

    @Column(name = "branch_name")
    private String branchName;

    @Column(name = "branch_creation_date")
    private LocalDate branchCreationDate;

    @Column(name = "branch_merge_date")
    private LocalDate branchMergeDate;

    private String labels;
    private String module;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "brd_document_id")
    private Long brdDocumentId;

    @ManyToOne
    @JoinColumn(name = "assigned_developer_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User assignedDeveloper;

    @ManyToOne
    @JoinColumn(name = "created_by_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User createdBy;

    @Column(name = "dev_start_date")
    private LocalDate devStartDate;
    
    @Column(name = "sit_date")
    private LocalDate sitDate;
    
    @Column(name = "uat_date")
    private LocalDate uatDate;
    
    @Column(name = "preprod_date")
    private LocalDate preprodDate;
    
    @Column(name = "production_date")
    private LocalDate productionDate;

    private String status;
    private String priority;
    private Double efforts;
    private String pds;
    
    @Column(name="git_links", length = 1000)
    private String gitLinks;
    
    @Column(name="code_review_comments", length = 2000)
    private String codeReviewComments;

    @Transient
    private String remarks;

    @Column(name = "created_date")
    private LocalDateTime createdDate;
    
    @Column(name = "updated_date")
    private LocalDateTime updatedDate;
    
    @ManyToOne
    @JoinColumn(name = "workflow_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Workflow workflow;

    @Column(name = "changes_requested")
    private boolean changesRequested;

    @Column(name = "unit_test_doc_url", columnDefinition = "LONGTEXT")
    private String unitTestDocUrl;

    @Column(name = "unit_test_doc_name", length = 512)
    private String unitTestDocName;



    @ManyToOne
    @JoinColumn(name = "tester_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User tester;

    @ManyToOne
    @JoinColumn(name = "approver_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User approver;

    @ManyToOne
    @JoinColumn(name = "deployment_owner_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User deploymentOwner;

    @Column(name = "is_quality_risk")
    private boolean isQualityRisk;

    @Column(name = "testing_started_date")
    private LocalDateTime testingStartedDate;

    @Column(name = "testing_completed_date")
    private LocalDateTime testingCompletedDate;

    @Column(name = "testing_duration")
    private String testingDuration;

    @Column(name = "testing_comments", length = 2000)
    private String testingComments;

    @Column(name = "total_bugs_raised")
    private Integer totalBugsRaised = 0;

    @Column(name = "total_retests")
    private Integer totalRetests = 0;

    @Column(name = "reassignment_reason", length = 1000)
    private String reassignmentReason;

    @ManyToOne
    @JoinColumn(name = "reassigned_by_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User reassignedBy;

    @Column(name = "reassignment_date")
    private LocalDateTime reassignmentDate;

    @ManyToOne
    @JoinColumn(name = "previous_tester_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User previousTester;


    @Column(name = "is_in_pool")
    private boolean isInPool;
    
    @Column(name = "in_pool_date")
    private LocalDateTime inPoolDate;

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    @org.hibernate.annotations.BatchSize(size = 50)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private java.util.List<TaskDeveloper> developers = new java.util.ArrayList<>();

    @ManyToMany
    @JoinTable(
        name = "cr_sprint_task_link",
        joinColumns = @JoinColumn(name = "cr_id"),
        inverseJoinColumns = @JoinColumn(name = "sprint_task_id")
    )
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties("linkedCrs")
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private java.util.List<SprintTask> sprintTasks = new java.util.ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
        updatedDate = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedDate = LocalDateTime.now();
    }

//    public Task() {}
//
//    public Long getId() { return id; }
//    public void setId(Long id) { this.id = id; }
//
//    public String getJtrackId() { return jtrackId; }
//    public void setJtrackId(String jtrackId) { this.jtrackId = jtrackId; }
//
//    public String getTitle() { return title; }
//    public void setTitle(String title) { this.title = title; }
//
//    public String getDescription() { return description; }
//    public void setDescription(String description) { this.description = description; }
//
//    public TaskType getType() { return type; }
//    public void setType(TaskType type) { this.type = type; }
//
//    public String getBranchName() { return branchName; }
//    public void setBranchName(String branchName) { this.branchName = branchName; }
//
//    public User getAssignedDeveloper() { return assignedDeveloper; }
//    public void setAssignedDeveloper(User assignedDeveloper) { this.assignedDeveloper = assignedDeveloper; }
//
//    public User getCreatedBy() { return createdBy; }
//    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
//
//    public LocalDate getDevStartDate() { return devStartDate; }
//    public void setDevStartDate(LocalDate devStartDate) { this.devStartDate = devStartDate; }
//
//    public LocalDate getSitDate() { return sitDate; }
//    public void setSitDate(LocalDate sitDate) { this.sitDate = sitDate; }
//
//    public LocalDate getUatDate() { return uatDate; }
//    public void setUatDate(LocalDate uatDate) { this.uatDate = uatDate; }
//
//    public LocalDate getPreprodDate() { return preprodDate; }
//    public void setPreprodDate(LocalDate preprodDate) { this.preprodDate = preprodDate; }
//
//    public LocalDate getProductionDate() { return productionDate; }
//    public void setProductionDate(LocalDate productionDate) { this.productionDate = productionDate; }
//
//    public String getStatus() { return status; }
//    public void setStatus(String status) { this.status = status; }
//
//    public String getPriority() { return priority; }
//    public void setPriority(String priority) { this.priority = priority; }
//
//    public Double getEfforts() { return efforts; }
//    public void setEfforts(Double efforts) { this.efforts = efforts; }
//
//    public LocalDateTime getCreatedDate() { return createdDate; }
//    public LocalDateTime getUpdatedDate() { return updatedDate; }
//
//    public String getPds() { return pds; }
//    public void setPds(String pds) { this.pds = pds; }
//
//    public String getRemarks() { return remarks; }
//    public void setRemarks(String remarks) { this.remarks = remarks; }
//
//    public String getGitLinks() { return gitLinks; }
//    public void setGitLinks(String gitLinks) { this.gitLinks = gitLinks; }
//
//    public String getCodeReviewComments() { return codeReviewComments; }
//    public void setCodeReviewComments(String codeReviewComments) { this.codeReviewComments = codeReviewComments; }
//
//    public Workflow getWorkflow() { return workflow; }
//    public void setWorkflow(Workflow workflow) { this.workflow = workflow; }
//
//    public User getTester() { return tester; }
//    public void setTester(User tester) { this.tester = tester; }
//
//    public boolean isInPool() { return isInPool; }
//    public void setInPool(boolean inPool) { this.isInPool = inPool; }
//
//    public LocalDateTime getInPoolDate() { return inPoolDate; }
//    public void setInPoolDate(LocalDateTime inPoolDate) { this.inPoolDate = inPoolDate; }
}
