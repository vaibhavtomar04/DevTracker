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
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xddf.usermodel.chart.*;
import org.apache.poi.xssf.usermodel.XSSFChart;
import org.apache.poi.xssf.usermodel.XSSFClientAnchor;
import org.apache.poi.xssf.usermodel.XSSFDrawing;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.ss.util.CellRangeAddress;
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
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
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

    private static final DateTimeFormatter D_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

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
    public void processReportJob(String jobId, String format) {
        log.info("Starting background report worker for jobId={} format={}", jobId, format);
        ReportJob job = reportJobRepository.findByJobId(jobId).orElse(null);
        if (job == null) return;

        job.setStatus(ReportJob.Status.RUNNING);
        reportJobRepository.save(job);

        try {
            // Normalize the requested report type. The frontend sends \"ANALYTICS\",
            // \"DEADLINE\" (no trailing S) and defaults to \"TASKS\"; we accept any
            // DEADLINE* spelling so the deadline export routes correctly.
            String rt = (job.getReportType() == null ? "TASKS" : job.getReportType().trim().toUpperCase());
            boolean isDeadline = rt.startsWith("DEADLINE");
            boolean isAnalytics = rt.equals("ANALYTICS");

            List<Task> tasks = taskRepository.findAllOptimized();
            List<Task> deadlineTasks = tasks.stream()
                    .filter(t -> t.getExpectedSitDeploymentDate() != null || t.getExpectedUatDeploymentDate() != null)
                    .collect(Collectors.toList());

            String ext = format.equalsIgnoreCase("pdf") ? ".pdf" : (format.equalsIgnoreCase("csv") ? ".csv" : ".xlsx");
            File tempFile = File.createTempFile("devtrack-export-" + jobId + "-", ext);

            if ("csv".equalsIgnoreCase(format)) {
                try (FileOutputStream out = new FileOutputStream(tempFile)) {
                    if (isDeadline) {
                        generateDeadlinesCsvReport(out, deadlineTasks);
                    } else {
                        generateTasksCsvReport(out, tasks);
                    }
                }
            } else if ("pdf".equalsIgnoreCase(format)) {
                try (FileOutputStream out = new FileOutputStream(tempFile)) {
                    if (isDeadline) {
                        generateDeadlinesPdfReport(out, deadlineTasks);
                    } else {
                        generateTasksPdfReport(out, tasks);
                    }
                }
            } else {
                try (Workbook workbook = new XSSFWorkbook(); FileOutputStream out = new FileOutputStream(tempFile)) {
                    if (isAnalytics) {
                        generateAnalyticsExcelReport(workbook);
                    } else if (isDeadline) {
                        generateDeadlinesExcelReport(workbook, deadlineTasks);
                    } else {
                        generateTasksExcelReport(workbook, tasks);
                    }
                    workbook.write(out);
                }
            }

            String label = isAnalytics ? "Analytics" : (isDeadline ? "Deadline_SLA" : "CR");

            job.setStatus(ReportJob.Status.READY);
            job.setFilePath(tempFile.getAbsolutePath());
            job.setFileName("DevTrack_" + label + "_Report_" + LocalDate.now().format(D_FMT) + "_" + jobId + ext);
            job.setDownloadToken(UUID.randomUUID().toString());
            job.setExpiresAt(LocalDateTime.now().plusHours(2));
            reportJobRepository.save(job);
            log.info("Report job READY: jobId={} token={}", jobId, job.getDownloadToken());

        } catch (Exception e) {
            log.error("Report job FAILED: jobId={} error={}", jobId, e.getMessage(), e);
            job.setStatus(ReportJob.Status.FAILED);
            job.setErrorReason(e.getMessage());
            reportJobRepository.save(job);
        }
    }

    // ==================================================================================
    // Premium styling toolkit (shared across all Excel reports)
    // ==================================================================================

    private XSSFColor rgb(int r, int g, int b) {
        return new XSSFColor(new byte[]{(byte) r, (byte) g, (byte) b}, null);
    }

    private static String str(Object o) {
        if (o == null) return "\u2014";
        String s = String.valueOf(o);
        return (s == null || s.isEmpty() || "null".equals(s)) ? "\u2014" : s;
    }

    private static double num(Object o) {
        try {
            return o == null ? 0.0 : Double.parseDouble(String.valueOf(o));
        } catch (Exception e) {
            return 0.0;
        }
    }

    private static String fmtDate(LocalDate d) {
        return d == null ? "\u2014" : d.format(D_FMT);
    }

    private static String fmtDateTime(LocalDateTime d) {
        return d == null ? "\u2014" : d.format(DT_FMT);
    }

    private static String humanize(String raw) {
        if (raw == null || raw.isEmpty()) return "\u2014";
        String[] parts = raw.toLowerCase().split("_");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (p.isEmpty()) continue;
            sb.append(Character.toUpperCase(p.charAt(0))).append(p.substring(1)).append(" ");
        }
        return sb.toString().trim();
    }

    /** Container for all reusable cell styles, built once per workbook. */
    private static class RptStyles {
        XSSFCellStyle bannerTitle, bannerSub, section, th,
                tdLabel, tdValue, td, tdAlt, tdCenter, tdCenterAlt, tdRight, tdRightAlt,
                good, warn, bad, neutral;
    }

    private void border(XSSFCellStyle st, XSSFColor c) {
        st.setBorderTop(BorderStyle.THIN);
        st.setBorderBottom(BorderStyle.THIN);
        st.setBorderLeft(BorderStyle.THIN);
        st.setBorderRight(BorderStyle.THIN);
        st.setTopBorderColor(c);
        st.setBottomBorderColor(c);
        st.setLeftBorderColor(c);
        st.setRightBorderColor(c);
    }

    private XSSFCellStyle bodyStyle(XSSFWorkbook wb, XSSFColor bg, HorizontalAlignment align, XSSFColor bdr, boolean bold, XSSFColor fontColor) {
        XSSFCellStyle st = wb.createCellStyle();
        if (bg != null) {
            st.setFillForegroundColor(bg);
            st.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        }
        st.setAlignment(align);
        st.setVerticalAlignment(VerticalAlignment.CENTER);
        border(st, bdr);
        XSSFFont f = (XSSFFont) wb.createFont();
        f.setFontHeightInPoints((short) 11);
        f.setBold(bold);
        f.setColor(fontColor);
        st.setFont(f);
        return st;
    }

    private RptStyles buildStyles(XSSFWorkbook wb) {
        RptStyles s = new RptStyles();

        XSSFColor brandDark = rgb(30, 41, 59);   // slate-800 banner
        XSSFColor brand = rgb(79, 70, 229);       // indigo-600 table header
        XSSFColor sectionBg = rgb(224, 231, 255); // indigo-100
        XSSFColor white = rgb(255, 255, 255);
        XSSFColor subText = rgb(203, 213, 225);   // slate-300
        XSSFColor bodyText = rgb(30, 41, 59);
        XSSFColor zebra = rgb(244, 246, 251);
        XSSFColor bdr = rgb(203, 213, 225);       // slate-300 borders
        XSSFColor goodBg = rgb(209, 250, 229), goodFg = rgb(6, 95, 70);
        XSSFColor warnBg = rgb(254, 243, 199), warnFg = rgb(146, 64, 14);
        XSSFColor badBg = rgb(254, 226, 226), badFg = rgb(153, 27, 27);
        XSSFColor neuBg = rgb(241, 245, 249), neuFg = rgb(71, 85, 105);

        // Banner title
        s.bannerTitle = wb.createCellStyle();
        s.bannerTitle.setFillForegroundColor(brandDark);
        s.bannerTitle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        s.bannerTitle.setAlignment(HorizontalAlignment.LEFT);
        s.bannerTitle.setVerticalAlignment(VerticalAlignment.CENTER);
        XSSFFont btf = (XSSFFont) wb.createFont();
        btf.setBold(true);
        btf.setFontHeightInPoints((short) 16);
        btf.setColor(white);
        s.bannerTitle.setFont(btf);

        // Banner subtitle
        s.bannerSub = wb.createCellStyle();
        s.bannerSub.setFillForegroundColor(brandDark);
        s.bannerSub.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        s.bannerSub.setAlignment(HorizontalAlignment.LEFT);
        s.bannerSub.setVerticalAlignment(VerticalAlignment.CENTER);
        XSSFFont bsf = (XSSFFont) wb.createFont();
        bsf.setItalic(true);
        bsf.setFontHeightInPoints((short) 10);
        bsf.setColor(subText);
        s.bannerSub.setFont(bsf);

        // Section header
        s.section = wb.createCellStyle();
        s.section.setFillForegroundColor(sectionBg);
        s.section.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        s.section.setAlignment(HorizontalAlignment.LEFT);
        s.section.setVerticalAlignment(VerticalAlignment.CENTER);
        XSSFFont scf = (XSSFFont) wb.createFont();
        scf.setBold(true);
        scf.setFontHeightInPoints((short) 12);
        scf.setColor(brand);
        s.section.setFont(scf);

        // Table header
        s.th = wb.createCellStyle();
        s.th.setFillForegroundColor(brand);
        s.th.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        s.th.setAlignment(HorizontalAlignment.CENTER);
        s.th.setVerticalAlignment(VerticalAlignment.CENTER);
        s.th.setWrapText(true);
        border(s.th, brand);
        XSSFFont thf = (XSSFFont) wb.createFont();
        thf.setBold(true);
        thf.setFontHeightInPoints((short) 11);
        thf.setColor(white);
        s.th.setFont(thf);

        s.tdLabel = bodyStyle(wb, white, HorizontalAlignment.LEFT, bdr, true, bodyText);
        s.tdValue = bodyStyle(wb, white, HorizontalAlignment.LEFT, bdr, true, brand);
        s.tdValue.getFont().setFontHeightInPoints((short) 12);
        s.td = bodyStyle(wb, white, HorizontalAlignment.LEFT, bdr, false, bodyText);
        s.tdAlt = bodyStyle(wb, zebra, HorizontalAlignment.LEFT, bdr, false, bodyText);
        s.tdCenter = bodyStyle(wb, white, HorizontalAlignment.CENTER, bdr, false, bodyText);
        s.tdCenterAlt = bodyStyle(wb, zebra, HorizontalAlignment.CENTER, bdr, false, bodyText);
        s.tdRight = bodyStyle(wb, white, HorizontalAlignment.RIGHT, bdr, false, bodyText);
        s.tdRightAlt = bodyStyle(wb, zebra, HorizontalAlignment.RIGHT, bdr, false, bodyText);
        s.good = bodyStyle(wb, goodBg, HorizontalAlignment.CENTER, bdr, true, goodFg);
        s.warn = bodyStyle(wb, warnBg, HorizontalAlignment.CENTER, bdr, true, warnFg);
        s.bad = bodyStyle(wb, badBg, HorizontalAlignment.CENTER, bdr, true, badFg);
        s.neutral = bodyStyle(wb, neuBg, HorizontalAlignment.CENTER, bdr, true, neuFg);

        return s;
    }

    private void put(Row row, int col, String val, XSSFCellStyle style) {
        Cell c = row.createCell(col);
        c.setCellValue(val == null ? "" : val);
        c.setCellStyle(style);
    }

    private void put(Row row, int col, double val, XSSFCellStyle style) {
        Cell c = row.createCell(col);
        c.setCellValue(val);
        c.setCellStyle(style);
    }

    /** Renders a full-width branded banner (title + subtitle) across colspan columns. */
    private void banner(Sheet sheet, int colspan, String title, String subtitle, RptStyles s) {
        Row r0 = sheet.createRow(0);
        r0.setHeightInPoints(30);
        for (int c = 0; c < colspan; c++) {
            Cell cell = r0.createCell(c);
            cell.setCellStyle(s.bannerTitle);
            if (c == 0) cell.setCellValue(title);
        }
        Row r1 = sheet.createRow(1);
        r1.setHeightInPoints(16);
        for (int c = 0; c < colspan; c++) {
            Cell cell = r1.createCell(c);
            cell.setCellStyle(s.bannerSub);
            if (c == 0) cell.setCellValue(subtitle);
        }
        if (colspan > 1) {
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, colspan - 1));
            sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, colspan - 1));
        }
    }

    private void sizeColumns(Sheet sheet, int cols) {
        for (int i = 0; i < cols; i++) {
            sheet.autoSizeColumn(i);
            int w = sheet.getColumnWidth(i) + 900;
            if (w > 16000) w = 16000;
            if (w < 2800) w = 2800;
            sheet.setColumnWidth(i, w);
        }
    }

    private XSSFCellStyle slaStatusStyle(RptStyles s, String status) {
        if (status == null) return s.neutral;
        switch (status) {
            case "COMPLETED_ON_TIME":
            case "ON_TRACK":
                return s.good;
            case "AT_RISK":
                return s.warn;
            case "MISSED":
            case "COMPLETED_DELAYED":
                return s.bad;
            default:
                return s.neutral;
        }
    }

    private XSSFCellStyle riskStyle(RptStyles s, String risk) {
        if ("High".equalsIgnoreCase(risk)) return s.bad;
        if ("Medium".equalsIgnoreCase(risk)) return s.warn;
        if ("Low".equalsIgnoreCase(risk)) return s.good;
        return s.neutral;
    }

    private XSSFCellStyle complianceStyle(RptStyles s, double pct) {
        if (pct >= 80) return s.good;
        if (pct >= 50) return s.warn;
        return s.bad;
    }

    // ==================================================================================
    // Premium PDF styling toolkit (OpenPDF / com.lowagie.text) shared across PDF reports
    // ==================================================================================

    private static final java.awt.Color PDF_BRAND_DARK = new java.awt.Color(30, 41, 59);
    private static final java.awt.Color PDF_BRAND = new java.awt.Color(79, 70, 229);
    private static final java.awt.Color PDF_ZEBRA = new java.awt.Color(244, 246, 251);
    private static final java.awt.Color PDF_BORDER = new java.awt.Color(203, 213, 225);
    private static final java.awt.Color PDF_SUBTEXT = new java.awt.Color(203, 213, 225);
    private static final java.awt.Color PDF_BODY_TEXT = new java.awt.Color(30, 41, 59);
    private static final java.awt.Color PDF_FOOTER_TEXT = new java.awt.Color(148, 163, 184);
    private static final java.awt.Color PDF_GOOD_BG = new java.awt.Color(209, 250, 229);
    private static final java.awt.Color PDF_GOOD_FG = new java.awt.Color(6, 95, 70);
    private static final java.awt.Color PDF_WARN_BG = new java.awt.Color(254, 243, 199);
    private static final java.awt.Color PDF_WARN_FG = new java.awt.Color(146, 64, 14);
    private static final java.awt.Color PDF_BAD_BG = new java.awt.Color(254, 226, 226);
    private static final java.awt.Color PDF_BAD_FG = new java.awt.Color(153, 27, 27);
    private static final java.awt.Color PDF_NEUTRAL_BG = new java.awt.Color(241, 245, 249);
    private static final java.awt.Color PDF_NEUTRAL_FG = new java.awt.Color(71, 85, 105);

    /** Draws a subtle footer (report label + page number) on every PDF page. */
    private static class PdfFooter extends com.lowagie.text.pdf.PdfPageEventHelper {
        private final String label;
        PdfFooter(String label) { this.label = label; }
        @Override
        public void onEndPage(com.lowagie.text.pdf.PdfWriter writer, com.lowagie.text.Document document) {
            com.lowagie.text.pdf.PdfContentByte cb = writer.getDirectContent();
            com.lowagie.text.Font f = com.lowagie.text.FontFactory.getFont(
                    com.lowagie.text.FontFactory.HELVETICA, 8, com.lowagie.text.Font.NORMAL, PDF_FOOTER_TEXT);
            com.lowagie.text.Phrase left = new com.lowagie.text.Phrase(label, f);
            com.lowagie.text.Phrase right = new com.lowagie.text.Phrase("Page " + writer.getPageNumber(), f);
            float y = document.bottom() - 14;
            com.lowagie.text.pdf.ColumnText.showTextAligned(
                    cb, com.lowagie.text.Element.ALIGN_LEFT, left, document.left(), y, 0);
            com.lowagie.text.pdf.ColumnText.showTextAligned(
                    cb, com.lowagie.text.Element.ALIGN_RIGHT, right, document.right(), y, 0);
        }
    }

    /** Full-width branded banner (title + subtitle) at the top of a PDF report. */
    private void pdfBanner(com.lowagie.text.Document document, String title, String subtitle) throws com.lowagie.text.DocumentException {
        com.lowagie.text.pdf.PdfPTable bannerTable = new com.lowagie.text.pdf.PdfPTable(1);
        bannerTable.setWidthPercentage(100);
        bannerTable.setSpacingAfter(14f);

        com.lowagie.text.Font titleFont = com.lowagie.text.FontFactory.getFont(
                com.lowagie.text.FontFactory.HELVETICA_BOLD, 16, com.lowagie.text.Font.NORMAL, java.awt.Color.WHITE);
        com.lowagie.text.pdf.PdfPCell titleCell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(title, titleFont));
        titleCell.setBackgroundColor(PDF_BRAND_DARK);
        titleCell.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
        titleCell.setPaddingTop(10f);
        titleCell.setPaddingLeft(12f);
        titleCell.setPaddingBottom(2f);
        bannerTable.addCell(titleCell);

        com.lowagie.text.Font subFont = com.lowagie.text.FontFactory.getFont(
                com.lowagie.text.FontFactory.HELVETICA_OBLIQUE, 9, com.lowagie.text.Font.NORMAL, PDF_SUBTEXT);
        com.lowagie.text.pdf.PdfPCell subCell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(subtitle, subFont));
        subCell.setBackgroundColor(PDF_BRAND_DARK);
        subCell.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
        subCell.setPaddingLeft(12f);
        subCell.setPaddingBottom(10f);
        bannerTable.addCell(subCell);

        document.add(bannerTable);
    }

    private com.lowagie.text.pdf.PdfPCell pdfHeaderCell(String text) {
        com.lowagie.text.Font f = com.lowagie.text.FontFactory.getFont(
                com.lowagie.text.FontFactory.HELVETICA_BOLD, 9, com.lowagie.text.Font.NORMAL, java.awt.Color.WHITE);
        com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(text, f));
        cell.setBackgroundColor(PDF_BRAND);
        cell.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_CENTER);
        cell.setVerticalAlignment(com.lowagie.text.Element.ALIGN_MIDDLE);
        cell.setPadding(6f);
        cell.setBorderColor(PDF_BRAND);
        return cell;
    }

    private com.lowagie.text.pdf.PdfPCell pdfBodyCell(String text, boolean alt, int align) {
        com.lowagie.text.Font f = com.lowagie.text.FontFactory.getFont(
                com.lowagie.text.FontFactory.HELVETICA, 8.5f, com.lowagie.text.Font.NORMAL, PDF_BODY_TEXT);
        com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(text == null ? "" : text, f));
        cell.setBackgroundColor(alt ? PDF_ZEBRA : java.awt.Color.WHITE);
        cell.setHorizontalAlignment(align);
        cell.setVerticalAlignment(com.lowagie.text.Element.ALIGN_MIDDLE);
        cell.setPadding(5f);
        cell.setBorderColor(PDF_BORDER);
        cell.setBorderWidth(0.5f);
        return cell;
    }

    private com.lowagie.text.pdf.PdfPCell pdfStatusCell(String text, java.awt.Color bg, java.awt.Color fg) {
        com.lowagie.text.Font f = com.lowagie.text.FontFactory.getFont(
                com.lowagie.text.FontFactory.HELVETICA_BOLD, 8.5f, com.lowagie.text.Font.NORMAL, fg);
        com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(text == null ? "" : text, f));
        cell.setBackgroundColor(bg);
        cell.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_CENTER);
        cell.setVerticalAlignment(com.lowagie.text.Element.ALIGN_MIDDLE);
        cell.setPadding(5f);
        cell.setBorderColor(PDF_BORDER);
        cell.setBorderWidth(0.5f);
        return cell;
    }

    private com.lowagie.text.pdf.PdfPCell pdfSlaStatusCell(String status) {
        String label = humanize(status);
        if (status == null) return pdfStatusCell(label, PDF_NEUTRAL_BG, PDF_NEUTRAL_FG);
        switch (status) {
            case "COMPLETED_ON_TIME":
            case "ON_TRACK":
                return pdfStatusCell(label, PDF_GOOD_BG, PDF_GOOD_FG);
            case "AT_RISK":
                return pdfStatusCell(label, PDF_WARN_BG, PDF_WARN_FG);
            case "MISSED":
            case "COMPLETED_DELAYED":
                return pdfStatusCell(label, PDF_BAD_BG, PDF_BAD_FG);
            default:
                return pdfStatusCell(label, PDF_NEUTRAL_BG, PDF_NEUTRAL_FG);
        }
    }

    private com.lowagie.text.pdf.PdfPCell pdfRiskCell(String risk) {
        if ("High".equalsIgnoreCase(risk)) return pdfStatusCell(risk, PDF_BAD_BG, PDF_BAD_FG);
        if ("Medium".equalsIgnoreCase(risk)) return pdfStatusCell(risk, PDF_WARN_BG, PDF_WARN_FG);
        if ("Low".equalsIgnoreCase(risk)) return pdfStatusCell(risk, PDF_GOOD_BG, PDF_GOOD_FG);
        return pdfStatusCell(risk, PDF_NEUTRAL_BG, PDF_NEUTRAL_FG);
    }

    // ==================================================================================

    @SuppressWarnings("unchecked")
    private void generateAnalyticsExcelReport(Workbook workbook) {
        Map<String, Object> data = analyticsService.getDashboardData();
        XSSFWorkbook wb = (XSSFWorkbook) workbook;
        RptStyles s = buildStyles(wb);

        // 1. Sheet: Executive Summary
        XSSFSheet overviewSheet = wb.createSheet("Executive Summary");
        overviewSheet.setDisplayGridlines(false);

        banner(overviewSheet, 4,
                "DevTrack 2.0  \u2014  Executive Analytics Report",
                "Generated " + LocalDateTime.now().format(DT_FMT) + "   \u2022   System-wide throughput & operations   \u2022   Confidential",
                s);

        // KPI section
        Row kpiHeader = overviewSheet.createRow(3);
        Cell kpiHeaderCell = kpiHeader.createCell(0);
        kpiHeaderCell.setCellValue("Key Performance Indicators");
        kpiHeaderCell.setCellStyle(s.section);
        overviewSheet.addMergedRegion(new CellRangeAddress(3, 3, 0, 3));

        Row kpiCols = overviewSheet.createRow(4);
        put(kpiCols, 0, "Metric", s.th);
        put(kpiCols, 1, "Value", s.th);

        String[] kpis = {
                "Total CRs", "Total Defects", "Quality Risks",
                "Bug Acceptance Rate", "Bug Rejection Rate", "Bug Challenge Rate",
                "Avg Bug Resolution", "Avg Testing Duration"
        };
        String[] values = {
                str(data.get("totalCRs")),
                str(data.get("totalBugs")),
                str(data.get("qualityRiskCrCount")),
                str(data.get("bugAcceptanceRate")) + "%",
                str(data.get("bugRejectionRate")) + "%",
                str(data.get("bugChallengeRate")) + "%",
                str(data.get("averageBugResolutionHours")) + " hrs",
                str(data.get("averageTestingDurationHours")) + " hrs"
        };
        int kpiRow = 5;
        for (int i = 0; i < kpis.length; i++) {
            Row r = overviewSheet.createRow(kpiRow++);
            put(r, 0, kpis[i], s.tdLabel);
            put(r, 1, values[i], s.tdValue);
        }

        // SLA section
        int slaSection = kpiRow + 1;
        Row slaHeaderRow = overviewSheet.createRow(slaSection);
        Cell slaHeaderCell = slaHeaderRow.createCell(0);
        slaHeaderCell.setCellValue("SLA Performance & Pipeline Compliance");
        slaHeaderCell.setCellStyle(s.section);
        overviewSheet.addMergedRegion(new CellRangeAddress(slaSection, slaSection, 0, 3));

        Row slaCols = overviewSheet.createRow(slaSection + 1);
        put(slaCols, 0, "Benchmark", s.th);
        put(slaCols, 1, "Compliance", s.th);
        put(slaCols, 2, "Status", s.th);

        String[] slas = {
                "Testing SLA (48h) Compliance Rate",
                "Approval SLA (24h) Compliance Rate",
                "Sprint Task Completion Rate"
        };
        double[] slaValues = {
                num(data.get("testingSlaComplianceRate")),
                num(data.get("approvalSlaComplianceRate")),
                num(data.get("sprintTaskCompletionRate"))
        };
        int slaRow = slaSection + 2;
        for (int i = 0; i < slas.length; i++) {
            Row r = overviewSheet.createRow(slaRow++);
            put(r, 0, slas[i], s.tdLabel);
            put(r, 1, String.format("%.1f%%", slaValues[i]), s.tdRight);
            String badge = slaValues[i] >= 80 ? "Optimal" : (slaValues[i] >= 50 ? "Acceptable" : "At Risk");
            put(r, 2, badge, complianceStyle(s, slaValues[i]));
        }

        overviewSheet.setColumnWidth(0, 13000);
        overviewSheet.setColumnWidth(1, 6000);
        overviewSheet.setColumnWidth(2, 5000);
        overviewSheet.setColumnWidth(3, 4000);
        overviewSheet.createFreezePane(0, 2);

        // 2. Sheet: Developer Productivity
        XSSFSheet devSheet = wb.createSheet("Dev Productivity");
        devSheet.setDisplayGridlines(false);
        banner(devSheet, 3, "Developer Productivity Analysis",
                "Logged efforts (days) and completed tasks delivered per engineer", s);
        Row pHeader = devSheet.createRow(3);
        String[] pCols = {"Developer", "Efforts Logged (Days)", "Completed Tasks"};
        for (int i = 0; i < pCols.length; i++) put(pHeader, i, pCols[i], s.th);

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

        int devRowIdx = 4;
        int devDataStart = 4;
        boolean alt = false;
        for (Map.Entry<String, Double> entry : effortsMap.entrySet()) {
            Row r = devSheet.createRow(devRowIdx++);
            put(r, 0, entry.getKey(), alt ? s.tdAlt : s.td);
            put(r, 1, entry.getValue(), alt ? s.tdRightAlt : s.tdRight);
            put(r, 2, (double) tasksCountMap.getOrDefault(entry.getKey(), 0), alt ? s.tdRightAlt : s.tdRight);
            alt = !alt;
        }
        sizeColumns(devSheet, pCols.length);
        devSheet.createFreezePane(0, 4);
        if (devRowIdx > devDataStart) {
            devSheet.setAutoFilter(new CellRangeAddress(3, devRowIdx - 1, 0, pCols.length - 1));
            try {
                XSSFDrawing drawing = devSheet.createDrawingPatriarch();
                XSSFClientAnchor anchor = drawing.createAnchor(0, 0, 0, 0, 4, 4, 14, 22);
                XSSFChart chart = drawing.createChart(anchor);
                chart.setTitleText("Developer Productivity Analysis");
                chart.setTitleOverlay(false);

                XDDFCategoryAxis categoryAxis = chart.createCategoryAxis(AxisPosition.BOTTOM);
                categoryAxis.setTitle("Developer");
                XDDFValueAxis valueAxis = chart.createValueAxis(AxisPosition.LEFT);
                valueAxis.setTitle("Efforts (Days) / Tasks");
                valueAxis.setCrosses(AxisCrosses.AUTO_ZERO);

                XDDFDataSource<String> devs = XDDFDataSourcesFactory.fromStringCellRange(devSheet,
                        new CellRangeAddress(devDataStart, devRowIdx - 1, 0, 0));
                XDDFNumericalDataSource<Double> efforts = XDDFDataSourcesFactory.fromNumericCellRange(devSheet,
                        new CellRangeAddress(devDataStart, devRowIdx - 1, 1, 1));
                XDDFNumericalDataSource<Double> tasksData = XDDFDataSourcesFactory.fromNumericCellRange(devSheet,
                        new CellRangeAddress(devDataStart, devRowIdx - 1, 2, 2));

                XDDFChartData chartData = chart.createData(ChartTypes.BAR, categoryAxis, valueAxis);
                ((XDDFBarChartData) chartData).setBarDirection(BarDirection.COL);
                ((XDDFBarChartData) chartData).setBarGrouping(BarGrouping.CLUSTERED);

                XDDFChartData.Series series1 = chartData.addSeries(devs, efforts);
                series1.setTitle("Logged Efforts (Days)", null);
                XDDFChartData.Series series2 = chartData.addSeries(devs, tasksData);
                series2.setTitle("Completed Tasks", null);

                chart.plot(chartData);
                XDDFChartLegend legend = chart.getOrAddLegend();
                legend.setPosition(LegendPosition.BOTTOM);
            } catch (Exception e) {
                log.error("Failed to generate Developer Productivity Excel chart", e);
            }
        }

        // 3. Sheet: Defect Resolution
        XSSFSheet defectSheet = wb.createSheet("Defects Resolution");
        defectSheet.setDisplayGridlines(false);
        banner(defectSheet, 4, "Defect Resolution Metrics",
                "Bugs raised vs. resolved and resolution rate per developer", s);
        Row dHeader = defectSheet.createRow(3);
        String[] dCols = {"Developer", "Bugs Raised", "Bugs Resolved", "Resolution Rate"};
        for (int i = 0; i < dCols.length; i++) put(dHeader, i, dCols[i], s.th);

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

        int defectRowIdx = 4;
        int defectDataStart = 4;
        alt = false;
        for (Map.Entry<String, Integer> entry : bugsRaisedMap.entrySet()) {
            Row r = defectSheet.createRow(defectRowIdx++);
            String dev = entry.getKey();
            int raised = entry.getValue();
            int solved = bugsSolvedMap.getOrDefault(dev, 0);
            double rate = raised > 0 ? (double) solved / raised * 100.0 : 0.0;
            rate = Math.round(rate * 10.0) / 10.0;
            put(r, 0, dev, alt ? s.tdAlt : s.td);
            put(r, 1, (double) raised, alt ? s.tdRightAlt : s.tdRight);
            put(r, 2, (double) solved, alt ? s.tdRightAlt : s.tdRight);
            put(r, 3, String.format("%.1f%%", rate), rate >= 80 ? s.good : (rate >= 50 ? s.warn : s.bad));
            alt = !alt;
        }
        sizeColumns(defectSheet, dCols.length);
        defectSheet.createFreezePane(0, 4);
        if (defectRowIdx > defectDataStart) {
            defectSheet.setAutoFilter(new CellRangeAddress(3, defectRowIdx - 1, 0, dCols.length - 1));
            try {
                XSSFDrawing drawing = defectSheet.createDrawingPatriarch();
                XSSFClientAnchor anchor = drawing.createAnchor(0, 0, 0, 0, 5, 4, 15, 22);
                XSSFChart chart = drawing.createChart(anchor);
                chart.setTitleText("Defect Resolution Metrics");
                chart.setTitleOverlay(false);

                XDDFCategoryAxis categoryAxis = chart.createCategoryAxis(AxisPosition.BOTTOM);
                categoryAxis.setTitle("Developer");
                XDDFValueAxis valueAxis = chart.createValueAxis(AxisPosition.LEFT);
                valueAxis.setTitle("Bugs Count");
                valueAxis.setCrosses(AxisCrosses.AUTO_ZERO);

                XDDFDataSource<String> devs = XDDFDataSourcesFactory.fromStringCellRange(defectSheet,
                        new CellRangeAddress(defectDataStart, defectRowIdx - 1, 0, 0));
                XDDFNumericalDataSource<Double> raised = XDDFDataSourcesFactory.fromNumericCellRange(defectSheet,
                        new CellRangeAddress(defectDataStart, defectRowIdx - 1, 1, 1));
                XDDFNumericalDataSource<Double> resolved = XDDFDataSourcesFactory.fromNumericCellRange(defectSheet,
                        new CellRangeAddress(defectDataStart, defectRowIdx - 1, 2, 2));

                XDDFChartData chartData = chart.createData(ChartTypes.LINE, categoryAxis, valueAxis);
                XDDFChartData.Series series1 = chartData.addSeries(devs, raised);
                series1.setTitle("Bugs Raised", null);
                XDDFChartData.Series series2 = chartData.addSeries(devs, resolved);
                series2.setTitle("Bugs Resolved", null);

                chart.plot(chartData);
                XDDFChartLegend legend = chart.getOrAddLegend();
                legend.setPosition(LegendPosition.BOTTOM);
            } catch (Exception e) {
                log.error("Failed to generate Defect Resolution Excel chart", e);
            }
        }

        // 4. Sheet: Active Sprint Burndown
        XSSFSheet burndownSheet = wb.createSheet("Sprint Burndown");
        burndownSheet.setDisplayGridlines(false);
        banner(burndownSheet, 3, "Active Sprint Burndown",
                "Remaining vs. ideal story points across the active sprint", s);
        Row bHeader = burndownSheet.createRow(3);
        String[] bCols = {"Day", "Remaining Story Points", "Ideal Story Points"};
        for (int i = 0; i < bCols.length; i++) put(bHeader, i, bCols[i], s.th);

        List<Map<String, Object>> burndownData = (List<Map<String, Object>>) data.get("sprintBurndown");
        int burnRowIdx = 4;
        int burnDataStart = 4;
        alt = false;
        if (burndownData != null) {
            for (Map<String, Object> day : burndownData) {
                Row r = burndownSheet.createRow(burnRowIdx++);
                put(r, 0, str(day.get("name")), alt ? s.tdAlt : s.td);
                put(r, 1, num(day.get("Remaining")), alt ? s.tdRightAlt : s.tdRight);
                put(r, 2, num(day.get("Ideal")), alt ? s.tdRightAlt : s.tdRight);
                alt = !alt;
            }
        }
        sizeColumns(burndownSheet, bCols.length);
        burndownSheet.createFreezePane(0, 4);
        if (burnRowIdx > burnDataStart) {
            burndownSheet.setAutoFilter(new CellRangeAddress(3, burnRowIdx - 1, 0, bCols.length - 1));
            try {
                XSSFDrawing drawing = burndownSheet.createDrawingPatriarch();
                XSSFClientAnchor anchor = drawing.createAnchor(0, 0, 0, 0, 4, 4, 14, 22);
                XSSFChart chart = drawing.createChart(anchor);
                chart.setTitleText("Active Sprint Burndown Chart");
                chart.setTitleOverlay(false);

                XDDFCategoryAxis categoryAxis = chart.createCategoryAxis(AxisPosition.BOTTOM);
                categoryAxis.setTitle("Day");
                XDDFValueAxis valueAxis = chart.createValueAxis(AxisPosition.LEFT);
                valueAxis.setTitle("Story Points");
                valueAxis.setCrosses(AxisCrosses.AUTO_ZERO);

                XDDFDataSource<String> days = XDDFDataSourcesFactory.fromStringCellRange(burndownSheet,
                        new CellRangeAddress(burnDataStart, burnRowIdx - 1, 0, 0));
                XDDFNumericalDataSource<Double> remaining = XDDFDataSourcesFactory.fromNumericCellRange(burndownSheet,
                        new CellRangeAddress(burnDataStart, burnRowIdx - 1, 1, 1));
                XDDFNumericalDataSource<Double> ideal = XDDFDataSourcesFactory.fromNumericCellRange(burndownSheet,
                        new CellRangeAddress(burnDataStart, burnRowIdx - 1, 2, 2));

                XDDFChartData chartData = chart.createData(ChartTypes.LINE, categoryAxis, valueAxis);
                XDDFChartData.Series series1 = chartData.addSeries(days, remaining);
                series1.setTitle("Remaining Story Points", null);
                XDDFChartData.Series series2 = chartData.addSeries(days, ideal);
                series2.setTitle("Ideal Story Points", null);

                chart.plot(chartData);
                XDDFChartLegend legend = chart.getOrAddLegend();
                legend.setPosition(LegendPosition.BOTTOM);
            } catch (Exception e) {
                log.error("Failed to generate Sprint Burndown Excel chart", e);
            }
        }

        // 5. Sheet: Response Times
        XSSFSheet timesSheet = wb.createSheet("Response Times");
        timesSheet.setDisplayGridlines(false);
        banner(timesSheet, 2, "Average Response Times",
                "Developer and tester average turnaround (hours)", s);

        Row devTimesHeader = timesSheet.createRow(3);
        put(devTimesHeader, 0, "Developer", s.th);
        put(devTimesHeader, 1, "Avg Response Time (Hours)", s.th);
        int timesRowIdx = 4;
        List<Map<String, Object>> devTimes = (List<Map<String, Object>>) data.get("developerResponseTimes");
        alt = false;
        if (devTimes != null) {
            for (Map<String, Object> dev : devTimes) {
                Row r = timesSheet.createRow(timesRowIdx++);
                put(r, 0, str(dev.get("name")), alt ? s.tdAlt : s.td);
                put(r, 1, num(dev.get("Response Time")), alt ? s.tdRightAlt : s.tdRight);
                alt = !alt;
            }
        }

        timesRowIdx += 1;
        Row testerHeader = timesSheet.createRow(timesRowIdx++);
        put(testerHeader, 0, "Tester", s.th);
        put(testerHeader, 1, "Avg Response Time (Hours)", s.th);
        List<Map<String, Object>> testerTimes = (List<Map<String, Object>>) data.get("testerResponseTimes");
        alt = false;
        if (testerTimes != null) {
            for (Map<String, Object> tester : testerTimes) {
                Row r = timesSheet.createRow(timesRowIdx++);
                put(r, 0, str(tester.get("name")), alt ? s.tdAlt : s.td);
                put(r, 1, num(tester.get("Response Time")), alt ? s.tdRightAlt : s.tdRight);
                alt = !alt;
            }
        }
        timesSheet.setColumnWidth(0, 11000);
        timesSheet.setColumnWidth(1, 8000);
        timesSheet.createFreezePane(0, 4);
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
                for (Sprint sp : sprints) {
                    sprintNames.put(sp.getId(), sp.getName());
                }
            }

            File tempFile = File.createTempFile("devtrack-tested-crs-" + jobId + "-", ".xlsx");

            try (XSSFWorkbook workbook = new XSSFWorkbook(); FileOutputStream out = new FileOutputStream(tempFile)) {
                RptStyles s = buildStyles(workbook);
                XSSFSheet sheet = workbook.createSheet("Tested CRs Report");
                sheet.setDisplayGridlines(false);

                String[] cols = {
                        "CR Number", "CR Title", "Project", "Sprint", "Assigned Developer(s)",
                        "Priority", "Testing Started", "Testing Completed", "Testing Duration",
                        "Bugs Raised", "Retests", "Production Status", "Final Status", "Quality Risk"
                };

                banner(sheet, cols.length, "DevTrack 2.0  \u2014  Tested Change Requests Report",
                        "Generated " + LocalDateTime.now().format(DT_FMT) + "   \u2022   " + tasks.size() + " record(s)", s);

                Row headerRow = sheet.createRow(3);
                for (int i = 0; i < cols.length; i++) put(headerRow, i, cols[i], s.th);

                int rowIdx = 4;
                boolean alt = false;
                for (Task task : tasks) {
                    Row row = sheet.createRow(rowIdx++);
                    XSSFCellStyle cs = alt ? s.tdAlt : s.td;
                    XSSFCellStyle cc = alt ? s.tdCenterAlt : s.tdCenter;
                    XSSFCellStyle cr = alt ? s.tdRightAlt : s.tdRight;

                    String devsStr = task.getDevelopers().stream()
                            .map(td -> td.getDeveloper() != null ? td.getDeveloper().getFullName() : "Unknown")
                            .collect(Collectors.joining(", "));

                    String sprintName = task.getSprintId() != null
                            ? sprintNames.getOrDefault(task.getSprintId(), "Sprint " + task.getSprintId())
                            : "Ad-hoc";

                    String prodStatus = task.getProductionDate() != null ? "DEPLOYED" : "PENDING";

                    put(row, 0, str(task.getJtrackId()), cs);
                    put(row, 1, str(task.getTitle()), cs);
                    put(row, 2, task.getProject() != null ? task.getProject() : "N/A", cs);
                    put(row, 3, sprintName, cs);
                    put(row, 4, devsStr, cs);
                    put(row, 5, str(task.getPriority()), cc);
                    put(row, 6, fmtDateTime(task.getTestingStartedDate()), cc);
                    put(row, 7, fmtDateTime(task.getTestingCompletedDate()), cc);
                    put(row, 8, task.getTestingDuration() != null ? task.getTestingDuration() : "N/A", cc);
                    put(row, 9, (double) (task.getTotalBugsRaised() != null ? task.getTotalBugsRaised() : 0), cr);
                    put(row, 10, (double) (task.getTotalRetests() != null ? task.getTotalRetests() : 0), cr);
                    put(row, 11, prodStatus, task.getProductionDate() != null ? s.good : s.neutral);
                    put(row, 12, str(task.getStatus()), cc);
                    put(row, 13, task.isQualityRisk() ? "YES" : "NO", task.isQualityRisk() ? s.bad : s.good);
                    alt = !alt;
                }

                sizeColumns(sheet, cols.length);
                sheet.createFreezePane(0, 4);
                if (rowIdx > 4) sheet.setAutoFilter(new CellRangeAddress(3, rowIdx - 1, 0, cols.length - 1));
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

    private void generateDeadlinesExcelReport(Workbook workbook, List<Task> tasks) {
        XSSFWorkbook wb = (XSSFWorkbook) workbook;
        RptStyles s = buildStyles(wb);
        XSSFSheet sheet = wb.createSheet("Deployment Deadlines");
        sheet.setDisplayGridlines(false);

        String[] cols = {"JTrack ID", "Title", "Priority", "Assigned Dev", "Milestone", "Expected Date", "Actual Date", "Delay (Days)", "SLA Status", "Risk Level"};
        banner(sheet, cols.length, "DevTrack 2.0  \u2014  Deployment Deadlines & SLA Report",
                "Generated " + LocalDateTime.now().format(DT_FMT) + "   \u2022   SIT & UAT deployment commitments   \u2022   Confidential", s);

        Row headerRow = sheet.createRow(3);
        for (int i = 0; i < cols.length; i++) put(headerRow, i, cols[i], s.th);

        int rowIdx = 4;
        boolean alt = false;
        for (Task t : tasks) {
            String devName = t.getAssignedDeveloper() != null ? t.getAssignedDeveloper().getFullName() : "Unassigned";

            if (t.getExpectedSitDeploymentDate() != null) {
                rowIdx = writeDeadlineRow(sheet, s, rowIdx, alt, t, devName, "SIT",
                        t.getExpectedSitDeploymentDate(), t.getSitDate());
                alt = !alt;
            }
            if (t.getExpectedUatDeploymentDate() != null) {
                rowIdx = writeDeadlineRow(sheet, s, rowIdx, alt, t, devName, "UAT",
                        t.getExpectedUatDeploymentDate(), t.getUatDate());
                alt = !alt;
            }
        }
        sizeColumns(sheet, cols.length);
        sheet.createFreezePane(0, 4);
        if (rowIdx > 4) sheet.setAutoFilter(new CellRangeAddress(3, rowIdx - 1, 0, cols.length - 1));
    }

    private int writeDeadlineRow(XSSFSheet sheet, RptStyles s, int rowIdx, boolean alt, Task t,
                                 String devName, String milestone, LocalDate expected, LocalDate actual) {
        XSSFCellStyle cs = alt ? s.tdAlt : s.td;
        XSSFCellStyle cc = alt ? s.tdCenterAlt : s.tdCenter;
        XSSFCellStyle cr = alt ? s.tdRightAlt : s.tdRight;
        Row row = sheet.createRow(rowIdx++);
        String status = evaluateSlaStatus(t, milestone);
        String risk = evaluateRiskLevel(t, milestone);
        put(row, 0, str(t.getJtrackId()), cs);
        put(row, 1, str(t.getTitle()), cs);
        put(row, 2, str(t.getPriority()), cc);
        put(row, 3, devName, cs);
        put(row, 4, milestone, cc);
        put(row, 5, fmtDate(expected), cc);
        put(row, 6, fmtDate(actual), cc);
        put(row, 7, (double) calculateDelayDays(t, milestone), cr);
        put(row, 8, humanize(status), slaStatusStyle(s, status));
        put(row, 9, risk, riskStyle(s, risk));
        return rowIdx;
    }

    private void generateDeadlinesCsvReport(java.io.OutputStream out, List<Task> tasks) {
        java.io.PrintWriter writer = new java.io.PrintWriter(out);
        writer.println("JTrack ID,Title,Priority,Assigned Dev,Milestone,Expected Date,Actual Date,Delay Days,SLA Status,Risk Level");
        for (Task t : tasks) {
            String devName = t.getAssignedDeveloper() != null ? t.getAssignedDeveloper().getFullName() : "Unassigned";
            if (t.getExpectedSitDeploymentDate() != null) {
                long delay = calculateDelayDays(t, "SIT");
                String status = evaluateSlaStatus(t, "SIT");
                String risk = evaluateRiskLevel(t, "SIT");
                writer.printf("\"%s\",\"%s\",\"%s\",\"%s\",\"SIT Deployment\",\"%s\",\"%s\",%d,\"%s\",\"%s\"\n",
                    escapeCsv(t.getJtrackId()), escapeCsv(t.getTitle()), escapeCsv(t.getPriority()), escapeCsv(devName),
                    t.getExpectedSitDeploymentDate(), t.getSitDate() != null ? t.getSitDate().toString() : "",
                    delay, status, risk);
            }
            if (t.getExpectedUatDeploymentDate() != null) {
                long delay = calculateDelayDays(t, "UAT");
                String status = evaluateSlaStatus(t, "UAT");
                String risk = evaluateRiskLevel(t, "UAT");
                writer.printf("\"%s\",\"%s\",\"%s\",\"%s\",\"UAT Deployment\",\"%s\",\"%s\",%d,\"%s\",\"%s\"\n",
                    escapeCsv(t.getJtrackId()), escapeCsv(t.getTitle()), escapeCsv(t.getPriority()), escapeCsv(devName),
                    t.getExpectedUatDeploymentDate(), t.getUatDate() != null ? t.getUatDate().toString() : "",
                    delay, status, risk);
            }
        }
        writer.flush();
    }

    private void generateDeadlinesPdfReport(java.io.OutputStream out, List<Task> tasks) throws Exception {
        com.lowagie.text.Document document = new com.lowagie.text.Document(com.lowagie.text.PageSize.A4.rotate(), 28, 28, 28, 36);
        com.lowagie.text.pdf.PdfWriter writer = com.lowagie.text.pdf.PdfWriter.getInstance(document, out);
        writer.setPageEvent(new PdfFooter("DevTrack 2.0  \u2014  Deployment Deadlines & SLA Report"));
        document.open();

        pdfBanner(document,
                "DevTrack 2.0  \u2014  Deployment Deadlines & SLA Report",
                "Generated " + LocalDateTime.now().format(DT_FMT) + "   \u2022   SIT & UAT deployment commitments   \u2022   Confidential");

        com.lowagie.text.pdf.PdfPTable table = new com.lowagie.text.pdf.PdfPTable(10);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.1f, 3f, 1f, 1.7f, 1f, 1.3f, 1.3f, 0.9f, 1.7f, 1f});
        table.setHeaderRows(1);

        String[] headers = {"JTrack ID", "Title", "Priority", "Assigned Dev", "Milestone", "Expected Date", "Actual Date", "Delay", "SLA Status", "Risk Level"};
        for (String h : headers) table.addCell(pdfHeaderCell(h));

        boolean alt = false;
        for (Task t : tasks) {
            String devName = t.getAssignedDeveloper() != null ? t.getAssignedDeveloper().getFullName() : "Unassigned";
            if (t.getExpectedSitDeploymentDate() != null) {
                addDeadlinePdfRow(table, t, devName, "SIT", t.getExpectedSitDeploymentDate(), t.getSitDate(), alt);
                alt = !alt;
            }
            if (t.getExpectedUatDeploymentDate() != null) {
                addDeadlinePdfRow(table, t, devName, "UAT", t.getExpectedUatDeploymentDate(), t.getUatDate(), alt);
                alt = !alt;
            }
        }

        document.add(table);
        document.close();
    }

    private void addDeadlinePdfRow(com.lowagie.text.pdf.PdfPTable table, Task t, String devName, String milestone,
                                   LocalDate expected, LocalDate actual, boolean alt) {
        String status = evaluateSlaStatus(t, milestone);
        String risk = evaluateRiskLevel(t, milestone);
        long delay = calculateDelayDays(t, milestone);
        table.addCell(pdfBodyCell(str(t.getJtrackId()), alt, com.lowagie.text.Element.ALIGN_LEFT));
        table.addCell(pdfBodyCell(str(t.getTitle()), alt, com.lowagie.text.Element.ALIGN_LEFT));
        table.addCell(pdfBodyCell(str(t.getPriority()), alt, com.lowagie.text.Element.ALIGN_CENTER));
        table.addCell(pdfBodyCell(devName, alt, com.lowagie.text.Element.ALIGN_LEFT));
        table.addCell(pdfBodyCell(milestone, alt, com.lowagie.text.Element.ALIGN_CENTER));
        table.addCell(pdfBodyCell(fmtDate(expected), alt, com.lowagie.text.Element.ALIGN_CENTER));
        table.addCell(pdfBodyCell(fmtDate(actual), alt, com.lowagie.text.Element.ALIGN_CENTER));
        table.addCell(pdfBodyCell(String.valueOf(delay), alt, com.lowagie.text.Element.ALIGN_RIGHT));
        table.addCell(pdfSlaStatusCell(status));
        table.addCell(pdfRiskCell(risk));
    }

    private void generateTasksCsvReport(java.io.OutputStream out, List<Task> tasks) {
        java.io.PrintWriter writer = new java.io.PrintWriter(out);
        writer.println("ID,JTrack ID,Title,Status,Priority,Assignee,Created Date,Quality Risk");
        for (Task task : tasks) {
            writer.printf("%d,\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                task.getId(),
                escapeCsv(task.getJtrackId()),
                escapeCsv(task.getTitle()),
                escapeCsv(task.getStatus()),
                escapeCsv(task.getPriority()),
                escapeCsv(task.getAssignedDeveloper() != null ? task.getAssignedDeveloper().getFullName() : "Unassigned"),
                task.getCreatedDate() != null ? task.getCreatedDate().toString() : "",
                task.isQualityRisk() ? "YES" : "NO");
        }
        writer.flush();
    }

    private void generateTasksPdfReport(java.io.OutputStream out, List<Task> tasks) throws Exception {
        com.lowagie.text.Document document = new com.lowagie.text.Document(com.lowagie.text.PageSize.A4.rotate(), 28, 28, 28, 36);
        com.lowagie.text.pdf.PdfWriter writer = com.lowagie.text.pdf.PdfWriter.getInstance(document, out);
        writer.setPageEvent(new PdfFooter("DevTrack 2.0  \u2014  Change Requests Report"));
        document.open();

        pdfBanner(document, "DevTrack 2.0  \u2014  Change Requests Report",
                "Generated " + LocalDateTime.now().format(DT_FMT) + "   \u2022   " + tasks.size() + " record(s)   \u2022   Confidential");

        com.lowagie.text.pdf.PdfPTable table = new com.lowagie.text.pdf.PdfPTable(8);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{0.7f, 1.4f, 3.4f, 1.4f, 1.1f, 2f, 1.6f, 1.2f});
        table.setHeaderRows(1);

        String[] cols = {"ID", "JTrack ID", "Title", "Status", "Priority", "Assignee", "Created Date", "Quality Risk"};
        for (String h : cols) table.addCell(pdfHeaderCell(h));

        boolean alt = false;
        for (Task task : tasks) {
            table.addCell(pdfBodyCell(String.valueOf(task.getId()), alt, com.lowagie.text.Element.ALIGN_RIGHT));
            table.addCell(pdfBodyCell(str(task.getJtrackId()), alt, com.lowagie.text.Element.ALIGN_LEFT));
            table.addCell(pdfBodyCell(str(task.getTitle()), alt, com.lowagie.text.Element.ALIGN_LEFT));
            table.addCell(pdfBodyCell(str(task.getStatus()), alt, com.lowagie.text.Element.ALIGN_CENTER));
            table.addCell(pdfBodyCell(str(task.getPriority()), alt, com.lowagie.text.Element.ALIGN_CENTER));
            table.addCell(pdfBodyCell(task.getAssignedDeveloper() != null ? task.getAssignedDeveloper().getFullName() : "Unassigned", alt, com.lowagie.text.Element.ALIGN_LEFT));
            table.addCell(pdfBodyCell(fmtDateTime(task.getCreatedDate()), alt, com.lowagie.text.Element.ALIGN_CENTER));
            table.addCell(task.isQualityRisk()
                    ? pdfStatusCell("YES", PDF_BAD_BG, PDF_BAD_FG)
                    : pdfStatusCell("NO", PDF_GOOD_BG, PDF_GOOD_FG));
            alt = !alt;
        }

        document.add(table);
        document.close();
    }

    private void generateTasksExcelReport(Workbook workbook, List<Task> tasks) {
        XSSFWorkbook wb = (XSSFWorkbook) workbook;
        RptStyles s = buildStyles(wb);
        XSSFSheet sheet = wb.createSheet("CR Tasks Report");
        sheet.setDisplayGridlines(false);

        String[] cols = {"ID", "JTrack ID", "Title", "Status", "Priority", "Assignee", "Created Date", "Quality Risk"};
        banner(sheet, cols.length, "DevTrack 2.0  \u2014  Change Requests Report",
                "Generated " + LocalDateTime.now().format(DT_FMT) + "   \u2022   " + tasks.size() + " record(s)   \u2022   Confidential", s);

        Row headerRow = sheet.createRow(3);
        for (int i = 0; i < cols.length; i++) put(headerRow, i, cols[i], s.th);

        int rowIdx = 4;
        boolean alt = false;
        for (Task task : tasks) {
            Row row = sheet.createRow(rowIdx++);
            XSSFCellStyle cs = alt ? s.tdAlt : s.td;
            XSSFCellStyle cc = alt ? s.tdCenterAlt : s.tdCenter;
            XSSFCellStyle cr = alt ? s.tdRightAlt : s.tdRight;
            put(row, 0, (double) task.getId(), cr);
            put(row, 1, str(task.getJtrackId()), cs);
            put(row, 2, str(task.getTitle()), cs);
            put(row, 3, str(task.getStatus()), cc);
            put(row, 4, str(task.getPriority()), cc);
            put(row, 5, task.getAssignedDeveloper() != null ? task.getAssignedDeveloper().getFullName() : "Unassigned", cs);
            put(row, 6, fmtDateTime(task.getCreatedDate()), cc);
            put(row, 7, task.isQualityRisk() ? "YES" : "NO", task.isQualityRisk() ? s.bad : s.good);
            alt = !alt;
        }

        sizeColumns(sheet, cols.length);
        sheet.createFreezePane(0, 4);
        if (rowIdx > 4) sheet.setAutoFilter(new CellRangeAddress(3, rowIdx - 1, 0, cols.length - 1));
    }

    private long calculateDelayDays(Task task, String type) {
        LocalDate expected = "SIT".equalsIgnoreCase(type) ? task.getExpectedSitDeploymentDate() : task.getExpectedUatDeploymentDate();
        LocalDate actual = "SIT".equalsIgnoreCase(type) ? task.getSitDate() : task.getUatDate();
        if (expected == null) return 0;
        LocalDate comp = actual != null ? actual : LocalDate.now();
        if (comp.isAfter(expected)) {
            return ChronoUnit.DAYS.between(expected, comp);
        }
        return 0;
    }

    private String evaluateSlaStatus(Task task, String type) {
        LocalDate expected = "SIT".equalsIgnoreCase(type) ? task.getExpectedSitDeploymentDate() : task.getExpectedUatDeploymentDate();
        LocalDate actual = "SIT".equalsIgnoreCase(type) ? task.getSitDate() : task.getUatDate();
        if (expected == null) return "NOT_SET";
        if (actual != null) {
            return actual.isAfter(expected) ? "COMPLETED_DELAYED" : "COMPLETED_ON_TIME";
        }
        if (LocalDate.now().isAfter(expected)) return "MISSED";
        long rem = expected.isAfter(LocalDate.now()) ? ChronoUnit.DAYS.between(LocalDate.now(), expected) : 0;
        return rem <= 2 ? "AT_RISK" : "ON_TRACK";
    }

    private String evaluateRiskLevel(Task task, String type) {
        String status = evaluateSlaStatus(task, type);
        if ("MISSED".equals(status) || "COMPLETED_DELAYED".equals(status)) return "High";
        if ("AT_RISK".equals(status)) return "Medium";
        return "Low";
    }

    private String escapeCsv(String val) {
        if (val == null) return "";
        return val.replace("\"", "\"\"");
    }
}
