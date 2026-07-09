package com.devtrack.api.notification.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_audit_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "notification_type", nullable = false, length = 64)
    private String notificationType;

    @Column(name = "recipient_to", nullable = false, columnDefinition = "TEXT")
    private String recipientTo;

    @Column(name = "recipient_cc", columnDefinition = "TEXT")
    private String recipientCc;

    @Column(nullable = false, length = 512)
    private String subject;

    @Column(nullable = false, length = 32)
    private String status; // SENT, FAILED, RETRYING, DISCARDED

    @Column(name = "smtp_message_id", length = 256)
    private String smtpMessageId;

    @Column(name = "retry_count", nullable = false)
    private int retryCount = 0;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
