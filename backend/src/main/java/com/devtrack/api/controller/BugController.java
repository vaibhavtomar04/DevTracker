package com.devtrack.api.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.devtrack.api.model.AppConfig;
import com.devtrack.api.model.Attachment;
import com.devtrack.api.model.AuditLog;
import com.devtrack.api.model.Bug;
import com.devtrack.api.model.BugWorkflowMap;
import com.devtrack.api.model.Task;
import com.devtrack.api.model.User;
import com.devtrack.api.model.Workflow;
import com.devtrack.api.model.WorkflowStep;
import com.devtrack.api.repository.AuditLogRepository;
import com.devtrack.api.repository.BugRepository;
import com.devtrack.api.repository.UserRepository;
import com.devtrack.api.repository.WorkflowRepository;
import com.devtrack.api.services.EmailNotificationService;
import java.time.LocalDateTime;
import com.devtrack.api.model.BugDeveloperFixSummary;
import com.devtrack.api.event.RecognitionTriggerEvent;
import com.devtrack.api.dto.BugDeveloperFixSummaryDto;

import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/bugs")
@Slf4j
public class BugController {

    @Autowired
    private BugRepository bugRepository;

    @Autowired
    private com.devtrack.api.repository.TaskRepository taskRepository;

    @Autowired
    private com.devtrack.api.repository.AttachmentRepository attachmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private com.devtrack.api.repository.ConfigRepository configRepository;

    @Autowired
    private com.devtrack.api.repository.BugWorkflowMapRepository bugWorkflowMapRepository;

    @Autowired
    private WorkflowRepository workflowRepository;
    
    @Autowired
    private EmailNotificationService notificationService;

    @Autowired
    private com.devtrack.api.repository.NotificationRepository notificationRepository;

    @Autowired
    private com.devtrack.api.config.NotificationWebSocketHandler webSocketHandler;

    @Autowired
    private com.devtrack.api.repository.BugDeveloperFixSummaryRepository bugDeveloperFixSummaryRepository;

    @Autowired
    private com.devtrack.api.services.QualityRiskService qualityRiskService;

    @Autowired
    private org.springframework.context.ApplicationEventPublisher applicationEventPublisher;

    @GetMapping
    public ResponseEntity<?> getAllBugs(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String status, @RequestParam(required = false) String severity) {
        
        if (page == null && size == null) {
            return ResponseEntity.ok(bugRepository.findAllOptimized());
        }
        
        Pageable pageable = PageRequest.of(page != null ? page : 0, size != null ? size : 10, Sort.by("id").descending());
        
        if(status!=null && !status.isBlank() && severity!=null && !severity.isBlank()) {
        	return ResponseEntity.ok(bugRepository.findAllOptimizedByStatusAndSeverity(status, severity, pageable));
        }
        else if(status!=null && !status.isBlank()) {
        	return ResponseEntity.ok(bugRepository.findAllOptimizedByStatus(status, pageable));
        }
        else if(severity!=null && !severity.isBlank()) {
        	return ResponseEntity.ok(bugRepository.findAllOptimizedBySeverity(severity, pageable));
        }
        else {
            return ResponseEntity.ok(bugRepository.findAllOptimizedActive(pageable));
        }
    }
    
    @GetMapping("/download-bugs")
    public Page<Bug> downloadBugs(@RequestParam(required = false) String status, @RequestParam(required = false) String severity) {
        
        if(status!=null && !status.isBlank() && severity!=null && !severity.isBlank()) {
        	return bugRepository.findAllOptimizedByStatusAndSeverity(status, severity, null);
        }
        else if(status!=null && !status.isBlank()) {
        	return bugRepository.findAllOptimizedByStatus(status, null);
        }
        else if(severity!=null && !severity.isBlank()) {
        	return bugRepository.findAllOptimizedBySeverity(severity, null);
        }
        else {
            return bugRepository.findAllOptimizedActive(null);
        }
    }

    @GetMapping("/my")
    public Page<Bug> getMyBugs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status, @RequestParam(required = false) String severity) {
    	log.info("status {} {}", status, severity);
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        
        if(status!=null && !status.isBlank() && severity!=null && !severity.isBlank()) {
        	return bugRepository.findAllOptimizedByDeveloperStatusAndSeverity(user.getId(),status, severity, pageable);
        }
        else if(status!=null && !status.isBlank()) {
        	return bugRepository.findAllOptimizedByDeveloperStatus(user.getId(),status, pageable);
        }
        else if(severity!=null && !severity.isBlank()) {
        	return bugRepository.findAllOptimizedByDeveloperSeverity(user.getId(),severity, pageable);
        }
        else {
            return bugRepository.findAllOptimizedByAssignedDeveloperIdAndActive(user.getId(), pageable);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Bug> getBugById(@PathVariable Long id) {
        return bugRepository.findById(id)
                .map(this::populateBugArtifacts)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{bugId}/artifacts/{artId}")
    public ResponseEntity<?> getBugArtifact(@PathVariable Long bugId, @PathVariable Long artId) {
        return attachmentRepository.findById(artId)
                .map(att -> {
                    java.util.Map<String, String> response = new java.util.HashMap<>();
                    response.put("fileName", att.getFileName());
                    response.put("fileType", att.getFileType());
                    if (att.getData() != null) {
                        String base64Data = java.util.Base64.getEncoder().encodeToString(att.getData());
                        response.put("fileData", "data:" + att.getFileType() + ";base64," + base64Data);
                    }
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN')")
    public Bug createBug(@RequestBody Bug bug) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();
        
        if (bug.getTitle() == null || bug.getTitle().trim().isEmpty()) {
            throw new RuntimeException("Title is mandatory.");
        }
        if (bug.getDescription() == null || bug.getDescription().trim().isEmpty()) {
            throw new RuntimeException("Description is mandatory.");
        }
        if (bug.getJtrackId() == null || bug.getJtrackId().trim().isEmpty()) {
            long nextNum = bugRepository.count() + 201;
            String generatedId = "BUG-" + nextNum;
            while (bugRepository.findByJtrackId(generatedId).isPresent()) {
                nextNum++;
                generatedId = "BUG-" + nextNum;
            }
            bug.setJtrackId(generatedId);
        }
        
        if (bug.getCrTaskId() != null) {
            taskRepository.findById(bug.getCrTaskId()).ifPresent(bug::setBugTask);
        }

        if (bug.getAssignedDeveloper() == null && bug.getBugTask() != null) {
            bug.setAssignedDeveloper(bug.getBugTask().getAssignedDeveloper());
        }

        if (bug.getAssignedDeveloper() == null) {
            throw new RuntimeException("Assignee is mandatory for Bugs.");
        }

        if (bug.getRaisedBy() == null) {
            bug.setRaisedBy(currentUser);
        }
        
        if (bug.getWorkflow() == null || bug.getWorkflow().getId() == null) {
            Workflow defaultWorkflow = workflowRepository.findById(2L).orElse(null);
            bug.setWorkflow(defaultWorkflow);
        } else {
            // Fetch full workflow to get steps if an ID was passed
            Workflow fullWorkflow = workflowRepository.findById(bug.getWorkflow().getId()).orElse(null);
            bug.setWorkflow(fullWorkflow);
        }
        
        if (bug.getWorkflow() == null) {
        	throw new RuntimeException("Workflow is mandatory");
        }
        
        if (bug.getWorkflow() != null && bug.getWorkflow().getSteps() != null && !bug.getWorkflow().getSteps().isEmpty()) {
            bug.setStatus(bug.getWorkflow().getSteps().get(0).getStepName());
        } else if (bug.getStatus() == null) {
            bug.setStatus("OPEN");
        }
        
        Bug savedBug = bugRepository.save(bug);
        
        // Transition the linked task status to BUG_FOUND
        if (savedBug.getBugTask() != null) {
            Task task = savedBug.getBugTask();
            String oldStatus = task.getStatus();
            task.setStatus("BUG_FOUND");
            taskRepository.save(task);
            try {
                qualityRiskService.evaluateCrRisk(task.getId(), "BUG_ACCEPTED");
            } catch (Exception e) {
                log.error("Failed to evaluate CR risk in createBug", e);
            }

            // Log audit log for task status change
            AuditLog taskAuditLog = new AuditLog();
            taskAuditLog.setEntityType("TASK");
            taskAuditLog.setEntityId(task.getId());
            taskAuditLog.setFieldName("status");
            taskAuditLog.setOldValue(oldStatus);
            taskAuditLog.setNewValue("BUG_FOUND");
            taskAuditLog.setRemarks("Bug raised: " + savedBug.getJtrackId() + " - " + savedBug.getTitle());
            taskAuditLog.setChangedBy(currentUser);
            taskAuditLog.setChangedDate(java.time.LocalDateTime.now());
            auditLogRepository.save(taskAuditLog);
        }

        // Save attachments if present
        if (bug.getArtifacts() != null && !bug.getArtifacts().isEmpty()) {
            for (Bug.BugArtifactDto artDto : bug.getArtifacts()) {
                Attachment attachment = new Attachment();
                attachment.setFileName(artDto.getFileName());
                attachment.setFileType(artDto.getFileType());
                attachment.setEntityType("BUG");
                attachment.setEntityId(savedBug.getId());
                attachment.setUploadedBy(currentUser);
                attachment.setUploadDate(LocalDateTime.now());

                if (artDto.getFileData() != null) {
                    try {
                        String dataStr = artDto.getFileData();
                        if (dataStr.contains(",")) {
                            dataStr = dataStr.substring(dataStr.indexOf(",") + 1);
                        }
                        byte[] bytes = java.util.Base64.getDecoder().decode(dataStr.trim());
                        attachment.setData(bytes);
                    } catch (Exception e) {
                        log.error("Failed to decode bug attachment data: " + artDto.getFileName(), e);
                    }
                }
                attachmentRepository.save(attachment);
            }
        }

        populateBugArtifacts(savedBug);
        
        notificationService.sendNotificationOnCreation(savedBug);

        if (savedBug.getWorkflow() != null && savedBug.getWorkflow().getSteps() != null) {
            List<BugWorkflowMap> wmaps = new java.util.ArrayList<>();
            boolean isFirst = true;

            for (WorkflowStep step : savedBug.getWorkflow().getSteps()) {
                BugWorkflowMap map = new BugWorkflowMap();
                map.setBug(savedBug);
                map.setWorkflow(savedBug.getWorkflow());
                map.setStep(step);
                map.setStepName(step.getStepName());
                map.setStepType(step.getStepType());
                map.setSequence(step.getSequence());

                if (isFirst) {
                    map.setStatus("IN_PROGRESS");
                    isFirst = false;
                } else {
                    map.setStatus("NOT_STARTED");
                }
                wmaps.add(map);
            }
            bugWorkflowMapRepository.saveAll(wmaps);
        }

        if (savedBug.getAssignedDeveloper() != null) {
            createAndPushNotification(savedBug.getAssignedDeveloper().getId(), "New Bug Assigned: " + savedBug.getJtrackId(),
                "Bug '" + savedBug.getTitle() + "' has been assigned to you by " + currentUser.getFullName() + ". Status: " + savedBug.getStatus());
        }
        if (savedBug.getRaisedBy() != null && (savedBug.getAssignedDeveloper() == null || !savedBug.getRaisedBy().getId().equals(savedBug.getAssignedDeveloper().getId()))) {
            createAndPushNotification(savedBug.getRaisedBy().getId(), "Bug Created: " + savedBug.getJtrackId(),
                "You have raised a Bug: '" + savedBug.getTitle() + "'.");
        }

        return savedBug;
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateBug(@PathVariable Long id, @RequestBody Bug bugDetails) {
        return bugRepository.findById(id)
                .map(bug -> {
                    String oldStatus = bug.getStatus();
                    
                    if ("INVALID_PENDING_APPROVAL".equals(oldStatus)) {
                        return ResponseEntity.status(403).body("This bug is pending invalidation review and locked from standard updates.");
                    }
                    
                    if ("CLOSED".equals(oldStatus) || "INVALID_BUG".equals(oldStatus)) {
                        return ResponseEntity.status(403).body("This bug is in a terminal state (CLOSED/INVALID) and cannot be updated.");
                    }
                    
                    // Restriction: Only assigned developer can update, UNLESS it's a Code Review, Admin override, or the Creator
                    if (bug.getAssignedDeveloper() != null) {
                        String username = SecurityContextHolder.getContext().getAuthentication().getName();
                        String roles = SecurityContextHolder.getContext().getAuthentication().getAuthorities().toString();
                        boolean isReviewer = roles.contains("ROLE_CODEREVIEWER");
                        boolean isAdmin = roles.contains("ROLE_TESTADMIN");
                        boolean isCreatorTop = bug.getRaisedBy() != null && bug.getRaisedBy().getUsername().equals(username);

                        // DEVADMIN is treated as a DEVELOPER for bug updates (restricted to assigned bugs)
                        if (!bug.getAssignedDeveloper().getUsername().equals(username) && !isReviewer && !isAdmin && !isCreatorTop) {
                            return ResponseEntity.status(403).body("Only the assigned developer, the bug creator, or an admin can update this bug.");
                        }

                        // NEW: Prevent developer updates if bug is in active testing phase or has a tester assigned
                        boolean isActiveTesting = bug.getStatus() != null && 
                                               ((bug.getStatus().contains("TESTING") && !bug.getStatus().contains("COMPLETED")) || 
                                                (bug.getStatus().contains("UAT") && !bug.getStatus().contains("COMPLETED")) ||
                                                (bug.getStatus().contains("SIT") && !bug.getStatus().contains("COMPLETED")));

                        if ((bug.getTester() != null || isActiveTesting) && 
                            !isAdmin && !isReviewer && !roles.contains("ROLE_TESTER")) {
                            return ResponseEntity.status(403).body("This bug is currently in testing/review phase and cannot be updated by developers.");
                        }
                    }

                    // Enforce Developer Fix Summary before resolving bug
                    if (bugDetails.getStatus() != null && bugDetails.getStatus().contains("RESOLVED") && !bug.getStatus().contains("RESOLVED")) {
                        Optional<BugDeveloperFixSummary> summaryOpt = bugDeveloperFixSummaryRepository.findByBugId(bug.getId());
                        if (summaryOpt.isEmpty() || 
                            summaryOpt.get().getRootCauseAnalysis() == null || summaryOpt.get().getRootCauseAnalysis().trim().isEmpty() ||
                            summaryOpt.get().getFixSummary() == null || summaryOpt.get().getFixSummary().trim().isEmpty()) {
                            return ResponseEntity.badRequest().body("Developer Fix Summary (Root Cause Analysis & Fix Summary) is mandatory before resolving this bug.");
                        }
                    }

                    // Mandatory remarks for status change
                    if (bugDetails.getStatus() != null && !bug.getStatus().equals(bugDetails.getStatus())) {
                        if (bugDetails.getRemarks() == null || bugDetails.getRemarks().trim().isEmpty()) {
                            return ResponseEntity.badRequest().body("Updating Remarks are mandatory for all status changes.");
                        }
                    }

                    // Check transition logic if workflow is present
                    if (bugDetails.getStatus() != null && !bug.getStatus().equals(bugDetails.getStatus())) {
                        if ("INVALID_PENDING_APPROVAL".equals(bugDetails.getStatus())) {
                            bug.setStatus("INVALID_PENDING_APPROVAL");
                        } else if (bug.getWorkflow() == null) {
                            bug.setStatus(bugDetails.getStatus());
                        } else {
                            List<BugWorkflowMap> snapshottedMaps = bugWorkflowMapRepository.findByBugId(bug.getId());
                            List<WorkflowStep> steps = snapshottedMaps.stream()
                                    .sorted(java.util.Comparator.comparing(BugWorkflowMap::getSequence))
                                    .map(BugWorkflowMap::getStep)
                                    .toList();
                            
                            Optional<WorkflowStep> currentStepOpt = steps.stream()
                                    .filter(s -> s.getStepName().equals(bug.getStatus()))
                                    .findFirst();
                            Optional<WorkflowStep> nextStepOpt = steps.stream()
                                    .filter(s -> s.getStepName().equals(bugDetails.getStatus()))
                                    .findFirst();

                            if (currentStepOpt.isPresent() && nextStepOpt.isPresent()) {
                                WorkflowStep currentStep = currentStepOpt.get();
                                WorkflowStep nextStep = nextStepOpt.get();
                                
                                // Special Transition: Invalid Bug (Developer shortcut to Verification)
                                if ("INVALID_BUG".equals(bugDetails.getRemarks()) || bugDetails.getStatus().contains("VERIFIED") || bugDetails.getStatus().contains("CLOSED")) {
                                    // if it's skipping, allow if it's jumping to the final step (Tester step)
                                    // Set all intermediate map steps to CLOSED, make target IN_PROGRESS
                                    snapshottedMaps.forEach(map -> {
                                        if (map.getSequence() <= currentStep.getSequence()) {
                                            map.setStatus("CLOSED");
                                            bugWorkflowMapRepository.save(map);
                                        } else if (map.getStepName().equals(nextStep.getStepName())) {
                                            map.setStatus("IN_PROGRESS");
                                            bugWorkflowMapRepository.save(map);
                                        }
                                    });
                                } else if ("NOT_RESOLVED".equals(bugDetails.getRemarks())) {
                                    // Special Transition: Tester rejecting fix back to developer
                                    // Close current verification step, re-open the developer step (usually index 1 if 0 is OPEN)
                                    WorkflowStep devStep = steps.stream()
                                        .filter(s -> "TASK".equals(s.getStepType()) && s.getSequence() > 1 && !s.getStepName().contains("COMPLETED"))
                                        .findFirst().orElse(steps.get(1)); // Fallback to 2nd step (IN_PROGRESS)

                                    snapshottedMaps.forEach(map -> {
                                        if (map.getStepName().equals(currentStep.getStepName())) {
                                            map.setStatus("CLOSED");
                                            bugWorkflowMapRepository.save(map);
                                        } else if (map.getStepName().equals(devStep.getStepName())) {
                                            map.setStatus("IN_PROGRESS");
                                            bugWorkflowMapRepository.save(map);
                                        }
                                    });
                                    if (bug.getBugTask() != null) {
                                        Task cr = bug.getBugTask();
                                        cr.setTotalRetests((cr.getTotalRetests() != null ? cr.getTotalRetests() : 0) + 1);
                                        taskRepository.save(cr);
                                    }
                                    bug.setStatus(devStep.getStepName());
                                    // Override bugDetails.status so it gets set correctly below
                                    bugDetails.setStatus(devStep.getStepName());
                                } else if (nextStep.getSequence() != currentStep.getSequence() + 1) {
                                    return ResponseEntity.status(400).body("Sequential transitions only. Cannot jump from " + bug.getStatus() + " to " + bugDetails.getStatus());
                                } else {
                                    // Standard sequential move
                                    snapshottedMaps.forEach(map -> {
                                        if (map.getStepName().equals(currentStep.getStepName())) {
                                            map.setStatus("CLOSED");
                                            bugWorkflowMapRepository.save(map);
                                        }
                                        if (map.getStepName().equals(nextStep.getStepName())) {
                                            map.setStatus("IN_PROGRESS");
                                            bugWorkflowMapRepository.save(map);
                                        }
                                    });
                                }
                            }
                            
                            // Check BYPASS LOGIC if necessary
                            bug.setStatus(bugDetails.getStatus());
                            
                            // Final step completion
                            if (bugDetails.getStatus().contains("CLOSED") || bugDetails.getStatus().contains("VERIFIED&CLOSED")) {
                                snapshottedMaps.forEach(map -> {
                                    map.setStatus("CLOSED");
                                    bugWorkflowMapRepository.save(map);
                                });
                            }
                        }
                    }

                    String username = SecurityContextHolder.getContext().getAuthentication().getName();
                    User currentUser = userRepository.findByUsername(username).orElseThrow();
                    String currentUserRole = SecurityContextHolder.getContext().getAuthentication().getAuthorities().toString();

                    boolean isCreator = bug.getRaisedBy() != null && bug.getRaisedBy().getId().equals(currentUser.getId());
                    boolean isAdmin = currentUserRole.contains("ROLE_TESTADMIN");
                    boolean isAssignedDeveloper = bug.getAssignedDeveloper() != null && bug.getAssignedDeveloper().getId().equals(currentUser.getId());

                    // Permission logic
                    if (!isCreator && !isAdmin) {
                        if (isAssignedDeveloper || currentUserRole.contains("ROLE_DEVELOPER")) {
                            if ("CLOSED".equals(bugDetails.getStatus()) || (bugDetails.getStatus() != null && bugDetails.getStatus().contains("VERIFIED"))) {
                                // Exclude INVALID_BUG short-circuit from this general block if developer triggers it
                                if (!"INVALID_BUG".equals(bugDetails.getRemarks())) {
                                    return ResponseEntity.status(403).body("Developers cannot verify/close bugs. Only the creator tester can do this.");
                                }
                            }
                        } else {
                            return ResponseEntity.status(403).body("You do not have permission to update this bug.");
                        }
                    } else {
                        // Creator or Admin update
                        if (bugDetails.getTitle() != null) {
                            bug.setTitle(bugDetails.getTitle());
                        }
                        if (bugDetails.getDescription() != null) {
                            bug.setDescription(bugDetails.getDescription());
                        }
                        if (bugDetails.getSeverity() != null) {
                            bug.setSeverity(bugDetails.getSeverity());
                        }
                        if (bugDetails.getPriority() != null) {
                            bug.setPriority(bugDetails.getPriority());
                        }
                        // jtrackId is immutable

                        if (bugDetails.getAssignedDeveloper() != null) {
                            bug.setAssignedDeveloper(bugDetails.getAssignedDeveloper());
                            // If assigned manually, remove from pool
                            if (bug.isInPool()) {
                                bug.setInPool(false);
                                bug.setInPoolDate(null);
                            }
                        }

                        if (bugDetails.getCrTaskId() != null) {
                            taskRepository.findById(bugDetails.getCrTaskId()).ifPresent(bug::setBugTask);
                        } else if (bugDetails.getBugTask() != null) {
                            bug.setBugTask(bugDetails.getBugTask());
                        }

                        if (bugDetails.getWorkflow() != null && bugDetails.getWorkflow().getId() != null) {
                            Workflow fullWorkflow = workflowRepository.findById(bugDetails.getWorkflow().getId()).orElse(null);
                            bug.setWorkflow(fullWorkflow);
                        }
                    }
                    
                    // Audit logging for status change
                    if (bugDetails.getStatus() != null && !bugDetails.getStatus().equals(oldStatus)) {
                        AuditLog log = new AuditLog();
                        log.setEntityType("BUG");
                        log.setEntityId(bug.getId());
                        log.setFieldName("status");
                        log.setOldValue(oldStatus);
                        log.setNewValue(bug.getStatus());
                        log.setRemarks(bugDetails.getRemarks());
                        log.setChangedBy(currentUser);
                        auditLogRepository.save(log);
                    }
                    Bug savedBug = bugRepository.save(bug);
                    if (savedBug.getBugTask() != null) {
                        try {
                            String eventType = "NOT_RESOLVED".equals(bugDetails.getRemarks()) ? "RETEST_RECORDED" : "BUG_UPDATED";
                            qualityRiskService.evaluateCrRisk(savedBug.getBugTask().getId(), eventType);
                        } catch (Exception e) {
                            log.error("Failed to evaluate CR risk in updateBug", e);
                        }
                    }

                    // ── Recognition hook — BUG_RESOLVED ─────────────────────────────
                    try {
                        String newSt = savedBug.getStatus();
                        boolean isResolution = newSt != null &&
                            (newSt.contains("RESOLVED") || newSt.contains("CLOSED") || newSt.contains("VERIFIED"));
                        if (isResolution && savedBug.getAssignedDeveloper() != null) {
                            applicationEventPublisher.publishEvent(new RecognitionTriggerEvent(
                                savedBug,
                                "BUG_RESOLVED",
                                savedBug.getAssignedDeveloper().getId(),
                                "BUG",
                                savedBug.getId(),
                                SecurityContextHolder.getContext().getAuthentication().getName(),
                                java.util.Map.of(
                                    "jtrackId", savedBug.getJtrackId() != null ? savedBug.getJtrackId() : "",
                                    "severity",  savedBug.getSeverity() != null ? savedBug.getSeverity() : "",
                                    "status",    savedBug.getStatus() != null ? savedBug.getStatus() : ""
                                )
                            ));
                        }
                    } catch (Exception e) {
                        log.error("Failed to publish BUG_RESOLVED recognition trigger: {}", e.getMessage());
                    }
                    
                    // Auto-transition task back to UAT_TESTING if all sibling bugs are VERIFIED or CLOSED
                    if ("VERIFIED".equals(savedBug.getStatus()) && savedBug.getBugTask() != null) {
                        Long taskId = savedBug.getBugTask().getId();
                        boolean hasActiveBugs = bugRepository.findAll().stream()
                                .filter(b -> b.getBugTask() != null && b.getBugTask().getId().equals(taskId))
                                .filter(b -> !b.getId().equals(savedBug.getId()))
                                .anyMatch(b -> "OPEN".equals(b.getStatus()) || "IN_PROGRESS".equals(b.getStatus()) || "RESOLVED".equals(b.getStatus()));
                        
                        if (!hasActiveBugs) {
                            Task task = savedBug.getBugTask();
                            String oldTaskStatus = task.getStatus();
                            if ("BUG_FOUND".equals(oldTaskStatus)) {
                                task.setStatus("UAT_TESTING");
                                taskRepository.save(task);
                                
                                AuditLog taskAuditLog = new AuditLog();
                                taskAuditLog.setEntityType("TASK");
                                taskAuditLog.setEntityId(task.getId());
                                taskAuditLog.setFieldName("status");
                                taskAuditLog.setOldValue(oldTaskStatus);
                                taskAuditLog.setNewValue("UAT_TESTING");
                                taskAuditLog.setRemarks("All bugs verified. UAT testing resumed.");
                                taskAuditLog.setChangedBy(currentUser);
                                taskAuditLog.setChangedDate(java.time.LocalDateTime.now());
                                auditLogRepository.save(taskAuditLog);
                            }
                        }
                    }

                    notificationService.sendMailOnBugUpdate(savedBug, bugDetails.getRemarks());
                    return ResponseEntity.ok(savedBug);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBug(@PathVariable Long id) {
        return bugRepository.findById(id)
                .map(bug -> {
                    String username = SecurityContextHolder.getContext().getAuthentication().getName();
                    String currentUserRole = SecurityContextHolder.getContext().getAuthentication().getAuthorities().toString();

                    if (!bug.getRaisedBy().getUsername().equals(username) && !currentUserRole.contains("ROLE_TESTADMIN")) {
                        return ResponseEntity.status(403).body("Only the creator or an admin can update this bug.");
                    }

                    bugWorkflowMapRepository.deleteByBugId(id);
                    bugRepository.delete(bug);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/current-step")
    public ResponseEntity<WorkflowStep> getCurrentBugStep(@PathVariable Long id) {
        return bugWorkflowMapRepository.findActiveStepByBugId(id)
                .map(map -> ResponseEntity.ok(map.getStep()))
                .orElse(ResponseEntity.ok(null));
    }

    @GetMapping("/{id}/steps")
    public ResponseEntity<List<WorkflowStep>> getBugSteps(@PathVariable Long id) {
        List<BugWorkflowMap> maps = bugWorkflowMapRepository.findByBugId(id);
        List<WorkflowStep> steps = maps.stream()
                .sorted(java.util.Comparator.comparing(BugWorkflowMap::getSequence))
                .map(BugWorkflowMap::getStep)
                .toList();
        return ResponseEntity.ok(steps);
    }

    // UAT and Pool Endpoints
    @PostMapping("/{id}/push-to-pool")
    @PreAuthorize("hasAnyRole('DEVADMIN', 'TESTADMIN')")
    public ResponseEntity<?> pushToPool(@PathVariable Long id) {
        return bugRepository.findById(id)
                .map(bug -> {
                    if (bug.getAssignedDeveloper() != null) {
                        return ResponseEntity.badRequest().body("Assigned bugs cannot be pushed to pool.");
                    }
                    bug.setInPool(true);
                    bug.setInPoolDate(java.time.LocalDateTime.now());
                    return ResponseEntity.ok(bugRepository.save(bug));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/pick-from-pool")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'DEVADMIN')")
    public ResponseEntity<?> pickFromPool(@PathVariable Long id) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();
        return bugRepository.findById(id)
                .map(bug -> {
                    if (!bug.isInPool()) {
                        return ResponseEntity.badRequest().body("Bug is not in the pool.");
                    }
                    bug.setInPool(false);
                    bug.setAssignedDeveloper(currentUser);
                    return ResponseEntity.ok(bugRepository.save(bug));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/pick-for-sit")
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN')")
    public ResponseEntity<?> pickForSit(@PathVariable Long id) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();
        return bugRepository.findById(id)
                .map(bug -> {
                    if (bug.getTester() != null) {
                        return ResponseEntity.badRequest().body("Bug is already being tested.");
                    }
                    bug.setTester(currentUser);
                    return ResponseEntity.ok(bugRepository.save(bug));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/approve-sit")
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN')")
    public ResponseEntity<?> approveSit(@PathVariable Long id, @RequestBody Bug bugDetails) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();
        return bugRepository.findById(id)
                .map(bug -> {
                    if (bugDetails.getRemarks() == null || bugDetails.getRemarks().trim().isEmpty()) {
                        return ResponseEntity.badRequest().body("Remarks are mandatory for approval.");
                    }
                    String oldStatus = bug.getStatus();
                    String newStatus = configRepository.findByConfigKey("STATUS_SIT_COMPLETED")
                            .map(AppConfig::getConfigValue).orElse("SIT_COMPLETED");
                    
                    bug.setStatus(newStatus);
                    bug.setTester(null);
                    bug.setRemarks(bugDetails.getRemarks());

                    // Sync Workflow Map
                    List<BugWorkflowMap> maps = bugWorkflowMapRepository.findByBugId(bug.getId());
                    if (!maps.isEmpty()) {
                        maps.forEach(map -> {
                            if (map.getStepName().equals(oldStatus)) {
                                map.setStatus("CLOSED");
                                bugWorkflowMapRepository.save(map);
                            }
                            if (map.getStepName().equals(newStatus)) {
                                map.setStatus("IN_PROGRESS");
                                bugWorkflowMapRepository.save(map);
                            }
                        });
                    }
                    
                    AuditLog log = new AuditLog();
                    log.setEntityType("BUG");
                    log.setEntityId(bug.getId());
                    log.setFieldName("status");
                    log.setOldValue(oldStatus);
                    log.setNewValue(newStatus);
                    log.setRemarks(bugDetails.getRemarks());
                    log.setChangedBy(currentUser);
                    auditLogRepository.save(log);
                    
                    return ResponseEntity.ok(bugRepository.save(bug));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/reject-sit")
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN')")
    public ResponseEntity<?> rejectSit(@PathVariable Long id, @RequestBody Bug bugDetails) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();
        return bugRepository.findById(id)
                .map(bug -> {
                    if (bugDetails.getRemarks() == null || bugDetails.getRemarks().trim().isEmpty()) {
                        return ResponseEntity.badRequest().body("Remarks are mandatory for rejection.");
                    }
                    String oldStatus = bug.getStatus();
                    bug.setStatus("IN_PROGRESS");
                    bug.setTester(null);
                    bug.setRemarks(bugDetails.getRemarks());

                    // Sync Workflow Map
                    List<BugWorkflowMap> maps = bugWorkflowMapRepository.findByBugId(bug.getId());
                    if (!maps.isEmpty()) {
                        maps.forEach(map -> {
                            if (map.getStepName().equals(oldStatus)) {
                                map.setStatus("NOT_STARTED");
                                bugWorkflowMapRepository.save(map);
                            }
                            if (map.getStepName().equals("IN_PROGRESS")) {
                                map.setStatus("IN_PROGRESS");
                                bugWorkflowMapRepository.save(map);
                            }
                        });
                    }
                    
                    AuditLog log = new AuditLog();
                    log.setEntityType("BUG");
                    log.setEntityId(bug.getId());
                    log.setFieldName("status");
                    log.setOldValue(oldStatus);
                    log.setNewValue("IN_PROGRESS");
                    log.setRemarks(bugDetails.getRemarks());
                    log.setChangedBy(currentUser);
                    auditLogRepository.save(log);
                    
                    return ResponseEntity.ok(bugRepository.save(bug));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/pick-for-uat")
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN')")
    public ResponseEntity<?> pickForUat(@PathVariable Long id) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();
        return bugRepository.findById(id)
                .map(bug -> {
                    if (bug.getTester() != null) {
                        return ResponseEntity.badRequest().body("Bug is already being tested.");
                    }
                    bug.setTester(currentUser);
                    return ResponseEntity.ok(bugRepository.save(bug));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/approve-uat")
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN')")
    public ResponseEntity<?> approveUat(@PathVariable Long id, @RequestBody Bug bugDetails) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();
        return bugRepository.findById(id)
                .map(bug -> {
                    if (bugDetails.getRemarks() == null || bugDetails.getRemarks().trim().isEmpty()) {
                        return ResponseEntity.badRequest().body("Remarks are mandatory for approval.");
                    }
                    String oldStatus = bug.getStatus();
                    String newStatus = configRepository.findByConfigKey("STATUS_UAT_COMPLETED")
                            .map(AppConfig::getConfigValue).orElse("UAT_COMPLETED");
                    
                    bug.setStatus(newStatus);
                    bug.setTester(null);
                    bug.setRemarks(bugDetails.getRemarks());

                    // Sync Workflow Map
                    List<BugWorkflowMap> maps = bugWorkflowMapRepository.findByBugId(bug.getId());
                    if (!maps.isEmpty()) {
                        maps.forEach(map -> {
                            if (map.getStepName().equals(oldStatus)) {
                                map.setStatus("CLOSED");
                                bugWorkflowMapRepository.save(map);
                            }
                            if (map.getStepName().equals(newStatus)) {
                                map.setStatus("IN_PROGRESS");
                                bugWorkflowMapRepository.save(map);
                            }
                        });
                    }
                    
                    AuditLog log = new AuditLog();
                    log.setEntityType("BUG");
                    log.setEntityId(bug.getId());
                    log.setFieldName("status");
                    log.setOldValue(oldStatus);
                    log.setNewValue(newStatus);
                    log.setRemarks(bugDetails.getRemarks());
                    log.setChangedBy(currentUser);
                    auditLogRepository.save(log);
                    
                    return ResponseEntity.ok(bugRepository.save(bug));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/reject-uat")
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN')")
    public ResponseEntity<?> rejectUat(@PathVariable Long id, @RequestBody Bug bugDetails) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();
        return bugRepository.findById(id)
                .map(bug -> {
                    if (bugDetails.getRemarks() == null || bugDetails.getRemarks().trim().isEmpty()) {
                        return ResponseEntity.badRequest().body("Remarks are mandatory for rejection.");
                    }
                    String oldStatus = bug.getStatus();
                    String newStatus = configRepository.findByConfigKey("STATUS_REJECTED")
                            .map(AppConfig::getConfigValue).orElse("IN_PROGRESS");
                    
                    bug.setStatus(newStatus);
                    bug.setTester(null); // Release tester
                    bug.setRemarks(bugDetails.getRemarks());
                    
                    // Sync Workflow Map
                    List<BugWorkflowMap> maps = bugWorkflowMapRepository.findByBugId(bug.getId());
                    if (!maps.isEmpty()) {
                        maps.forEach(map -> {
                            if (map.getStepName().equals(oldStatus)) {
                                map.setStatus("NOT_STARTED");
                                bugWorkflowMapRepository.save(map);
                            }
                            if (map.getStepName().equals(newStatus)) {
                                map.setStatus("IN_PROGRESS");
                                bugWorkflowMapRepository.save(map);
                            }
                        });
                    }
                    
                    AuditLog log = new AuditLog();
                    log.setEntityType("BUG");
                    log.setEntityId(bug.getId());
                    log.setFieldName("status");
                    log.setOldValue(oldStatus);
                    log.setNewValue(newStatus);
                    log.setRemarks(bugDetails.getRemarks());
                    log.setChangedBy(currentUser);
                    auditLogRepository.save(log);
                    
                    return ResponseEntity.ok(bugRepository.save(bug));
                })
                .orElse(ResponseEntity.notFound().build());
    }
    @PostMapping("/{id}/approve-invalid")
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN')")
    public ResponseEntity<?> approveInvalidBug(@PathVariable Long id, @RequestBody Bug bugDetails) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();
        return bugRepository.findById(id)
                .map(bug -> {
                    if (!"INVALID_PENDING_APPROVAL".equals(bug.getStatus())) {
                        return ResponseEntity.badRequest().body("Bug is not pending invalidation review.");
                    }
                    if (bugDetails.getRemarks() == null || bugDetails.getRemarks().trim().isEmpty()) {
                        return ResponseEntity.badRequest().body("Remarks are mandatory for approval.");
                    }
                    String oldStatus = bug.getStatus();
                    String newStatus = "INVALID_BUG";
                    
                    bug.setStatus(newStatus);
                    bug.setRemarks(bugDetails.getRemarks());
                    
                    bugWorkflowMapRepository.findByBugId(bug.getId()).forEach(map -> {
                        map.setStatus("CLOSED");
                        bugWorkflowMapRepository.save(map);
                    });
                    
                    AuditLog log = new AuditLog();
                    log.setEntityType("BUG");
                    log.setEntityId(bug.getId());
                    log.setFieldName("status");
                    log.setOldValue(oldStatus);
                    log.setNewValue(newStatus);
                    log.setRemarks(bugDetails.getRemarks());
                    log.setChangedBy(currentUser);
                    auditLogRepository.save(log);
                    
                    return ResponseEntity.ok(bugRepository.save(bug));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/reject-invalid")
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN')")
    public ResponseEntity<?> rejectInvalidBug(@PathVariable Long id, @RequestBody Bug bugDetails) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();
        return bugRepository.findById(id)
                .map(bug -> {
                    if (!"INVALID_PENDING_APPROVAL".equals(bug.getStatus())) {
                        return ResponseEntity.badRequest().body("Bug is not pending invalidation review.");
                    }
                    if (bugDetails.getRemarks() == null || bugDetails.getRemarks().trim().isEmpty()) {
                        return ResponseEntity.badRequest().body("Remarks are mandatory for rejection.");
                    }
                    String oldStatus = bug.getStatus();
                    String newStatus = "IN_PROGRESS"; // Return to developer step
                    
                    bug.setStatus(newStatus);
                    bug.setRemarks(bugDetails.getRemarks());

                    // Sync Workflow Map
                    List<BugWorkflowMap> maps = bugWorkflowMapRepository.findByBugId(bug.getId());
                    if (!maps.isEmpty()) {
                        maps.forEach(map -> {
                            if (map.getStepName().equals(oldStatus)) {
                                map.setStatus("NOT_STARTED");
                                bugWorkflowMapRepository.save(map);
                            }
                            if (map.getStepName().equals(newStatus)) {
                                map.setStatus("IN_PROGRESS");
                                bugWorkflowMapRepository.save(map);
                            }
                        });
                    }
                    
                    AuditLog log = new AuditLog();
                    log.setEntityType("BUG");
                    log.setEntityId(bug.getId());
                    log.setFieldName("status");
                    log.setOldValue(oldStatus);
                    log.setNewValue(newStatus);
                    log.setRemarks(bugDetails.getRemarks());
                    log.setChangedBy(currentUser);
                    auditLogRepository.save(log);
                    
                    Bug savedBug = bugRepository.save(bug);
                    if (newStatus != null && !newStatus.equals(oldStatus)) {
                        String desc = "Bug status changed from " + oldStatus + " to " + newStatus + " by " + currentUser.getFullName() + ". Remarks: " + bugDetails.getRemarks();
                        if (savedBug.getAssignedDeveloper() != null) {
                            createAndPushNotification(savedBug.getAssignedDeveloper().getId(), "Bug " + savedBug.getJtrackId() + " Status Updated", desc);
                        }
                        if (savedBug.getRaisedBy() != null && (savedBug.getAssignedDeveloper() == null || !savedBug.getRaisedBy().getId().equals(savedBug.getAssignedDeveloper().getId()))) {
                            createAndPushNotification(savedBug.getRaisedBy().getId(), "Bug " + savedBug.getJtrackId() + " Status Updated", desc);
                        }
                    }
                    return ResponseEntity.ok(savedBug);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private void createAndPushNotification(Long userId, String title, String desc) {
        if (userId == null) return;
        try {
            com.devtrack.api.model.Notification notif = new com.devtrack.api.model.Notification();
            notif.setUserId(userId);
            notif.setTitle(title);
            notif.setDesc(desc);
            notif.setTime("Just now");
            notif.setUnread(true);
            
            com.devtrack.api.model.Notification saved = notificationRepository.save(notif);
            webSocketHandler.sendToUser(userId, java.util.Map.of(
                "type", "NOTIFICATION",
                "notification", saved
            ));
        } catch (Exception e) {
            log.error("Failed to send real-time notification to userId {}: {}", userId, e.getMessage());
        }
    }

    private Bug populateBugArtifacts(Bug bug) {
        if (bug == null) return null;
        List<Attachment> attachments = attachmentRepository.findByEntityTypeAndEntityId("BUG", bug.getId());
        List<Bug.BugArtifactDto> artDtos = new java.util.ArrayList<>();
        for (Attachment att : attachments) {
            Bug.BugArtifactDto dto = new Bug.BugArtifactDto();
            dto.setId(att.getId());
            dto.setBugId(bug.getId());
            dto.setFileName(att.getFileName());
            dto.setFileType(att.getFileType());
            if (att.getData() != null) {
                long len = att.getData().length;
                if (len < 1024) {
                    dto.setFileSize(len + " B");
                } else if (len < 1024 * 1024) {
                    dto.setFileSize(String.format("%.1f KB", len / 1024.0));
                } else {
                    dto.setFileSize(String.format("%.2f MB", len / (1024.0 * 1024.0)));
                }
            }
            dto.setUploadedBy(att.getUploadedBy());
            dto.setUploadedOn(att.getUploadDate());
            artDtos.add(dto);
        }
        bug.setArtifacts(artDtos);
        return bug;
    }

    @PostMapping("/{id}/fix-summary")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'DEVADMIN', 'ADMIN')")
    public ResponseEntity<?> submitFixSummary(@PathVariable Long id, @RequestBody BugDeveloperFixSummaryDto dto) {
        if (dto.getRootCauseAnalysis() == null || dto.getRootCauseAnalysis().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Root Cause Analysis is mandatory.");
        }
        if (dto.getFixSummary() == null || dto.getFixSummary().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Fix Summary is mandatory.");
        }
        
        Optional<Bug> bugOpt = bugRepository.findById(id);
        if (bugOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Bug bug = bugOpt.get();
        
        BugDeveloperFixSummary summary = bugDeveloperFixSummaryRepository.findByBugId(id)
                .orElse(new BugDeveloperFixSummary());
        
        summary.setBug(bug);
        summary.setCrId(bug.getCrTaskId());
        summary.setRootCauseAnalysis(dto.getRootCauseAnalysis().trim());
        summary.setFixSummary(dto.getFixSummary().trim());
        summary.setFilesModified(dto.getFilesModified());
        summary.setDatabaseChanges(dto.getDatabaseChanges());
        summary.setApiChanges(dto.getApiChanges());
        summary.setAdditionalNotes(dto.getAdditionalNotes());
        
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        summary.setCreatedBy(username);
        
        BugDeveloperFixSummary saved = bugDeveloperFixSummaryRepository.save(summary);
        
        // Log audit log
        User currentUser = userRepository.findByUsername(username).orElseThrow();
        AuditLog log = new AuditLog();
        log.setEntityType("BUG");
        log.setEntityId(bug.getId());
        log.setFieldName("fixSummary");
        log.setOldValue(null);
        log.setNewValue("SUBMITTED");
        log.setRemarks("Developer submitted Fix Summary for bug: " + bug.getJtrackId());
        log.setChangedBy(currentUser);
        auditLogRepository.save(log);
        
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/{id}/fix-summary")
    public ResponseEntity<?> getFixSummary(@PathVariable Long id) {
        return bugDeveloperFixSummaryRepository.findByBugId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok().build());
    }

    @GetMapping("/cr/{crId}/fix-summaries")
    public ResponseEntity<?> getFixSummariesByCrId(@PathVariable Long crId) {
        List<BugDeveloperFixSummary> summaries = bugDeveloperFixSummaryRepository.findAll().stream()
                .filter(summary -> crId.equals(summary.getCrId()))
                .toList();
        return ResponseEntity.ok(summaries);
    }
}
