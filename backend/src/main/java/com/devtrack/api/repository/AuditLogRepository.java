package com.devtrack.api.repository;

import com.devtrack.api.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.time.LocalDateTime;

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

    @Query("""
  SELECT a FROM AuditLog a
  LEFT JOIN FETCH a.changedBy
  WHERE a.id IN (SELECT MAX(b.id) FROM AuditLog b GROUP BY b.entityType, b.entityId)
""")
List<AuditLog> findLatestPerEntity();

// Distinct entity count (== "Tracked Entities" stat == unfiltered entity-index totalElements)
@Query("SELECT COUNT(a) FROM AuditLog a WHERE a.id IN (SELECT MAX(b.id) FROM AuditLog b GROUP BY b.entityType, b.entityId)")
long countDistinctEntities();

@Query("SELECT COUNT(DISTINCT a.changedBy.id) FROM AuditLog a")
long countDistinctAuditors();

@Query("SELECT MAX(a.changedDate) FROM AuditLog a")
LocalDateTime findLastActivity();
}
