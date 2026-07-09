package com.devtrack.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BugReviewProposedDto {
    private Long crTaskId;
    private String title;
    private String description;
    private String priority;
    private String severity;
    private String reason;
    private String stepsToReproduce;
    private String expectedResult;
    private String actualResult;
    private List<ProposedArtifactDto> artifacts;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ProposedArtifactDto {
        private String fileName;
        private String fileSize;
        private String fileType;
        private String fileData;
    }
}
