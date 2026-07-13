package com.devtrack.api.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.devtrack.api.dto.BugReviewProposedDto;
import com.devtrack.api.dto.BugRejectionDto;
import com.devtrack.api.model.*;
import com.devtrack.api.repository.*;
import com.devtrack.api.config.NotificationWebSocketHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

@Service
@Slf4j
public class BugValidationService {

    @Autowired
    private BugReviewRepository bugReviewRepository;

    @Autowired
    private BugRejectionRepository bugRejectionRepository;

    @Autowired
    private BugDeveloperFixSummaryRepository bugDeveloperFixSummaryRepository;

    @Autowired
    private BugRepository bugRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private AttachmentRepository attachmentRepository;

    @Autowired
    private WorkflowRepository workflowRepository;

    @Autowired
    private BugWorkflowMapRepository bugWorkflowMapRepository;

    @Autowired
    private com.devtrack.api.repository.ConfigRepository configRepository;

    @Autowired
    private NotificationWebSocketHandler webSocketHandler;

    @Autowired
    private QualityRiskService qualityRiskService;

    @Autowired
    private EmailNotificationService emailNotificationService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public BugReview proposeBugReview(BugReviewProposedDto dto, User tester) {
        Task cr = taskRepository.findById(dto.getCrTaskId())
                .orElseThrow(() -> new RuntimeException("CR Task not found."));

        User developer = cr.getAssignedDeveloper();
        if (developer == null) {
            throw new RuntimeException("Assignee (Developer) is mandatory for CR to raise a bug review.");
        }

        BugReview review = new BugReview();
        review.setCrId(cr.getId());
        review.setRaisedByTester(tester);
        review.setDeveloper(developer);
        review.setReviewStatus("PENDING_DEV_REVIEW");
        review.setCurrentOwnerRole("DEVELOPER");
        review.setCreatedBy(tester.getUsername());

        try {
            review.setProposedBugPayload(objectMapper.writeValueAsString(dto));
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize proposed bug details: " + e.getMessage());
        }

        BugReview savedReview = bugReviewRepository.save(review);

        // Store attachments with entity_type = "BUG_REVIEW"
        if (dto.getArtifacts() != null && !dto.getArtifacts().isEmpty()) {
            for (BugReviewProposedDto.ProposedArtifactDto artDto : dto.getArtifacts()) {
                Attachment attachment = new Attachment();
                attachment.setFileName(artDto.getFileName());
                attachment.setFileType(artDto.getFileType());
                attachment.setEntityType("BUG_REVIEW");
                attachment.setEntityId(savedReview.getId());
                attachment.setUploadedBy(tester);
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
                        log.error("Failed to decode bug review attachment: " + artDto.getFileName(), e);
                    }
                }
                attachmentRepository.save(attachment);
            }
        }

        // Audit Log
        AuditLog audit = new AuditLog();
        audit.setEntityType("BUG_REVIEW");
        audit.setEntityId(savedReview.getId());
        audit.setFieldName("reviewStatus");
        audit.setOldValue(null);
        audit.setNewValue("PENDING_DEV_REVIEW");
        audit.setRemarks("Proposed bug review raised by tester for CR: " + cr.getJtrackId());
        audit.setChangedBy(tester);
        auditLogRepository.save(audit);

        // Notify Developer
        createAndPushNotification(developer.getId(), "New Proposed Bug Review",
                "Tester " + tester.getFullName() + " raised a proposed bug for CR: " + cr.getJtrackId() + " (" + dto.getTitle() + "). Action required: Accept or Reject.");

        return savedReview;
    }

    @Transactional
    public Bug acceptReview(Long reviewId, User actor, String overrideStatus) {
        BugReview review = bugReviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Bug review not found."));

        if (!"PENDING_DEV_REVIEW".equals(review.getReviewStatus()) && !"CHALLENGED".equals(review.getReviewStatus())) {
            throw new RuntimeException("Review is not in a status that can be accepted. Current: " + review.getReviewStatus());
        }

        BugReviewProposedDto proposedDto;
        try {
            proposedDto = objectMapper.readValue(review.getProposedBugPayload(), BugReviewProposedDto.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to deserialize proposed bug details: " + e.getMessage());
        }

        Task cr = taskRepository.findById(review.getCrId())
                .orElseThrow(() -> new RuntimeException("CR Task not found."));

        // Create the real Bug
        Bug bug = new Bug();
        long nextNum = bugRepository.count() + 201;
        String generatedId = "BUG-" + nextNum;
        while (bugRepository.findByJtrackId(generatedId).isPresent()) {
            nextNum++;
            generatedId = "BUG-" + nextNum;
        }
        bug.setJtrackId(generatedId);
        bug.setBugTask(cr);
        bug.setTitle(proposedDto.getTitle());
        bug.setDescription(proposedDto.getDescription());
        bug.setRaisedBy(review.getRaisedByTester());
        bug.setAssignedDeveloper(review.getDeveloper());
        bug.setPriority(proposedDto.getPriority());
        bug.setSeverity(proposedDto.getSeverity());
        bug.setReason(proposedDto.getReason());
        bug.setStepsToReproduce(proposedDto.getStepsToReproduce());
        bug.setExpectedResult(proposedDto.getExpectedResult());
        bug.setActualResult(proposedDto.getActualResult());

        // Default Bug Workflow (typically ID 2)
        Workflow defaultWorkflow = workflowRepository.findById(2L).orElse(null);
        bug.setWorkflow(defaultWorkflow);
        if (defaultWorkflow != null && defaultWorkflow.getSteps() != null && !defaultWorkflow.getSteps().isEmpty()) {
            bug.setStatus(defaultWorkflow.getSteps().get(0).getStepName());
        } else {
            bug.setStatus("OPEN");
        }

        Bug savedBug = bugRepository.save(bug);

        // Copy Attachments from BUG_REVIEW to BUG
        List<Attachment> reviewAttachments = attachmentRepository.findByEntityTypeAndEntityId("BUG_REVIEW", review.getId());
        for (Attachment att : reviewAttachments) {
            Attachment copy = new Attachment();
            copy.setFileName(att.getFileName());
            copy.setFileType(att.getFileType());
            copy.setEntityType("BUG");
            copy.setEntityId(savedBug.getId());
            copy.setUploadedBy(att.getUploadedBy());
            copy.setUploadDate(att.getUploadDate());
            copy.setData(att.getData());
            attachmentRepository.save(copy);
        }

        // Initialize Bug Workflow Map
        if (savedBug.getWorkflow() != null && savedBug.getWorkflow().getSteps() != null) {
            List<BugWorkflowMap> wmaps = new ArrayList<>();
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

        String oldCRStatus = cr.getStatus();
        cr.setStatus("BUG_FOUND");
        taskRepository.save(cr);
        try {
            qualityRiskService.evaluateCrRisk(cr.getId(), "BUG_ACCEPTED");
        } catch (Exception e) {
            log.error("Failed to evaluate CR risk in acceptReview", e);
        }

        // Audit Log for Task status change
        AuditLog taskAudit = new AuditLog();
        taskAudit.setEntityType("TASK");
        taskAudit.setEntityId(cr.getId());
        taskAudit.setFieldName("status");
        taskAudit.setOldValue(oldCRStatus);
        taskAudit.setNewValue("BUG_FOUND");
        taskAudit.setRemarks("Bug Review accepted and created: " + savedBug.getJtrackId());
        taskAudit.setChangedBy(actor);
        auditLogRepository.save(taskAudit);

        // Update Review Status
        review.setCreatedBug(savedBug);
        review.setReviewStatus(overrideStatus != null ? overrideStatus : "ACCEPTED");
        review.setCurrentOwnerRole("NONE");
        bugReviewRepository.save(review);

        // Update Bug entity's sourceBugReviewId
        savedBug.setSourceBugReviewId(review.getId());
        bugRepository.save(savedBug);

        // Audit Log for Review acceptance
        AuditLog reviewAudit = new AuditLog();
        reviewAudit.setEntityType("BUG_REVIEW");
        reviewAudit.setEntityId(review.getId());
        reviewAudit.setFieldName("reviewStatus");
        reviewAudit.setOldValue(review.getReviewStatus());
        reviewAudit.setNewValue(overrideStatus != null ? overrideStatus : "ACCEPTED");
        reviewAudit.setRemarks("Accepted bug review, generated Bug: " + savedBug.getJtrackId());
        reviewAudit.setChangedBy(actor);
        auditLogRepository.save(reviewAudit);

        // Notify Tester
        if (review.getRaisedByTester() != null) {
            createAndPushNotification(review.getRaisedByTester().getId(), "Bug Review Accepted",
                    "Your bug review for CR " + cr.getJtrackId() + " has been accepted. Bug " + savedBug.getJtrackId() + " is now active.");
        }

        try {
            emailNotificationService.sendNotificationOnCreation(savedBug);
        } catch (Exception e) {
            log.error("Failed to send bug creation mail on review acceptance", e);
        }

        return savedBug;
    }

    @Transactional
    public BugReview rejectReview(Long reviewId, BugRejectionDto dto, User developer) {
        BugReview review = bugReviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Bug review not found."));

        if (!"PENDING_DEV_REVIEW".equals(review.getReviewStatus())) {
            throw new RuntimeException("Review is not pending developer review.");
        }

        if (dto.getJustification() == null || dto.getJustification().trim().isEmpty()) {
            throw new RuntimeException("Justification is mandatory for rejecting a bug review.");
        }

        // Save Rejection
        BugRejection rejection = new BugRejection();
        rejection.setBugReviewId(review.getId());
        rejection.setJustification(dto.getJustification().trim());
        rejection.setRootCause(dto.getRootCause());
        rejection.setReason(dto.getReason());
        rejection.setEvidenceNote(dto.getEvidenceNote());
        rejection.setCreatedBy(developer.getUsername());
        bugRejectionRepository.save(rejection);

        // Update Review Status
        review.setReviewStatus("REJECTED");
        review.setCurrentOwnerRole("TESTER");
        bugReviewRepository.save(review);

        // Audit Log
        AuditLog audit = new AuditLog();
        audit.setEntityType("BUG_REVIEW");
        audit.setEntityId(review.getId());
        audit.setFieldName("reviewStatus");
        audit.setOldValue("PENDING_DEV_REVIEW");
        audit.setNewValue("REJECTED");
        audit.setRemarks("Developer rejected bug review: " + dto.getJustification());
        audit.setChangedBy(developer);
        auditLogRepository.save(audit);

        // Notify Tester
        if (review.getRaisedByTester() != null) {
            createAndPushNotification(review.getRaisedByTester().getId(), "Bug Review Rejected",
                    "Developer " + developer.getFullName() + " rejected your proposed bug review. Justification: " + dto.getJustification());
        }

        try {
            qualityRiskService.evaluateCrRisk(review.getCrId(), "BUG_REJECTED");
        } catch (Exception e) {
            log.error("Failed to evaluate CR risk in rejectReview", e);
        }
        return review;
    }

    @Transactional
    public BugReview testerAcceptExplanation(Long reviewId, User tester) {
        BugReview review = bugReviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Bug review not found."));

        if (!"REJECTED".equals(review.getReviewStatus())) {
            throw new RuntimeException("Only rejected reviews can be closed.");
        }

        review.setReviewStatus("CLOSED");
        review.setCurrentOwnerRole("NONE");
        bugReviewRepository.save(review);

        // Audit Log
        AuditLog audit = new AuditLog();
        audit.setEntityType("BUG_REVIEW");
        audit.setEntityId(review.getId());
        audit.setFieldName("reviewStatus");
        audit.setOldValue("REJECTED");
        audit.setNewValue("CLOSED");
        audit.setRemarks("Tester accepted developer's rejection explanation.");
        audit.setChangedBy(tester);
        auditLogRepository.save(audit);

        return review;
    }

    @Transactional
    public BugReview testerRaiseAgain(Long reviewId, User tester) {
        BugReview review = bugReviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Bug review not found."));

        if (!"REJECTED".equals(review.getReviewStatus())) {
            throw new RuntimeException("Only rejected reviews can be raised again.");
        }

        review.setReviewStatus("PENDING_DEV_REVIEW");
        review.setCurrentOwnerRole("DEVELOPER");
        bugReviewRepository.save(review);

        // Audit Log
        AuditLog audit = new AuditLog();
        audit.setEntityType("BUG_REVIEW");
        audit.setEntityId(review.getId());
        audit.setFieldName("reviewStatus");
        audit.setOldValue("REJECTED");
        audit.setNewValue("PENDING_DEV_REVIEW");
        audit.setRemarks("Tester raised proposed bug review again.");
        audit.setChangedBy(tester);
        auditLogRepository.save(audit);

        // Notify Developer
        if (review.getDeveloper() != null) {
            createAndPushNotification(review.getDeveloper().getId(), "Bug Review Raised Again",
                    "Tester " + tester.getFullName() + " raised the rejected bug review again.");
        }

        // Increment retest on Task
        taskRepository.findById(review.getCrId()).ifPresent(cr -> {
            cr.setTotalRetests((cr.getTotalRetests() != null ? cr.getTotalRetests() : 0) + 1);
            taskRepository.save(cr);
            try {
                qualityRiskService.evaluateCrRisk(cr.getId(), "RETEST_RECORDED");
            } catch (Exception e) {
                log.error("Failed to evaluate CR risk in testerRaiseAgain", e);
            }
        });

        return review;
    }

    @Transactional
    public BugReview testerChallenge(Long reviewId, User tester) {
        BugReview review = bugReviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Bug review not found."));

        if (!"REJECTED".equals(review.getReviewStatus())) {
            throw new RuntimeException("Only rejected reviews can be challenged.");
        }

        review.setReviewStatus("CHALLENGED");
        review.setCurrentOwnerRole("ADMIN");
        bugReviewRepository.save(review);

        // Set CR status to "Bug Review Pending"
        Task cr = taskRepository.findById(review.getCrId())
                .orElseThrow(() -> new RuntimeException("CR Task not found."));
        String oldCRStatus = cr.getStatus();
        cr.setStatus("Bug Review Pending");
        taskRepository.save(cr);

        // Audit Log for Task status change
        AuditLog taskAudit = new AuditLog();
        taskAudit.setEntityType("TASK");
        taskAudit.setEntityId(cr.getId());
        taskAudit.setFieldName("status");
        taskAudit.setOldValue(oldCRStatus);
        taskAudit.setNewValue("Bug Review Pending");
        taskAudit.setRemarks("Tester challenged bug review rejection. CR status set to Bug Review Pending.");
        taskAudit.setChangedBy(tester);
        auditLogRepository.save(taskAudit);

        // Audit Log for Review
        AuditLog audit = new AuditLog();
        audit.setEntityType("BUG_REVIEW");
        audit.setEntityId(review.getId());
        audit.setFieldName("reviewStatus");
        audit.setOldValue("REJECTED");
        audit.setNewValue("CHALLENGED");
        audit.setRemarks("Tester challenged developer rejection.");
        audit.setChangedBy(tester);
        auditLogRepository.save(audit);

        // Notify Admins
        List<User> admins = userRepository.findAll().stream()
                .filter(u -> u.getRoles().contains(Role.TESTADMIN) || u.getRoles().contains(Role.DEVADMIN))
                .toList();
        for (User admin : admins) {
            createAndPushNotification(admin.getId(), "Bug Rejection Challenged",
                    "Tester " + tester.getFullName() + " challenged the rejection of bug review for CR " + cr.getJtrackId() + ". Action required.");
        }

        try {
            qualityRiskService.evaluateCrRisk(review.getCrId(), "CHALLENGE_RAISED");
        } catch (Exception e) {
            log.error("Failed to evaluate CR risk in testerChallenge", e);
        }

        return review;
    }

    @Transactional
    public BugReview adminAcceptRejection(Long reviewId, User admin) {
        BugReview review = bugReviewRepository.findById(reviewId)
                .orElseThrow(() -> new RuntimeException("Bug review not found."));

        if (!"CHALLENGED".equals(review.getReviewStatus())) {
            throw new RuntimeException("Only challenged reviews can be resolved by admin.");
        }

        review.setReviewStatus("ADMIN_ACCEPTED");
        review.setCurrentOwnerRole("NONE");
        bugReviewRepository.save(review);

        // Set CR status back to UAT_TESTING
        Task cr = taskRepository.findById(review.getCrId())
                .orElseThrow(() -> new RuntimeException("CR Task not found."));
        String oldCRStatus = cr.getStatus();
        cr.setStatus("UAT_TESTING");
        taskRepository.save(cr);

        // Audit Log for Task status change
        AuditLog taskAudit = new AuditLog();
        taskAudit.setEntityType("TASK");
        taskAudit.setEntityId(cr.getId());
        taskAudit.setFieldName("status");
        taskAudit.setOldValue(oldCRStatus);
        taskAudit.setNewValue("UAT_TESTING");
        taskAudit.setRemarks("Admin accepted developer's rejection of proposed bug. CR status reverted to UAT_TESTING.");
        taskAudit.setChangedBy(admin);
        auditLogRepository.save(taskAudit);

        // Audit Log for Review
        AuditLog audit = new AuditLog();
        audit.setEntityType("BUG_REVIEW");
        audit.setEntityId(review.getId());
        audit.setFieldName("reviewStatus");
        audit.setOldValue("CHALLENGED");
        audit.setNewValue("ADMIN_ACCEPTED");
        audit.setRemarks("Admin accepted developer rejection decision.");
        audit.setChangedBy(admin);
        auditLogRepository.save(audit);

        // Notify Tester
        if (review.getRaisedByTester() != null) {
            createAndPushNotification(review.getRaisedByTester().getId(), "Admin Resolved Challenge: Rejection Upheld",
                    "Admin " + admin.getFullName() + " upheld the developer's rejection decision. Proposed bug review closed.");
        }

        return review;
    }

    @Transactional
    public Bug adminForceAccept(Long reviewId, User admin) {
        return acceptReview(reviewId, admin, "ADMIN_FORCED");
    }

    private void createAndPushNotification(Long userId, String title, String desc) {
        if (userId == null) return;
        try {
            Notification notif = new Notification();
            notif.setUserId(userId);
            notif.setTitle(title);
            notif.setDesc(desc);
            notif.setTime("Just now");
            notif.setUnread(true);

            Notification saved = notificationRepository.save(notif);
            webSocketHandler.sendToUser(userId, java.util.Map.of(
                    "type", "NOTIFICATION",
                    "notification", saved
            ));
        } catch (Exception e) {
            log.error("Failed to send real-time notification to userId {}: {}", userId, e.getMessage());
        }
    }
}
