package com.devtrack.api.dto;

import com.devtrack.api.model.AuditLog;
import com.devtrack.api.model.Role;
import com.devtrack.api.model.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
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
        AuditLogDTO dto = new AuditLogDTO();
        dto.setId(log.getId());
        dto.setEntityType(log.getEntityType());
        dto.setEntityId(log.getEntityId());
        dto.setFieldName(log.getFieldName());
        dto.setOldValue(log.getOldValue());
        dto.setNewValue(log.getNewValue());
        dto.setRemarks(log.getRemarks());
        dto.setChangedDate(log.getChangedDate());
        dto.setChangedBy(AuditUserDTO.from(log.getChangedBy()));
        return dto;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AuditUserDTO {
        private Long id;
        private String username;
        private String fullName;
        private Set<String> roles;   // avatar intentionally excluded (LONGTEXT bloat)

        public static AuditUserDTO from(User user) {
            if (user == null) return null;
            AuditUserDTO dto = new AuditUserDTO();
            dto.setId(user.getId());
            dto.setUsername(user.getUsername());
            dto.setFullName(user.getFullName());
            Set<Role> roles = user.getRoles();
            if (roles != null) {
                dto.setRoles(roles.stream().map(Enum::name).collect(Collectors.toSet()));
            }
            return dto;
        }
    }
}