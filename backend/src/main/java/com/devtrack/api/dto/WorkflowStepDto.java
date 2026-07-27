package com.devtrack.api.dto;

import com.devtrack.api.model.WorkflowStep;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowStepDto {
    private Long id;
    private String stepName;
    private String stepType;
    private Integer sequence;

    public static WorkflowStepDto from(WorkflowStep s) {
        return s == null ? null :
            WorkflowStepDto.builder()
                .id(s.getId())
                .stepName(s.getStepName())
                .stepType(s.getStepType())
                .sequence(s.getSequence())
                .build();
    }
}
