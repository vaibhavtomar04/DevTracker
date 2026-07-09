package com.devtrack.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BugDeveloperFixSummaryDto {
    private String rootCauseAnalysis;
    private String fixSummary;
    private String filesModified;
    private String databaseChanges;
    private String apiChanges;
    private String additionalNotes;
}
