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

    /**
     * Bug statuses that represent a resolution/terminal outcome. Used for exact-equality
     * checks that drive business state (resolvedDate stamping and recognition awards).
     * Replaces the previous substring .contains("RESOLVED"/"VERIFIED"/"CLOSED") matching,
     * which could be triggered incorrectly by values such as NOT_RESOLVED.
     */
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
            @RequestParam(defaultValue = "10") int