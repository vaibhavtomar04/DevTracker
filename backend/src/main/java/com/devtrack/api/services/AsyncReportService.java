package com.devtrack.api.services;

import com.devtrack.api.model.ReportJob;
import com.devtrack.api.model.Task;
import com.devtrack.api.model.User;
import com.devtrack.api.repository.ReportJobRepository;
import com.devtrack.api.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.devtrack.api.model.Role;
import com.devtrack.api.model.Sprint;
import com.devtrack.api.repository.SprintRepository;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;
import java.io.File;
import java.io.FileOutputStream;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.UUID;

import com.devtrack.api.repository.BugRepository;
import com.devtrack.api.model.Bug;

@Service
@RequiredArgsConstructor
@Slf4j
public class AsyncReportService {

    private final ReportJobRepository reportJobRepository;
    private final TaskRepository taskRepository;
    private final SprintRepository sprintRepository;
    private final BugRepository bugRepository;
    private final AnalyticsService analyticsService;

    /** Enqueues a new asynchronous report generation job and returns immediate metadata. */
    @Transactional
    public ReportJob createJob(User requester, String reportType) {
        String jobId = "JOB-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        ReportJob job = ReportJob.builder()
                .jobId(jobId)
                .requester(requester)
                .reportType(reportType)
                .status(ReportJob.Status.QUEUED)
                .createdAt(LocalDateTime.now())
                .build();
        return reportJobRepository.save(job);
    }

    /** Background worker processing Apache POI Excel creation asynchronously. */
    @Async("taskExecutor")
    @Transactional
    public void processReportJob(String jobId) {
        log.info("Starting background report worker for jobId={}", jobId);
        ReportJob job = reportJobRepository.findByJobId(jobId).orElse(null);
        if (job == null) return;

        job.setStatus(ReportJob.Status.RUNNING);
        reportJobRepository.save(job);

        try {
            List<Task> tasks = taskRepository.findAllOptimized();
            File tempFile = File.createTempFile("devtrack-export-" + jobId + "-", ".xlsx");

            try (Workbook workbook = new XSSFWorkbook(); FileOutputStream out = new FileOutputStream(tempFile)) {
                if ("ANALYTICS".equalsIgnoreCase(job.getReportType())) {
                    generateAnalyticsExcelReport(workbook);
                } else {
                    Sheet sheet = workbook.createSheet("CR Tasks Report");
                    Row headerRow = sheet.createRow(0);
                    String[] cols = {"ID", "JTrack ID", "Title", "Status", "Priority", "Assignee", "Created Date", "Quality Risk"};

                    CellStyle headerStyle = workbook.createCellStyle();
                    Font font = workbook.createFont();
                    font.setBold(true);
                    headerStyle.setFont(font);

                    for (int i = 0; i < cols.length; i++) {
                        Cell cell = headerRow.createCell(i);
                        cell.setCellValue(cols[i]);
                        cell.setCellStyle(headerStyle);
                    }

                    int rowIdx = 1;
                    for (Task task : tasks) {
                        Row row = sheet.createRow(rowIdx++);
                        row.createCell(0).setCellValue(task.getId());
                        row.createCell(1).setCellValue(task.getJtrackId() != null ? task.getJtrackId() : "");
                        row.createCell(2).setCellValue(task.getTitle() != null ? task.getTitle() : "");
                        row.createCell(3).setCellValue(task.getStatus() != null ? task.getStatus() : "");
                        row.createCell(4).setCellValue(task.getPriority() != null ? task.getPriority() : "");
                        row.createCell(5).setCellValue(task.getAssignedDeveloper() != null ? task.getAssignedDeveloper().getFullName() : "Unassigned");
                        row.createCell(6).setCellValue(task.getCreatedDate() != null ? task.getCreatedDate().toString() : "");
                        row.createCell(7).setCellValue(task.isQualityRisk() ? "YES" : "NO");
                    }

                    for (int i = 0; i < cols.length; i++) sheet.autoSizeColumn(i);
                }
                workbook.write(out);
            }

            job.setStatus(ReportJob.Status.READY);
            job.setFilePath(tempFile.getAbsolutePath());
            job.setFileName("DevTrack_Report_" + jobId + ".xlsx");
            job.setDownloadToken(UUID.randomUUID().toString());
            job.setExpiresAt(LocalDateTime.now().plusHours(2)); // Token valid for 2 hours
            reportJobRepository.save(job);
            log.info("Report job READY: jobId={} token={}", jobId, job.getDownloadToken());

        } catch (Exception e) {
            log.error("Report job FAILED: jobId={} error={}", jobId, e.getMessage());
            job.setStatus(ReportJob.Status.FAILED);
            job.setErrorReason(e.getMessage());
            reportJobRepository.save(job);
        }
    }

    @SuppressWarnings("unchecked")
    private void generateAnalyticsExcelReport(Workbook workbook) {
        Map<String, Object> data = analyticsService.getDashboardData();

        // 1. Sheet: Overview & SLA Metrics
        Sheet overviewSheet = workbook.createSheet("Overview & SLA");
        overviewSheet.setDisplayGridlines(true);

        // Header style (Navy Theme)
        CellStyle headerStyle = workbook.createCellStyle();
        headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        Font headerFont = workbook.createFont();
        headerFont.setColor(IndexedColors.WHITE.getIndex());
        headerFont.setBold(true);
        headerFont.setFontHeightInPoints((short) 12);
        headerStyle.setFont(headerFont);
        headerStyle.setAlignment(HorizontalAlignment.LEFT);

        // Subtitle style
        CellStyle subStyle = workbook.createCellStyle();
        Font subFont = workbook.createFont();
        subFont.setItalic(true);
        subFont.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
        subStyle.setFont(subFont);

        // KPI styles
        CellStyle kpiLabelStyle = workbook.createCellStyle();
        kpiLabelStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        kpiLabelStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        Font kpiLabelFont = workbook.createFont();
        kpiLabelFont.setBold(true);
        kpiLabelStyle.setFont(kpiLabelFont);
        kpiLabelStyle.setAlignment(HorizontalAlignment.CENTER);

        CellStyle kpiValueStyle = workbook.createCellStyle();
        kpiValueStyle.setFillForegroundColor(IndexedColors.LIGHT_TURQUOISE.getIndex());
        kpiValueStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        Font kpiValueFont = workbook.createFont();
        kpiValueFont.setBold(true);
        kpiValueFont.setFontHeightInPoints((short) 14);
        kpiValueStyle.setFont(kpiValueFont);
        kpiValueStyle.setAlignment(HorizontalAlignment.CENTER);

        // Title Row
        Row titleRow = overviewSheet.createRow(0);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue("DEVTRACK SYSTEM THROUGHPUT & OPERATIONS REPORT");
        titleCell.setCellStyle(headerStyle);

        Row dateRow = overviewSheet.createRow(1);
        Cell dateCell = dateRow.createCell(0);
        dateCell.setCellValue("Generated: " + java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").format(java.time.LocalDateTime.now()));
        dateCell.setCellStyle(subStyle);

        // KPI block starting at row 3
        int startRow = 3;
        String[] kpis = {
            "Total CRs", "Total Defects", "Quality Risks",
            "Bug Acceptance Rate", "Bug Rejection Rate", "Bug Challenge Rate",
            "Avg Bug Resolution", "Avg Testing Duration"
        };
        String[] values = {
            String.valueOf(data.get("totalCRs")),
            String.valueOf(data.get("totalBugs")),
            String.valueOf(data.get("qualityRiskCrCount")),
            data.get("bugAcceptanceRate") + "%",
            data.get("bugRejectionRate") + "%",
            data.get("bugChallengeRate") + "%",
            data.get("averageBugResolutionHours") + " hrs",
            data.get("averageTestingDurationHours") + " hrs"
        };

        for (int i = 0; i < kpis.length; i++) {
            int rowIdx = startRow + (i / 4) * 3;
            int colIdx = (i % 4) * 2;

            Row lblRow = overviewSheet.getRow(rowIdx);
            if (lblRow == null) lblRow = overviewSheet.createRow(rowIdx);
            Cell lblCell = lblRow.createCell(colIdx);
            lblCell.setCellValue(kpis[i]);
            lblCell.setCellStyle(kpiLabelStyle);

            Row valRow = overviewSheet.getRow(rowIdx + 1);
            if (valRow == null) valRow = overviewSheet.createRow(rowIdx + 1);
            Cell valCell = valRow.createCell(colIdx);
            valCell.setCellValue(values[i]);
            valCell.setCellStyle(kpiValueStyle);
        }

        // SLA Benchmarks block starting at row 10
        Row slaHeaderRow = overviewSheet.createRow(10);
        Cell slaHeaderCell = slaHeaderRow.createCell(0);
        slaHeaderCell.setCellValue("SLA Performance & Pipeline Compliance Benchmarks");
        slaHeaderCell.setCellStyle(headerStyle);

        String[] slas = {
            "Testing SLA (48h) Compliance Rate",
            "Approval SLA (24h) Compliance Rate",
            "Sprint Task Completion Rate"
        };
        double[] slaValues = {
            Double.parseDouble(String.valueOf(data.get("testingSlaComplianceRate"))),
            Double.parseDouble(String.valueOf(data.get("approvalSlaComplianceRate"))),
            Double.parseDouble(String.valueOf(data.get("sprintTaskCompletionRate")))
        };

        CellStyle labelStyle = workbook.createCellStyle();
        Font labelFont = workbook.createFont();
        labelFont.setBold(true);
        labelStyle.setFont(labelFont);

        int slaRowIdx = 12;
        for (int i = 0; i < slas.length; i++) {
            Row row = overviewSheet.createRow(slaRowIdx++);
            Cell c1 = row.createCell(0);
            c1.setCellValue(slas[i]);
            c1.setCellStyle(labelStyle);

            Cell c2 = row.createCell(2);
            c2.setCellValue(slaValues[i] + "%");

            // Render visual progress bar: e.g. [███████░░░]
            Cell c3 = row.createCell(3);
            int blocks = (int) Math.round(slaValues[i] / 10.0);
            StringBuilder bar = new StringBuilder("[");
            for (int b = 0; b < 10; b++) {
                if (b < blocks) bar.append("█");
                else bar.append("░");
            }
            bar.append("]");
            c3.setCellValue(bar.toString());

            CellStyle barStyle = workbook.createCellStyle();
            Font barFont = workbook.createFont();
            barFont.setFontName("Courier New");
            if (slaValues[i] >= 80.0) {
                barFont.setColor(IndexedColors.GREEN.getIndex());
            } else if (slaValues[i] >= 50.0) {
                barFont.setColor(IndexedColors.ORANGE.getIndex());
            } else {
                barFont.setColor(IndexedColors.RED.getIndex());
            }
            barStyle.setFont(barFont);
            c3.setCellStyle(barStyle);
        }

        // Autosize Overview Columns
        for (int i = 0; i < 8; i++) {
            overviewSheet.autoSizeColumn(i);
        }

        // 2. Sheet: Developer Productivity
        Sheet devSheet = workbook.createSheet("Dev Productivity");
        devSheet.setDisplayGridlines(true);

        Row pHeader = devSheet.createRow(0);
        String[] pCols = {"Developer", "Efforts Logged (Days)", "Completed Tasks", "Productivity Visual Bar"};
        for (int i = 0; i < pCols.length; i++) {
            Cell c = pHeader.createCell(i);
            c.setCellValue(pCols[i]);
            c.setCellStyle(headerStyle);
        }

        // Group efforts & tasks by developer
        List<Task> allTasks = taskRepository.findAllOptimized();
        Map<String, Double> effortsMap = new HashMap<>();
        Map<String, Integer> tasksCountMap = new HashMap<>();
        for (Task t : allTasks) {
            if (t.getAssignedDeveloper() != null) {
                String devName = t.getAssignedDeveloper().getFullName();
                effortsMap.put(devName, effortsMap.getOrDefault(devName, 0.0) + (t.getEfforts() != null ? t.getEfforts() : 0));
                tasksCountMap.put(devName, tasksCountMap.getOrDefault(devName, 0) + 1);
            }
        }

        double maxEfforts = effortsMap.values().stream().mapToDouble(Double::doubleValue).max().orElse(1.0);

        int devRowIdx = 1;
        for (Map.Entry<String, Double> entry : effortsMap.entrySet()) {
            Row r = devSheet.createRow(devRowIdx++);
            r.createCell(0).setCellValue(entry.getKey());
            r.createCell(1).setCellValue(entry.getValue());
            r.createCell(2).setCellValue(tasksCountMap.getOrDefault(entry.getKey(), 0));

            // Horizontal visual bar for productivity
            Cell visualCell = r.createCell(3);
            int barLen = (int) Math.round((entry.getValue() / maxEfforts) * 10.0);
            StringBuilder bar = new StringBuilder();
            for (int b = 0; b < 10; b++) {
                if (b < barLen) bar.append("█");
                else bar.append("░");
            }
            visualCell.setCellValue(bar.toString());

            CellStyle vStyle = workbook.createCellStyle();
            Font vFont = workbook.createFont();
            vFont.setFontName("Courier New");
            vFont.setColor(IndexedColors.ROYAL_BLUE.getIndex());
            vStyle.setFont(vFont);
            visualCell.setCellStyle(vStyle);
        }
        for (int i = 0; i < pCols.length; i++) devSheet.autoSizeColumn(i);

        // 3. Sheet: Defect Resolution
        Sheet defectSheet = workbook.createSheet("Defects Resolution");
        defectSheet.setDisplayGridlines(true);

        Row dHeader = defectSheet.createRow(0);
        String[] dCols = {"Developer", "Bugs Raised", "Bugs Resolved", "Resolution Rate", "Visual Resolution Bar"};
        for (int i = 0; i < dCols.length; i++) {
            Cell c = dHeader.createCell(i);
            c.setCellValue(dCols[i]);
            c.setCellStyle(headerStyle);
        }

        List<Bug> allBugs = bugRepository.findAll();
        Map<String, Integer> bugsRaisedMap = new HashMap<>();
        Map<String, Integer> bugsSolvedMap = new HashMap<>();
        for (Bug b : allBugs) {
            if (b.getAssignedDeveloper() != null) {
                String devName = b.getAssignedDeveloper().getFullName();
                bugsRaisedMap.put(devName, bugsRaisedMap.getOrDefault(devName, 0) + 1);
                if ("RESOLVED".equalsIgnoreCase(b.getStatus()) || "VERIFIED".equalsIgnoreCase(b.getStatus()) || "CLOSED".equalsIgnoreCase(b.getStatus())) {
                    bugsSolvedMap.put(devName, bugsSolvedMap.getOrDefault(devName, 0) + 1);
                }
            }
        }

        int defectRowIdx = 1;
        for (Map.Entry<String, Integer> entry : bugsRaisedMap.entrySet()) {
            Row r = defectSheet.createRow(defectRowIdx++);
            String dev = entry.getKey();
            int raised = entry.getValue();
            int solved = bugsSolvedMap.getOrDefault(dev, 0);
            double rate = raised > 0 ? (double) solved / raised * 100.0 : 0.0;
            rate = Math.round(rate * 10.0) / 10.0;

            r.createCell(0).setCellValue(dev);
            r.createCell(1).setCellValue(raised);
            r.createCell(2).setCellValue(solved);
            r.createCell(3).setCellValue(rate + "%");

            // Resolution bar
            Cell vCell = r.createCell(4);
            int barLen = (int) Math.round((rate / 10.0));
            StringBuilder bar = new StringBuilder();
            for (int b = 0; b < 10; b++) {
                if (b < barLen) bar.append("█");
                else bar.append("░");
            }
            vCell.setCellValue(bar.toString());

            CellStyle vStyle = workbook.createCellStyle();
            Font vFont = workbook.createFont();
            vFont.setFontName("Courier New");
            vFont.setColor(IndexedColors.CORAL.getIndex());
            vStyle.setFont(vFont);
            vCell.setCellStyle(vStyle);
        }
        for (int i = 0; i < dCols.length; i++) defectSheet.autoSizeColumn(i);

        // 4. Sheet: Active Sprint Burndown
        Sheet burndownSheet = workbook.createSheet("Sprint Burndown");
        burndownSheet.setDisplayGridlines(true);

        Row bHeader = burndownSheet.createRow(0);
        String[] bCols = {"Day", "Remaining Story Points", "Ideal Story Points", "Visual Burndown"};
        for (int i = 0; i < bCols.length; i++) {
            Cell c = bHeader.createCell(i);
            c.setCellValue(bCols[i]);
            c.setCellStyle(headerStyle);
        }

        List<Map<String, Object>> burndownData = (List<Map<String, Object>>) data.get("sprintBurndown");
        int burnRowIdx = 1;
        long maxVal = 0;
        if (burndownData != null) {
            for (Map<String, Object> day : burndownData) {
                long remaining = Long.parseLong(String.valueOf(day.get("Remaining")));
                if (remaining > maxVal) maxVal = remaining;
            }
        }
        if (maxVal == 0) maxVal = 1;

        if (burndownData != null) {
            for (Map<String, Object> day : burndownData) {
                Row r = burndownSheet.createRow(burnRowIdx++);
                r.createCell(0).setCellValue(String.valueOf(day.get("name")));
                r.createCell(1).setCellValue(Double.parseDouble(String.valueOf(day.get("Remaining"))));
                r.createCell(2).setCellValue(Double.parseDouble(String.valueOf(day.get("Ideal"))));

                // Visual remaining bar
                Cell vCell = r.createCell(3);
                double rem = Double.parseDouble(String.valueOf(day.get("Remaining")));
                int barLen = (int) Math.round((rem / maxVal) * 10.0);
                StringBuilder bar = new StringBuilder();
                for (int b = 0; b < 10; b++) {
                    if (b < barLen) bar.append("█");
                    else bar.append("░");
                }
                vCell.setCellValue(bar.toString());

                CellStyle vStyle = workbook.createCellStyle();
                Font vFont = workbook.createFont();
                vFont.setFontName("Courier New");
                vFont.setColor(IndexedColors.DARK_RED.getIndex());
                vStyle.setFont(vFont);
                vCell.setCellStyle(vStyle);
            }
        }
        for (int i = 0; i < bCols.length; i++) burndownSheet.autoSizeColumn(i);

        // 5. Sheet: Category & Response Times
        Sheet timesSheet = workbook.createSheet("Categories & Response");
        timesSheet.setDisplayGridlines(true);

        Row tHeader = timesSheet.createRow(0);
        Cell tCell = tHeader.createCell(0);
        tCell.setCellValue("Developer Avg Response Times (Hours)");
        tCell.setCellStyle(headerStyle);

        int timesRowIdx = 2;
        List<Map<String, Object>> devTimes = (List<Map<String, Object>>) data.get("developerResponseTimes");
        if (devTimes != null) {
            for (Map<String, Object> dev : devTimes) {
                Row r = timesSheet.createRow(timesRowIdx++);
                r.createCell(0).setCellValue(String.valueOf(dev.get("name")));
                r.createCell(1).setCellValue(Double.parseDouble(String.valueOf(dev.get("Response Time"))));
            }
        }

        timesRowIdx += 2;
        Row testerHeader = timesSheet.createRow(timesRowIdx++);
        Cell testerCell = testerHeader.createCell(0);
        testerCell.setCellValue("Tester Avg Response Times (Hours)");
        testerCell.setCellStyle(headerStyle);

        List<Map<String, Object>> testerTimes = (List<Map<String, Object>>) data.get("testerResponseTimes");
        if (testerTimes != null) {
            for (Map<String, Object> tester : testerTimes) {
                Row r = timesSheet.createRow(timesRowIdx++);
                r.createCell(0).setCellValue(String.valueOf(tester.get("name")));
                r.createCell(1).setCellValue(Double.parseDouble(String.valueOf(tester.get("Response Time"))));
            }
        }

        timesSheet.autoSizeColumn(0);
        timesSheet.autoSizeColumn(1);
    }

    @Async("taskExecutor")
    @Transactional
    public void processTestedCrsReportJob(
            String jobId,
            User currentUser,
            String search,
            String project,
            Long sprintId,
            String priority,
            String status,
            LocalDateTime startDate,
            LocalDateTime endDate
    ) {
        log.info("Starting background Tested CRs report worker for jobId={}", jobId);
        ReportJob job = reportJobRepository.findByJobId(jobId).orElse(null);
        if (job == null) return;

        job.setStatus(ReportJob.Status.RUNNING);
        reportJobRepository.save(job);

        try {
            boolean isAdmin = currentUser.getRoles().contains(Role.DEVADMIN) || currentUser.getRoles().contains(Role.TESTADMIN);

            Specification<Task> spec = (root, query, cb) -> {
                List<Predicate> predicates = new ArrayList<>();
                predicates.add(cb.isNotNull(root.get("testingCompletedDate")));
                if (!isAdmin) {
                    predicates.add(cb.equal(root.get("tester"), currentUser));
                }
                if (search != null && !search.trim().isEmpty()) {
                    String likePattern = "%" + search.trim().toLowerCase() + "%";
                    predicates.add(cb.or(
                            cb.like(cb.lower(root.get("jtrackId")), likePattern),
                            cb.like(cb.lower(root.get("title")), likePattern),
                            cb.like(cb.lower(root.get("description")), likePattern)
                    ));
                }
                if (project != null && !project.trim().isEmpty()) {
                    predicates.add(cb.equal(cb.lower(root.get("project")), project.trim().toLowerCase()));
                }
                if (sprintId != null) {
                    predicates.add(cb.equal(root.get("sprintId"), sprintId));
                }
                if (priority != null && !priority.trim().isEmpty()) {
                    predicates.add(cb.equal(cb.lower(root.get("priority")), priority.trim().toLowerCase()));
                }
                if (status != null && !status.trim().isEmpty()) {
                    predicates.add(cb.equal(cb.lower(root.get("status")), status.trim().toLowerCase()));
                }
                if (startDate != null) {
                    predicates.add(cb.greaterThanOrEqualTo(root.get("testingCompletedDate"), startDate));
                }
                if (endDate != null) {
                    predicates.add(cb.lessThanOrEqualTo(root.get("testingCompletedDate"), endDate));
                }
                return cb.and(predicates.toArray(new Predicate[0]));
            };

            List<Task> tasks = taskRepository.findAll(spec);

            // Fetch sprints mapping
            List<Long> sprintIds = tasks.stream()
                    .map(Task::getSprintId)
                    .filter(Objects::nonNull)
                    .distinct()
                    .collect(Collectors.toList());
            Map<Long, String> sprintNames = new HashMap<>();
            if (!sprintIds.isEmpty()) {
                List<Sprint> sprints = sprintRepository.findAllById(sprintIds);
                for (Sprint s : sprints) {
                    sprintNames.put(s.getId(), s.getName());
                }
            }

            File tempFile = File.createTempFile("devtrack-tested-crs-" + jobId + "-", ".xlsx");

            try (Workbook workbook = new XSSFWorkbook(); FileOutputStream out = new FileOutputStream(tempFile)) {
                Sheet sheet = workbook.createSheet("Tested CRs Report");
                Row headerRow = sheet.createRow(0);
                String[] cols = {
                        "CR Number", "CR Title", "Project", "Sprint", "Assigned Developer(s)",
                        "Priority", "Testing Started", "Testing Completed", "Testing Duration",
                        "Bugs Raised", "Retests", "Production Status", "Final Status", "Quality Risk"
                };

                CellStyle headerStyle = workbook.createCellStyle();
                Font font = workbook.createFont();
                font.setBold(true);
                headerStyle.setFont(font);

                for (int i = 0; i < cols.length; i++) {
                    Cell cell = headerRow.createCell(i);
                    cell.setCellValue(cols[i]);
                    cell.setCellStyle(headerStyle);
                }

                int rowIdx = 1;
                for (Task task : tasks) {
                    Row row = sheet.createRow(rowIdx++);

                    String devsStr = task.getDevelopers().stream()
                            .map(td -> td.getDeveloper() != null ? td.getDeveloper().getFullName() : "Unknown")
                            .collect(Collectors.joining(", "));

                    String sprintName = task.getSprintId() != null 
                            ? sprintNames.getOrDefault(task.getSprintId(), "Sprint " + task.getSprintId()) 
                            : "Ad-hoc";

                    String prodStatus = task.getProductionDate() != null ? "DEPLOYED" : "PENDING";

                    row.createCell(0).setCellValue(task.getJtrackId() != null ? task.getJtrackId() : "");
                    row.createCell(1).setCellValue(task.getTitle() != null ? task.getTitle() : "");
                    row.createCell(2).setCellValue(task.getProject() != null ? task.getProject() : "N/A");
                    row.createCell(3).setCellValue(sprintName);
                    row.createCell(4).setCellValue(devsStr);
                    row.createCell(5).setCellValue(task.getPriority() != null ? task.getPriority() : "");
                    row.createCell(6).setCellValue(task.getTestingStartedDate() != null ? task.getTestingStartedDate().toString() : "");
                    row.createCell(7).setCellValue(task.getTestingCompletedDate() != null ? task.getTestingCompletedDate().toString() : "");
                    row.createCell(8).setCellValue(task.getTestingDuration() != null ? task.getTestingDuration() : "N/A");
                    row.createCell(9).setCellValue(task.getTotalBugsRaised() != null ? task.getTotalBugsRaised() : 0);
                    row.createCell(10).setCellValue(task.getTotalRetests() != null ? task.getTotalRetests() : 0);
                    row.createCell(11).setCellValue(prodStatus);
                    row.createCell(12).setCellValue(task.getStatus() != null ? task.getStatus() : "");
                    row.createCell(13).setCellValue(task.isQualityRisk() ? "YES" : "NO");
                }

                for (int i = 0; i < cols.length; i++) sheet.autoSizeColumn(i);
                workbook.write(out);
            }

            job.setStatus(ReportJob.Status.READY);
            job.setFilePath(tempFile.getAbsolutePath());
            job.setFileName("Tested_CRs_Report_" + jobId + ".xlsx");
            job.setDownloadToken(UUID.randomUUID().toString());
            job.setExpiresAt(LocalDateTime.now().plusHours(2));
            reportJobRepository.save(job);
            log.info("Tested CRs Report job READY: jobId={} token={}", jobId, job.getDownloadToken());

        } catch (Exception e) {
            log.error("Tested CRs Report job FAILED: jobId={} error={}", jobId, e.getMessage());
            job.setStatus(ReportJob.Status.FAILED);
            job.setErrorReason(e.getMessage());
            reportJobRepository.save(job);
        }
    }

    /** Multi-instance safe scheduled cleanup job purging expired report files and records. */
    @Scheduled(cron = "0 0 * * * *") // Runs hourly
    @SchedulerLock(name = "ReportJobCleanupLock", lockAtMostFor = "15m", lockAtLeastFor = "1m")
    @Transactional
    public void cleanupExpiredReports() {
        log.info("Executing scheduled cleanup of expired report jobs...");
        List<ReportJob> expired = reportJobRepository.findByExpiresAtBefore(LocalDateTime.now());
        for (ReportJob job : expired) {
            if (job.getFilePath() != null) {
                File file = new File(job.getFilePath());
                if (file.exists()) file.delete();
            }
            reportJobRepository.delete(job);
        }
        log.info("Purged {} expired report jobs.", expired.size());
    }
}
