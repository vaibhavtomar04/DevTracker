package com.devtrack.api.notification.repository;

import com.devtrack.api.notification.model.EmailAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EmailAuditLogRepository extends JpaRepository<EmailAuditLog, Long> {
}
