package com.devtrack.api.repository;

import com.devtrack.api.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByEntityTypeAndEntityId(String entityType, Long entityId);
    boolean existsByEntityIdAndEntityTypeAndRemarks(Long entityId, String entityType, String remarks);
    Page<AuditLog> findAllByOrderByChangedDateDesc(Pageable pageable);

    @Query("""
      SELECT a FROM AuditLog a
      WHERE a.entityType IN ('TASK','TASK_DELETED','BUG','BUG_REVIEW','BUG_TASK','COMMENT','DOCUMENT')
        AND (a.remarks IS NULL OR a.remarks NOT LIKE '%Reminder%')
      ORDER BY a.changedDate DESC
    """)
    List<AuditLog> findCrActivityLogs();
}
