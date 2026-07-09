package com.devtrack.api.dto;

import com.devtrack.api.model.AuditLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuditGroupDto {
    private String groupName;
    private List<AuditLog> logs;
}
