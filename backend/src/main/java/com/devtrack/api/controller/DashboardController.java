package com.devtrack.api.controller;

import com.devtrack.api.dto.DashboardSummaryDTO;
import com.devtrack.api.model.Sprint;
import com.devtrack.api.model.Task;
import com.devtrack.api.model.User;
import com.devtrack.api.repository.*;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final TaskRepository taskRepository;
    private final BugRepository bugRepository;
    private final SprintRepository sprintRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;

    public DashboardController(TaskRepository taskRepository,
                               BugRepository bugRepository,
                               SprintRepository sprintRepository,
                               UserRepository userRepository,
                               NotificationRepository notificationRepository) {
        this.taskRepository = taskRepository;
        this.bugRepository = bugRepository;
        this.sprintRepository = sprintRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
    }

    @GetMapping("/summary")
    public ResponseEntity<DashboardSummaryDTO> getDashboardSummary(Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        Optional<User> currentUserOpt = username != null ? userRepository.findByUsername(username) : Optional.empty();
        User currentUser = currentUserOpt.orElse(null);

        // 1. Overall stats
        long totalCrs = taskRepository.count();
        long pendingApprovals = taskRepository.findAll().stream()
                .filter(t -> "PENDING_APPROVAL".equalsIgnoreCase(t.getStatus()) || "CODE_REVIEW".equalsIgnoreCase(t.getStatus()))
                .count();
        long activeBugs = bugRepository.findAll().stream()
                .filter(b -> !"CLOSED".equalsIgnoreCase(b.getStatus()) && !"VERIFIED".equalsIgnoreCase(b.getStatus()))
                .count();
        long completedUat = taskRepository.findAll().stream()
                .filter(t -> "UAT_TESTING".equalsIgnoreCase(t.getStatus()) || "PROD_DEPLOYED".equalsIgnoreCase(t.getStatus()))
                .count();

        DashboardSummaryDTO.StatsSummary stats = DashboardSummaryDTO.StatsSummary.builder()
                .totalCrs(totalCrs)
                .pendingApprovals(pendingApprovals)
                .activeBugs(activeBugs)
                .completedUat(completedUat)
                .build();

        // 2. User summary
        DashboardSummaryDTO.UserSummary userSummary = null;
        if (currentUser != null) {
            userSummary = DashboardSummaryDTO.UserSummary.builder()
                    .id(currentUser.getId())
                    .username(currentUser.getUsername())
                    .fullName(currentUser.getFullName())
                    .email(currentUser.getEmail())
                    .roles(currentUser.getRoles().stream().map(r -> r.name().replace("ROLE_", "")).collect(Collectors.toList()))
                    .build();
        }

        // 3. Active Sprint summary
        DashboardSummaryDTO.ActiveSprintSummary activeSprintSummary = null;
        Optional<Sprint> activeSprintOpt = sprintRepository.findByStatus("ACTIVE");
        if (activeSprintOpt.isPresent()) {
            Sprint s = activeSprintOpt.get();
            List<Task> sprintTasks = taskRepository.findAll().stream()
                    .filter(t -> t.getSprintId() != null && t.getSprintId().equals(s.getId()))
                    .collect(Collectors.toList());
            int totalTasks = sprintTasks.size();
            int completedTasks = (int) sprintTasks.stream().filter(t -> "CLOSED".equalsIgnoreCase(t.getStatus()) || "PROD_DEPLOYED".equalsIgnoreCase(t.getStatus())).count();

            activeSprintSummary = DashboardSummaryDTO.ActiveSprintSummary.builder()
                    .id(s.getId())
                    .name(s.getName())
                    .goal(s.getGoal())
                    .startDate(s.getStartDate() != null ? s.getStartDate().toString() : null)
                    .endDate(s.getEndDate() != null ? s.getEndDate().toString() : null)
                    .status(s.getStatus())
                    .totalTasks(totalTasks)
                    .completedTasks(completedTasks)
                    .build();
        }

        // 4. Unread Notification Count
        long unreadCount = 0;
        if (currentUser != null) {
            unreadCount = notificationRepository.findByUserId(currentUser.getId()).stream()
                    .filter(com.devtrack.api.model.Notification::isUnread)
                    .count();
        }

        // 5. Recent CRs (top 5)
        List<Task> allTasks = taskRepository.findAll();
        List<DashboardSummaryDTO.RecentCrSummary> recentCrs = allTasks.stream()
                .sorted((a, b) -> Long.compare(b.getId(), a.getId()))
                .limit(5)
                .map(t -> DashboardSummaryDTO.RecentCrSummary.builder()
                        .id(t.getId())
                        .jtrackId(t.getJtrackId())
                        .title(t.getTitle())
                        .priority(t.getPriority())
                        .status(t.getStatus())
                        .updatedDate(t.getUpdatedDate() != null ? t.getUpdatedDate().toString() : null)
                        .assignedDeveloperName(t.getAssignedDeveloper() != null ? t.getAssignedDeveloper().getFullName() : null)
                        .build())
                .collect(Collectors.toList());

        // 6. Pending Tasks for current user
        List<DashboardSummaryDTO.PendingTaskSummary> pendingTasks = Collections.emptyList();
        if (currentUser != null) {
            pendingTasks = allTasks.stream()
                    .filter(t -> (t.getAssignedDeveloper() != null && t.getAssignedDeveloper().getId().equals(currentUser.getId()))
                            || (t.getTester() != null && t.getTester().getId().equals(currentUser.getId())))
                    .filter(t -> !"CLOSED".equalsIgnoreCase(t.getStatus()) && !"PROD_DEPLOYED".equalsIgnoreCase(t.getStatus()))
                    .limit(5)
                    .map(t -> DashboardSummaryDTO.PendingTaskSummary.builder()
                            .id(t.getId())
                            .jtrackId(t.getJtrackId())
                            .title(t.getTitle())
                            .priority(t.getPriority())
                            .status(t.getStatus())
                            .dueDate(t.getDueDate() != null ? t.getDueDate().toString() : null)
                            .build())
                    .collect(Collectors.toList());
        }

        DashboardSummaryDTO summary = DashboardSummaryDTO.builder()
                .stats(stats)
                .user(userSummary)
                .activeSprint(activeSprintSummary)
                .unreadNotificationCount(unreadCount)
                .recentCrs(recentCrs)
                .pendingTasks(pendingTasks)
                .build();

        return ResponseEntity.ok(summary);
    }
}
