package com.devtrack.api.dto;

import com.devtrack.api.model.SprintTask;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SprintTaskSlimDto {
    private Long id;
    private String taskCode;
    private String title;
    private String status;
    private String completionRule;

    public static SprintTaskSlimDto from(SprintTask st) {
        return st == null ? null :
            SprintTaskSlimDto.builder()
                .id(st.getId())
                .taskCode(st.getTaskCode())
                .title(st.getTitle())
                .status(st.getStatus())
                .completionRule(st.getCompletionRule())
                .build();
    }
}
