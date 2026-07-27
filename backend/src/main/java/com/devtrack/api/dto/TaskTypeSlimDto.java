package com.devtrack.api.dto;

import com.devtrack.api.model.TaskType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskTypeSlimDto {
    private Long id;
    private String name;

    public static TaskTypeSlimDto from(TaskType t) {
        return t == null ? null :
            TaskTypeSlimDto.builder().id(t.getId()).name(t.getName()).build();
    }
}
