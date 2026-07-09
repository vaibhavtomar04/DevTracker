package com.devtrack.api.services;

import com.devtrack.api.model.*;
import com.devtrack.api.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class WorkflowMapSanitizer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(WorkflowMapSanitizer.class);

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private WorkflowRepository workflowRepository;

    @Autowired
    private TaskWorkflowMapRepository taskWorkflowMapRepository;

    @Autowired
    private WorkflowExecutionService workflowExecutionService;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("Starting WorkflowMapSanitizer to ensure all tasks have complete workflow maps...");
        List<Task> tasks = taskRepository.findAll();
        Workflow standardWorkflow = workflowRepository.findById(1L).orElse(null);
        if (standardWorkflow == null) {
            log.warn("Standard Dev Workflow (ID 1) not found. Skipping sanitization.");
            return;
        }

        int updatedCount = 0;
        for (Task task : tasks) {
            List<TaskWorkflowMap> currentMaps = taskWorkflowMapRepository.findByTaskId(task.getId());
            if (currentMaps.size() < standardWorkflow.getSteps().size()) {
                log.info("Sanitizing workflow map for Task ID: {}, JTrack ID: {}, current steps count: {}", 
                         task.getId(), task.getJtrackId(), currentMaps.size());
                
                String activeStepName = null;
                for (TaskWorkflowMap map : currentMaps) {
                    if ("IN_PROGRESS".equals(map.getStatus())) {
                        activeStepName = map.getStepName();
                        break;
                    }
                }

                String originalStatus = task.getStatus();

                workflowExecutionService.initializeWorkflow(task.getId(), standardWorkflow.getId());

                if (activeStepName != null) {
                    workflowExecutionService.syncWorkflowMapWithStatus(task.getId(), activeStepName);
                } else {
                    workflowExecutionService.syncWorkflowMapWithStatus(task.getId(), originalStatus);
                }
                
                // Restore task's original status because initializeWorkflow sets status to first step
                task.setStatus(originalStatus);
                taskRepository.save(task);
                updatedCount++;
            }
        }
        log.info("WorkflowMapSanitizer finished. Sanitized {} tasks.", updatedCount);
    }
}
