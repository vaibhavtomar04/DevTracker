package com.devtrack.api.dto;

import com.devtrack.api.model.BugReview;
import com.devtrack.api.model.BugRejection;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BugReviewResponseDto {
    private BugReview bugReview;
    private List<BugRejection> rejections;
}
