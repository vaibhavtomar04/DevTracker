package com.devtrack.api.dto;

import com.devtrack.api.model.TaskDeveloper;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskDeveloperSlimDto {
    private Long id;
    private UserSlimDto developer;
    private String branchName;
    private Integer progress;

    public static TaskDeveloperSlimDto from(TaskDeveloper td) {
        return td == null ? null :
            TaskDeveloperSlimDto.builder()
                .id(td.getId())
                .developer(UserSlimDto.from(td.getDeveloper()))
                .branchName(td.getBranchName())
                .progress(td.getProgress())
                .build();
    }
}
