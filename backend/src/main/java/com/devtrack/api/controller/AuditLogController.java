package com.devtrack.api.controller;

import com.devtrack.api.dto.AuditLogDTO;
import com.devtrack.api.dto.AuditSummaryDTO;
import com.devtrack.api.model.AuditLog;
import com.devtrack.api.repository.AuditLogRepository;
import com.devtrack.api.services.AuditIndexService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
public class AuditLogController {

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private AuditIndexService auditIndexService;

    // Existing: full audit table — kept for the store + all existing consumers.
    @GetMapping
    public List<AuditLog> getAllAuditLogs() {
        return auditLogRepository.findAll();
    }

    // Existing: per-entity drill-down — kept, used by the drill-down timeline.
    @GetMapping("/{entityType}/{entityId}")
    public List<AuditLog> getAuditLogs(@PathVariable String entityType, @PathVariable Long entityId) {
        return auditLogRepository.findByEntityTypeAndEntityId(entityType.toUpperCase(), entityId);
    }

    // Additive + dormant: flat chronological paginated feed (lean DTO).
    // NOT wired into audits.tsx. Reserved for future exports / investigation / "All Changes" feed.
    @GetMapping("/page")
    public Page<AuditLogDTO> getAuditLogsPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(size, 1), 200);
        Pageable pageable = PageRequest.of(safePage, safeSize,Sort.by(Sort.Direction.DESC, "changedDate"));
        return auditLogRepository.findAllByOrderByChangedDateDesc(pageable).map(AuditLogDTO::from);
    }

    // NEW: lightweight KPI summary for the Audit page stat cards.
    @GetMapping("/summary")
    public AuditSummaryDTO getAuditSummary() {
        return auditIndexService.getSummary();
    }

    // NEW: paginated latest-change-per-entity index for the Audit master list.
    // entityType is optional (drives the existing filter dropdown; omit/"all" = no filter).
    @GetMapping("/entity-index")
    public Page<AuditLogDTO> getEntityIndex(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String entityType) {
        int safeSize = Math.min(Math.max(size, 1), 200);
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize);
        return auditIndexService.getEntityIndex(search, entityType, pageable);
    }
}