package com.devtrack.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BugRejectionDto {
    private String justification;
    private String rootCause;
    private String reason;
    private String evidenceNote;
}
