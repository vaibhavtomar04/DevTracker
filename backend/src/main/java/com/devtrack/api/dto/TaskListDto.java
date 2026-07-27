package com.devtrack.api.dto;

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
    // unit-test doc metadata ONLY (no base64)
    private Long unitTestDocId;
    private String unitTestDocName;
    // list/board dates
    private LocalDate devStartDate;
    private LocalDate sitDate;
    private LocalDateTime sitCompletedDate;
    private LocalDateTime codeReviewDate;
    private LocalDate uatDate;
    private LocalDate productionDate;
    private LocalDate expectedSitDeploymentDate;
    private LocalDate expectedUatDeploymentDate;
    private LocalDateTime createdDate;
    // slim relations
    private TaskTypeSlimDto type;
    private UserSlimDto assignedDeveloper;
    private UserSlimDto createdBy;
    private UserSlimDto tester;
    private WorkflowSlimDto workflow;
    private List<TaskDeveloperSlimDto> developers;
    private List<SprintTaskSlimDto> sprintTasks;
}