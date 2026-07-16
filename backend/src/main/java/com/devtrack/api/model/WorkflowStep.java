package com.devtrack.api.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "workflow_steps")
@Getter
@Setter
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

    @Override
    public String toString() {
        return "WorkflowStep(id=" + id + ", stepName=" + stepName + ", stepType=" + stepType + ", sequence=" + sequence + ")";
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        WorkflowStep that = (WorkflowStep) o;
        return java.util.Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(id);
    }
    
}
