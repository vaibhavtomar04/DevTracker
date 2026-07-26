package com.devtrack.api.controller;

import com.devtrack.api.dto.AuditLogDTO;
import com.devtrack.api.model.AuditLog;
import com.devtrack.api.repository.AuditLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
public class AuditLogController {

    @Autowired
    private AuditLogRepository auditLogRepository;

    @GetMapping
    public List<AuditLog> getAllAuditLogs() {
        return auditLogRepository.findAll();
    }

    @GetMapping("/page")
    public Page<AuditLogDTO> getAuditLogsPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        int safeSize = Math.min(Math.max(size, 1), 200);
        return auditLogRepository
                .findAllByOrderByChangedDateDesc(PageRequest.of(page, safeSize))
                .map(AuditLogDTO::from);
    }

    @GetMapping("/{entityType}/{entityId}")
    public List<AuditLog> getAuditLogs(@PathVariable String entityType, @PathVariable Long entityId) {
        return auditLogRepository.findByEntityTypeAndEntityId(entityType.toUpperCase(), entityId);
    }
}