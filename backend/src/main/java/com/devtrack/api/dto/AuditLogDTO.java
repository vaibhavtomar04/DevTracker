package com.devtrack.api.dto;

import com.devtrack.api.model.AuditLog;
import com.devtrack.api.model.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Set;
import java.util.stream.Collectors;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AuditLogDTO {
    private Long id;
    private String entityType;
    private Long entityId;
    private String fieldName;
    private String oldValue;
    private String newValue;
    private String remarks;
    private LocalDateTime changedDate;
    private AuditUserDTO changedBy;

    public static AuditLogDTO from(AuditLog log) {
        if (log == null) return null;
        return new AuditLogDTO(
                log.getId(),
                log.getEntityType(),
                log.getEntityId(),
                log.getFieldName(),
                log.getOldValue(),
                log.getNewValue(),
                log.getRemarks(),
                log.getChangedDate(),
                AuditUserDTO.from(log.getChangedBy())
        );
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AuditUserDTO {
        private Long id;
        private String username;
        private String fullName;
        private Set<String> roles;

        public static AuditUserDTO from(User user) {
            if (user == null) return null;
            Set<String> roleNames = (user.getRoles() == null)
                    ? Collections.emptySet()
                    : user.getRoles().stream().map(Enum::name).collect(Collectors.toSet());
            return new AuditUserDTO(user.getId(), user.getUsername(), user.getFullName(), roleNames);
        }
    }
}