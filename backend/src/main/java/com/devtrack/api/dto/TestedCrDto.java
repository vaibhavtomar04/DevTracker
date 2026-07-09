package com.devtrack.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TestedCrDto {
    private Long id;
    private String jtrackId;
    private String title;
    private String project;
    private Long sprintId;
    private String sprintName;
    private String priority;
    private List<String> developers;
    private LocalDateTime testingStartedDate;
    private LocalDateTime testingCompletedDate;
    private String testingDuration;
    private Integer totalBugsRaised;
    private Integer totalRetests;
    private String productionStatus;
    private String finalStatus;
    
    // Timeline View Dates (milestones)
    private LocalDate devStartDate;
    private LocalDate sitDate;
    private LocalDate uatDate;
    private LocalDate productionDate;

    @com.fasterxml.jackson.annotation.JsonProperty("isQualityRisk")
    private boolean isQualityRisk;
}
