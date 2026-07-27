package com.devtrack.api.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

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
import com.devtrack.api.model.BugDeveloper;
import com.devtrack.api.model.BugDeveloperFixSummary;
import com.devtrack.api.event.RecognitionTriggerEvent;
import com.devtrack.api.dto.BugDeveloperFixSummaryDto;

import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/bugs")
@Slf4j
public class BugController {

    // Bug statuses representing a resolution/terminal outcome. Used for exact-equality
    // checks that drive business state (resolvedDate stamping + recognition awards).
    // Replaces prior substring .contains("RESOLVED"/"VERIFIED"/"CLOSED") matching.
    private static final java.util.Set<String> RESOLUTION_STATUSES =
            java.util.Set.of("RESOLVED", "VERIFIED", "CLOSED", "VERIFIED&CLOSED");

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

    @Autowired
    private com.devtrack.api.repository.BugDeveloperRepository bugDeveloperRepository;

    @Autowired
    private com.devtrack.api.event.DomainEventPublisher domainEventPublisher;

    @Autowired
    private com.devtrack.api.services.JtrackIdSequenceService jtrackIdSequenceService;

    @GetMapping
    public ResponseEntity<?> getAllBugs(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String status, @RequestParam(required = false) String severity) {

        if (page == null && size == null) {
            return ResponseEntity.ok(bugRepository.findAllOptimized());
        }

        Pageable pageable = PageRequest.of(page != null ? page : 0, size != null ? size : 10, Sort.by("id").descending());

        if (status != null && !status.isBlank() && severity != null && !severity.isBlank()) {
            return ResponseEntity.ok(bugRepository.findAllOptimizedByStatusAndSeverity(status, severity, pageable));
        } else if (status != null && !status.isBlank()) {
            return ResponseEntity.ok(bugRepository.findAllOptimizedByStatus(status, pageable));
        } else if (severity != null && !severity.isBlank()) {
            return ResponseEntity.ok(bugRepository.findAllOptimizedBySeverity(severity, pageable));
        } else {
            return ResponseEntity.ok(bugRepository.findAllOptimizedActive(pageable));
        }
    }

    @GetMapping("/download-bugs")
    public Page<Bug> downloadBugs(@RequestParam(required = false) String status, @RequestParam(required = false) String severity) {
        if (status != null && !status.isBlank() && severity != null && !severity.isBlank()) {
            return bugRepository.findAllOptimizedByStatusAndSeverity(status, severity, null);
        } else if (status != null && !status.isBlank()) {
            return bugRepository.findAllOptimizedByStatus(status, null);
        } else if (severity != null && !severity.isBlank()) {
            return bugRepository.findAllOptimizedBySeverity(severity, null);
        } else {
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

        if (status != null && !status.isBlank() && severity != null && !severity.isBlank()) {
            return bugRepository.findAllOptimizedByDeveloperStatusAndSeverity(user.getId(), status, severity, pageable);
        } else if (status != null && !status.isBlank()) {
            return bugRepository.findAllOptimizedByDeveloperStatus(user.getId(), status, pageable);
        } else if (severity != null && !severity.isBlank()) {
            return bugRepository.findAllOptimizedByDeveloperSeverity(user.getId(), severity, pageable);
        } else {
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
    @CacheEvict(value = "dashboardSummary", allEntries = true)
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN')")
    @Transactional
    public Bug createBug(@RequestBody Bug bug) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();

        if (bug.getTitle() == null || bug.getTitle().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title is mandatory.");
        }
        if (bug.getDescription() == null || bug.getDescription().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Description is mandatory.");
        }
        if (bug.getJtrackId() == null || bug.getJtrackId().trim().isEmpty()) {
            // Race-free sequential id from the id_sequence counter table (see V39).
            bug.setJtrackId(jtrackIdSequenceService.nextBugJtrackId());
        }

        if (bug.getCrTaskId() != null) {
            taskRepository.findById(bug.getCrTaskId()).ifPresent(bug::setBugTask);
        }

        // Multi-developer assignment: a Bug inherits its developer pool from the parent CR.
        // The legacy assignedDeveloper field is the primary sentinel (first/primary dev).
        if (bug.getBugTask() != null) {
            Task parentTask = bug.getBugTask();
            java.util.List<User> poolFromCr = new java.util.ArrayList<>();
            if (parentTask.getDevelopers() != null) {
                parentTask.getDevelopers().forEach(td -> {
                    if (td.getDeveloper() != null) poolFromCr.add(td.getDeveloper());
                });
            }
            if (parentTask.getAssignedDeveloper() != null) {
                boolean alreadyInPool = poolFromCr.stream()
                        .anyMatch(u -> u.getId().equals(parentTask.getAssignedDeveloper().getId()));
                if (!alreadyInPool) {
                    poolFromCr.add(0, parentTask.getAssignedDeveloper());
                }
            }
            for (User dev : poolFromCr) {
                BugDeveloper bd = new BugDeveloper();
                bd.setBug(bug);
                bd.setDeveloper(dev);
                bug.getDevelopers().add(bd);
            }
            if (bug.getAssignedDeveloper() == null && !poolFromCr.isEmpty()) {
                bug.setAssignedDeveloper(poolFromCr.get(0));
            }
        }
        if (bug.getAssignedDeveloper() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assignee is mandatory for Bugs.");
        }

        if (bug.getRaisedBy() == null) {
            bug.setRaisedBy(currentUser);
        }

        if (bug.getWorkflow() == null || bug.getWorkflow().getId() == null) {
            Workflow defaultWorkflow = workflowRepository.findById(2L).orElse(null);
            bug.setWorkflow(defaultWorkflow);
        } else {
            Workflow fullWorkflow = workflowRepository.findById(bug.getWorkflow().getId()).orElse(null);
            bug.setWorkflow(fullWorkflow);
        }

        if (bug.getWorkflow() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workflow is mandatory");
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
            emitTaskEvent(task, "UPDATED", currentUser.getId());
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

        // Notify all developers in the bug's pool (inherited from parent CR)
        java.util.Set<Long> notifiedDevIds = new java.util.HashSet<>();
        if (savedBug.getDevelopers() != null) {
            for (BugDeveloper bd : savedBug.getDevelopers()) {
                if (bd.getDeveloper() != null && !notifiedDevIds.contains(bd.getDeveloper().getId())) {
                    notifiedDevIds.add(bd.getDeveloper().getId());
                    createAndPushNotification(bd.getDeveloper().getId(), "New Bug Assigned: " + savedBug.getJtrackId(),
                            "Bug '" + savedBug.getTitle() + "' has been assigned to you by " + currentUser.getFullName() + ". Status: " + savedBug.getStatus());
                }
            }
        }
        if (savedBug.getAssignedDeveloper() != null && !notifiedDevIds.contains(savedBug.getAssignedDeveloper().getId())) {
            notifiedDevIds.add(savedBug.getAssignedDeveloper().getId());
            createAndPushNotification(savedBug.getAssignedDeveloper().getId(), "New Bug Assigned: " + savedBug.getJtrackId(),
                    "Bug '" + savedBug.getTitle() + "' has been assigned to you by " + currentUser.getFullName() + ". Status: " + savedBug.getStatus());
        }
        if (savedBug.getRaisedBy() != null && !notifiedDevIds.contains(savedBug.getRaisedBy().getId())) {
            createAndPushNotification(savedBug.getRaisedBy().getId(), "Bug Created: " + savedBug.getJtrackId(),
                    "You have raised a Bug: '" + savedBug.getTitle() + "'.");
        }
        emitBugEvent(savedBug, "CREATED", currentUser.getId());

        return savedBug;
    }

    @PutMapping("/{id}")
    @CacheEvict(value = "dashboardSummary", allEntries = true)
    @Transactional
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

                    // Only assigned developer can update, UNLESS Code Review, Admin override, or Creator.
                    if (bug.getAssignedDeveloper() != null) {
                        String username = SecurityContextHolder.getContext().getAuthentication().getName();
                        String roles = SecurityContextHolder.getContext().getAuthentication().getAuthorities().toString();
                        boolean isReviewer = roles.contains("ROLE_CODEREVIEWER");
                        boolean isAdmin = roles.contains("ROLE_TESTADMIN");
                        boolean isCreatorTop = bug.getRaisedBy() != null && bug.getRaisedBy().getUsername().equals(username);

                        if (!isBugCoOwner(bug, username) && !isReviewer && !isAdmin && !isCreatorTop) {
                            return ResponseEntity.status(403).body("Only an assigned co-owner, the bug creator, or an admin can update this bug.");
                        }

                        boolean isActiveTesting = bug.getStatus() != null &&
                                ((bug.getStatus().contains("TESTING") && !bug.getStatus().contains("COMPLETED")) ||
                                 (bug.getStatus().contains("UAT") && !bug.getStatus().contains("COMPLETED")) ||
                                 (bug.getStatus().contains("SIT") && !bug.getStatus().contains("COMPLETED")));

                        if ((bug.getTester() != null || isActiveTesting) &&
                                !isAdmin && !isReviewer && !roles.contains("ROLE_TESTER")) {
                            return ResponseEntity.status(403).body("This bug is currently in testing/review phase and cannot be updated by developers.");
                        }
                    }

                    // Enforce Developer Fix Summary before resolving bug.
                    // Exact-equality (was substring .contains("RESOLVED"), which matched NOT_RESOLVED).
                    if ("RESOLVED".equals(bugDetails.getStatus()) && !"RESOLVED".equals(bug.getStatus())) {
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

                    // Transition logic if workflow is present
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

                                // Special transition: Invalid/verified/closed shortcut to final step.
                                // Exact-equality (was substring .contains("VERIFIED"/"CLOSED")).
                                if ("INVALID_BUG".equals(bugDetails.getRemarks())
                                        || "VERIFIED".equals(bugDetails.getStatus())
                                        || "VERIFIED&CLOSED".equals(bugDetails.getStatus())
                                        || "CLOSED".equals(bugDetails.getStatus())) {
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
                                    // Tester rejecting fix back to developer.
                                    WorkflowStep devStep = steps.stream()
                                            .filter(s -> "TASK".equals(s.getStepType()) && s.getSequence() > 1 && !s.getStepName().contains("COMPLETED"))
                                            .findFirst().orElse(steps.get(1));

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
                                        emitTaskEvent(cr, "UPDATED", null);
                                    }
                                    bug.setStatus(devStep.getStepName());
                                    bugDetails.setStatus(devStep.getStepName());
                                } else if (nextStep.getSequence() != currentStep.getSequence() + 1) {
                                    return ResponseEntity.status(400).body("Sequential transitions only. Cannot jump from " + bug.getStatus() + " to " + bugDetails.getStatus());
                                } else {
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

                            bug.setStatus(bugDetails.getStatus());

                            // Final step completion. Exact-equality (was substring .contains).
                            if ("CLOSED".equals(bugDetails.getStatus()) || "VERIFIED&CLOSED".equals(bugDetails.getStatus())) {
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
                    boolean isAssignedDeveloper = isBugCoOwner(bug, username);

                    if (!isCreator && !isAdmin) {
                        if (isAssignedDeveloper || currentUserRole.contains("ROLE_DEVELOPER")) {
                            // Developers cannot verify/close. Exact-equality (was substring .contains("VERIFIED")).
                            if ("CLOSED".equals(bugDetails.getStatus())
                                    || "VERIFIED".equals(bugDetails.getStatus())
                                    || "VERIFIED&CLOSED".equals(bugDetails.getStatus())) {
                                if (!"INVALID_BUG".equals(bugDetails.getRemarks())) {
                                    // Throw (not return): this check runs AFTER the transition block above may have
                                    // already flushed BugWorkflowMap changes. A plain return would let the
                                    // @Transactional method commit that partial state; throwing forces a full
                                    // rollback. GlobalExceptionHandler maps ResponseStatusException to HTTP 403.
                                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Developers cannot verify/close bugs. Only the creator tester can do this.");
                                }
                            }
                        } else {
                            // Throw (not return) for the same rollback-safety reason as above.
                            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to update this bug.");
                        }
                    } else {
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
                        if (bugDetails.getAssignedDeveloper() != null) {
                            bug.setAssignedDeveloper(bugDetails.getAssignedDeveloper());
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

                    // Persist resolution timestamp at transition. Exact-equality set membership
                    // (was substring .contains("RESOLVED"/"VERIFIED"/"CLOSED")).
                    String resolveCheck = bug.getStatus();
                    if (resolveCheck != null && RESOLUTION_STATUSES.contains(resolveCheck) && bug.getResolvedDate() == null) {
                        bug.setResolvedDate(java.time.LocalDateTime.now());
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

                    // Recognition hook -- BUG_RESOLVED (multi-developer EQUAL split).
                    // Points split equally across the union of bug sentinel, bug_developers pool,
                    // parent CR sentinel and parent CR task_developers pool. idempotencyKey includes
                    // userId so distinct devs never collide and a dev is never double-rewarded.
                    // Runs AFTER commit via the RecognitionEventListener @TransactionalEventListener.
                    try {
                        String newSt = savedBug.getStatus();
                        boolean isResolution = newSt != null && RESOLUTION_STATUSES.contains(newSt);
                        if (isResolution) {
                            java.util.Set<Long> devIdSet = new java.util.TreeSet<>();
                            if (savedBug.getAssignedDeveloper() != null) {
                                devIdSet.add(savedBug.getAssignedDeveloper().getId());
                            }
                            if (savedBug.getDevelopers() != null) {
                                savedBug.getDevelopers().forEach(bd -> {
                                    if (bd.getDeveloper() != null) devIdSet.add(bd.getDeveloper().getId());
                                });
                            }
                            if (savedBug.getBugTask() != null) {
                                Task parentCr = savedBug.getBugTask();
                                if (parentCr.getAssignedDeveloper() != null) {
                                    devIdSet.add(parentCr.getAssignedDeveloper().getId());
                                }
                                if (parentCr.getDevelopers() != null) {
                                    parentCr.getDevelopers().forEach(td -> {
                                        if (td.getDeveloper() != null) devIdSet.add(td.getDeveloper().getId());
                                    });
                                }
                            }

                            if (!devIdSet.isEmpty()) {
                                java.util.List<Long> allDevIds = new java.util.ArrayList<>(devIdSet);
                                int numDevs = allDevIds.size();
                                int basePoints = 10;
                                int base = basePoints / numDevs;
                                int rem = Math.abs(basePoints % numDevs);
                                int step = basePoints < 0 ? -1 : 1;
                                String actor = SecurityContextHolder.getContext().getAuthentication().getName();

                                for (int i = 0; i < numDevs; i++) {
                                    Long dId = allDevIds.get(i);
                                    int pointsForThisDev = base + (i < rem ? step : 0);
                                    java.util.Map<String, Object> meta = new java.util.HashMap<>();
                                    meta.put("jtrackId", savedBug.getJtrackId() != null ? savedBug.getJtrackId() : "");
                                    meta.put("severity", savedBug.getSeverity() != null ? savedBug.getSeverity() : "");
                                    meta.put("status", savedBug.getStatus() != null ? savedBug.getStatus() : "");
                                    meta.put("pointsOverride", pointsForThisDev);
                                    meta.put("strategy", "EQUAL");
                                    meta.put("poolSize", numDevs);

                                    applicationEventPublisher.publishEvent(new RecognitionTriggerEvent(
                                            savedBug, "BUG_RESOLVED", dId, "BUG", savedBug.getId(), actor, meta));
                                }
                            }
                        }
                    } catch (Exception e) {
                        log.error("Failed to publish BUG_RESOLVED recognition trigger: {}", e.getMessage());
                    }

                    // Auto-transition task back to UAT_TESTING if all sibling bugs are VERIFIED/CLOSED.
                    // Uses a scoped count query (was findAll().stream().filter(...) full-table scan).
                    if ("VERIFIED".equals(savedBug.getStatus()) && savedBug.getBugTask() != null) {
                        Long taskId = savedBug.getBugTask().getId();
                        boolean hasActiveBugs = bugRepository.countByBugTaskIdAndStatusInExcluding(
                                taskId, savedBug.getId(),
                                java.util.List.of("OPEN", "IN_PROGRESS", "RESOLVED")) > 0;

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
                                emitTaskEvent(task, "UPDATED", currentUser.getId());
                            }
                        }
                    }

                    notificationService.sendMailOnBugUpdate(savedBug, bugDetails.getRemarks());
                    emitBugEvent(savedBug, "UPDATED", currentUser.getId());
                    return ResponseEntity.ok(savedBug);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Transactional
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
                    emitBugEvent(bug, "DELETED", null);
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
    @Transactional
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
    @Transactional
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
    @Transactional
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
    @Transactional
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
                    bug.setTester(null);
                    bug.setRemarks(bugDetails.getRemarks());

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
    @Transactional
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
    @Transactional
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
                    String newStatus = "IN_PROGRESS";

                    bug.setStatus(newStatus);
                    bug.setRemarks(bugDetails.getRemarks());

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

    // Multi-developer co-ownership check for bugs. A user may act on a bug if they are the
    // legacy sentinel assignedDeveloper, a member of the bug's developer pool, or a co-owner
    // of the parent CR (task_developers pool or CR sentinel).
    private boolean isBugCoOwner(Bug bug, String username) {
        if (bug == null || username == null) return false;
        if (bug.getAssignedDeveloper() != null && username.equals(bug.getAssignedDeveloper().getUsername())) {
            return true;
        }
        if (bug.getDevelopers() != null) {
            for (BugDeveloper bd : bug.getDevelopers()) {
                if (bd.getDeveloper() != null && username.equals(bd.getDeveloper().getUsername())) {
                    return true;
                }
            }
        }
        if (bug.getBugTask() != null) {
            Task cr = bug.getBugTask();
            if (cr.getAssignedDeveloper() != null && username.equals(cr.getAssignedDeveloper().getUsername())) {
                return true;
            }
            if (cr.getDevelopers() != null) {
                for (com.devtrack.api.model.TaskDeveloper td : cr.getDevelopers()) {
                    if (td.getDeveloper() != null && username.equals(td.getDeveloper().getUsername())) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Runs the given publication action AFTER the current transaction commits, so real-time
    // domain events are never emitted for state that later rolls back. Falls back to immediate
    // execution when no transaction is active.
    private void publishAfterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }

    private void emitBugEvent(Bug bug, String action, Long actorId) {
        if (bug == null) return;
        try {
            java.util.Set<Long> recipients = new java.util.LinkedHashSet<>();
            if (bug.getAssignedDeveloper() != null) recipients.add(bug.getAssignedDeveloper().getId());
            if (bug.getDevelopers() != null) {
                for (BugDeveloper bd : bug.getDevelopers()) {
                    if (bd.getDeveloper() != null) recipients.add(bd.getDeveloper().getId());
                }
            }
            if (bug.getTester() != null) recipients.add(bug.getTester().getId());
            if (bug.getRaisedBy() != null) recipients.add(bug.getRaisedBy().getId());
            if (recipients.isEmpty()) return;
            final java.util.List<Long> recipientList = new java.util.ArrayList<>(recipients);
            final com.devtrack.api.event.DomainEventPayload payload =
                    com.devtrack.api.event.DomainEventPayload.of("BUG", action, bug.getId(), actorId);
            publishAfterCommit(() -> domainEventPublisher.publish(recipientList, payload));
        } catch (Exception e) {
            log.warn("Failed to emit typed BUG event ({}) for id={}: {}", action, bug.getId(), e.getMessage());
        }
    }

    private void emitTaskEvent(Task task, String action, Long actorId) {
        if (task == null) return;
        try {
            java.util.Set<Long> recipients = new java.util.LinkedHashSet<>();
            if (task.getAssignedDeveloper() != null) recipients.add(task.getAssignedDeveloper().getId());
            if (task.getDevelopers() != null) {
                for (com.devtrack.api.model.TaskDeveloper td : task.getDevelopers()) {
                    if (td.getDeveloper() != null) recipients.add(td.getDeveloper().getId());
                }
            }
            if (task.getTester() != null) recipients.add(task.getTester().getId());
            if (task.getCreatedBy() != null) recipients.add(task.getCreatedBy().getId());
            if (recipients.isEmpty()) return;
            final java.util.List<Long> recipientList = new java.util.ArrayList<>(recipients);
            final com.devtrack.api.event.DomainEventPayload payload =
                    com.devtrack.api.event.DomainEventPayload.of("TASK", action, task.getId(), actorId);
            publishAfterCommit(() -> domainEventPublisher.publish(recipientList, payload));
        } catch (Exception e) {
            log.warn("Failed to emit typed parent-CR TASK event ({}) for id={}: {}", action, task.getId(), e.getMessage());
        }
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
    @Transactional
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
        // Derived query replaces the previous findAll().stream().filter(...) full-table scan.
        List<BugDeveloperFixSummary> summaries = bugDeveloperFixSummaryRepository.findAllByCrId(crId);
        return ResponseEntity.ok(summaries);
    }
}
