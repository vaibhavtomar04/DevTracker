package com.devtrack.api.repository;

import com.devtrack.api.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByEntityTypeAndEntityId(String entityType, Long entityId);
    boolean existsByEntityIdAndEntityTypeAndRemarks(Long entityId, String entityType, String remarks);
    Page<AuditLog> findAllByOrderByChangedDateDesc(Pageable pageable);
}
