package com.devtrack.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuditSummaryDTO {
    private long totalEvents;       // Total Events
    private long distinctEntities;  // Tracked Entities
    private long distinctAuditors;  // Auditors
    private LocalDateTime lastActivity; // Last Activity
}