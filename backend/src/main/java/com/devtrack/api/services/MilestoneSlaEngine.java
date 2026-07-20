package com.devtrack.api.services;

import com.devtrack.api.model.*;
import com.devtrack.api.repository.*;
import com.devtrack.api.notification.model.NotificationPriority;
import com.devtrack.api.notification.model.NotificationType;
import com.devtrack.api.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class MilestoneSlaEngine {

    public enum MilestoneType {
        SIT("SIT", "SIT Deployment", Task::getExpectedSitDeploymentDate, Task::getSitDate, "SIT Deployment Deadline Missed", "SIT Deployment Date Missed"),
        UAT("UAT", "UAT Deployment", Task::getExpectedUatDeploymentDate, Task::getUatDate, "UAT Deployment Deadline Missed", "UAT Deployment Date Missed");

        public final String code;
        public final String displayName;
        public final java.util.function.Function<Task, LocalDate> expectedDateGetter;
        public final java.util.function.Function<Task, LocalDate> actualDateGetter;
        public final String missedLogRemark;
        public final String badgeLabel;

        MilestoneType(String code, String displayName,
                      java.util.function.Function<Task, LocalDate> expectedDateGetter,
                      java.util.function.Function<Task, LocalDate> actualDateGetter,
                      String missedLogRemark,
                      String badgeLabel) {
            this.code = code;
            this.displayName = displayName;
            this.expectedDateGetter = expectedDateGetter;
            this.actualDateGetter = actualDateGetter;
            this.missedLogRemark = missedLogRemark;
            this.badgeLabel = badgeLabel;
        }
    }

    private final TaskRepository taskRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final com.devtrack.api.config.NotificationWebSocketHandler webSocketHandler;
    private final NotificationService notificationService;

    /**
     * Helper to check if a milestone is missed.
     */
    public boolean isMilestoneMissed(Task task, MilestoneType milestone) {
        LocalDate expected = milestone.expectedDateGetter.apply(task);
        LocalDate actual = milestone.actualDateGetter.apply(task);
        if (expected == null) return false;
        
        // If not completed yet, check if currentDate > expectedDate
        if (actual == null) {
            return LocalDate.now().isAfter(expected);
        }
        return false;
    }

    /**
     * Dynamic delay days calculation.
     */
    public long calculateDelayDays(Task task, MilestoneType milestone) {
        LocalDate expected = milestone.expectedDateGetter.apply(task);
        LocalDate actual = milestone.actualDateGetter.apply(task);
        if (expected == null) return 0;
        
        LocalDate comparisonDate = actual != null ? actual : LocalDate.now();
        if (comparisonDate.isAfter(expected)) {
            return ChronoUnit.DAYS.between(expected, comparisonDate);
        }
        return 0;
    }

    /**
     * Remaining days calculation.
     */
    public long calculateRemainingDays(Task task, MilestoneType milestone) {
        LocalDate expected = milestone.expectedDateGetter.apply(task);
        LocalDate actual = milestone.actualDateGetter.apply(task);
        if (expected == null || actual != null) return 0;
        
        if (LocalDate.now().isBefore(expected) || LocalDate.now().isEqual(expected)) {
            return ChronoUnit.DAYS.between(LocalDate.now(), expected);
        }
        return 0;
    }

    /**
     * Milestone status evaluation.
     */
    public String evaluateMilestoneStatus(Task task, MilestoneType milestone) {
        LocalDate expected = milestone.expectedDateGetter.apply(task);
        LocalDate actual = milestone.actualDateGetter.apply(task);
        if (expected == null) return "NOT_SET";
        
        if (actual != null) {
            return actual.isAfter(expected) ? "COMPLETED_DELAYED" : "COMPLETED_ON_TIME";
        }
        
        if (LocalDate.now().isAfter(expected)) {
            return "MISSED";
        }
        
        long remaining = calculateRemainingDays(task, milestone);
        if (remaining <= 2) {
            return "AT_RISK";
        }
        return "ON_TRACK";
    }

    /**
     * Risk level evaluation.
     */
    public String evaluateRiskLevel(Task task, MilestoneType milestone) {
        String status = evaluateMilestoneStatus(task, milestone);
        if ("MISSED".equals(status) || "COMPLETED_DELAYED".equals(status)) {
            return "High";
        }
        if ("AT_RISK".equals(status)) {
            return "Medium";
        }
        return "Low";
    }

    /**
     * Scheduled hourly sweep to check all tasks, send reminders, and log misses.
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void sweepDeadlines() {
        log.info("Starting background Milestone/SLA Engine evaluation sweep...");
        List<Task> activeTasks = taskRepository.findAll();
        int evaluations = 0;

        for (Task t : activeTasks) {
            boolean updated = false;
            for (MilestoneType m : MilestoneType.values()) {
                LocalDate expected = m.expectedDateGetter.apply(t);
                if (expected == null) continue;

                LocalDate actual = m.actualDateGetter.apply(t);
                LocalDate today = LocalDate.now();

                // 1. One Day Before Reminder
                if (today.plusDays(1).isEqual(expected) && actual == null) {
                    String remark = m.displayName + " Reminder: 1 Day Before";
                    if (!hasAuditLog(t.getId(), remark)) {
                        sendSlaNotification(t, m, "Tomorrow", remark, NotificationPriority.HIGH);
                        saveAuditEntry(t, m.code + "_DEADLINE_REMINDER", expected.toString(), remark);
                        updated = true;
                    }
                }
                
                // 2. Day of Deadline Reminder
                else if (today.isEqual(expected) && actual == null) {
                    String remark = m.displayName + " Reminder: Day Of";
                    if (!hasAuditLog(t.getId(), remark)) {
                        sendSlaNotification(t, m, "Today", remark, NotificationPriority.HIGH);
                        saveAuditEntry(t, m.code + "_DEADLINE_REMINDER", expected.toString(), remark);
                        updated = true;
                    }
                }
                
                // 3. Deadline Missed Alert
                else if (today.isAfter(expected) && actual == null) {
                    String remark = m.missedLogRemark;
                    if (!hasAuditLog(t.getId(), remark)) {
                        sendSlaNotification(t, m, "Missed", remark, NotificationPriority.CRITICAL);
                        saveAuditEntry(t, m.code + "_DEADLINE_MISSED", expected.toString(), remark);
                        updated = true;
                    }
                }
            }

            if (updated) {
                evaluations++;
                // Notify via WebSocket to update active screens in real-time
                webSocketHandler.broadcast(Map.of(
                    "type", "TASK_UPDATE",
                    "taskId", t.getId()
                ));
            }
        }
        log.info("Milestone/SLA sweep completed. Flagged/notified updates for {} tasks.", evaluations);
    }

    private boolean hasAuditLog(Long taskId, String remark) {
        return auditLogRepository.existsByEntityIdAndEntityTypeAndRemarks(taskId, "TASK", remark);
    }

    private void saveAuditEntry(Task task, String fieldName, String oldValue, String remark) {
        AuditLog logEntry = new AuditLog();
        logEntry.setEntityType("TASK");
        logEntry.setEntityId(task.getId());
        logEntry.setFieldName(fieldName);
        logEntry.setOldValue(oldValue);
        logEntry.setNewValue("MISSED");
        logEntry.setRemarks(remark);
        logEntry.setChangedDate(LocalDateTime.now());
        logEntry.setIpAddress("127.0.0.1");
        logEntry.setBrowser("MilestoneSlaEngine");
        auditLogRepository.save(logEntry);
    }

    private void sendSlaNotification(Task task, MilestoneType milestone, String timing, String remark, NotificationPriority priority) {
        try {
            String subject = String.format("[%s] %s Commitment %s: %s", 
                priority.getLabel(), milestone.displayName, timing, task.getJtrackId());
            
            Map<String, Object> data = new HashMap<>();
            data.put("task", task);
            data.put("remarks", remark);
            data.put("bodyText", String.format("The change request '%s' (%s) milestone '%s' is scheduled for: %s. Current status: %s.",
                task.getTitle(), task.getJtrackId(), milestone.displayName, milestone.expectedDateGetter.apply(task), timing));

            // Central notification dispatch
            notificationService.sendNotification(
                NotificationType.MILESTONE_DEADLINE_ALERT,
                null,
                null,
                null,
                data,
                priority
            );

            // In-app persistent notification push
            notifyInApp(task, subject, remark);
        } catch (Exception e) {
            log.error("Failed to send SLA notification for task ID={}", task.getId(), e);
        }
    }

    private void notifyInApp(Task task, String title, String desc) {
        Set<Long> userIds = new HashSet<>();
        if (task.getAssignedDeveloper() != null) {
            userIds.add(task.getAssignedDeveloper().getId());
        }
        
        // Notify Admins
        userRepository.findAll().stream()
            .filter(u -> u.getRoles().contains(Role.DEVADMIN) || u.getRoles().contains(Role.TESTADMIN))
            .forEach(admin -> userIds.add(admin.getId()));

        for (Long uid : userIds) {
            try {
                if (notificationRepository.existsByUserIdAndTitleAndDesc(uid, title, desc)) {
                    continue;
                }
                Notification notif = new Notification();
                notif.setUserId(uid);
                notif.setTitle(title);
                notif.setDesc(desc);
                notif.setTime("Just now");
                notif.setUnread(true);

                Notification saved = notificationRepository.save(notif);
                webSocketHandler.sendToUser(uid, Map.of(
                    "type", "NOTIFICATION",
                    "notification", saved
                ));
            } catch (Exception e) {
                log.error("Failed to push WS notification to user={}", uid, e);
            }
        }
    }
}
