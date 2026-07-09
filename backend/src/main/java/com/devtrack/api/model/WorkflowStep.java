package com.devtrack.api.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "workflow_steps")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class WorkflowStep {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "workflow_id")
    @JsonIgnore
    private Workflow workflow;

    @Column(name = "step_name")
    private String stepName;
    
    @Column(name = "step_type")
    private String stepType; // TASK, CODE_REVIEW, TESTING
    private Integer sequence;

//    public WorkflowStep() {}
//
//    public Long getId() { return id; }
//    public void setId(Long id) { this.id = id; }
//
//    public Workflow getWorkflow() { return workflow; }
//    public void setWorkflow(Workflow workflow) { this.workflow = workflow; }
//
//    public String getStepName() { return stepName; }
//    public void setStepName(String stepName) { this.stepName = stepName; }
//
//    public String getStepType() { return stepType; }
//    public void setStepType(String stepType) { this.stepType = stepType; }
//
//    public Integer getSequence() { return sequence; }
//    public void setSequence(Integer sequence) { this.sequence = sequence; }
    
}
