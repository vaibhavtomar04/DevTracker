package com.devtrack.api.services;

import com.devtrack.api.dto.AuditLogDTO;
import com.devtrack.api.dto.AuditSummaryDTO;
import com.devtrack.api.model.AuditLog;
import com.devtrack.api.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuditIndexService {

    private final AuditLogRepository auditLogRepository;

    public AuditSummaryDTO getSummary() {
        LocalDateTime lastActivity = auditLogRepository.findLastActivity();
        return AuditSummaryDTO.builder()
                .totalEvents(auditLogRepository.count())
                .distinctEntities(auditLogRepository.countDistinctEntities())
                .distinctAuditors(auditLogRepository.countDistinctAuditors())
                .lastActivity(lastActivity)
                .build();
    }

    public Page<AuditLogDTO> getEntityIndex(String search, String entityType, Pageable pageable) {
        // 1. One (latest) audit record per entity
        List<AuditLog> latest = auditLogRepository.findLatestPerEntity();

        final String s = (search == null) ? "" : search.trim().toLowerCase();
        final String type = (entityType == null || entityType.trim().isEmpty()
                || "all".equalsIgnoreCase(entityType.trim())) ? null : entityType.trim().toUpperCase();

        // 2. Server-side entityType filter (dropdown) + search (audit-native fields only)
        List<AuditLog> filtered = latest.stream()
                .filter(log -> type == null
                        || (log.getEntityType() != null && type.equals(log.getEntityType().toUpperCase())))
                .filter(log -> matchesSearch(log, s))
                .sorted(Comparator.comparing(AuditLog::getChangedDate,
                        Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .collect(Collectors.toList());

        // 3. Paginate + map to lean DTO
        int total = filtered.size();
        int from = (int) pageable.getOffset();
        if (from >= total) {
            return new PageImpl<>(List.of(), pageable, total);
        }
        int to = Math.min(from + pageable.getPageSize(), total);
        List<AuditLogDTO> content = filtered.subList(from, to).stream()
                .map(AuditLogDTO::from)
                .collect(Collectors.toList());
        return new PageImpl<>(content, pageable, total);
    }

    // Search ONLY across audit-native fields. No jTrackId resolution, no Tasks/Bugs coupling.
    private boolean matchesSearch(AuditLog log, String s) {
        if (s.isEmpty()) return true;
        if (contains(log.getFieldName(), s)) return true;
        if (contains(log.getOldValue(), s)) return true;
        if (contains(log.getNewValue(), s)) return true;
        if (contains(log.getRemarks(), s)) return true;
        if (contains(log.getEntityType(), s)) return true;
        if (log.getEntityId() != null && String.valueOf(log.getEntityId()).contains(s)) return true;
        if (log.getChangedBy() != null) {
            if (contains(log.getChangedBy().getFullName(), s)) return true;
            if (contains(log.getChangedBy().getUsername(), s)) return true;
        }
        return false;
    }

    private boolean contains(String field, String s) {
        return field != null && field.toLowerCase().contains(s);
    }
}