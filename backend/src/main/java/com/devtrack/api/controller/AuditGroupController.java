package com.devtrack.api.controller;

import com.devtrack.api.dto.AuditGroupDto;
import com.devtrack.api.model.AuditLog;
import com.devtrack.api.services.AuditGroupService;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/audit/groups")
public class AuditGroupController {

    private final AuditGroupService auditGroupService;

    @GetMapping("/{entityType}/{entityId}")
    public ResponseEntity<List<AuditGroupDto>> getGroupedAuditLogs(
            @PathVariable String entityType,
            @PathVariable Long entityId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) {
        LocalDateTime start = (startDate != null && !startDate.trim().isEmpty()) ? LocalDateTime.parse(startDate) : null;
        LocalDateTime end = (endDate != null && !endDate.trim().isEmpty()) ? LocalDateTime.parse(endDate) : null;

        List<AuditGroupDto> groupedLogs = auditGroupService.getGroupedAuditLogs(
                entityType, entityId, search, actorId, actionType, start, end
        );
        return ResponseEntity.ok(groupedLogs);
    }

    @GetMapping("/{entityType}/{entityId}/export")
    public ResponseEntity<byte[]> exportGroupedAuditLogs(
            @PathVariable String entityType,
            @PathVariable Long entityId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate
    ) throws IOException {
        LocalDateTime start = (startDate != null && !startDate.trim().isEmpty()) ? LocalDateTime.parse(startDate) : null;
        LocalDateTime end = (endDate != null && !endDate.trim().isEmpty()) ? LocalDateTime.parse(endDate) : null;

        List<AuditGroupDto> groupedLogs = auditGroupService.getGroupedAuditLogs(
                entityType, entityId, search, actorId, actionType, start, end
        );

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Audit History");
            Row headerRow = sheet.createRow(0);
            String[] headers = {"Date", "Category", "Field Name", "Old Value", "New Value", "Remarks", "Changed By"};
            
            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);

            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

            for (AuditGroupDto group : groupedLogs) {
                for (AuditLog log : group.getLogs()) {
                    Row row = sheet.createRow(rowIdx++);
                    row.createCell(0).setCellValue(log.getChangedDate() != null ? log.getChangedDate().format(formatter) : "");
                    row.createCell(1).setCellValue(group.getGroupName());
                    row.createCell(2).setCellValue(log.getFieldName() != null ? log.getFieldName() : "");
                    row.createCell(3).setCellValue(log.getOldValue() != null ? log.getOldValue() : "");
                    row.createCell(4).setCellValue(log.getNewValue() != null ? log.getNewValue() : "");
                    row.createCell(5).setCellValue(log.getRemarks() != null ? log.getRemarks() : "");
                    row.createCell(6).setCellValue(log.getChangedBy() != null ? log.getChangedBy().getFullName() : "System");
                }
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            workbook.write(bos);
            byte[] bytes = bos.toByteArray();

            HttpHeaders responseHeaders = new HttpHeaders();
            responseHeaders.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            responseHeaders.setContentDispositionFormData("attachment", "audit_history_" + entityType + "_" + entityId + ".xlsx");

            return ResponseEntity.ok().headers(responseHeaders).body(bytes);
        }
    }
}
