package com.devtrack.api.controller;

import com.devtrack.api.dto.DashboardSummaryDTO;
import com.devtrack.api.model.Role;
import com.devtrack.api.model.Sprint;
import com.devtrack.api.model.User;
import com.devtrack.api.repository.*;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;

/**
 * DashboardController — Fast First Load aggregate endpoint.
 *
 * Design:
 *  - All sub-queries run in parallel via CompletableFuture on the dedicated dashboardExecutor pool.
 *  - Uses SQL projection queries (7 cols) instead of full Task entity hydration.
 *  - Scope is always derived from the JWT authentication — never from client-supplied params.
 *    ALL  → admin/devadmin/testadmin: global counts across all CRs
 *    MINE → developer/tester/codereviewer: counts scoped to their assigned tasks/bugs
 *  - Response cached per user (5-minute Caffeine TTL, evicted on task mutations).
 *  - X-Response-Time header added for observability.
 */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final TaskRepository taskRepository;
    private final BugRepository bugRepository;
    private final SprintRepository sprintRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final Executor dashboardExecutor;

    public DashboardController(
            TaskRepository taskRepository,
            BugRepository bugRepository,
            SprintRepository sprintRepository,
            UserRepository userRepository,
            NotificationRepository notificationRepository,
            @Qualifier("dashboardExecutor") Executor dashboardExecutor) {
        this.taskRepository = taskRepository;
        this.bugRepository = bugRepository;
        this.sprintRepository = sprintRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.dashboardExecutor = dashboardExecutor;
    }

    @GetMapping("/summary")
    @Cacheable(value = "dashboardSummary", key = "#authentication != null ? #authentication.name : 'anonymous'")
    public ResponseEntity<DashboardSummaryDTO> getDashboardSummary(
            Authentication authentication,
            HttpServletResponse httpResponse) {

        long requestStart = System.currentTimeMillis();

        // ── Resolve authenticated user (identity always from JWT, never from client) ──
        String username = authentication != null ? authentication.getName() : null;
        Optional<User> currentUserOpt = username != null ? userRepository.findByUsername(username) : Optional.empty();
        User currentUser = currentUserOpt.orElse(null);
        Long userId = currentUser != null ? currentUser.getId() : null;

        // ── Determine scope from JWT roles (server-enforced) ──
        boolean isAdminScope = currentUser != null && currentUser.getRoles() != null &&
                currentUser.getRoles().stream().anyMatch(r ->
                        r == Role.DEVADMIN || r == Role.TESTADMIN);

        // ── Phase 1: Parallel aggregate queries via dedicated executor ──────────────

        // 1a. Stats — global or scoped counts
        CompletableFuture<Long> totalCrsFuture;
        CompletableFuture<Long> pendingApprovalsFuture;
        CompletableFuture<Long> activeBugsFuture;
        CompletableFuture<Long> completedUatFuture;

        if (isAdminScope || userId == null) {
            // ALL scope: global counts for admins
            totalCrsFuture = CompletableFuture.supplyAsync(
                    () -> taskRepository.count(), dashboardExecutor);
            pendingApprovalsFuture = CompletableFuture.supplyAsync(
                    () -> taskRepository.countByStatusIn(List.of("PENDING_APPROVAL", "CODE_REVIEW")), dashboardExecutor);
            activeBugsFuture = CompletableFuture.supplyAsync(
                    () -> bugRepository.countActiveBugs(), dashboardExecutor);
            completedUatFuture = CompletableFuture.supplyAsync(
                    () -> taskRepository.countByStatusIn(List.of("UAT_TESTING", "PROD_DEPLOYED", "PROD_COMPLETED", "CLOSED")), dashboardExecutor);
        } else {
            // MINE scope: counts scoped to authenticated user's assignments
            final Long uid = userId;
            totalCrsFuture = CompletableFuture.supplyAsync(
                    () -> taskRepository.countActiveCrsForUser(uid), dashboardExecutor);
            pendingApprovalsFuture = CompletableFuture.supplyAsync(
                    () -> taskRepository.countPendingApprovalCrsForUser(uid), dashboardExecutor);
            activeBugsFuture = CompletableFuture.supplyAsync(
                    () -> bugRepository.countActiveBugsForUser(uid), dashboardExecutor);
            completedUatFuture = CompletableFuture.supplyAsync(
                    () -> taskRepository.countCompletedUatCrsForUser(uid), dashboardExecutor);
        }

        // 1b. Active Sprint — always global (sprint is shared across all users)
        CompletableFuture<Optional<Sprint>> sprintFuture = CompletableFuture.supplyAsync(
                () -> sprintRepository.findByStatus("ACTIVE"), dashboardExecutor);

        // 1c. Unread notification count — always user-scoped
        CompletableFuture<Long> unreadFuture;
        if (userId != null) {
            final Long uid = userId;
            unreadFuture = CompletableFuture.supplyAsync(
                    () -> notificationRepository.countUnreadByUserId(uid), dashboardExecutor);
        } else {
            unreadFuture = CompletableFuture.completedFuture(0L);
        }

        // 1d. Recent CRs — lightweight projection query (7 cols, no entity hydration)
        CompletableFuture<List<Object[]>> recentCrsFuture = CompletableFuture.supplyAsync(
                () -> taskRepository.findRecentTaskProjections(5), dashboardExecutor);

        // 1e. Pending tasks — lightweight projection query (6 cols, no entity hydration)
        CompletableFuture<List<Object[]>> pendingTasksFuture;
        if (userId != null) {
            final Long uid = userId;
            pendingTasksFuture = CompletableFuture.supplyAsync(
                    () -> taskRepository.findPendingTaskProjectionsForUser(uid, "CLOSED", "PROD_COMPLETED"), dashboardExecutor);
        } else {
            pendingTasksFuture = CompletableFuture.completedFuture(Collections.emptyList());
        }

        // ── Wait for all futures to complete ────────────────────────────────────────
        CompletableFuture.allOf(
                totalCrsFuture, pendingApprovalsFuture, activeBugsFuture, completedUatFuture,
                sprintFuture, unreadFuture, recentCrsFuture, pendingTasksFuture
        ).join();

        // ── Phase 2: Assemble response ────────────────────────────────────────────

        // Stats
        DashboardSummaryDTO.StatsSummary stats = new DashboardSummaryDTO.StatsSummary(
                totalCrsFuture.join(),
                pendingApprovalsFuture.join(),
                activeBugsFuture.join(),
                completedUatFuture.join()
        );

        // User summary (from already-loaded currentUser — no extra DB call)
        DashboardSummaryDTO.UserSummary userSummary = null;
        if (currentUser != null) {
            userSummary = new DashboardSummaryDTO.UserSummary(
                    currentUser.getId(),
                    currentUser.getUsername(),
                    currentUser.getFullName(),
                    currentUser.getEmail(),
                    currentUser.getRoles().stream()
                            .map(r -> r.name().replace("ROLE_", ""))
                            .collect(Collectors.toList())
            );
        }

        // Active Sprint — use count-only native queries, no full entity hydration for tasks
        DashboardSummaryDTO.ActiveSprintSummary activeSprintSummary = null;
        Optional<Sprint> activeSprintOpt = sprintFuture.join();
        if (activeSprintOpt.isPresent()) {
            Sprint s = activeSprintOpt.get();
            int totalTasks = taskRepository.countBySprintIdNative(s.getId());
            int completedTasks = taskRepository.countCompletedBySprintIdNative(s.getId());
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

        // Recent CRs — map from Object[] projection
        List<DashboardSummaryDTO.RecentCrSummary> recentCrs = recentCrsFuture.join().stream()
                .map(row -> new DashboardSummaryDTO.RecentCrSummary(
                        row[0] != null ? ((Number) row[0]).longValue() : null,
                        row[1] != null ? row[1].toString() : null,
                        row[2] != null ? row[2].toString() : null,
                        row[3] != null ? row[3].toString() : null,
                        row[4] != null ? row[4].toString() : null,
                        row[5] != null ? row[5].toString() : null,
                        row[6] != null ? row[6].toString() : null
                ))
                .collect(Collectors.toList());

        // Pending Tasks — map from Object[] projection
        List<DashboardSummaryDTO.PendingTaskSummary> pendingTasks = pendingTasksFuture.join().stream()
                .map(row -> new DashboardSummaryDTO.PendingTaskSummary(
                        row[0] != null ? ((Number) row[0]).longValue() : null,
                        row[1] != null ? row[1].toString() : null,
                        row[2] != null ? row[2].toString() : null,
                        row[3] != null ? row[3].toString() : null,
                        row[4] != null ? row[4].toString() : null,
                        row[5] != null ? row[5].toString() : null
                ))
                .collect(Collectors.toList());

        // Scope metadata in response (for frontend awareness, no trust implied)
        String resolvedScope = isAdminScope ? "ALL" : "MINE";

        DashboardSummaryDTO summary = new DashboardSummaryDTO(
                stats,
                userSummary,
                activeSprintSummary,
                unreadFuture.join(),
                recentCrs,
                pendingTasks,
                resolvedScope
        );

        // ── Observability: X-Response-Time header ───────────────────────────────
        long elapsed = System.currentTimeMillis() - requestStart;
        httpResponse.setHeader("X-Response-Time", elapsed + "ms");

        return ResponseEntity.ok(summary);
    }
}
