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
            log.info("Standard Dev Workflow (ID 1) not found. Seeding default workflows...");
            try {
                Workflow devWf = new Workflow();
                devWf.setName("Standard Dev Workflow");
                devWf.setType("TASK");
                devWf = workflowRepository.save(devWf); // Auto-assigns ID 1 if table empty
                
                WorkflowStep step1 = new WorkflowStep(null, devWf, "OPEN", "TASK", 1);
                WorkflowStep step2 = new WorkflowStep(null, devWf, "IN_PROGRESS", "TASK", 2);
                WorkflowStep step3 = new WorkflowStep(null, devWf, "SIT_DEPLOYED", "TASK", 3);
                WorkflowStep step4 = new WorkflowStep(null, devWf, "SIT_TESTING", "TESTING", 4);
                WorkflowStep step5 = new WorkflowStep(null, devWf, "SIT_COMPLETED", "TASK", 5);
                WorkflowStep step6 = new WorkflowStep(null, devWf, "CODE_REVIEW", "CODE_REVIEW", 6);
                WorkflowStep step7 = new WorkflowStep(null, devWf, "CODE_REVIEW_DONE", "TASK", 7);
                WorkflowStep step8 = new WorkflowStep(null, devWf, "MOVE_TO_UAT", "TASK", 8);
                WorkflowStep step9 = new WorkflowStep(null, devWf, "UAT_TESTING", "TESTING", 9);
                WorkflowStep step10 = new WorkflowStep(null, devWf, "UAT_COMPLETED", "TASK", 10);
                WorkflowStep step11 = new WorkflowStep(null, devWf, "PROD_DEPLOYED", "TASK", 11);
                WorkflowStep step12 = new WorkflowStep(null, devWf, "PROD_COMPLETED", "TASK", 12);
                WorkflowStep step13 = new WorkflowStep(null, devWf, "CLOSED", "TASK", 13);
                
                devWf.setSteps(List.of(step1, step2, step3, step4, step5, step6, step7, step8, step9, step10, step11, step12, step13));
                standardWorkflow = workflowRepository.save(devWf);
                
                Workflow bugWf = new Workflow();
                bugWf.setName("Bug Resolution Workflow");
                bugWf.setType("BUG");
                bugWf = workflowRepository.save(bugWf); // Auto-assigns ID 2 if table has only ID 1
                
                WorkflowStep bstep1 = new WorkflowStep(null, bugWf, "OPEN", "TASK", 1);
                WorkflowStep bstep2 = new WorkflowStep(null, bugWf, "IN_PROGRESS", "TASK", 2);
                WorkflowStep bstep3 = new WorkflowStep(null, bugWf, "RESOLVED", "TASK", 3);
                WorkflowStep bstep4 = new WorkflowStep(null, bugWf, "VERIFIED", "TESTING", 4);
                WorkflowStep bstep5 = new WorkflowStep(null, bugWf, "CLOSED", "TASK", 5);
                
                bugWf.setSteps(List.of(bstep1, bstep2, bstep3, bstep4, bstep5));
                workflowRepository.save(bugWf);
                
                log.info("Default workflows seeded successfully.");
            } catch (Exception e) {
                log.error("Failed to seed default workflows: ", e);
                return;
            }
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
