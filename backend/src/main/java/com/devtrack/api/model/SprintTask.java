package com.devtrack.api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "sprint_tasks")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class SprintTask {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_code", nullable = false, unique = true)
    private String taskCode;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "sprint_id")
    private Long sprintId;

    @Column(name = "story_points")
    private Integer storyPoints;

    @Column(name = "estimated_hours")
    private Integer estimatedHours;

    private String priority;

    @ManyToOne
    @JoinColumn(name = "assigned_developer_id")
    private User assignedDeveloper;

    @Column(name = "due_date")
    private LocalDate dueDate;

    private String status;

    @Column(name = "completion_rule")
    private String completionRule = "KEEP_OPEN";

    @ManyToMany(mappedBy = "sprintTasks")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties("sprintTasks")
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private java.util.List<Task> linkedCrs = new java.util.ArrayList<>();

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
    }

    @PreUpdate
    protected void onUpdate() {
        modifiedDate = LocalDateTime.now();
    }
}
