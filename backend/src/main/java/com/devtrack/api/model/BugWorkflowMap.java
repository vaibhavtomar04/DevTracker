package com.devtrack.api.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

@Entity
@Table(name = "bug_workflow_map")
public class BugWorkflowMap {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "bug_id")
    private Bug bug;

    @ManyToOne
    @JoinColumn(name = "workflow_id")
    private Workflow workflow;

    @Column(name = "step_id")
    private Long stepId;

    @Column(name = "step_name")
    private String stepName;
    
    @Column(name = "step_type")
    private String stepType;
    
    private Integer sequence;

    private String status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public BugWorkflowMap() {}

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Bug getBug() { return bug; }
    public void setBug(Bug bug) { this.bug = bug; }

    public Workflow getWorkflow() { return workflow; }
    public void setWorkflow(Workflow workflow) { this.workflow = workflow; }

    @Transient
    public WorkflowStep getStep() {
        if (this.stepId == null) return null;
        WorkflowStep dummy = new WorkflowStep();
        dummy.setId(this.stepId);
        dummy.setStepName(this.stepName);
        dummy.setStepType(this.stepType);
        dummy.setSequence(this.sequence);
        return dummy;
    }

    public void setStep(WorkflowStep step) {
        if (step != null) {
            this.stepId = step.getId();
            this.stepName = step.getStepName();
            this.stepType = step.getStepType();
            this.sequence = step.getSequence();
        } else {
            this.stepId = null;
        }
    }

    public Long getStepId() { return stepId; }
    public void setStepId(Long stepId) { this.stepId = stepId; }

    public String getStepName() { return stepName; }
    public void setStepName(String stepName) { this.stepName = stepName; }

    public String getStepType() { return stepType; }
    public void setStepType(String stepType) { this.stepType = stepType; }

    public Integer getSequence() { return sequence; }
    public void setSequence(Integer sequence) { this.sequence = sequence; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
