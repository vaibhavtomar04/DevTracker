package com.devtrack.api.controller;

import com.devtrack.api.model.*;
import com.devtrack.api.repository.AuditLogRepository;
import com.devtrack.api.repository.BugTaskRepository;
import com.devtrack.api.repository.TaskTypeRepository;
import com.devtrack.api.repository.UserRepository;
import com.devtrack.api.repository.WorkflowRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bugtasks")
public class BugTaskController {

    @Autowired
    private BugTaskRepository bugTaskRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private TaskTypeRepository taskTypeRepository;

    @Autowired
    private WorkflowRepository workflowRepository;

    @GetMapping
    public List<BugTask> getAllBugTasks() {
        return bugTaskRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<BugTask> getBugTaskById(@PathVariable Long id) {
        return bugTaskRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public BugTask createBugTask(@RequestBody BugTask bugTask) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();
        
        if (bugTask.getTitle() == null || bugTask.getTitle().trim().isEmpty()) {
            throw new RuntimeException("Title is mandatory.");
        }
        if (bugTask.getDescription() == null || bugTask.getDescription().trim().isEmpty()) {
            throw new RuntimeException("Description is mandatory.");
        }
        if (bugTask.getCreatedBy() == null) {
            bugTask.setCreatedBy(currentUser);
        }

        if (bugTask.getWorkflow() != null && bugTask.getWorkflow().getSteps() != null && !bugTask.getWorkflow().getSteps().isEmpty()) {
            bugTask.setStatus(bugTask.getWorkflow().getSteps().get(0).getStepName());
        } else if (bugTask.getStatus() == null) {
            bugTask.setStatus("OPEN");
        }

        // Ensure all related entities are managed or null
        if (bugTask.getType() != null) {
            if (bugTask.getType().getId() != null) {
                bugTask.setType(taskTypeRepository.findById(bugTask.getType().getId()).orElse(null));
            } else {
                bugTask.setType(null);
            }
        }

        if (bugTask.getWorkflow() != null) {
            if (bugTask.getWorkflow().getId() != null) {
                bugTask.setWorkflow(workflowRepository.findById(bugTask.getWorkflow().getId()).orElse(null));
            } else {
                bugTask.setWorkflow(null);
            }
        }

        if (bugTask.getAssignedDeveloper() != null) {
            if (bugTask.getAssignedDeveloper().getId() != null) {
                bugTask.setAssignedDeveloper(userRepository.findById(bugTask.getAssignedDeveloper().getId()).orElse(null));
            } else {
                bugTask.setAssignedDeveloper(null);
            }
        }
        
        return bugTaskRepository.save(bugTask);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateBugTask(@PathVariable Long id, @RequestBody BugTask bugTaskDetails) {
        return bugTaskRepository.findById(id)
                .map(bugTask -> {
                    String oldStatus = bugTask.getStatus();
                    bugTask.setTitle(bugTaskDetails.getTitle());
                    bugTask.setDescription(bugTaskDetails.getDescription());
                    bugTask.setPriority(bugTaskDetails.getPriority());
                    bugTask.setType(bugTaskDetails.getType());
                    bugTask.setBranchName(bugTaskDetails.getBranchName());
                    // jtrackId is immutable
                    bugTask.setPds(bugTaskDetails.getPds());
                    bugTask.setGitLinks(bugTaskDetails.getGitLinks());
                    bugTask.setCodeReviewComments(bugTaskDetails.getCodeReviewComments());

                    // Restriction: Only assigned developer can update, UNLESS it's a Code Review or Admin override
                    if (bugTask.getAssignedDeveloper() != null) {
                        String username = SecurityContextHolder.getContext().getAuthentication().getName();
                        String roles = SecurityContextHolder.getContext().getAuthentication().getAuthorities().toString();
                        boolean isReviewer = roles.contains("ROLE_CODEREVIEWER");
                        boolean isAdmin = roles.contains("ROLE_DEVADMIN");

                        if (!bugTask.getAssignedDeveloper().getUsername().equals(username) && !isReviewer && !isAdmin) {
                            return ResponseEntity.status(403).body("Only the assigned developer (" + bugTask.getAssignedDeveloper().getFullName() + ") can update this bug task.");
                        }
                    }

                    if (bugTaskDetails.getStatus() != null && !bugTask.getStatus().equals(bugTaskDetails.getStatus())) {
                        if (bugTaskDetails.getRemarks() == null || bugTaskDetails.getRemarks().trim().isEmpty()) {
                            return ResponseEntity.badRequest().body("Updating Remarks are mandatory for all status changes.");
                        }
                        if (bugTask.getWorkflow() == null) {
                            bugTask.setStatus(bugTaskDetails.getStatus());
                        } else {
                            // Enforce sequential transition
                            String currentStatus = bugTask.getStatus();
                            String nextStatus = bugTaskDetails.getStatus();
                            
                            WorkflowStep currentStep = bugTask.getWorkflow().getSteps().stream()
                                    .filter(s -> s.getStepName().equals(currentStatus))
                                    .findFirst().orElse(null);
                            WorkflowStep nextStep = bugTask.getWorkflow().getSteps().stream()
                                    .filter(s -> s.getStepName().equals(nextStatus))
                                    .findFirst().orElse(null);

                            if (currentStep != null && nextStep != null) {
                                // Specific logic for CODE_REVIEW
                                if (nextStep.getStepName().equals("CODE_REVIEW")) {
                                    if (bugTaskDetails.getGitLinks() == null || bugTaskDetails.getGitLinks().isBlank()) {
                                        return ResponseEntity.badRequest().body("Git links are required when pushing for Code Review.");
                                    }
                                    bugTask.setGitLinks(bugTaskDetails.getGitLinks());
                                }

                                // Role-based checks for moving OUT of CODE_REVIEW
                                if (currentStep.getStepName().equals("CODE_REVIEW")) {
                                    String username = SecurityContextHolder.getContext().getAuthentication().getName();
                                    User currentUser = userRepository.findByUsername(username).orElseThrow();
                                    if (!currentUser.getRoles().contains(Role.CODEREVIEWER) && !currentUser.getRoles().contains(Role.DEVADMIN)) {
                                        return ResponseEntity.status(403).body("Only Code Reviewers or Admins can approve/reject code reviews.");
                                    }
                                }

                                // Allow rejection: move back from CODE_REVIEW to SIT_COMPLETED
                                if (currentStep.getStepName().equals("CODE_REVIEW") && nextStep.getStepName().equals("SIT_COMPLETED")) {
                                    // Rejection is allowed
                                } else if (nextStep.getSequence() != currentStep.getSequence() + 1) {
                                    return ResponseEntity.status(400).body("Sequential transitions only. Cannot jump from " + currentStatus + " to " + nextStatus);
                                }
                            }
                            bugTask.setStatus(nextStatus);
                        }
                    }
                    
                    if (bugTaskDetails.getAssignedDeveloper() != null) {
                        bugTask.setAssignedDeveloper(bugTaskDetails.getAssignedDeveloper());
                    }

                    if (bugTaskDetails.getWorkflow() != null) {
                        bugTask.setWorkflow(bugTaskDetails.getWorkflow());
                    }
                    
                    String username = SecurityContextHolder.getContext().getAuthentication().getName();
                    User currentUser = userRepository.findByUsername(username).orElseThrow();
                    
                    // Simple audit logging for status change
                    if (bugTaskDetails.getStatus() != null && !bugTaskDetails.getStatus().equals(oldStatus)) {
                        AuditLog log = new AuditLog();
                        log.setEntityType("BUG_TASK");
                        log.setEntityId(bugTask.getId());
                        log.setFieldName("status");
                        log.setOldValue(oldStatus);
                        log.setNewValue(bugTask.getStatus());
                        log.setRemarks(bugTaskDetails.getRemarks());
                        log.setChangedBy(currentUser);
                        auditLogRepository.save(log);
                    }
                    
                    return ResponseEntity.ok(bugTaskRepository.save(bugTask));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBugTask(@PathVariable Long id) {
        return bugTaskRepository.findById(id)
                .map(bugTask -> {
                    bugTaskRepository.delete(bugTask);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
