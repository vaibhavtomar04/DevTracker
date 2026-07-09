package com.devtrack.api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Entity
@Table(name = "workflows")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Workflow {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String type; // TASK, BUG

    @OneToMany(mappedBy = "workflow", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequence ASC")
    private List<WorkflowStep> steps;

//    public Workflow() {}
//
//    public Long getId() { return id; }
//    public void setId(Long id) { this.id = id; }
//
//    public String getName() { return name; }
//    public void setName(String name) { this.name = name; }
//
//    public String getType() { return type; }
//    public void setType(String type) { this.type = type; }
//
//    public List<WorkflowStep> getSteps() { return steps; }
//    public void setSteps(List<WorkflowStep> steps) { this.steps = steps; }
}
