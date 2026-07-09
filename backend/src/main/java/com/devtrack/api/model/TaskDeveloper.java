package com.devtrack.api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Entity
@Table(name = "task_developers")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class TaskDeveloper {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "task_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties("developers")
    private Task task;

    @ManyToOne
    @JoinColumn(name = "developer_id", nullable = false)
    private User developer;

    @Column(name = "branch_name")
    private String branchName;

    @Column(name = "branch_created_date")
    private LocalDate branchCreatedDate;

    @Column(name = "dev_start_date")
    private LocalDate devStartDate;

    @Column(name = "dev_end_date")
    private LocalDate devEndDate;

    @Column(name = "pr_link")
    private String prLink;

    @Column(name = "commit_id")
    private String commitId;

    private String remarks;

    private Integer progress = 0;
}
