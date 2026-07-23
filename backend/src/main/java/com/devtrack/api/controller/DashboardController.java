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
    @Cacheable(value = "dashboardSummary", key = "#authentication != null ? #authentication.name : 'anonymous'")
    public ResponseEntity<DashboardSummaryDTO> getDashboardSummary(Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        Optional<User> currentUserOpt = username != null ? userRepository.findByUsername(username) : Optional.empty();
        User currentUser = currentUserOpt.orElse(null);

        // 1. Overall stats via fast index-driven SQL queries
        long totalCrs = taskRepository.count();
        long pendingApprovals = taskRepository.countByStatusIn(List.of("PENDING_APPROVAL", "CODE_REVIEW"));
        long activeBugs = bugRepository.countActiveBugs();
        long completedUat = taskRepository.countByStatusIn(List.of("UAT_TESTING", "PROD_DEPLOYED"));

        DashboardSummaryDTO.StatsSummary stats = new DashboardSummaryDTO.StatsSummary(
                totalCrs, pendingApprovals, activeBugs, completedUat);

        // 2. User summary
        DashboardSummaryDTO.UserSummary userSummary = null;
        if (currentUser != null) {
            userSummary = new DashboardSummaryDTO.UserSummary(
                    currentUser.getId(),
                    currentUser.getUsername(),
                    currentUser.getFullName(),
                    currentUser.getEmail(),
                    currentUser.getRoles().stream().map(r -> r.name().replace("ROLE_", "")).collect(Collectors.toList())
            );
        }

        // 3. Active Sprint summary
        DashboardSummaryDTO.ActiveSprintSummary activeSprintSummary = null;
        Optional<Sprint> activeSprintOpt = sprintRepository.findByStatus("ACTIVE");
        if (activeSprintOpt.isPresent()) {
            Sprint s = activeSprintOpt.get();
            List<Task> sprintTasks = taskRepository.findBySprintId(s.getId());
            int totalTasks = sprintTasks.size();
            int completedTasks = (int) sprintTasks.stream().filter(t -> "CLOSED".equalsIgnoreCase(t.getStatus()) || "PROD_DEPLOYED".equalsIgnoreCase(t.getStatus())).count();

            activeSprintSummary = new DashboardSummaryDTO.ActiveSprintSummary(
                    s.getId(),
                    s.getName(),
                    s.getGoal(),
                    s.getStartDate() != null ? s.getStartDate().toString() : null,
                    s.getEndDate() != null ? s.getEndDate().toString() : null,
                    s.getStatus(),
                    totalTasks,
                    completedTasks
            );
        }

        // 4. Unread Notification Count
        long unreadCount = 0;
        if (currentUser != null) {
            unreadCount = notificationRepository.countUnreadByUserId(currentUser.getId());
        }

        // 5. Recent CRs (top 5 via SQL PageRequest)
        List<Task> recentTaskList = taskRepository.findRecentTasks(org.springframework.data.domain.PageRequest.of(0, 5)).getContent();
        List<DashboardSummaryDTO.RecentCrSummary> recentCrs = recentTaskList.stream()
                .map(t -> new DashboardSummaryDTO.RecentCrSummary(
                        t.getId(),
                        t.getJtrackId(),
                        t.getTitle(),
                        t.getPriority(),
                        t.getStatus(),
                        t.getUpdatedDate() != null ? t.getUpdatedDate().toString() : null,
                        t.getAssignedDeveloper() != null ? t.getAssignedDeveloper().getFullName() : null
                ))
                .collect(Collectors.toList());

        // 6. Pending Tasks for current user (top 5 via multi-developer SQL PageRequest)
        List<DashboardSummaryDTO.PendingTaskSummary> pendingTasks = Collections.emptyList();
        if (currentUser != null) {
            List<Task> pendingTaskList = taskRepository.findPendingTasksForUser(
                    currentUser.getId(), 
                    List.of("CLOSED", "PROD_DEPLOYED"), 
                    org.springframework.data.domain.PageRequest.of(0, 5)
            ).getContent();

            pendingTasks = pendingTaskList.stream()
                    .map(t -> new DashboardSummaryDTO.PendingTaskSummary(
                            t.getId(),
                            t.getJtrackId(),
                            t.getTitle(),
                            t.getPriority(),
                            t.getStatus(),
                            t.getDueDate() != null ? t.getDueDate().toString() : null
                    ))
                    .collect(Collectors.toList());
        }

        DashboardSummaryDTO summary = new DashboardSummaryDTO(
                stats,
                userSummary,
                activeSprintSummary,
                unreadCount,
                recentCrs,
                pendingTasks
        );

        return ResponseEntity.ok(summary);
    }
}
