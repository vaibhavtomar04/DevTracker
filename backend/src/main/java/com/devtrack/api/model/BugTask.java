package com.devtrack.api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "bug_tasks")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class BugTask {
	
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bug_id")
    private String jtrackId;
    
    private String title;
    
    @Column(length = 2000)
    private String description;
    
    @ManyToOne
    @JoinColumn(name = "task_type_id")
    private TaskType type;
    
    @Column(name = "branch_name")
    private String branchName;

    @ManyToOne
    @JoinColumn(name = "assigned_developer_id")
    private User assignedDeveloper;

    @ManyToOne
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @ManyToOne
    @JoinColumn(name = "workflow_id")
    private Workflow workflow;

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

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
        updatedDate = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedDate = LocalDateTime.now();
    }

//    public BugTask() {}
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
//    public Workflow getWorkflow() { return workflow; }
//    public void setWorkflow(Workflow workflow) { this.workflow = workflow; }
//
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
}
