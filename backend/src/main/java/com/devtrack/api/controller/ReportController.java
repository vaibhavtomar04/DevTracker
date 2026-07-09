package com.devtrack.api.controller;

import com.devtrack.api.model.Bug;
import com.devtrack.api.model.BugTask;
import com.devtrack.api.model.Task;
import com.devtrack.api.model.TestCaseTask;
import com.devtrack.api.repository.BugRepository;
import com.devtrack.api.repository.BugTaskRepository;
import com.devtrack.api.repository.TaskRepository;
import com.devtrack.api.repository.TestCaseTaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    @Autowired
    private BugRepository bugRepository;

    @Autowired
    private BugTaskRepository bugTaskRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private TestCaseTaskRepository testCaseTaskRepository;

    @GetMapping("/metrics")
    public Map<String, Object> getMetrics(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        
        Map<String, Object> metrics = new HashMap<>();

        // 1. Setup Date Filtering
        LocalDateTime start = null;
        LocalDateTime end = null;
        if (startDate != null && !startDate.isEmpty()) {
            start = LocalDateTime.parse(startDate + "T00:00:00");
        }
        if (endDate != null && !endDate.isEmpty()) {
            end = LocalDateTime.parse(endDate + "T23:59:59");
        }

        final LocalDateTime finalStart = start;
        final LocalDateTime finalEnd = end;

        // 2. Fetch and filter data
        List<Bug> allBugs = bugRepository.findAll().stream()
                .filter(b -> {
                    if (finalStart != null && b.getCreatedDate() != null && b.getCreatedDate().isBefore(finalStart)) return false;
                    if (finalEnd != null && b.getCreatedDate() != null && b.getCreatedDate().isAfter(finalEnd)) return false;
                    return true;
                })
                .collect(Collectors.toList());

        List<Task> allDevTasks = taskRepository.findAll().stream()
                .filter(t -> {
                    if (finalStart != null && t.getCreatedDate() != null && t.getCreatedDate().isBefore(finalStart)) return false;
                    if (finalEnd != null && t.getCreatedDate() != null && t.getCreatedDate().isAfter(finalEnd)) return false;
                    return true;
                })
                .collect(Collectors.toList());

        List<BugTask> allBugTasks = bugTaskRepository.findAll().stream()
                .filter(t -> {
                    if (finalStart != null && t.getCreatedDate() != null && t.getCreatedDate().isBefore(finalStart)) return false;
                    if (finalEnd != null && t.getCreatedDate() != null && t.getCreatedDate().isAfter(finalEnd)) return false;
                    return true;
                })
                .collect(Collectors.toList());

        List<TestCaseTask> allTestCaseTasks = testCaseTaskRepository.findAll().stream()
                .filter(t -> {
                    if (finalStart != null && t.getCreatedDate() != null && t.getCreatedDate().isBefore(finalStart)) return false;
                    if (finalEnd != null && t.getCreatedDate() != null && t.getCreatedDate().isAfter(finalEnd)) return false;
                    return true;
                })
                .collect(Collectors.toList());

        // --- BUG METRICS (For Testers/Admins) ---
        long totalBugs = allBugs.size();
        long openBugs = allBugs.stream().filter(b -> "OPEN".equals(b.getStatus()) || "IN_PROGRESS".equals(b.getStatus())).count();
        long closedBugs = allBugs.stream().filter(b -> "CLOSED".equals(b.getStatus()) || "RESOLVED".equals(b.getStatus()) || "VERIFIED".equals(b.getStatus())).count();
        long blockedBugs = allBugs.stream().filter(b -> "BLOCKED".equals(b.getStatus())).count();

        metrics.put("totalBugs", totalBugs);
        metrics.put("openBugs", openBugs);
        metrics.put("closedBugs", closedBugs);
        metrics.put("blockedBugs", blockedBugs);
        metrics.put("bugClosureRate", totalBugs == 0 ? 0 : (double) closedBugs / totalBugs * 100);

        Map<String, Long> bugStatusDistribution = allBugs.stream()
                .filter(b -> b.getStatus() != null)
                .collect(Collectors.groupingBy(Bug::getStatus, Collectors.counting()));
        metrics.put("bugStatusDistribution", bugStatusDistribution);

        Map<String, Long> bugsRaisedByTester = allBugs.stream()
                .filter(b -> b.getRaisedBy() != null)
                .collect(Collectors.groupingBy(b -> b.getRaisedBy().getFullName(), Collectors.counting()));
        metrics.put("bugsRaisedByTester", bugsRaisedByTester);

        Map<String, Long> bugsClosedByTester = allBugs.stream()
                .filter(b -> b.getRaisedBy() != null && ("CLOSED".equals(b.getStatus()) || "VERIFIED".equals(b.getStatus())))
                .collect(Collectors.groupingBy(b -> b.getRaisedBy().getFullName(), Collectors.counting()));
        metrics.put("bugsClosedByTester", bugsClosedByTester);

        Map<String, Long> invalidBugsRaisedByTester = allBugs.stream()
                .filter(b -> b.getRaisedBy() != null && "INVALID_BUG".equals(b.getStatus()))
                .collect(Collectors.groupingBy(b -> b.getRaisedBy().getFullName(), Collectors.counting()));
        metrics.put("invalidBugsRaisedByTester", invalidBugsRaisedByTester);


        // --- TASK METRICS (For Developers/Admins - Dev Tasks Only) ---
        long totalTasks = allDevTasks.size();
        long completedTasks = allDevTasks.stream().filter(t -> "CLOSED".equals(t.getStatus()) && "PROD_COMPLETED".equals(t.getStatus())).count();
        long openTasksForDashboard = allDevTasks.stream().filter(t -> "OPEN".equals(t.getStatus()) || "IN_PROGRESS".equals(t.getStatus())).count();
        long pendingTasks = totalTasks - completedTasks;

        metrics.put("totalTasks", totalTasks);
        metrics.put("openTasks", openTasksForDashboard); // Specific count for dashboard
        metrics.put("completedTasks", completedTasks);
        metrics.put("pendingTasks", pendingTasks);
        metrics.put("taskCompletionRate", totalTasks == 0 ? 0 : (double) completedTasks / totalTasks * 100);

        Map<String, Long> taskStatusDistribution = allDevTasks.stream()
                .filter(t -> t.getStatus() != null)
                .collect(Collectors.groupingBy(Task::getStatus, Collectors.counting()));
        metrics.put("taskStatusDistribution", taskStatusDistribution);

        Map<String, Long> taskCountPerDev = allDevTasks.stream()
                .filter(t -> t.getAssignedDeveloper() != null)
                .collect(Collectors.groupingBy(t -> t.getAssignedDeveloper().getFullName(), Collectors.counting()));
        metrics.put("taskCountPerDev", taskCountPerDev);

        Map<String, Long> pendingTaskCountPerDev = allDevTasks.stream()
                .filter(t -> t.getAssignedDeveloper() != null && !"CLOSED".equals(t.getStatus()) && !"PROD_COMPLETED".equals(t.getStatus()))
                .collect(Collectors.groupingBy(t -> t.getAssignedDeveloper().getFullName(), Collectors.counting()));
        metrics.put("pendingTaskCountPerDev", pendingTaskCountPerDev);

        // --- BUG TASK METRICS ---
        metrics.put("totalBugTasks", (long) allBugTasks.size());
        Map<String, Long> bugTaskCountPerTester = allBugTasks.stream()
                .filter(t -> t.getCreatedBy() != null)
                .collect(Collectors.groupingBy(t -> t.getCreatedBy().getFullName(), Collectors.counting()));
        metrics.put("bugTaskCountPerTester", bugTaskCountPerTester);

        Map<String, Long> bugsRaisedAgainstDev = allBugs.stream()
                .filter(b -> b.getAssignedDeveloper() != null)
                .collect(Collectors.groupingBy(b -> b.getAssignedDeveloper().getFullName(), Collectors.counting()));
        metrics.put("bugsRaisedAgainstDev", bugsRaisedAgainstDev);

        Map<String, Long> bugsSolvedByDev = allBugs.stream()
                .filter(b -> b.getAssignedDeveloper() != null && ("RESOLVED".equals(b.getStatus()) || "CLOSED".equals(b.getStatus())) || "INVALID_BUG".equals(b.getStatus()))
                .collect(Collectors.groupingBy(b -> b.getAssignedDeveloper().getFullName(), Collectors.counting()));
        metrics.put("bugsSolvedByDev", bugsSolvedByDev);

        // --- TEST CASE TASK METRICS ---
        metrics.put("totalTestCaseTasks", (long) allTestCaseTasks.size());

        return metrics;
    }
}

