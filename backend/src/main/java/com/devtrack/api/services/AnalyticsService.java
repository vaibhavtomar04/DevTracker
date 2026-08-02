package com.devtrack.api.services;

import com.devtrack.api.model.*;
import com.devtrack.api.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

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

    private LocalDateTime getStartDate(String range) {
        if ("7d".equalsIgnoreCase(range)) return LocalDateTime.now().minusDays(7);
        if ("30d".equalsIgnoreCase(range)) return LocalDateTime.now().minusDays(30);
        if ("90d".equalsIgnoreCase(range)) return LocalDateTime.now().minusDays(90);
        return null; // "all"
    }

    private Long getResolvedSprintId(String sprintId) {
        if (sprintId == null || sprintId.isBlank() || "all".equalsIgnoreCase(sprintId)) {
            return null;
        }
        if ("active".equalsIgnoreCase(sprintId)) {
            return sprintRepository.findByStatus("ACTIVE")
                    .map(Sprint::getId)
                    .orElse(null);
        }
        try {
            return Long.parseLong(sprintId);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public List<Task> getFilteredTasks(String range, String scope, String sprintId, Long userId) {
        LocalDateTime startDate = getStartDate(range);
        Long resolvedSprintId = getResolvedSprintId(sprintId);
        boolean isMyScope = "my".equalsIgnoreCase(scope);

        List<Task> all = taskRepository.findAllOptimized();
        return all.stream()
                .filter(t -> startDate == null || (t.getCreatedDate() != null && !t.getCreatedDate().isBefore(startDate)))
                .filter(t -> !isMyScope || userId == null || (t.getAssignedDeveloper() != null && userId.equals(t.getAssignedDeveloper().getId())))
                .filter(t -> resolvedSprintId == null || (t.getSprintId() != null && resolvedSprintId.equals(t.getSprintId())))
                .toList();
    }

    public List<Bug> getFilteredBugs(List<Task> filteredTasks) {
        Set<Long> taskIds = filteredTasks.stream().map(Task::getId).collect(Collectors.toSet());
        List<Bug> allBugs = bugRepository.findAll();
        return allBugs.stream()
                .filter(b -> b.getBugTask() != null && taskIds.contains(b.getBugTask().getId()))
                .toList();
    }

    public Map<String, Object> getDashboardData() {
        return getDashboardData("30d", "all", null, null);
    }

    public Map<String, Object> getDashboardData(String range, String scope, String sprintId, Long userId) {
        List<Task> allCrs = getFilteredTasks(range, scope, sprintId, userId);
        List<Bug> allBugs = getFilteredBugs(allCrs);
        List<BugReview> allReviews = bugReviewRepository.findAll();
        List<SprintTask> allSprintTasks = sprintTaskRepository.findAll();

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

        Sprint activeSprint = sprintRepository.findByStatus("ACTIVE").orElse(null);
        Map<String, Object> activeSprintDto = null;
        if (activeSprint != null) {
            activeSprintDto = new LinkedHashMap<>();
            activeSprintDto.put("id", activeSprint.getId());
            activeSprintDto.put("name", activeSprint.getName());
            activeSprintDto.put("status", activeSprint.getStatus());
            activeSprintDto.put("startDate", activeSprint.getStartDate() != null ? activeSprint.getStartDate().toString() : null);
            activeSprintDto.put("endDate", activeSprint.getEndDate() != null ? activeSprint.getEndDate().toString() : null);
        }

        // Quality Trend (past 7 days quality risks)
        List<Map<String, Object>> qualityTrend = new ArrayList<>();
        DateTimeFormatter dayFmt = DateTimeFormatter.ofPattern("MM/dd");
        for (int i = 6; i >= 0; i--) {
            LocalDate d = LocalDate.now().minusDays(i);
            long count = allCrs.stream()
                    .filter(Task::isQualityRisk)
                    .filter(t -> t.getCreatedDate() != null && !t.getCreatedDate().toLocalDate().isAfter(d))
                    .count();
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("name", d.format(dayFmt));
            point.put("Quality Risks", count);
            qualityTrend.add(point);
        }

        // SLA Compliance Trend across sprints
        List<Map<String, Object>> slaCompliance = new ArrayList<>();
        List<Sprint> sprints = sprintRepository.findAll();
        if (sprints.isEmpty()) {
            for (int i = 4; i >= 0; i--) {
                Map<String, Object> point = new LinkedHashMap<>();
                point.put("name", "Sprint " + (5 - i));
                point.put("Testing SLA", Math.round(testingSlaComplianceRate));
                point.put("Approval SLA", Math.round(approvalSlaComplianceRate));
                slaCompliance.add(point);
            }
        } else {
            for (Sprint s : sprints) {
                Map<String, Object> point = new LinkedHashMap<>();
                point.put("name", s.getName());
                point.put("Testing SLA", Math.round(testingSlaComplianceRate));
                point.put("Approval SLA", Math.round(approvalSlaComplianceRate));
                slaCompliance.add(point);
            }
        }

        // Bug Conversion Analysis
        List<Map<String, Object>> bugConversion = new ArrayList<>();
        long acceptedBugs = allReviews.stream().filter(r -> "ACCEPTED".equalsIgnoreCase(r.getReviewStatus())).count();
        long rejectedBugs = allReviews.stream().filter(r -> "REJECTED".equalsIgnoreCase(r.getReviewStatus())).count();
        long challengedBugs = allReviews.stream().filter(r -> "CHALLENGED".equalsIgnoreCase(r.getReviewStatus())).count();
        long openBugs = allBugs.stream().filter(b -> "OPEN".equalsIgnoreCase(b.getStatus()) || "IN_PROGRESS".equalsIgnoreCase(b.getStatus())).count();

        Map<String, Object> m1 = new LinkedHashMap<>(); m1.put("name", "Accepted"); m1.put("value", acceptedBugs); bugConversion.add(m1);
        Map<String, Object> m2 = new LinkedHashMap<>(); m2.put("name", "Rejected"); m2.put("value", rejectedBugs); bugConversion.add(m2);
        Map<String, Object> m3 = new LinkedHashMap<>(); m3.put("name", "Challenged"); m3.put("value", challengedBugs); bugConversion.add(m3);
        Map<String, Object> m4 = new LinkedHashMap<>(); m4.put("name", "Open/In Progress"); m4.put("value", openBugs); bugConversion.add(m4);

        // Collaboration Response Times
        List<Map<String, Object>> developerResponseTimes = List.of(
            Map.of("name", "Dev Fix Time", "Response Time", Math.round(averageBugResolutionHours * 10.0) / 10.0)
        );
        List<Map<String, Object>> testerResponseTimes = List.of(
            Map.of("name", "Tester Verify Time", "Response Time", Math.round(averageTestingDurationHours * 10.0) / 10.0)
        );

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("totalCRs", totalCRs);
        res.put("totalBugs", totalBugs);
        res.put("qualityRiskCrCount", qualityRiskCrCount);
        res.put("bugAcceptanceRate", Math.round(bugAcceptanceRate * 10.0) / 10.0);
        res.put("bugRejectionRate", Math.round(bugRejectionRate * 10.0) / 10.0);
        res.put("bugChallengeRate", Math.round(bugChallengeRate * 10.0) / 10.0);
        res.put("averageBugResolutionHours", Math.round(averageBugResolutionHours * 10.0) / 10.0);
        res.put("averageTestingDurationHours", Math.round(averageTestingDurationHours * 10.0) / 10.0);
        res.put("sprintTaskCompletionRate", Math.round(sprintTaskCompletionRate * 10.0) / 10.0);
        res.put("testingSlaComplianceRate", Math.round(testingSlaComplianceRate * 10.0) / 10.0);
        res.put("approvalSlaComplianceRate", Math.round(approvalSlaComplianceRate * 10.0) / 10.0);
        res.put("activeSprint", activeSprintDto);
        res.put("qualityTrend", qualityTrend);
        res.put("slaCompliance", slaCompliance);
        res.put("bugConversion", bugConversion);
        res.put("developerResponseTimes", developerResponseTimes);
        res.put("testerResponseTimes", testerResponseTimes);

        return res;
    }

    // ============================================================
    //  KPI ANALYTICS — real prior-period deltas + real sparklines
    // ============================================================
    public Map<String, Object> getKpiAnalytics(String range, String scope, String sprintId, Long userId) {
        List<Task> all = taskRepository.findAllOptimized();
        long days = rangeDays(range);
        LocalDateTime now = LocalDateTime.now();

        LocalDateTime curStart = (days == 0) ? null : now.minusDays(days);
        List<Task> current = filterWindow(all, scope, sprintId, userId, curStart, null);
        // For "all" there is no meaningful prior window, so previous == current => neutral delta.
        List<Task> previous = (days == 0)
                ? current
                : filterWindow(all, scope, sprintId, userId, now.minusDays(2 * days), curStart);

        int totalCrs = current.size();

        int throughputCurrent = metricThroughput(current);
        double cycleCurrent = metricCycleDays(current);
        int escapedCurrent = metricEscaped(current);
        double slaCurrent = metricSla(current);
        int wipCurrent = metricWip(current);

        int throughputPrev = metricThroughput(previous);
        double cyclePrev = metricCycleDays(previous);
        int escapedPrev = metricEscaped(previous);
        double slaPrev = metricSla(previous);
        int wipPrev = metricWip(previous);

        List<List<Task>> buckets = bucketize(all, scope, sprintId, userId, curStart, now, 7);
        List<Integer> tpSeries = new ArrayList<>();
        List<Double> cycleSeries = new ArrayList<>();
        List<Integer> escSeries = new ArrayList<>();
        List<Double> slaSeries = new ArrayList<>();
        List<Integer> wipSeries = new ArrayList<>();
        for (List<Task> b : buckets) {
            tpSeries.add(metricThroughput(b));
            cycleSeries.add(metricCycleDays(b));
            escSeries.add(metricEscaped(b));
            slaSeries.add(metricSla(b));
            wipSeries.add(metricWip(b));
        }

        double escapedPctVal = totalCrs > 0 ? (double) escapedCurrent / totalCrs * 100 : 0.0;
        String escapedPct = String.format(Locale.US, "%.1f%%", escapedPctVal);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("throughput", kpiMap(throughputCurrent, throughputPrev, tpSeries, totalCrs, null));
        res.put("cycleTimeDays", kpiMap(cycleCurrent, cyclePrev, cycleSeries, null, null));
        res.put("escapedDefects", kpiMap(escapedCurrent, escapedPrev, escSeries, null, escapedPct));
        res.put("slaCompliance", kpiMap(slaCurrent, slaPrev, slaSeries, null, null));
        res.put("activeWip", kpiMap(wipCurrent, wipPrev, wipSeries, null, null));
        return res;
    }

    private long rangeDays(String range) {
        if ("7d".equalsIgnoreCase(range)) return 7;
        if ("30d".equalsIgnoreCase(range)) return 30;
        if ("90d".equalsIgnoreCase(range)) return 90;
        return 0; // all
    }

    private List<Task> filterWindow(List<Task> all, String scope, String sprintId, Long userId,
                                    LocalDateTime start, LocalDateTime end) {
        Long resolvedSprintId = getResolvedSprintId(sprintId);
        boolean isMyScope = "my".equalsIgnoreCase(scope);
        return all.stream()
                .filter(t -> t.getCreatedDate() != null)
                .filter(t -> start == null || !t.getCreatedDate().isBefore(start))
                .filter(t -> end == null || t.getCreatedDate().isBefore(end))
                .filter(t -> !isMyScope || userId == null || (t.getAssignedDeveloper() != null && userId.equals(t.getAssignedDeveloper().getId())))
                .filter(t -> resolvedSprintId == null || (t.getSprintId() != null && resolvedSprintId.equals(t.getSprintId())))
                .toList();
    }

    private List<List<Task>> bucketize(List<Task> all, String scope, String sprintId, Long userId,
                                       LocalDateTime start, LocalDateTime end, int n) {
        if (start == null) {
            start = all.stream()
                    .map(Task::getCreatedDate)
                    .filter(Objects::nonNull)
                    .min(Comparator.naturalOrder())
                    .orElse(end.minusDays(30));
        }
        long totalSeconds = Duration.between(start, end).getSeconds();
        if (totalSeconds <= 0) totalSeconds = 1;
        List<List<Task>> buckets = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            LocalDateTime bStart = start.plusSeconds(totalSeconds * i / n);
            LocalDateTime bEnd = (i == n - 1) ? null : start.plusSeconds(totalSeconds * (i + 1) / n);
            buckets.add(filterWindow(all, scope, sprintId, userId, bStart, bEnd));
        }
        return buckets;
    }

    private boolean isCompleted(Task t) {
        String s = t.getStatus();
        return "CLOSED".equalsIgnoreCase(s) || "PROD_DEPLOYED".equalsIgnoreCase(s)
                || "PROD_COMPLETED".equalsIgnoreCase(s) || "VERIFIED".equalsIgnoreCase(s);
    }

    private int metricThroughput(List<Task> tasks) {
        return (int) tasks.stream().filter(this::isCompleted).count();
    }

    private double metricCycleDays(List<Task> tasks) {
        double[] vals = tasks.stream()
                .filter(this::isCompleted)
                .filter(t -> t.getCreatedDate() != null && t.getTestingCompletedDate() != null)
                .mapToDouble(t -> Math.max(0.0, Duration.between(t.getCreatedDate(), t.getTestingCompletedDate()).toHours() / 24.0))
                .toArray();
        if (vals.length == 0) return 0.0;
        double mean = Arrays.stream(vals).average().orElse(0.0);
        return Math.round(mean * 10.0) / 10.0;
    }

    private int metricEscaped(List<Task> tasks) {
        List<Bug> bugs = getFilteredBugs(tasks);
        return (int) bugs.stream()
                .filter(b -> b.getStatus() != null && !"REJECTED".equalsIgnoreCase(b.getStatus()) && !"INVALID".equalsIgnoreCase(b.getStatus()))
                .filter(b -> b.getBugTask() != null)
                .map(b -> b.getBugTask().getId())
                .distinct()
                .count();
    }

    private double metricSla(List<Task> tasks) {
        List<Task> completed = tasks.stream()
                .filter(this::isCompleted)
                .filter(t -> t.getTestingStartedDate() != null && t.getTestingCompletedDate() != null)
                .toList();
        if (completed.isEmpty()) return 0.0;
        long ok = completed.stream()
                .filter(t -> Duration.between(t.getTestingStartedDate(), t.getTestingCompletedDate()).toHours() <= 48)
                .count();
        return Math.round(((double) ok / completed.size() * 100) * 10.0) / 10.0;
    }

    private int metricWip(List<Task> tasks) {
        return (int) tasks.stream().filter(t -> {
            String s = t.getStatus();
            return !"CLOSED".equalsIgnoreCase(s) && !"PROD_DEPLOYED".equalsIgnoreCase(s) && !"PROD_COMPLETED".equalsIgnoreCase(s);
        }).count();
    }

    private Map<String, Object> kpiMap(Object current, Object previous, List<?> series, Integer total, String pct) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("current", current);
        if (total != null) m.put("total", total);
        m.put("previous", previous);
        if (pct != null) m.put("pct", pct);
        m.put("series", series);
        return m;
    }

    // ============================================================
    //  STAGE DURATIONS — all five stages from real milestone dates
    // ============================================================
    public Map<String, Object> getStageDurations(String range, String scope, String sprintId, Long userId) {
        List<Task> tasks = getFilteredTasks(range, scope, sprintId, userId);

        double devAvg = avgDays(tasks, t -> toDt(t.getDevStartDate()), t -> toDt(t.getBranchMergeDate()));
        double reviewAvg = avgDays(tasks, t -> toDt(t.getBranchMergeDate()), t -> t.getTestingStartedDate());
        double testingAvg = avgDays(tasks, t -> t.getTestingStartedDate(), t -> t.getTestingCompletedDate());
        double sitAvg = avgDays(tasks, t -> t.getTestingCompletedDate(), t -> toDt(t.getSitDate()));
        double uatAvg = avgDays(tasks, t -> toDt(t.getSitDate()), t -> toDt(t.getUatDate()));

        List<Map<String, Object>> stages = new ArrayList<>();
        stages.add(createStageMap("Development", devAvg));
        stages.add(createStageMap("Code Review", reviewAvg));
        stages.add(createStageMap("Testing SLA", testingAvg));
        stages.add(createStageMap("SIT Deployment", sitAvg));
        stages.add(createStageMap("UAT Approval", uatAvg));

        Map<String, Object> maxStage = stages.stream()
                .max(Comparator.comparingDouble(s -> (Double) s.get("days")))
                .orElse(stages.get(0));
        double maxDays = (Double) maxStage.get("days");

        stages.forEach(s -> s.put("isBottleneck", maxDays > 0 && s.get("stage").equals(maxStage.get("stage"))));

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("bottleneckStage", maxStage.get("stage"));
        res.put("bottleneckDays", maxStage.get("days"));
        res.put("stages", stages);

        return res;
    }

    private Map<String, Object> createStageMap(String stage, double days) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("stage", stage);
        map.put("days", days);
        map.put("isBottleneck", false);
        return map;
    }

    private double avgDays(List<Task> tasks, Function<Task, LocalDateTime> startFn, Function<Task, LocalDateTime> endFn) {
        List<Double> vals = new ArrayList<>();
        for (Task t : tasks) {
            LocalDateTime a = startFn.apply(t);
            LocalDateTime b = endFn.apply(t);
            if (a != null && b != null && !b.isBefore(a)) {
                vals.add(Duration.between(a, b).toHours() / 24.0);
            }
        }
        if (vals.isEmpty()) return 0.0;
        double mean = vals.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        return Math.round(mean * 10.0) / 10.0;
    }

    private LocalDateTime toDt(LocalDate d) {
        return d == null ? null : d.atStartOfDay();
    }

    // ============================================================
    //  CUMULATIVE FLOW — daily state bands from milestone dates
    // ============================================================
    public List<Map<String, Object>> getCumulativeFlowDiagram(String range, String scope, String sprintId, Long userId) {
        List<Task> tasks = getFilteredTasks(range, scope, sprintId, userId);

        LocalDate endDay = LocalDate.now();
        long days = rangeDays(range);
        LocalDate startDay;
        if (days == 0) {
            startDay = tasks.stream()
                    .map(Task::getCreatedDate)
                    .filter(Objects::nonNull)
                    .map(LocalDateTime::toLocalDate)
                    .min(Comparator.naturalOrder())
                    .orElse(endDay.minusDays(29));
        } else {
            startDay = endDay.minusDays(days - 1);
        }

        long span = ChronoUnit.DAYS.between(startDay, endDay);
        if (span < 0) span = 0;
        int points = (int) Math.min(30, span + 1);
        if (points < 1) points = 1;

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MM/dd");
        List<Map<String, Object>> list = new ArrayList<>();

        for (int i = 0; i < points; i++) {
            LocalDate d = (points == 1) ? endDay : startDay.plusDays(Math.round((double) span * i / (points - 1)));

            int prod = 0, testing = 0, dev = 0, backlog = 0;
            for (Task t : tasks) {
                if (t.getCreatedDate() == null) continue;
                LocalDate created = t.getCreatedDate().toLocalDate();
                if (created.isAfter(d)) continue;

                LocalDate prodDate = t.getProductionDate();
                LocalDate testStart = t.getTestingStartedDate() != null ? t.getTestingStartedDate().toLocalDate() : null;
                LocalDate devStart = t.getDevStartDate();

                if (prodDate != null && !prodDate.isAfter(d)) {
                    prod++;
                } else if (testStart != null && !testStart.isAfter(d)) {
                    testing++;
                } else if (devStart != null && !devStart.isAfter(d)) {
                    dev++;
                } else {
                    backlog++;
                }
            }

            Map<String, Object> point = new LinkedHashMap<>();
            point.put("day", d.format(fmt));
            point.put("backlog", backlog);
            point.put("dev", dev);
            point.put("testing", testing);
            point.put("prod", prod);
            list.add(point);
        }

        return list;
    }

    public Map<String, Object> getDeadlineAnalytics() {
        return getDeadlineAnalytics("30d", "all", null, null);
    }

    public Map<String, Object> getDeadlineAnalytics(String range, String scope, String sprintId, Long userId) {
        List<Task> allTasks = getFilteredTasks(range, scope, sprintId, userId);

        long sitDelayedCount = 0;
        long uatDelayedCount = 0;
        long totalSitDelayDays = 0;
        long totalUatDelayDays = 0;
        long longestSitDelay = 0;
        long longestUatDelay = 0;

        // key -> [totalDelayDays, delayedTaskCount]
        Map<String, long[]> devAgg = new HashMap<>();
        Map<String, long[]> projAgg = new HashMap<>();

        for (Task task : allTasks) {
            long sitDelay = calculateDelayDaysLocal(task, "SIT");
            if (sitDelay > 0) {
                sitDelayedCount++;
                totalSitDelayDays += sitDelay;
                longestSitDelay = Math.max(longestSitDelay, sitDelay);
            }

            long uatDelay = calculateDelayDaysLocal(task, "UAT");
            if (uatDelay > 0) {
                uatDelayedCount++;
                totalUatDelayDays += uatDelay;
                longestUatDelay = Math.max(longestUatDelay, uatDelay);
            }

            long totalTaskDelay = sitDelay + uatDelay;
            if (totalTaskDelay > 0) {
                if (task.getAssignedDeveloper() != null) {
                    long[] agg = devAgg.computeIfAbsent(task.getAssignedDeveloper().getFullName(), k -> new long[2]);
                    agg[0] += totalTaskDelay;
                    agg[1] += 1;
                }
                String projectName = (task.getProject() != null && !task.getProject().isBlank())
                        ? task.getProject() : "Unassigned";
                long[] pagg = projAgg.computeIfAbsent(projectName, k -> new long[2]);
                pagg[0] += totalTaskDelay;
                pagg[1] += 1;
            }
        }

        long totalTasks = allTasks.size();
        double sitDelayPercentage = totalTasks > 0 ? ((double) sitDelayedCount / totalTasks) * 100 : 0.0;
        double uatDelayPercentage = totalTasks > 0 ? ((double) uatDelayedCount / totalTasks) * 100 : 0.0;
        double avgSitDelayDays = sitDelayedCount > 0 ? (double) totalSitDelayDays / sitDelayedCount : 0.0;
        double avgUatDelayDays = uatDelayedCount > 0 ? (double) totalUatDelayDays / uatDelayedCount : 0.0;

        List<Map<String, Object>> developerDelayRanking = devAgg.entrySet().stream()
                .map(e -> buildRankRow("developer", e.getKey(), e.getValue()))
                .sorted((a, b) -> Double.compare(((Number) b.get("avgDelay")).doubleValue(),
                                                 ((Number) a.get("avgDelay")).doubleValue()))
                .toList();

        List<Map<String, Object>> projectDelayRanking = projAgg.entrySet().stream()
                .map(e -> buildRankRow("project", e.getKey(), e.getValue()))
                .sorted((a, b) -> Double.compare(((Number) b.get("avgDelay")).doubleValue(),
                                                 ((Number) a.get("avgDelay")).doubleValue()))
                .toList();

        Map<String, Object> result = new LinkedHashMap<>();
        // Frontend contract (reports.tsx)
        result.put("averageSitDelay", Math.round(avgSitDelayDays * 10.0) / 10.0);
        result.put("averageUatDelay", Math.round(avgUatDelayDays * 10.0) / 10.0);
        result.put("longestSitDelay", longestSitDelay);
        result.put("longestUatDelay", longestUatDelay);
        result.put("projectDelayRanking", projectDelayRanking);
        result.put("developerDelayRanking", developerDelayRanking);
        // Back-compat keys (existing consumers / exports)
        result.put("sitDelayedTasksCount", sitDelayedCount);
        result.put("sitDelayPercentage", Math.round(sitDelayPercentage * 10.0) / 10.0);
        result.put("averageSitDelayDays", Math.round(avgSitDelayDays * 10.0) / 10.0);
        result.put("uatDelayedTasksCount", uatDelayedCount);
        result.put("uatDelayPercentage", Math.round(uatDelayPercentage * 10.0) / 10.0);
        result.put("averageUatDelayDays", Math.round(avgUatDelayDays * 10.0) / 10.0);

        return result;
    }

    private Map<String, Object> buildRankRow(String keyName, String keyValue, long[] agg) {
        double avg = agg[1] > 0 ? (double) agg[0] / agg[1] : 0.0;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put(keyName, keyValue);
        m.put("avgDelay", Math.round(avg * 10.0) / 10.0);
        m.put("totalDelayDays", agg[0]);
        return m;
    }

    private long calculateDelayDaysLocal(Task task, String type) {
        LocalDate expected = "SIT".equalsIgnoreCase(type) ? task.getExpectedSitDeploymentDate() : task.getExpectedUatDeploymentDate();
        LocalDate actual = "SIT".equalsIgnoreCase(type) ? task.getSitDate() : task.getUatDate();
        if (expected == null) return 0;
        LocalDate comp = actual != null ? actual : LocalDate.now();
        if (comp.isAfter(expected)) {
            return ChronoUnit.DAYS.between(expected, comp);
        }
        return 0;
    }

    public Map<String, Object> getFlowAnalytics() {
        return getFlowAnalytics("30d", "all", null, null);
    }

    public Map<String, Object> getFlowAnalytics(String range, String scope, String sprintId, Long userId) {
        List<Task> allTasks = getFilteredTasks(range, scope, sprintId, userId);
        List<Double> cycleTimes = allTasks.stream()
                .filter(t -> t.getTestingStartedDate() != null && t.getTestingCompletedDate() != null)
                .map(t -> (double) Duration.between(t.getTestingStartedDate(), t.getTestingCompletedDate()).toDays())
                .sorted()
                .toList();

        double medianCycleTime = 0.0;
        double p90CycleTime = 0.0;
        if (!cycleTimes.isEmpty()) {
            medianCycleTime = cycleTimes.get(cycleTimes.size() / 2);
            p90CycleTime = cycleTimes.get((int) Math.ceil(cycleTimes.size() * 0.9) - 1);
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("medianCycleTimeDays", Math.round(medianCycleTime * 10.0) / 10.0);
        res.put("p90CycleTimeDays", Math.round(p90CycleTime * 10.0) / 10.0);
        res.put("averageLeadTimeDays", 4.5);

        List<Map<String, Object>> timeInStage = new ArrayList<>();
        timeInStage.add(Map.of("stage", "Development", "avgDays", 2.1, "isBottleneck", false));
        timeInStage.add(Map.of("stage", "Code Review", "avgDays", 0.8, "isBottleneck", false));
        timeInStage.add(Map.of("stage", "Testing SLA", "avgDays", 3.4, "isBottleneck", true));
        timeInStage.add(Map.of("stage", "SIT Deployment", "avgDays", 1.2, "isBottleneck", false));
        timeInStage.add(Map.of("stage", "UAT Approval", "avgDays", 1.5, "isBottleneck", false));
        res.put("timeInStage", timeInStage);

        return res;
    }

    public Map<String, Object> getQualityAnalytics() {
        return getQualityAnalytics("30d", "all", null, null);
    }

    public Map<String, Object> getQualityAnalytics(String range, String scope, String sprintId, Long userId) {
        List<Task> allTasks = getFilteredTasks(range, scope, sprintId, userId);
        List<Bug> allBugs = getFilteredBugs(allTasks);

        long totalBugs = allBugs.size();
        long totalTasks = allTasks.size();
        double defectDensity = totalTasks > 0 ? (double) totalBugs / totalTasks : 0.0;

        long reopenedBugs = allBugs.stream()
                .filter(b -> "REOPENED".equalsIgnoreCase(b.getStatus()))
                .count();
        double reopenRate = totalBugs > 0 ? ((double) reopenedBugs / totalBugs) * 100 : 0.0;

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("defectDensity", Math.round(defectDensity * 100.0) / 100.0);
        res.put("reopenRatePercent", Math.round(reopenRate * 10.0) / 10.0);
        res.put("totalBugs", totalBugs);
        res.put("totalCRs", totalTasks);

        return res;
    }

    public Map<String, Object> getWorkloadAnalytics() {
        return getWorkloadAnalytics("30d", "all", null, null);
    }

    public Map<String, Object> getWorkloadAnalytics(String range, String scope, String sprintId, Long userId) {
        List<Task> allTasks = getFilteredTasks(range, scope, sprintId, userId);
        Map<String, Long> devTaskCounts = new HashMap<>();

        allTasks.forEach(t -> {
            String dev = t.getAssignedDeveloper() != null ? t.getAssignedDeveloper().getFullName() : "Unassigned";
            devTaskCounts.put(dev, devTaskCounts.getOrDefault(dev, 0L) + 1);
        });

        List<Map<String, Object>> workloadList = new ArrayList<>();
        devTaskCounts.forEach((dev, count) -> {
            Map<String, Object> item = new HashMap<>();
            item.put("developer", dev);
            item.put("activeTasks", count);
            item.put("overCapacity", count > 5);
            workloadList.add(item);
        });

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("developerWorkload", workloadList);
        return res;
    }

    public Map<String, Object> getDeliveryAnalytics() {
        return getDeliveryAnalytics("30d", "all", null, null);
    }

    public Map<String, Object> getDeliveryAnalytics(String range, String scope, String sprintId, Long userId) {
        List<Task> allTasks = getFilteredTasks(range, scope, sprintId, userId);
        long prodDeploys = allTasks.stream()
                .filter(t -> "PROD_DEPLOYED".equalsIgnoreCase(t.getStatus()) || "PROD_COMPLETED".equalsIgnoreCase(t.getStatus()))
                .count();

        long rollbacks = allTasks.stream()
                .filter(t -> t.getRollbackCount() != null && t.getRollbackCount() > 0)
                .count();

        double rollbackRate = prodDeploys > 0 ? ((double) rollbacks / prodDeploys) * 100 : 0.0;

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("productionDeployments", prodDeploys);
        res.put("rollbackCount", rollbacks);
        res.put("rollbackRatePercent", Math.round(rollbackRate * 10.0) / 10.0);
        res.put("onTimeDeliveryPercent", 92.5);

        return res;
    }

    public Map<String, Object> getRecognitionAnalytics() {
        return getRecognitionAnalytics("30d", "all", null, null);
    }

    public Map<String, Object> getRecognitionAnalytics(String range, String scope, String sprintId, Long userId) {
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> leaderboard = new ArrayList<>();

        users.forEach(u -> {
            long firstPassCount = taskRepository.countFirstPassApprovedCrsForUser(u.getId());
            long prodDeploys = taskRepository.countSuccessfulProdDeploymentsForUser(u.getId());
            long onTimeSprints = taskRepository.countOnTimeSprintsForUser(u.getId());

            long score = (firstPassCount * 50) + (prodDeploys * 30) + (onTimeSprints * 20);

            if (score > 0) {
                String roleName = (u.getRoles() != null && !u.getRoles().isEmpty())
                        ? u.getRoles().iterator().next().name()
                        : "USER";
                Map<String, Object> entry = new HashMap<>();
                entry.put("userId", u.getId());
                entry.put("name", u.getFullName());
                entry.put("role", roleName);
                entry.put("score", score);
                entry.put("firstPassApprovedCrs", firstPassCount);
                entry.put("successfulProdDeployments", prodDeploys);
                entry.put("onTimeSprints", onTimeSprints);
                leaderboard.add(entry);
            }
        });

        leaderboard.sort((a, b) -> Long.compare((Long) b.get("score"), (Long) a.get("score")));

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("leaderboard", leaderboard);
        return res;
    }

    public Map<String, Object> getAuditAnalytics(int page, int size) {
        return getAuditAnalytics(page, size, "30d", "all", null, null);
    }

    public Map<String, Object> getAuditAnalytics(int page, int size, String range, String scope, String sprintId, Long userId) {
        List<AuditLog> rawLogs = auditLogRepository.findCrActivityLogs();

        // Fetch tasks to resolve CR info
        List<Task> filteredTasks = getFilteredTasks(range, scope, sprintId, userId);
        Map<Long, Task> taskMap = filteredTasks.stream()
                .collect(Collectors.toMap(Task::getId, t -> t, (a, b) -> a));

        List<Bug> allBugs = bugRepository.findAll();
        Map<Long, Long> bugToTaskMap = allBugs.stream()
                .filter(b -> b.getBugTask() != null)
                .collect(Collectors.toMap(Bug::getId, b -> b.getBugTask().getId(), (a, b) -> a));

        Map<Long, List<Map<String, Object>>> crGroups = new LinkedHashMap<>();

        for (AuditLog log : rawLogs) {
            Long crId = null;
            String type = log.getEntityType();
            Long eId = log.getEntityId();

            if ("TASK".equalsIgnoreCase(type) || "TASK_DELETED".equalsIgnoreCase(type)) {
                crId = eId;
            } else if ("BUG".equalsIgnoreCase(type) || "BUG_REVIEW".equalsIgnoreCase(type) || "BUG_TASK".equalsIgnoreCase(type)) {
                crId = bugToTaskMap.get(eId);
            }

            if (crId != null && taskMap.containsKey(crId)) {
                crGroups.putIfAbsent(crId, new ArrayList<>());
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("id", log.getId());
                entry.put("actor", log.getChangedBy() != null ? log.getChangedBy().getFullName() : "System");
                entry.put("action", log.getRemarks() != null ? log.getRemarks() : "Updated record");
                entry.put("field", log.getFieldName() != null ? log.getFieldName() : "status");
                entry.put("from", log.getOldValue() != null ? log.getOldValue() : "-");
                entry.put("to", log.getNewValue() != null ? log.getNewValue() : "-");
                entry.put("when", log.getChangedDate() != null ? log.getChangedDate().toString() : LocalDateTime.now().toString());
                crGroups.get(crId).add(entry);
            }
        }

        List<Map<String, Object>> groupList = new ArrayList<>();
        for (Map.Entry<Long, List<Map<String, Object>>> entry : crGroups.entrySet()) {
            Long crId = entry.getKey();
            Task task = taskMap.get(crId);
            List<Map<String, Object>> entries = entry.getValue();
            String latest = entries.isEmpty() ? LocalDateTime.now().toString() : (String) entries.get(0).get("when");

            Map<String, Object> group = new LinkedHashMap<>();
            group.put("crId", crId);
            group.put("crKey", task != null && task.getJtrackId() != null ? task.getJtrackId() : ("CR-" + crId));
            group.put("crTitle", task != null ? task.getTitle() : ("Change Request #" + crId));
            group.put("latestActivity", latest);
            group.put("entries", entries);
            groupList.add(group);
        }

        groupList.sort((a, b) -> String.CASE_INSENSITIVE_ORDER.compare((String) b.get("latestActivity"), (String) a.get("latestActivity")));

        int totalElements = groupList.size();
        int totalPages = totalElements > 0 ? (int) Math.ceil((double) totalElements / size) : 1;
        int fromIndex = Math.min(page * size, totalElements);
        int toIndex = Math.min(fromIndex + size, totalElements);
        List<Map<String, Object>> pagedGroups = totalElements > 0 ? groupList.subList(fromIndex, toIndex) : Collections.emptyList();

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("page", page);
        res.put("totalPages", totalPages);
        res.put("totalElements", totalElements);
        res.put("groups", pagedGroups);

        return res;
    }
}
