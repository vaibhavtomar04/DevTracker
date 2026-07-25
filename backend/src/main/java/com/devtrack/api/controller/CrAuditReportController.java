package com.devtrack.api.controller;

import com.devtrack.api.services.CrAuditReportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;

/**
 * Streams a premium multi-sheet CR Audit workbook (.xlsx).
 *
 * The frontend builds the fully-enriched payload (it already has tasks, bugs
 * and audit logs loaded, so timeline/bug data matches exactly what the user
 * sees). This controller stays a thin pass-through to keep the backend free of
 * any entity/lazy-loading coupling.
 *
 * Path: POST /api/reports/cr-audit-export  (context-path /devtrack)
 */
@RestController
@RequestMapping("/api/reports")
public class CrAuditReportController {

    private final CrAuditReportService crAuditReportService;

    public CrAuditReportController(CrAuditReportService crAuditReportService) {
        this.crAuditReportService = crAuditReportService;
    }

    @PostMapping("/cr-audit-export")
    public ResponseEntity<byte[]> exportCrAudit(@RequestBody Map<String, Object> payload) throws Exception {
        byte[] workbook = crAuditReportService.generate(payload);

        String fileName = "DevTrack_CR_Audit_Report_" + LocalDate.now() + ".xlsx";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDispositionFormData("attachment", fileName);
        headers.setContentLength(workbook.length);

        return new ResponseEntity<>(workbook, headers, HttpStatus.OK);
    }
}
