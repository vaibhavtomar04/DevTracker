package com.devtrack.api.dto;

import com.devtrack.api.model.Workflow;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowSlimDto {
    private Long id;
    private String name;
    private String type;

    public static WorkflowSlimDto from(Workflow w) {
        return w == null ? null :
            WorkflowSlimDto.builder().id(w.getId()).name(w.getName()).type(w.getType()).build();
    }
}
