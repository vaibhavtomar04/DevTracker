package com.devtrack.api.dto;

import com.devtrack.api.model.Workflow;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowDetailDto {
    private Long id;
    private String name;
    private String type;
    private List<WorkflowStepDto> steps;

    public static WorkflowDetailDto from(Workflow w) {
        return w == null ? null :
            WorkflowDetailDto.builder()
                .id(w.getId())
                .name(w.getName())
                .type(w.getType())
                .steps(w.getSteps() == null ? null : w.getSteps().stream().map(WorkflowStepDto::from).collect(Collectors.toList()))
                .build();
    }
}
