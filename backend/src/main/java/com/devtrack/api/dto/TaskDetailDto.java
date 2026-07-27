package com.devtrack.api.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class TaskDetailDto {
    // all lean fields …
    private Long id;
    private String jtrackId;
    private String title;
    private String description;
    private String project;
    private Long sprintId;
    private String branchName;
    private String module;
    private String status;
    private String priority;
    private Double efforts;
    private String gitLinks;
    private Long brdDocumentId;
    private Boolean changesRequested;
    private Boolean qualityRisk;
    private Boolean inPool;
    private Integer totalBugsRaised;
    private Integer totalRetests;
    private Long unitTestDocId;
    private String unitTestDocName;
    // detail-only scalars
    private String labels;
    private String pds;
    private String codeReviewComments;
    private String remarks;
    private String deploymentNote;
    private String serverPath;
    private String itemsToDeploy;
    private String testingDuration;
    private String testingComments;
    private String reassignmentReason;
    private Integer rollbackCount;
    // detail-only dates
    private LocalDate branchCreationDate;
    private LocalDate branchMergeDate;
    private LocalDate dueDate;
    private LocalDateTime testingStartedDate;
    private LocalDateTime testingCompletedDate;
    private LocalDateTime uatCompletedDate;
    private LocalDate preprodDate;
    private LocalDateTime reassignmentDate;
    private LocalDateTime inPoolDate;
    private LocalDate devStartDate;
    private LocalDate sitDate;
    private LocalDateTime sitCompletedDate;
    private LocalDateTime codeReviewDate;
    private LocalDate uatDate;
    private LocalDate productionDate;
    private LocalDate expectedSitDeploymentDate;
    private LocalDate expectedUatDeploymentDate;
    private LocalDateTime createdDate;
    private LocalDateTime updatedDate;
    // slim/full relations
    private TaskTypeSlimDto type;
    private UserSlimDto assignedDeveloper;
    private UserSlimDto createdBy;
    private UserSlimDto tester;
    private UserSlimDto approver;
    private UserSlimDto deploymentOwner;
    private UserSlimDto reassignedBy;
    private UserSlimDto previousTester;
    private WorkflowDetailDto workflow;
    private List<TaskDeveloperSlimDto> developers;
    private List<SprintTaskSlimDto> sprintTasks;
}
