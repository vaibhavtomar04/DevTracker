package com.devtrack.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SprintTaskDto {
    private Long id;
    private String taskCode;
    private String title;
    private String description;
    private Long sprintId;
    private Integer storyPoints;
    private Integer estimatedHours;
    private String priority;
    private Long assignedDeveloperId;
    private String assignedDeveloperName;
    private LocalDate dueDate;
    private String status;
    private String completionRule;
    private List<Long> linkedCrIds;
    private List<CrSummaryDto> linkedCrs;
    
    private String createdBy;
    private LocalDateTime createdDate;
    private String modifiedBy;
    private LocalDateTime modifiedDate;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class CrSummaryDto {
        private Long id;
        private String jtrackId;
        private String title;
        private String status;
        private String priority;
    }
}
