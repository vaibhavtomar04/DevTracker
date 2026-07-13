package com.devtrack.api.controller;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
import com.devtrack.api.model.Role;
import com.devtrack.api.model.Task;
import com.devtrack.api.model.TaskDeveloper;
import com.devtrack.api.model.TaskWorkflowMap;
import com.devtrack.api.model.User;
import com.devtrack.api.model.WorkflowStep;
import com.devtrack.api.repository.AttachmentRepository;
import com.devtrack.api.repository.AuditLogRepository;
import com.devtrack.api.repository.CommentRepository;
import com.devtrack.api.repository.ConfigRepository;
import com.devtrack.api.repository.TaskRepository;
import com.devtrack.api.repository.TaskWorkflowMapRepository;
import com.devtrack.api.repository.UserRepository;
import com.devtrack.api.services.EmailNotificationService;
import com.devtrack.api.services.WorkflowExecutionService;

import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/tasks")
@Slf4j
public class TaskController {

    private final EmailNotificationService emailNotificationService;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private ConfigRepository configRepository;

    @Autowired
    private WorkflowExecutionService workflowExecutionService;

    @Autowired
    private TaskWorkflowMapRepository taskWorkflowMapRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private AttachmentRepository attachmentRepository;

    @Autowired
    private com.devtrack.api.repository.NotificationRepository notificationRepository;

    @Autowired
    private com.devtrack.api.config.NotificationWebSocketHandler webSocketHandler;

    @Autowired
    private com.devtrack.api.services.SprintTaskService sprintTaskService;

    @Autowired
    private com.devtrack.api.services.QualityRiskService qualityRiskService;

    TaskController(EmailNotificationService emailNotificationService) {
        this.emailNotificationService = emailNotificationService;
    }

    @GetMapping
    public ResponseEntity<?> getAllTasks(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String search) {

        // ── Command Palette full-text search ─────────────────────────────────
        if (search != null && !search.isBlank()) {
            Pageable pageable = PageRequest.of(
                    page != null ? page : 0,
                    size != null ? size : 10,
                    Sort.by("id").descending());
            return ResponseEntity.ok(taskRepository.searchAll(search.trim(), pageable));
        }

        if (page == null && size == null) {
            return ResponseEntity.ok(taskRepository.findAllOptimized());
        }

        Pageable pageable = PageRequest.of(page != null ? page : 0, size != null ? size : 10, Sort.by("id").descending());
        if(status!=null && !status.isBlank() && priority!=null && !priority.isBlank()) {
        	return ResponseEntity.ok(taskRepository.findAllOptimizedByStatusAndPriority(List.of(status), priority, pageable));
        }
        else if(status!=null && !status.isBlank()) {
        	return ResponseEntity.ok(taskRepository.findAllOptimizedByStatusIn(List.of(status), pageable));
        }
        else if(priority!=null && !priority.isBlank()) {
        	return ResponseEntity.ok(taskRepository.findAllOptimizedByPriority(priority, pageable));
        }
        else {
            return ResponseEntity.ok(taskRepository.findAllOptimizedByStatusNotIn(List.of("CLOSED","PROD_COMPLETED"), pageable));
        }

    }
    
    @GetMapping("/download-tasks")
    public Page<Task> downloadTasks(@RequestParam(required = false) String status, 
            @RequestParam(required = false) String priority) {
    	
        if(status!=null && !status.isBlank() && priority!=null && !priority.isBlank()) {
        	return taskRepository.findAllOptimizedByStatusAndPriority(List.of(status), priority, null);
        }
        else if(status!=null && !status.isBlank()) {
        	return taskRepository.findAllOptimizedByStatusIn(List.of(status), null);
        }
        else if(priority!=null && !priority.isBlank()) {
        	return taskRepository.findAllOptimizedByPriority(priority, null);
        }
        else {
            return taskRepository.findAllOptimizedByStatusNotIn(List.of("CLOSED","PROD_COMPLETED"), null);
        }
        
    }

    @GetMapping("/my")
    public Page<Task> getMyTasks(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String status, @RequestParam(required = false) String priority) {
    	
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        
        if(status!=null && !status.isBlank() && priority!=null && !priority.isBlank()) {
        	return taskRepository.findAllOptimizedByDeveloperAndStatusAndPriority(user.getId(), List.of(status), priority, pageable);
        }
        else if(status!=null && !status.isBlank()) {
        	return taskRepository.findAllOptimizedByAssignedDeveloperIdAndStatusIn(user.getId(), List.of(status), pageable);
        }
        else if(priority!=null && !priority.isBlank()) {
        	return taskRepository.findAllOptimizedByDeveloperAndPriority(user.getId(), priority, pageable);
        } else {
            return taskRepository.findAllOptimizedByAssignedDeveloperIdAndStatusNot(user.getId(), List.of("CLOSED","PROD_COMPLETED"), pageable);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Task> getTaskById(@PathVariable Long id) {
        return taskRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Task createTask(@RequestBody Task task) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();
        
        if (task.getTitle() == null || task.getTitle().trim().isEmpty()) {
            throw new RuntimeException("Title is mandatory.");
        }
        if (task.getDescription() == null || task.getDescription().trim().isEmpty()) {
            throw new RuntimeException("Description is mandatory.");
        }

        if(task.getWorkflow()==null) {
        	throw new RuntimeException("Workflow is mandatory");
        }
        
        if (task.getCreatedBy() == null) {
            task.setCreatedBy(currentUser);
        }
        
        // Refined Assignment Logic:
        // 1. If a DEVELOPER creates a task and it's unassigned, auto-assign to them.
        // 2. If an ADMIN creates a task, keep it as they provided (unassigned or specific dev).
        if (task.getAssignedDeveloper() == null) {
            boolean isDeveloper = currentUser.getRoles().contains(Role.DEVELOPER);
            boolean isAdmin = currentUser.getRoles().contains(Role.DEVADMIN) || currentUser.getRoles().contains(Role.TESTADMIN);
            
            if (isDeveloper && !isAdmin) {
                task.setAssignedDeveloper(currentUser);
            }
        }
        
        if (task.getDevelopers() != null) {
            for (TaskDeveloper td : task.getDevelopers()) {
                td.setTask(task);
            }
        }

        Task savedTask;
        if (task.getWorkflow() != null) {
            savedTask = taskRepository.save(task);
            workflowExecutionService.initializeWorkflow(savedTask.getId(), task.getWorkflow().getId());
        } else {
            if (task.getStatus() == null) {
                task.setStatus("OPEN");
            }
            savedTask = taskRepository.save(task);
        }
        
        notifyAllDevelopersAndTester(savedTask, "New CR Created: " + savedTask.getJtrackId(), 
            "Change Request (CR) '" + savedTask.getTitle() + "' has been successfully created and assigned.");
            
        return savedTask;
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTask(@PathVariable Long id, @RequestBody Task taskDetails) {
    	log.info("Inside Update task");
        return taskRepository.findById(id)
                .map(task -> {
                    String oldStatus = task.getStatus();
                    
                    if ("CLOSED".equals(oldStatus)) {
                        return ResponseEntity.status(403).body("This task is in a terminal state (CLOSED) and cannot be updated.");
                    }
                    
                    // Restriction: Only assigned developer can update, UNLESS it's a Code Review or Admin override
                    if (task.getAssignedDeveloper() != null) {
                        String username = SecurityContextHolder.getContext().getAuthentication().getName();
                        String roles = SecurityContextHolder.getContext().getAuthentication().getAuthorities().toString();
                        boolean isReviewer = roles.contains("ROLE_CODEREVIEWER");
                        boolean isAdmin = roles.contains("ROLE_DEVADMIN");
                        
                        if (!task.getAssignedDeveloper().getUsername().equals(username) && !isReviewer && !isAdmin) {
                            return ResponseEntity.status(403).body("Only the assigned developer (" + task.getAssignedDeveloper().getFullName() + ") can update this task.");
                        }

                        // Developers can test and complete SIT. Block only for Code Review, UAT, Testing, or terminal phases
                        boolean isDeveloperBlocked = task.getStatus().equals("CODE_REVIEW") || 
                                                     task.getStatus().equals("CODE_REVIEW_DONE") ||
                                                     task.getStatus().contains("UAT") ||
                                                     task.getStatus().equals("TESTING_IN_PROGRESS") ||
                                                     task.getStatus().equals("TESTING_COMPLETED") ||
                                                     task.getStatus().equals("PROD_DEPLOYED") ||
                                                     task.getStatus().equals("CLOSED");
                        
                        // Exemption: developer is allowed to move from CODE_REVIEW_DONE to MOVE_TO_UAT, from MOVE_TO_UAT to TESTING_POOL, and from BUG_FOUND to TESTING_IN_PROGRESS
                        if (task.getStatus().equals("CODE_REVIEW_DONE") && "MOVE_TO_UAT".equals(taskDetails.getStatus())) {
                            isDeveloperBlocked = false;
                        }
                        if (task.getStatus().equals("MOVE_TO_UAT") && "TESTING_POOL".equals(taskDetails.getStatus())) {
                            isDeveloperBlocked = false;
                        }
                        if (task.getStatus().equals("BUG_FOUND") && "TESTING_IN_PROGRESS".equals(taskDetails.getStatus())) {
                            isDeveloperBlocked = false;
                        }
                        
                        if (isDeveloperBlocked && 
                            !isAdmin && !roles.contains("ROLE_TESTER") && !roles.contains("ROLE_CODEREVIEWER")) {
                            return ResponseEntity.status(403).body("This task is currently in testing/review phase and cannot be updated by developers.");
                        }
                    }

                    // Mandatory Date Validations based on selected status (Only for DEPLOYED/MOVE_TO_UAT)
                    String currentTargetStatus = taskDetails.getStatus() != null ? taskDetails.getStatus() : task.getStatus();
                    
                    // Auto-populate status dates to today's date if transitioning and null
                    if (currentTargetStatus.equals("IN_PROGRESS") && taskDetails.getDevStartDate() == null && task.getDevStartDate() == null) {
                        taskDetails.setDevStartDate(LocalDate.now());
                    }
                    if (currentTargetStatus.equals("SIT_DEPLOYED") && taskDetails.getSitDate() == null && task.getSitDate() == null) {
                        taskDetails.setSitDate(LocalDate.now());
                    }
                    if (currentTargetStatus.equals("MOVE_TO_UAT") && taskDetails.getUatDate() == null && task.getUatDate() == null) {
                        taskDetails.setUatDate(LocalDate.now());
                    }
                    if (currentTargetStatus.equals("PROD_DEPLOYED") && taskDetails.getProductionDate() == null && task.getProductionDate() == null) {
                        taskDetails.setProductionDate(LocalDate.now());
                    }

                    if (currentTargetStatus.equals("IN_PROGRESS") && taskDetails.getDevStartDate() == null && task.getDevStartDate() == null) {
                        return ResponseEntity.badRequest().body("Dev Start Date is mandatory for IN_PROGRESS status.");
                    }
                    if (currentTargetStatus.equals("SIT_DEPLOYED") && taskDetails.getSitDate() == null && task.getSitDate() == null) {
                        return ResponseEntity.badRequest().body("SIT Date is mandatory for SIT_DEPLOYED status.");
                    }
                    if (currentTargetStatus.equals("MOVE_TO_UAT") && taskDetails.getUatDate() == null && task.getUatDate() == null) {
                        return ResponseEntity.badRequest().body("UAT Date is mandatory for MOVE_TO_UAT status.");
                    }
                    if (currentTargetStatus.equals("PROD_DEPLOYED") && taskDetails.getProductionDate() == null && task.getProductionDate() == null) {
                        return ResponseEntity.badRequest().body("Production Date is mandatory for PROD_DEPLOYED status.");
                    }
                    
                    if (currentTargetStatus.equals("CODE_REVIEW")) {
                        String gitLinks = taskDetails.getGitLinks() != null ? taskDetails.getGitLinks() : task.getGitLinks();
                        if (gitLinks == null || gitLinks.trim().isEmpty()) {
                            return ResponseEntity.badRequest().body("Git Links are mandatory for CODE_REVIEW status.");
                        }
                    }

                    if (taskDetails.getStatus() != null && !task.getStatus().equals(taskDetails.getStatus())) {
                        if (taskDetails.getRemarks() == null || taskDetails.getRemarks().trim().isEmpty()) {
                            return ResponseEntity.badRequest().body("Updating Remarks are mandatory for all status changes.");
                        }
                        task.setStatus(taskDetails.getStatus());
                        workflowExecutionService.syncWorkflowMapWithStatus(task.getId(), taskDetails.getStatus());
                        if ("BUG_FOUND".equals(taskDetails.getStatus())) {
                            task.setTotalRetests((task.getTotalRetests() != null ? task.getTotalRetests() : 0) + 1);
                        }
                        if ("CHANGES_REQUESTED".equals(taskDetails.getStatus())) {
                            task.setChangesRequested(true);
                        } else if (task.isChangesRequested()) {
                            task.setChangesRequested(false);
                        }

                        // Auto-complete linked Sprint Tasks on PROD_DEPLOYED status transition
                        if ("PROD_DEPLOYED".equals(taskDetails.getStatus())) {
                            if (task.getSprintTasks() != null) {
                                for (com.devtrack.api.model.SprintTask st : task.getSprintTasks()) {
                                    if ("COMPLETE_AFTER_PROD".equals(st.getCompletionRule()) && !"COMPLETED".equals(st.getStatus())) {
                                        try {
                                            sprintTaskService.completeSprintTask(st.getId());
                                        } catch (Exception ex) {
                                            log.warn("Failed to auto-complete sprint task {} on PROD_DEPLOYED: {}", st.getTaskCode(), ex.getMessage());
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (taskDetails.getTitle() != null) {
                        task.setTitle(taskDetails.getTitle());
                    }
                    if (taskDetails.getDescription() != null) {
                        task.setDescription(taskDetails.getDescription());
                    }
                    if (taskDetails.getPriority() != null) {
                        task.setPriority(taskDetails.getPriority());
                    }
                    if (taskDetails.getType() != null) {
                        task.setType(taskDetails.getType());
                    }
                    if (taskDetails.getBranchName() != null) {
                        task.setBranchName(taskDetails.getBranchName());
                    }
                    if (taskDetails.getBrdDocumentId() != null) {
                        task.setBrdDocumentId(taskDetails.getBrdDocumentId());
                    }
                    // jtrackId is immutable once created
                    if (taskDetails.getPds() != null) {
                        task.setPds(taskDetails.getPds());
                    }
                    if (taskDetails.getGitLinks() != null) {
                        task.setGitLinks(taskDetails.getGitLinks());
                    }
                    if (taskDetails.getCodeReviewComments() != null) {
                        task.setCodeReviewComments(taskDetails.getCodeReviewComments());
                    }
                    // Persist unit testing document if provided
                    if (taskDetails.getUnitTestDocUrl() != null) {
                        task.setUnitTestDocUrl(taskDetails.getUnitTestDocUrl());
                    }
                    if (taskDetails.getUnitTestDocName() != null) {
                        task.setUnitTestDocName(taskDetails.getUnitTestDocName());
                    }
                    // Allow clearing the unit test document (e.g. empty string to remove)
                    if ("".equals(taskDetails.getUnitTestDocUrl())) {
                        task.setUnitTestDocUrl(null);
                        task.setUnitTestDocName(null);
                    }

                    
                    if (taskDetails.getDevStartDate() != null) {
                        task.setDevStartDate(taskDetails.getDevStartDate());
                    }
                    if (taskDetails.getSitDate() != null) {
                        task.setSitDate(taskDetails.getSitDate());
                    }
                    if (taskDetails.getUatDate() != null) {
                        task.setUatDate(taskDetails.getUatDate());
                    }
                    if (taskDetails.getPreprodDate() != null) {
                        task.setPreprodDate(taskDetails.getPreprodDate());
                    }
                    if (taskDetails.getProductionDate() != null) {
                        task.setProductionDate(taskDetails.getProductionDate());
                    }
                    
                    if (taskDetails.getAssignedDeveloper() != null) {
                        task.setAssignedDeveloper(taskDetails.getAssignedDeveloper());
                        // If assigned manually, remove from pool
                        if (task.isInPool()) {
                            task.setInPool(false);
                            task.setInPoolDate(null);
                        }
                    }

                    if (taskDetails.getWorkflow() != null) {
                        task.setWorkflow(taskDetails.getWorkflow());
                    }

                    if (taskDetails.getDevelopers() != null) {
                        task.getDevelopers().clear();
                        for (TaskDeveloper td : taskDetails.getDevelopers()) {
                            td.setTask(task);
                            task.getDevelopers().add(td);
                        }
                    }
                    
                    String username = SecurityContextHolder.getContext().getAuthentication().getName();
                    User currentUser = userRepository.findByUsername(username).orElseThrow();
                    
                    // Simple audit logging for status change
                    if (taskDetails.getStatus() != null && !taskDetails.getStatus().equals(oldStatus)) {
                        AuditLog log = new AuditLog();
                        log.setEntityType("TASK");
                        log.setEntityId(task.getId());
                        log.setFieldName("status");
                        log.setOldValue(oldStatus);
                        log.setNewValue(task.getStatus());
                        log.setRemarks(taskDetails.getRemarks());
                        log.setChangedBy(currentUser);
                        com.devtrack.api.services.AuditLogHelper.enrich(log);
                        auditLogRepository.save(log);
                    }
                    
                    Task saved = taskRepository.save(task);

                    if (taskDetails.getStatus() != null && !taskDetails.getStatus().equals(oldStatus)) {
                        notifyAllDevelopersAndTester(saved, saved.getJtrackId() + " Status Updated",
                            "Status changed from " + oldStatus + " to " + saved.getStatus() + " by " + currentUser.getFullName() + ". Remarks: " + taskDetails.getRemarks());
                        
                        if ("CODE_REVIEW".equalsIgnoreCase(saved.getStatus())) {
                            try {
                                emailNotificationService.sendMailOnCodeReview(saved, taskDetails.getRemarks() != null ? taskDetails.getRemarks() : "Sent to Code Review");
                            } catch (Exception e) {
                                log.error("Failed to send Code Review mail", e);
                            }
                        }

                        try {
                            String triggeredEvent = "BUG_FOUND".equals(saved.getStatus()) ? "RETEST_RECORDED" : "STATUS_UPDATED";
                            qualityRiskService.evaluateCrRisk(saved.getId(), triggeredEvent);
                        } catch (Exception e) {
                            log.error("Failed to evaluate CR risk in updateTask status transition", e);
                        }
                    }
                    
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/sprint")
    public ResponseEntity<?> assignTaskToSprint(@PathVariable Long id, @RequestBody java.util.Map<String, Object> payload) {
        return taskRepository.findById(id)
                .map(task -> {
                    Object sprintVal = payload.get("sprintId");
                    Long sprintId = null;
                    if (sprintVal != null) {
                        sprintId = Long.valueOf(sprintVal.toString());
                    }
                    task.setSprintId(sprintId);
                    task.setUpdatedDate(LocalDateTime.now());
                    
                    // Audit log for sprint update
                    String username = SecurityContextHolder.getContext().getAuthentication().getName();
                    User currentUser = userRepository.findByUsername(username).orElseThrow();
                    AuditLog log = new AuditLog();
                    log.setEntityType("TASK");
                    log.setEntityId(task.getId());
                    log.setFieldName("sprintId");
                    log.setOldValue(task.getSprintId() != null ? String.valueOf(task.getSprintId()) : "None");
                    log.setNewValue(sprintId != null ? String.valueOf(sprintId) : "None");
                    log.setRemarks("Updated sprint assignment to: " + (sprintId != null ? sprintId : "Backlog"));
                    log.setChangedBy(currentUser);
                    com.devtrack.api.services.AuditLogHelper.enrich(log);
                    auditLogRepository.save(log);

                    return ResponseEntity.ok(taskRepository.save(task));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/assign-tester")
    public ResponseEntity<?> assignTester(@PathVariable Long id) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();
        
        int updatedCount = taskRepository.assignTesterAtomically(id, currentUser);
        if (updatedCount == 0) {
            return ResponseEntity.badRequest().body("Assign to Me failed: CR is already assigned or not in the Testing Pool.");
        }
        
        Task task = taskRepository.findById(id).orElseThrow();
        
        // Create Audit Log
        AuditLog auditLogObj = new AuditLog();
        auditLogObj.setEntityType("TASK");
        auditLogObj.setEntityId(task.getId());
        auditLogObj.setFieldName("tester");
        auditLogObj.setOldValue(null);
        auditLogObj.setNewValue(currentUser.getFullName());
        auditLogObj.setRemarks("Tester self-assigned from pool.");
        auditLogObj.setChangedBy(currentUser);
        com.devtrack.api.services.AuditLogHelper.enrich(auditLogObj);
        auditLogRepository.save(auditLogObj);

        // Status change audit log
        AuditLog statusLog = new AuditLog();
        statusLog.setEntityType("TASK");
        statusLog.setEntityId(task.getId());
        statusLog.setFieldName("status");
        statusLog.setOldValue("TESTING_POOL");
        statusLog.setNewValue("TESTING_IN_PROGRESS");
        statusLog.setRemarks("Status changed to Testing In Progress on tester assignment.");
        statusLog.setChangedBy(currentUser);
        com.devtrack.api.services.AuditLogHelper.enrich(statusLog);
        auditLogRepository.save(statusLog);

        notifyAllDevelopersAndTester(task, "Tester Assigned to " + task.getJtrackId(),
            "Tester " + currentUser.getFullName() + " has self-assigned and started testing for " + task.getJtrackId() + ".");

        try {
            emailNotificationService.sendMailForUatTesting(task, "Tester self-assigned: " + currentUser.getFullName(), currentUser);
        } catch (Exception e) {
            System.err.println("Failed to send assignment mail: " + e.getMessage());
        }
             
        return ResponseEntity.ok(task);
    }

    @PostMapping("/{id}/reassign-tester")
    @PreAuthorize("hasAnyRole('ROLE_DEVADMIN', 'ROLE_TESTADMIN')")
    public ResponseEntity<?> reassignTester(@PathVariable Long id, @RequestBody java.util.Map<String, String> payload) {
        String newTesterUsername = payload.get("newTesterUsername");
        String reason = payload.get("reason");
        
        if (reason == null || reason.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Reassignment reason is mandatory.");
        }
        if (newTesterUsername == null || newTesterUsername.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("New tester username is mandatory.");
        }
        
        String adminUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User adminUser = userRepository.findByUsername(adminUsername).orElseThrow();
        User newTester = userRepository.findByUsername(newTesterUsername)
                .orElseThrow(() -> new IllegalArgumentException("Tester not found with username: " + newTesterUsername));
        
        return taskRepository.findById(id)
                .map(task -> {
                    User oldTester = task.getTester();
                    
                    task.setPreviousTester(oldTester);
                    task.setTester(newTester);
                    task.setReassignedBy(adminUser);
                    task.setReassignmentDate(LocalDateTime.now());
                    task.setReassignmentReason(reason);
                    task.setStatus("TESTING_IN_PROGRESS");
                    task.setUpdatedDate(LocalDateTime.now());
                    
                    Task saved = taskRepository.save(task);
                    
                    // Audit log for tester reassignment
                    AuditLog reassignLog = new AuditLog();
                    reassignLog.setEntityType("TASK");
                    reassignLog.setEntityId(task.getId());
                    reassignLog.setFieldName("tester");
                    reassignLog.setOldValue(oldTester != null ? oldTester.getFullName() : "None");
                    reassignLog.setNewValue(newTester.getFullName());
                    reassignLog.setRemarks("Admin reassigned tester. Reason: " + reason);
                    reassignLog.setChangedBy(adminUser);
                    com.devtrack.api.services.AuditLogHelper.enrich(reassignLog);
                    auditLogRepository.save(reassignLog);
                    
                    notifyAllDevelopersAndTester(saved, "Tester Reassigned for " + saved.getJtrackId(),
                        saved.getJtrackId() + " has been reassigned to tester " + newTester.getFullName() + 
                        " by admin " + adminUser.getFullName() + ". Reason: " + reason);
                    
                    if (oldTester != null) {
                        createAndPushNotification(oldTester.getId(), "Tester Unassigned from " + saved.getJtrackId(),
                            "You have been unassigned from " + saved.getJtrackId() + " by Admin " + adminUser.getFullName() + ".");
                    }
                    createAndPushNotification(newTester.getId(), "Tester Assigned to " + saved.getJtrackId(),
                        "You have been assigned to " + saved.getJtrackId() + " by Admin " + adminUser.getFullName() + ". Reason: " + reason);

                    try {
                        emailNotificationService.sendMailForUatTesting(saved, "Reassigned to " + newTester.getFullName() + " by Admin. Reason: " + reason, adminUser);
                    } catch (Exception e) {
                        System.err.println("Failed to send reassignment mail: " + e.getMessage());
                    }
                    
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/complete-testing")
    public ResponseEntity<?> completeTesting(@PathVariable Long id, @RequestBody java.util.Map<String, String> payload) {
        String comments = payload.get("comments");
        String remarks = payload.get("remarks");
        
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();
        
        return taskRepository.findById(id)
                .map(task -> {
                    String oldStatus = task.getStatus();
                    
                    task.setStatus("TESTING_COMPLETED");
                    task.setTestingCompletedDate(LocalDateTime.now());
                    task.setTestingComments(comments);
                    task.setUpdatedDate(LocalDateTime.now());
                    
                    // Calculate duration
                    if (task.getTestingStartedDate() != null) {
                        java.time.Duration duration = java.time.Duration.between(task.getTestingStartedDate(), LocalDateTime.now()).abs();
                        long hours = duration.toHours();
                        long minutes = duration.toMinutesPart();
                        task.setTestingDuration(hours + "h " + minutes + "m");
                    } else {
                        task.setTestingDuration("0h");
                    }
                    
                    Task saved = taskRepository.save(task);
                    
                    // Audit log for status completion
                    AuditLog completeLog = new AuditLog();
                    completeLog.setEntityType("TASK");
                    completeLog.setEntityId(task.getId());
                    completeLog.setFieldName("status");
                    completeLog.setOldValue(oldStatus);
                    completeLog.setNewValue("TESTING_COMPLETED");
                    completeLog.setRemarks(remarks != null ? remarks : "Testing completed successfully.");
                    completeLog.setChangedBy(currentUser);
                    com.devtrack.api.services.AuditLogHelper.enrich(completeLog);
                    auditLogRepository.save(completeLog);
                    
                    notifyAllDevelopersAndTester(saved, "Testing Passed for " + saved.getJtrackId(),
                        saved.getJtrackId() + " testing has passed successfully. Remarks: " + comments);
                    
                    try {
                        emailNotificationService.sendMailOnUATTestingComplete(saved, comments, currentUser);
                    } catch (Exception e) {
                        System.err.println("Failed to send test complete mail: " + e.getMessage());
                    }
                    
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportTasksToExcel() {
        List<Task> tasks = taskRepository.findAll();
        
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Tasks");
            
            // Create Header
            Row headerRow = sheet.createRow(0);
            String[] columns = {"ID", "Jtrack ID", "Title", "Type", "Status", "Priority", "Assignee", "Branch", "PDs", "Created Date", "Dev Start", "SIT Date", "UAT Date", "Preprod", "Prod"};
            
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }
            
            // Fill Data
            int rowIdx = 1;
            for (Task task : tasks) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(task.getId());
                row.createCell(1).setCellValue(task.getJtrackId() != null ? task.getJtrackId() : "");
                row.createCell(2).setCellValue(task.getTitle() != null ? task.getTitle() : "");
                row.createCell(3).setCellValue(task.getType() != null ? task.getType().getName() : "");
                row.createCell(4).setCellValue(task.getStatus() != null ? task.getStatus() : "");
                row.createCell(5).setCellValue(task.getPriority() != null ? task.getPriority() : "");
                row.createCell(6).setCellValue(task.getAssignedDeveloper() != null ? task.getAssignedDeveloper().getFullName() : "Unassigned");
                row.createCell(7).setCellValue(task.getBranchName() != null ? task.getBranchName() : "");
                row.createCell(8).setCellValue(task.getPds() != null ? task.getPds() : "");
                row.createCell(9).setCellValue(task.getCreatedDate() != null ? task.getCreatedDate().toString() : "");
                row.createCell(10).setCellValue(task.getDevStartDate() != null ? task.getDevStartDate().toString() : "");
                row.createCell(11).setCellValue(task.getSitDate() != null ? task.getSitDate().toString() : "");
                row.createCell(12).setCellValue(task.getUatDate() != null ? task.getUatDate().toString() : "");
                row.createCell(13).setCellValue(task.getPreprodDate() != null ? task.getPreprodDate().toString() : "");
                row.createCell(14).setCellValue(task.getProductionDate() != null ? task.getProductionDate().toString() : "");
            }
            
            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }
            
            workbook.write(out);
            byte[] bytes = out.toByteArray();
            
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=tasks.xlsx")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(bytes);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('DEVADMIN', 'DEVELOPER')")
    public ResponseEntity<?> deleteTask(@PathVariable Long id, @RequestParam(value = "remarks", required = false) String remarks) {
        if (remarks == null || remarks.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Remarks are mandatory for deleting a CR.");
        }
        
        return taskRepository.findById(id)
                .map(task -> {
                    // Write audit log for deletion before deleting the task
                    String username = SecurityContextHolder.getContext().getAuthentication().getName();
                    User currentUser = userRepository.findByUsername(username).orElseThrow();
                    
                    AuditLog deleteLog = new AuditLog();
                    deleteLog.setEntityType("TASK_DELETED");
                    deleteLog.setEntityId(task.getId());
                    deleteLog.setFieldName("task");
                    deleteLog.setOldValue(task.getJtrackId());
                    deleteLog.setNewValue("DELETED");
                    deleteLog.setRemarks("Deleted CR: " + task.getJtrackId() + " (" + task.getTitle() + "). Remarks: " + remarks);
                    deleteLog.setChangedBy(currentUser);
                    com.devtrack.api.services.AuditLogHelper.enrich(deleteLog);
                    auditLogRepository.save(deleteLog);

                    // Notify Developer and Tester of deletion
                    notifyAllDevelopersAndTester(task, task.getJtrackId() + " Deleted",
                        "CR '" + task.getTitle() + "' has been deleted by " + currentUser.getFullName() + ". Remarks: " + remarks);

                    // 1. Delete associated TaskWorkflowMap records
                    List<TaskWorkflowMap> workflowMaps = taskWorkflowMapRepository.findByTaskId(id);
                    taskWorkflowMapRepository.deleteAll(workflowMaps);
                    
                    // 2. Delete associated AuditLog records (entityType = "TASK")
                    List<AuditLog> auditLogs = auditLogRepository.findAll().stream()
                            .filter(log -> log.getEntityId().equals(id) && "TASK".equals(log.getEntityType()))
                            .toList();
                    auditLogRepository.deleteAll(auditLogs);
                    
                    // 3. Delete associated Comment records
                    List<com.devtrack.api.model.Comment> comments = commentRepository.findAll().stream()
                            .filter(c -> c.getEntityId().equals(id) && "TASK".equals(c.getEntityType()))
                            .toList();
                    commentRepository.deleteAll(comments);
                    
                    // 4. Delete associated Attachment records
                    List<Attachment> attachments = attachmentRepository.findAll().stream()
                            .filter(a -> a.getEntityId().equals(id) && "TASK".equals(a.getEntityType()))
                            .toList();
                    attachmentRepository.deleteAll(attachments);

                    // Finally, delete the task itself
                    taskRepository.delete(task);
                    
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // UAT and Pool Endpoints
    @PostMapping("/{id}/push-to-pool")
    @PreAuthorize("hasRole('DEVADMIN')")
    public ResponseEntity<?> pushToPool(@PathVariable Long id) {
        return taskRepository.findById(id)
                .map(task -> {
                    if (task.getAssignedDeveloper() != null) {
                        return ResponseEntity.badRequest().body("Assigned tasks cannot be pushed to pool.");
                    }
                    task.setInPool(true);
                    task.setInPoolDate(java.time.LocalDateTime.now());
                    return ResponseEntity.ok(taskRepository.save(task));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/pick-from-pool")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'DEVADMIN')")
    public ResponseEntity<?> pickFromPool(@PathVariable Long id) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();
        return taskRepository.findById(id)
                .map(task -> {
                    if (!task.isInPool()) {
                        return ResponseEntity.badRequest().body("Task is not in the pool.");
                    }
                    task.setInPool(false);
                    task.setAssignedDeveloper(currentUser);
                    return ResponseEntity.ok(taskRepository.save(task));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/pick-for-sit")
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN')")
    public ResponseEntity<?> pickForSit(@PathVariable Long id) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();
        return taskRepository.findById(id)
                .map(task -> {
                    if (task.getTester() != null) {
                        return ResponseEntity.badRequest().body("Task is already being tested.");
                    }
                    task.setTester(currentUser);
                    return ResponseEntity.ok(taskRepository.save(task));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/approve-sit")
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN')")
    public ResponseEntity<?> approveSit(@PathVariable Long id, @RequestBody Task taskDetails) {
        return taskRepository.findById(id).map(task -> {
            if (taskDetails.getRemarks() == null || taskDetails.getRemarks().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Remarks are mandatory for approval.");
            }
            // Update SIT Date if provided during approval (optional during testing phase)
            if (taskDetails.getSitDate() != null) {
                task.setSitDate(taskDetails.getSitDate());
            }
            String oldStatus = task.getStatus();
            if (task.getWorkflow() != null) {
                workflowExecutionService.approveStep(id);
            } else {
                String newStatus = configRepository.findByConfigKey("STATUS_SIT_COMPLETED")
                        .map(AppConfig::getConfigValue).orElse("SIT_COMPLETED");
                task.setStatus(newStatus);
            }
            task.setTester(null);
            task.setRemarks(taskDetails.getRemarks());
            
            AuditLog log = new AuditLog();
            log.setEntityType("TASK");
            log.setEntityId(task.getId());
            log.setFieldName("status");
            log.setOldValue(oldStatus);
            log.setNewValue(taskRepository.findById(id).get().getStatus());
            log.setRemarks(taskDetails.getRemarks());
            log.setChangedBy(userRepository.findByUsername(SecurityContextHolder.getContext().getAuthentication().getName()).orElseThrow());
            auditLogRepository.save(log);
            
            return ResponseEntity.ok(taskRepository.save(task));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/reject-sit")
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN')")
    public ResponseEntity<?> rejectSit(@PathVariable Long id, @RequestBody Task taskDetails) {
        return taskRepository.findById(id).map(task -> {
            if (taskDetails.getRemarks() == null || taskDetails.getRemarks().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Remarks are mandatory for rejection.");
            }
            String oldStatus = task.getStatus();
            if (task.getWorkflow() != null) {
                workflowExecutionService.rejectStep(id);
            } else {
                task.setStatus("IN_PROGRESS");
            }
            task.setTester(null);
            task.setRemarks(taskDetails.getRemarks());
            
            AuditLog log = new AuditLog();
            log.setEntityType("TASK");
            log.setEntityId(task.getId());
            log.setFieldName("status");
            log.setOldValue(oldStatus);
            log.setNewValue(taskRepository.findById(id).get().getStatus());
            log.setRemarks(taskDetails.getRemarks());
            log.setChangedBy(userRepository.findByUsername(SecurityContextHolder.getContext().getAuthentication().getName()).orElseThrow());
            auditLogRepository.save(log);
            
            task.setTotalRetests((task.getTotalRetests() != null ? task.getTotalRetests() : 0) + 1);
            Task saved = taskRepository.save(task);
            try {
                qualityRiskService.evaluateCrRisk(saved.getId(), "RETEST_RECORDED");
            } catch (Exception e) {
                TaskController.log.error("Failed to evaluate CR risk in rejectSit", e);
            }
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/pick-for-uat")
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN')")
    public ResponseEntity<?> pickForUat(@PathVariable Long id) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username).orElseThrow();
        return taskRepository.findById(id)
                .map(task -> {
                    if (task.getTester() != null) {
                        return ResponseEntity.badRequest().body("Task is already being tested.");
                    }
                    task.setTester(currentUser);
                    return ResponseEntity.ok(taskRepository.save(task));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/approve-uat")
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN')")
    public ResponseEntity<?> approveUat(@PathVariable Long id, @RequestBody Task taskDetails) {
        return taskRepository.findById(id).map(task -> {
            if (taskDetails.getRemarks() == null || taskDetails.getRemarks().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Remarks are mandatory for approval.");
            }
            // Update UAT Date if provided during approval (optional during testing phase)
            if (taskDetails.getUatDate() != null) {
                task.setUatDate(taskDetails.getUatDate());
            }
            String oldStatus = task.getStatus();
            if (task.getWorkflow() != null) {
                workflowExecutionService.approveStep(id);
            } else {
                String newStatus = configRepository.findByConfigKey("STATUS_UAT_COMPLETED")
                        .map(AppConfig::getConfigValue).orElse("UAT_COMPLETED");
                task.setStatus(newStatus);
            }
            task.setTester(null);
            task.setRemarks(taskDetails.getRemarks());
            
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            User currentUser = userRepository.findByUsername(username).orElseThrow();
            
            AuditLog log = new AuditLog();
            log.setEntityType("TASK");
            log.setEntityId(task.getId());
            log.setFieldName("status");
            log.setOldValue(oldStatus);
            log.setNewValue(taskRepository.findById(id).get().getStatus());
            log.setRemarks(taskDetails.getRemarks());
            log.setChangedBy(currentUser);
            auditLogRepository.save(log);
            
            emailNotificationService.sendMailOnUATTestingComplete(task, taskDetails.getRemarks(), currentUser);
            
            return ResponseEntity.ok(taskRepository.save(task));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/reject-uat")
    @PreAuthorize("hasAnyRole('TESTER', 'TESTADMIN')")
    public ResponseEntity<?> rejectUat(@PathVariable Long id, @RequestBody Task taskDetails) {
        return taskRepository.findById(id).map(task -> {
            if (taskDetails.getRemarks() == null || taskDetails.getRemarks().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Remarks are mandatory for rejection.");
            }
            String oldStatus = task.getStatus();
            if (task.getWorkflow() != null) {
                workflowExecutionService.rejectStep(id);
            } else {
                String newStatus = configRepository.findByConfigKey("STATUS_REJECTED")
                        .map(AppConfig::getConfigValue).orElse("IN_PROGRESS");
                task.setStatus(newStatus);
            }
            task.setTester(null);
            task.setRemarks(taskDetails.getRemarks());
            
            AuditLog log = new AuditLog();
            log.setEntityType("TASK");
            log.setEntityId(task.getId());
            log.setFieldName("status");
            log.setOldValue(oldStatus);
            log.setNewValue(taskRepository.findById(id).get().getStatus());
            log.setRemarks(taskDetails.getRemarks());
            log.setChangedBy(userRepository.findByUsername(SecurityContextHolder.getContext().getAuthentication().getName()).orElseThrow());
            auditLogRepository.save(log);
            
            task.setTotalRetests((task.getTotalRetests() != null ? task.getTotalRetests() : 0) + 1);
            Task saved = taskRepository.save(task);
            try {
                qualityRiskService.evaluateCrRisk(saved.getId(), "RETEST_RECORDED");
            } catch (Exception e) {
                TaskController.log.error("Failed to evaluate CR risk in rejectUat", e);
            }
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/current-step")
    public ResponseEntity<TaskWorkflowMap> getCurrentStep(@PathVariable Long id) {
        TaskWorkflowMap step = workflowExecutionService.getCurrentStep(id);
        if (step != null) {
            return ResponseEntity.ok(step);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/{id}/steps")
    public ResponseEntity<List<WorkflowStep>> getTaskSteps(@PathVariable Long id) {
        List<TaskWorkflowMap> maps = taskWorkflowMapRepository.findByTaskId(id);
        List<WorkflowStep> steps = maps.stream()
                .sorted(java.util.Comparator.comparing(TaskWorkflowMap::getSequence))
                .map(TaskWorkflowMap::getStep)
                .toList();
        return ResponseEntity.ok(steps);
    }

    // Dynamic Workflow Endpoints
    @GetMapping("/current")
    public List<Task> getTasksByStepType(@RequestParam String type) {
        return taskWorkflowMapRepository.findTasksByStepType(type);
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approveWorkflowStep(@PathVariable Long id, @RequestBody(required = false) Task taskDetails) {
    	log.info("Inside approveWorkflowStep");
        return taskRepository.findById(id).map(task -> {
            TaskWorkflowMap currentStep = workflowExecutionService.getCurrentStep(id);
            if (currentStep == null) return ResponseEntity.badRequest().body("No active workflow step found.");

            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            String roles = SecurityContextHolder.getContext().getAuthentication().getAuthorities().toString();
            boolean isAdmin = roles.contains("ROLE_DEVADMIN") || roles.contains("ROLE_TESTADMIN");
            String nextStage = null;
            
            // RBAC Check
            if (!isAdmin) {
                if ("CODE_REVIEW".equals(currentStep.getStepType()) && !roles.contains("ROLE_CODEREVIEWER")) {
                    return ResponseEntity.status(403).body("Only Code Reviewers can approve this step.");
                }
                if ("TESTING".equals(currentStep.getStepType()) && !roles.contains("ROLE_TESTER")) {
                    return ResponseEntity.status(403).body("Only Testers can approve this step.");
                }
                if ("TASK".equals(currentStep.getStepType()) && task.getAssignedDeveloper() != null) {
                    if (!task.getAssignedDeveloper().getUsername().equals(username)) {
                        return ResponseEntity.status(403).body("Only the assigned developer can approve this task step.");
                    }
                }
            }

            // Date validation for the NEXT status
            // We need to peek at the next step to see what status we are moving into
            List<TaskWorkflowMap> maps = taskWorkflowMapRepository.findByTaskId(id);
            if (!maps.isEmpty()) {
                List<WorkflowStep> steps = maps.stream()
                        .sorted(java.util.Comparator.comparing(TaskWorkflowMap::getSequence))
                        .map(TaskWorkflowMap::getStep)
                        .toList();
                int currentIndex = -1;
                for (int i = 0; i < steps.size(); i++) {
                    if (steps.get(i).getStepName().equals(task.getStatus())) {
                        currentIndex = i;
                        break;
                    }
                }
                
                if (currentIndex != -1 && currentIndex + 1 < steps.size()) {
                    WorkflowStep nextStep = steps.get(currentIndex + 1);
                    String nextStatus = nextStep.getStepName();
                    nextStage = nextStep.getStepName();
                    
                    // Use dates from taskDetails if provided, otherwise from task
                    LocalDate devStartDate = (taskDetails != null && taskDetails.getDevStartDate() != null) ? taskDetails.getDevStartDate() : task.getDevStartDate();
                    LocalDate sitDate = (taskDetails != null && taskDetails.getSitDate() != null) ? taskDetails.getSitDate() : task.getSitDate();
                    LocalDate uatDate = (taskDetails != null && taskDetails.getUatDate() != null) ? taskDetails.getUatDate() : task.getUatDate();
                    LocalDate prodDate = (taskDetails != null && taskDetails.getProductionDate() != null) ? taskDetails.getProductionDate() : task.getProductionDate();

                    if (nextStatus.equals("IN_PROGRESS") && devStartDate == null) {
                        return ResponseEntity.badRequest().body("Dev Start Date is mandatory to move to " + nextStatus);
                    }
                    if (nextStatus.contains("SIT_DEPLOYED") && sitDate == null) {
                        return ResponseEntity.badRequest().body("SIT Date is mandatory to move to " + nextStatus);
                    }
                    if (nextStatus.contains("MOVE_TO_UAT") && uatDate == null) {
                        return ResponseEntity.badRequest().body("UAT Date is mandatory to move to " + nextStatus);
                    }
                    if (nextStatus.contains("PROD_DEPLOYED") && prodDate == null) {
                        return ResponseEntity.badRequest().body("Production Date is mandatory to move to " + nextStatus);
                    }
                    
                    if (nextStatus.equals("CODE_REVIEW")) {
                        String gitLinks = (taskDetails != null && taskDetails.getGitLinks() != null) ? taskDetails.getGitLinks() : task.getGitLinks();
                        if (gitLinks == null || gitLinks.trim().isEmpty()) {
                            return ResponseEntity.badRequest().body("Git Links are mandatory to move to Code Review");
                        }
                    }
                }
            }

            // Persist task details provided during approval
            if (taskDetails != null) {
                if (taskDetails.getDevStartDate() != null) task.setDevStartDate(taskDetails.getDevStartDate());
                if (taskDetails.getSitDate() != null) task.setSitDate(taskDetails.getSitDate());
                if (taskDetails.getUatDate() != null) task.setUatDate(taskDetails.getUatDate());
                if (taskDetails.getProductionDate() != null) task.setProductionDate(taskDetails.getProductionDate());
                if (taskDetails.getPreprodDate() != null) task.setPreprodDate(taskDetails.getPreprodDate());
                if (taskDetails.getGitLinks() != null) task.setGitLinks(taskDetails.getGitLinks());
                if (taskDetails.getAssignedDeveloper() != null) task.setAssignedDeveloper(taskDetails.getAssignedDeveloper());
                
                // Save the task fields before transitioning the workflow step
                taskRepository.save(task);
            }

            String oldStatus = task.getStatus();
            workflowExecutionService.approveStep(id);
            
            // Log Audit
            User currentUser = userRepository.findByUsername(username).orElseThrow();
            log.info("current step , next step {} {}",currentStep.getStepName(),nextStage);
            if( currentStep.getStepName().equalsIgnoreCase("SIT_COMPLETED")) {
            	emailNotificationService.sendMailOnCodeReview(task, taskDetails != null ? taskDetails.getRemarks() : "SIT Completed");
            }
            
            if(currentStep.getStepName().equalsIgnoreCase("CODE_REVIEW"))
            	emailNotificationService.sendMailOnCodeReviewUpdate(task, taskDetails != null ? taskDetails.getRemarks() : "Approved", oldStatus, currentUser);
            
            if(nextStage!=null && nextStage.equalsIgnoreCase("UAT_TESTING")) {
            	emailNotificationService.sendMailForUatTesting(task, taskDetails != null ? taskDetails.getRemarks() : "Sent to UAT", currentUser);
            }
            
            
            AuditLog audit = new AuditLog();
            audit.setEntityType("TASK");
            audit.setEntityId(task.getId());
            audit.setFieldName("workflow_approve");
            audit.setOldValue(oldStatus);
            audit.setNewValue(taskRepository.findById(id).get().getStatus());
            audit.setRemarks(taskDetails != null ? taskDetails.getRemarks() : "Step Approved");
            audit.setChangedBy(currentUser);
            auditLogRepository.save(audit);
            
            Task updatedTask = taskRepository.findById(id).get();
            notifyAllDevelopersAndTester(updatedTask, updatedTask.getJtrackId() + " Step Approved",
                "Code Review Step approved. Status is now " + updatedTask.getStatus() + ". Remarks: " + (taskDetails != null ? taskDetails.getRemarks() : "Approved"));
            
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<?> rejectWorkflowStep(@PathVariable Long id, @RequestBody(required = false) Task taskDetails) {
        return taskRepository.findById(id).map(task -> {
            String oldStatus = task.getStatus();
            workflowExecutionService.rejectStep(id);
            
            task.setStatus("CHANGES_REQUESTED");
            task.setChangesRequested(true);
            task.setTotalRetests((task.getTotalRetests() != null ? task.getTotalRetests() : 0) + 1);
            taskRepository.save(task);
            try {
                qualityRiskService.evaluateCrRisk(task.getId(), "RETEST_RECORDED");
            } catch (Exception e) {
                TaskController.log.error("Failed to evaluate CR risk in rejectWorkflowStep", e);
            }
            
            // Log Audit
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            User currentUser = userRepository.findByUsername(username).orElseThrow();
            AuditLog log = new AuditLog();
            log.setEntityType("TASK");
            log.setEntityId(task.getId());
            log.setFieldName("workflow_reject");
            log.setOldValue(oldStatus);
            log.setNewValue("CHANGES_REQUESTED");
            log.setRemarks(taskDetails != null ? taskDetails.getRemarks() : "Step Rejected");
            log.setChangedBy(currentUser);
            auditLogRepository.save(log);
            
            Task updatedTask = taskRepository.findById(id).get();
            notifyAllDevelopersAndTester(updatedTask, updatedTask.getJtrackId() + " Sent Back by Admin",
                "CR has been sent back by Admin/Reviewer: " + currentUser.getFullName() + ". Remarks: " + (taskDetails != null ? taskDetails.getRemarks() : "Step Rejected"));
            
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
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

    private void notifyAllDevelopersAndTester(Task task, String title, String desc) {
        if (task == null) return;
        if (task.getAssignedDeveloper() != null) {
            createAndPushNotification(task.getAssignedDeveloper().getId(), title, desc);
        }
        if (task.getDevelopers() != null) {
            for (TaskDeveloper td : task.getDevelopers()) {
                if (td.getDeveloper() != null && (task.getAssignedDeveloper() == null || !td.getDeveloper().getId().equals(task.getAssignedDeveloper().getId()))) {
                    createAndPushNotification(td.getDeveloper().getId(), title, desc);
                }
            }
        }
        if (task.getTester() != null) {
            createAndPushNotification(task.getTester().getId(), title, desc);
        }
    }
}
