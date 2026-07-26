package com.devtrack.api.dto;

import com.devtrack.api.model.SprintTask;
import com.devtrack.api.model.TaskDeveloper;
import com.devtrack.api.model.TaskType;
import com.devtrack.api.model.User;
import com.devtrack.api.model.Workflow;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class TaskListDto {
    private Long id;
    private String jtrackId;
    private String title;
    private String description;
    private String project;
    private Long sprintId;
    private String branchName;
    private LocalDate branchCreationDate;
    private LocalDate branchMergeDate;
    private String labels;
    private String module;
    private LocalDate dueDate;
    private Long brdDocumentId;

    private String status;
    private String priority;
    private Double efforts;
    private String pds;
    private String gitLinks;
    private String codeReviewComments;
    private String remarks;

    private String deploymentNote;
    private String serverPath;
    private String itemsToDeploy;

    private boolean changesRequested;
    private Integer rollbackCount;
    private String unitTestDocUrl;
    private String unitTestDocName;
    private boolean qualityRisk;          // mirrors Task.isQualityRisk() -> JSON "qualityRisk"

    private String testingDuration;
    private String testingComments;
    private Integer totalBugsRaised;
    private Integer totalRetests;
    private String reassignmentReason;
    private boolean inPool;               // mirrors Task.isInPool() -> JSON "inPool"

    // ── Timeline / milestone dates (flat — source of truth for workflow UI) ──
    private LocalDate     devStartDate;
    private LocalDate     sitDate;
    private LocalDateTime sitCompletedDate;
    private LocalDateTime codeReviewDate;
    private LocalDateTime testingStartedDate;
    private LocalDateTime testingCompletedDate;
    private LocalDate     uatDate;
    private LocalDateTime uatCompletedDate;
    private LocalDate     preprodDate;
    private LocalDate     productionDate;
    private LocalDate     expectedSitDeploymentDate;
    private LocalDate     expectedUatDeploymentDate;
    private LocalDateTime reassignmentDate;
    private LocalDateTime inPoolDate;
    private LocalDateTime createdDate;
    private LocalDateTime updatedDate;

    // ── Relations (reuse entities to preserve current JSON shape) ──
    private TaskType type;
    private User assignedDeveloper;
    private User createdBy;
    private Workflow workflow;
    private User tester;
    private User approver;
    private User deploymentOwner;
    private User reassignedBy;
    private User previousTester;
    private List<TaskDeveloper> developers;

    @JsonIgnoreProperties("linkedCrs")
    private List<SprintTask> sprintTasks;
}