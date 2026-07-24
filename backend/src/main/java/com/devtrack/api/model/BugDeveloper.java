package com.devtrack.api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

/**
 * Join-table entity between {@link Bug} and {@link User}.
 *
 * <p>A Bug can have multiple developers assigned through this table,
 * matching the collaborative model already used by {@link TaskDeveloper}
 * for Change Requests.
 *
 * <p>The legacy {@code bugs.assigned_developer_id} FK is preserved as the
 * PRIMARY SENTINEL for backward-compatible single-developer code paths
 * (bug listings, email notifications that reference one assignee, etc.).
 * All developers — including the sentinel — are also represented here.
 */
@Entity
@Table(
    name = "bug_developers",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_bug_developer",
        columnNames = {"bug_id", "developer_id"}
    )
)
@Data
@AllArgsConstructor
@NoArgsConstructor
public class BugDeveloper {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bug_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties("developers")
    private Bug bug;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "developer_id", nullable = false)
    private User developer;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt;

    @PrePersist
    protected void onCreate() {
        if (assignedAt == null) {
            assignedAt = LocalDateTime.now();
        }
    }
}
