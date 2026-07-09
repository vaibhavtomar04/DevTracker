package com.devtrack.api.services;

import com.devtrack.api.model.*;
import com.devtrack.api.repository.*;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class AnalyticsService {

    private final TaskRepository taskRepository;
    private final BugRepository bugRepository;
    private final BugReviewRepository bugReviewRepository;
    private final SprintTaskRepository sprintTaskRepository;
    private final UserRepository userRepository;
    private final SprintRepository sprintRepository;
    private final AuditLogRepository auditLogRepository;
    private final QualityRiskHistoryRepository qualityRiskHistoryRepository;

    public AnalyticsService(TaskRepository taskRepository,
                            BugRepository bugRepository,
                            BugReviewRepository bugReviewRepository,
                            SprintTaskRepository sprintTaskRepository,
                            UserRepository userRepository,
                            SprintRepository sprintRepository,
                            AuditLogRepository auditLogRepository,
                            QualityRiskHistoryRepository qualityRiskHistoryRepository) {
        this.taskRepository = taskRepository;
        this.bugRepository = bugRepository;
        this.bugReviewRepository = bugReviewRepository;
        this.sprintTaskRepository = sprintTaskRepository;
        this.userRepository = userRepository;
        this.sprintRepository = sprintRepository;
        this.auditLogRepository = auditLogRepository;
        this.qualityRiskHistoryRepository = qualityRiskHistoryRepository;
    }

    public Map<String, Object> getDashboardData() {
        List<Task> allCrs = taskRepository.findAll();
        List<Bug> allBugs = bugRepository.findAll();
        List<BugReview> allReviews = bugReviewRepository.findAll();
        List<SprintTask> allSprintTasks = sprintTaskRepository.findAll();
        List<User> allUsers = userRepository.findAll();
        List<AuditLog> allLogs = auditLogRepository.findAll();

        long totalCRs = allCrs.size();
        long totalBugs = allBugs.size();
        long qualityRiskCrCount = allCrs.stream().filter(Task::isQualityRisk).count();

        // 1. Bug Validation Rates
        long totalReviews = allReviews.size();
        double bugAcceptanceRate = 0.0;
        double bugRejectionRate = 0.0;
        double bugChallengeRate = 0.0;

        if (totalReviews > 0) {
            long accepted = allReviews.stream().filter(r -> "ACCEPTED".equalsIgnoreCase(r.getReviewStatus())).count();
            long rejected = allReviews.stream().filter(r -> "REJECTED".equalsIgnoreCase(r.getReviewStatus())).count();
            long challenged = allReviews.stream().filter(r -> "CHALLENGED".equalsIgnoreCase(r.getReviewStatus())).count();

            bugAcceptanceRate = (double) accepted / totalReviews * 100;
            bugRejectionRate = (double) rejected / totalReviews * 100;
            bugChallengeRate = (double) challenged / totalReviews * 100;
        }

        // 2. Average Bug Resolution Time
        List<Bug> resolvedBugs = allBugs.stream()
                .filter(b -> "RESOLVED".equalsIgnoreCase(b.getStatus()) || "CLOSED".equalsIgnoreCase(b.getStatus()))
                .filter(b -> b.getCreatedDate() != null && b.getUpdatedDate() != null)
                .toList();
        double averageBugResolutionHours = resolvedBugs.isEmpty() ? 0.0 :
                resolvedBugs.stream()
                        .mapToLong(b -> Duration.between(b.getCreatedDate(), b.getUpdatedDate()).toHours())
                        .average().orElse(0.0);

        // 3. Average Testing Duration
        List<Task> testedCrs = allCrs.stream()
                .filter(t -> t.getTestingStartedDate() != null && t.getTestingCompletedDate() != null)
                .toList();
        double averageTestingDurationHours = testedCrs.isEmpty() ? 0.0 :
                testedCrs.stream()
                        .mapToLong(t -> Duration.between(t.getTestingStartedDate(), t.getTestingCompletedDate()).toHours())
                        .average().orElse(0.0);

        // 4. Sprint Task Completion Rate
        double sprintTaskCompletionRate = 0.0;
        if (!allSprintTasks.isEmpty()) {
            long completed = allSprintTasks.stream().filter(t -> "COMPLETED".equalsIgnoreCase(t.getStatus()) || "DONE".equalsIgnoreCase(t.getStatus())).count();
            sprintTaskCompletionRate = (double) completed / allSprintTasks.size() * 100;
        }

        // 5. 48h Testing SLA compliance
        double testingSlaComplianceRate = 0.0;
        if (!testedCrs.isEmpty()) {
            long compliant = testedCrs.stream()
                    .filter(t -> Duration.between(t.getTestingStartedDate(), t.getTestingCompletedDate()).toHours() <= 48)
                    .count();
            testingSlaComplianceRate = (double) compliant / testedCrs.size() * 100;
        }

        // 6. 24h Approval SLA compliance
        double approvalSlaComplianceRate = 0.0;
        List<Task> approvedCrs = allCrs.stream()
                .filter(t -> t.getUatDate() != null && t.getProductionDate() != null)
                .toList();
        if (!approvedCrs.isEmpty()) {
            long compliant = approvedCrs.stream()
                    .filter(t -> !t.getProductionDate().isAfter(t.getUatDate().plusDays(1)))
                    .count();
            approvalSlaComplianceRate = (double) compliant / approvedCrs.size() * 100;
        }

        // 7. Trend and charts datasets
        List<Map<String, Object>> qualityTrend = new ArrayList<>();
        List<Map<String, Object>> slaCompliance = new ArrayList<>();
        List<Map<String, Object>> bugConversion = new ArrayList<>();
        List<Map<String, Object>> developerResponseTimes = new ArrayList<>();
        List<Map<String, Object>> testerResponseTimes = new ArrayList<>();
        List<Map<String, Object>> sprintBurndown = new ArrayList<>();

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd");
        LocalDateTime now = LocalDateTime.now();
        for (int i = 6; i >= 0; i--) {
            LocalDateTime targetDate = now.minusDays(i);
            String dayLabel = targetDate.format(formatter);
            long riskCountAtDay = allCrs.stream()
                    .filter(Task::isQualityRisk)
                    .filter(t -> t.getUpdatedDate() != null && t.getUpdatedDate().isBefore(targetDate))
                    .count();
            qualityTrend.add(Map.of("name", dayLabel, "Quality Risks", riskCountAtDay));
        }

        List<Sprint> sprints = sprintRepository.findAll();
        sprints.sort(Comparator.comparing(Sprint::getId));
        if (sprints.isEmpty()) {
            slaCompliance.add(Map.of("name", "Sprint 1", "Testing SLA", 0.0, "Approval SLA", 0.0));
        } else {
            for (Sprint sprint : sprints) {
                List<Task> sprintCrs = allCrs.stream()
                        .filter(t -> t.getSprintId() != null && t.getSprintId().equals(sprint.getId()))
                        .toList();

                double testSla = 100.0;
                List<Task> sprintTested = sprintCrs.stream()
                        .filter(t -> t.getTestingStartedDate() != null && t.getTestingCompletedDate() != null)
                        .toList();
                if (!sprintTested.isEmpty()) {
                    long compliant = sprintTested.stream()
                            .filter(t -> Duration.between(t.getTestingStartedDate(), t.getTestingCompletedDate()).toHours() <= 48)
                            .count();
                    testSla = (double) compliant / sprintTested.size() * 100.0;
                }

                double appSla = 100.0;
                List<Task> sprintApproved = sprintCrs.stream()
                        .filter(t -> t.getUatDate() != null && t.getProductionDate() != null)
                        .toList();
                if (!sprintApproved.isEmpty()) {
                    long compliant = sprintApproved.stream()
                            .filter(t -> !t.getProductionDate().isAfter(t.getUatDate().plusDays(1)))
                            .count();
                    appSla = (double) compliant / sprintApproved.size() * 100.0;
                }

                slaCompliance.add(Map.of(
                        "name", sprint.getName(),
                        "Testing SLA", Math.round(testSla * 10.0) / 10.0,
                        "Approval SLA", Math.round(appSla * 10.0) / 10.0
                ));
            }
        }

        long acceptedReviews = allReviews.stream().filter(r -> "ACCEPTED".equalsIgnoreCase(r.getReviewStatus())).count();
        long rejectedReviews = allReviews.stream().filter(r -> "REJECTED".equalsIgnoreCase(r.getReviewStatus())).count();
        long challengedReviews = allReviews.stream().filter(r -> "CHALLENGED".equalsIgnoreCase(r.getReviewStatus())).count();

        bugConversion.add(Map.of("name", "Accepted", "value", acceptedReviews));
        bugConversion.add(Map.of("name", "Rejected", "value", rejectedReviews));
        bugConversion.add(Map.of("name", "Challenged", "value", challengedReviews));

        // Group audit logs by entityId for TASK entityType
        Map<Long, List<AuditLog>> taskLogsMap = new HashMap<>();
        for (AuditLog log : allLogs) {
            if ("TASK".equalsIgnoreCase(log.getEntityType())) {
                taskLogsMap.computeIfAbsent(log.getEntityId(), k -> new ArrayList<>()).add(log);
            }
        }

        Map<Long, Double> taskDevTimes = new HashMap<>();
        Map<Long, Double> taskTestTimes = new HashMap<>();

        for (Task t : allCrs) {
            // Dev Time
            if (t.getDevStartDate() != null && t.getSitDate() != null) {
                double hours = Duration.between(t.getDevStartDate().atStartOfDay(), t.getSitDate().atStartOfDay()).toHours();
                taskDevTimes.put(t.getId(), hours);
            } else {
                List<AuditLog> logs = taskLogsMap.getOrDefault(t.getId(), Collections.emptyList());
                logs.sort(Comparator.comparing(AuditLog::getChangedDate));
                LocalDateTime start = null;
                LocalDateTime end = null;
                for (AuditLog log : logs) {
                    if ("status".equalsIgnoreCase(log.getFieldName())) {
                        if ("IN_PROGRESS".equalsIgnoreCase(log.getNewValue())) {
                            start = log.getChangedDate();
                        } else if (start != null && ("SIT_DEPLOYED".equalsIgnoreCase(log.getNewValue()) ||
                                                     "SIT_COMPLETED".equalsIgnoreCase(log.getNewValue()) ||
                                                     "CODE_REVIEW".equalsIgnoreCase(log.getNewValue()) ||
                                                     "MOVE_TO_UAT".equalsIgnoreCase(log.getNewValue()))) {
                            end = log.getChangedDate();
                            break;
                        }
                    }
                }
                if (start != null && end != null && !end.isBefore(start)) {
                    taskDevTimes.put(t.getId(), (double) Duration.between(start, end).toHours());
                }
            }

            // Test Time
            if (t.getTestingStartedDate() != null && t.getTestingCompletedDate() != null) {
                double hours = Duration.between(t.getTestingStartedDate(), t.getTestingCompletedDate()).toHours();
                taskTestTimes.put(t.getId(), hours);
            } else {
                List<AuditLog> logs = taskLogsMap.getOrDefault(t.getId(), Collections.emptyList());
                logs.sort(Comparator.comparing(AuditLog::getChangedDate));
                LocalDateTime start = null;
                LocalDateTime end = null;
                for (AuditLog log : logs) {
                    if ("status".equalsIgnoreCase(log.getFieldName())) {
                        if ("UAT_TESTING".equalsIgnoreCase(log.getNewValue()) || "UAT_TESTING_POOL".equalsIgnoreCase(log.getNewValue())) {
                            start = log.getChangedDate();
                        } else if (start != null && ("TESTING_COMPLETED".equalsIgnoreCase(log.getNewValue()) ||
                                                     "BUG_FOUND".equalsIgnoreCase(log.getNewValue()) ||
                                                     "UAT_COMPLETED".equalsIgnoreCase(log.getNewValue()) ||
                                                     "PROD_DEPLOYED".equalsIgnoreCase(log.getNewValue()) ||
                                                     "CLOSED".equalsIgnoreCase(log.getNewValue()))) {
                            end = log.getChangedDate();
                            break;
                        }
                    }
                }
                if (start != null && end != null && !end.isBefore(start)) {
                    taskTestTimes.put(t.getId(), (double) Duration.between(start, end).toHours());
                }
            }
        }

        for (User u : allUsers) {
            boolean isDev = u.getRoles().contains(Role.DEVELOPER) || u.getRoles().contains(Role.DEVADMIN);
            boolean isTester = u.getRoles().contains(Role.TESTER) || u.getRoles().contains(Role.TESTADMIN);

            if (isDev) {
                List<Double> times = allCrs.stream()
                        .filter(t -> t.getAssignedDeveloper() != null && t.getAssignedDeveloper().getId().equals(u.getId()))
                        .map(t -> taskDevTimes.get(t.getId()))
                        .filter(Objects::nonNull)
                        .toList();
                double avg = times.isEmpty() ? 0.0 : times.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
                developerResponseTimes.add(Map.of("name", u.getFullName() != null ? u.getFullName() : u.getUsername(), "Response Time", Math.round(avg * 10.0) / 10.0));
            }
            if (isTester) {
                List<Double> times = allCrs.stream()
                        .filter(t -> t.getTester() != null && t.getTester().getId().equals(u.getId()))
                        .map(t -> taskTestTimes.get(t.getId()))
                        .filter(Objects::nonNull)
                        .toList();
                double avg = times.isEmpty() ? 0.0 : times.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
                testerResponseTimes.add(Map.of("name", u.getFullName() != null ? u.getFullName() : u.getUsername(), "Response Time", Math.round(avg * 10.0) / 10.0));
            }
        }

        Sprint activeSprint = sprintRepository.findByStatus("ACTIVE").orElse(null);
        if (activeSprint == null) {
            List<Sprint> allSprints = sprintRepository.findAllByOrderByCreatedDateDesc();
            if (!allSprints.isEmpty()) {
                activeSprint = allSprints.get(0);
            }
        }

        final Sprint finalActiveSprint = activeSprint;
        if (finalActiveSprint != null) {
            LocalDate start = finalActiveSprint.getStartDate();
            LocalDate end = finalActiveSprint.getEndDate();
            if (start != null && end != null && !end.isBefore(start)) {
                long totalDays = java.time.temporal.ChronoUnit.DAYS.between(start, end);
                if (totalDays <= 0) totalDays = 1;

                List<SprintTask> sprintTasks = allSprintTasks.stream()
                        .filter(st -> st.getSprintId() != null && st.getSprintId().equals(finalActiveSprint.getId()))
                        .toList();

                long totalStoryPoints = sprintTasks.stream()
                        .mapToLong(st -> st.getStoryPoints() != null ? st.getStoryPoints() : 0)
                        .sum();

                for (int d = 0; d <= totalDays; d++) {
                    LocalDate currentDayDate = start.plusDays(d);
                    double ideal = totalStoryPoints - (d * (double) totalStoryPoints / totalDays);
                    ideal = Math.max(0.0, Math.round(ideal * 10.0) / 10.0);

                    long remaining = 0;
                    for (SprintTask st : sprintTasks) {
                        int pts = st.getStoryPoints() != null ? st.getStoryPoints() : 0;
                        boolean isDone = "COMPLETED".equalsIgnoreCase(st.getStatus()) || "DONE".equalsIgnoreCase(st.getStatus());
                        if (isDone) {
                            LocalDate compDate = st.getModifiedDate() != null ? st.getModifiedDate().toLocalDate() : start;
                            if (compDate.isAfter(currentDayDate)) {
                                remaining += pts;
                            }
                        } else {
                            remaining += pts;
                        }
                    }

                    sprintBurndown.add(Map.of(
                            "name", "Day " + (d + 1),
                            "Remaining", remaining,
                            "Ideal", ideal
                    ));
                }
            }
        }
        if (sprintBurndown.isEmpty()) {
            sprintBurndown.add(Map.of("name", "Day 1", "Remaining", 0, "Ideal", 0));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalCRs", totalCRs);
        result.put("totalBugs", totalBugs);
        result.put("qualityRiskCrCount", qualityRiskCrCount);
        result.put("bugAcceptanceRate", Math.round(bugAcceptanceRate * 10.0) / 10.0);
        result.put("bugRejectionRate", Math.round(bugRejectionRate * 10.0) / 10.0);
        result.put("bugChallengeRate", Math.round(bugChallengeRate * 10.0) / 10.0);
        result.put("averageBugResolutionHours", Math.round(averageBugResolutionHours * 10.0) / 10.0);
        result.put("averageTestingDurationHours", Math.round(averageTestingDurationHours * 10.0) / 10.0);
        result.put("sprintTaskCompletionRate", Math.round(sprintTaskCompletionRate * 10.0) / 10.0);
        result.put("testingSlaComplianceRate", Math.round(testingSlaComplianceRate * 10.0) / 10.0);
        result.put("approvalSlaComplianceRate", Math.round(approvalSlaComplianceRate * 10.0) / 10.0);

        result.put("qualityTrend", qualityTrend);
        result.put("slaCompliance", slaCompliance);
        result.put("bugConversion", bugConversion);
        result.put("developerResponseTimes", developerResponseTimes);
        result.put("testerResponseTimes", testerResponseTimes);
        result.put("sprintBurndown", sprintBurndown);

        return result;
    }
}
