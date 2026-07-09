package com.devtrack.api.controller;

import com.devtrack.api.model.Workflow;
import com.devtrack.api.model.WorkflowStep;
import com.devtrack.api.repository.WorkflowRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/workflows")
public class WorkflowController {

    @Autowired
    private WorkflowRepository workflowRepository;

    @GetMapping
    public List<Workflow> getAllWorkflows() {
        return workflowRepository.findAll();
    }

    @GetMapping("/type/{type}")
    public List<Workflow> getWorkflowsByType(@PathVariable String type) {
        return workflowRepository.findByType(type.toUpperCase());
    }

    @PostMapping
    public Workflow createWorkflow(@RequestBody Workflow workflow) {
        if (workflow.getSteps() != null) {
            int seq = 1;
            for (WorkflowStep step : workflow.getSteps()) {
                step.setWorkflow(workflow);
                step.setSequence(seq++);
            }
        }
        return workflowRepository.save(workflow);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Workflow> getWorkflowById(@PathVariable Long id) {
        return workflowRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Workflow> updateWorkflow(@PathVariable Long id, @RequestBody Workflow workflowDetails) {
        return workflowRepository.findById(id)
                .map(workflow -> {
                    workflow.setName(workflowDetails.getName());
                    workflow.setType(workflowDetails.getType());
                    
                    if (workflowDetails.getSteps() != null) {
                        workflow.getSteps().clear();
                        int seq = 1;
                        for (WorkflowStep step : workflowDetails.getSteps()) {
                            step.setWorkflow(workflow);
                            step.setSequence(seq++);
                            workflow.getSteps().add(step);
                        }
                    }
                    
                    return ResponseEntity.ok(workflowRepository.save(workflow));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorkflow(@PathVariable Long id) {
        return workflowRepository.findById(id)
                .map(workflow -> {
                    workflowRepository.delete(workflow);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
