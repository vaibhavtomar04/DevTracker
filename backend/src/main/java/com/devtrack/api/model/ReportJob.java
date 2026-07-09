package com.devtrack.api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "report_jobs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportJob {

    public enum Status { QUEUED, RUNNING, READY, FAILED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_id", nullable = false, unique = true, length = 64)
    private String jobId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User requester;

    @Column(name = "report_type", nullable = false, length = 64)
    private String reportType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.QUEUED;

    @Column(name = "download_token", unique = true, length = 128)
    private String downloadToken;

    @Column(name = "file_path", length = 1024)
    private String filePath;

    @Column(name = "file_name", length = 512)
    private String fileName;

    @Column(name = "error_reason", columnDefinition = "TEXT")
    private String errorReason;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;
}
