package com.devtrack.api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "cr_timeline_events")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class CrTimelineEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cr_id", nullable = false)
    private Long crId;

    @Column(name = "milestone_type", nullable = false)
    private String milestoneType;

    @Column(name = "event_status", nullable = false)
    private String eventStatus;

    @Column(name = "event_date", nullable = false)
    private LocalDateTime eventDate;

    @Column(name = "duration_ms")
    private Long durationMs;

    @ManyToOne
    @JoinColumn(name = "actor_id")
    private User actor;

    @Column(name = "is_restart")
    private Integer isRestart = 0;

    @Column(name = "restart_reason", length = 1000)
    private String restartReason;

    @Column(name = "superseded_event_id")
    private Long supersededEventId;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_date", nullable = false, updatable = false)
    private LocalDateTime createdDate;

    @Column(name = "modified_by")
    private String modifiedBy;

    @Column(name = "modified_date", nullable = false)
    private LocalDateTime modifiedDate;

    @Version
    private Integer version = 1;

    @Column(name = "active_flag", nullable = false)
    private Integer activeFlag = 1;

    @PrePersist
    protected void onCreate() {
        createdDate = LocalDateTime.now();
        modifiedDate = LocalDateTime.now();
        if (version == null) {
            version = 1;
        }
        if (activeFlag == null) {
            activeFlag = 1;
        }
        if (isRestart == null) {
            isRestart = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        modifiedDate = LocalDateTime.now();
    }
}
