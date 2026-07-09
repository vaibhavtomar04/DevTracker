package com.devtrack.api.services;

import com.devtrack.api.dto.AuditGroupDto;
import com.devtrack.api.model.AuditLog;
import com.devtrack.api.model.Bug;
import com.devtrack.api.model.Comment;
import com.devtrack.api.repository.AuditLogRepository;
import com.devtrack.api.repository.BugRepository;
import com.devtrack.api.repository.CommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuditGroupService {

    private final AuditLogRepository auditLogRepository;
    private final BugRepository bugRepository;
    private final CommentRepository commentRepository;

    public List<AuditGroupDto> getGroupedAuditLogs(
            String entityType,
            Long entityId,
            String search,
            Long actorId,
            String actionType,
            LocalDateTime startDate,
            LocalDateTime endDate
    ) {
        String targetType = entityType.toUpperCase();
        List<AuditLog> allLogs = new ArrayList<>();

        // 1. Fetch direct audit logs
        List<AuditLog> directLogs = auditLogRepository.findByEntityTypeAndEntityId(targetType, entityId);
        if (directLogs != null) {
            allLogs.addAll(directLogs);
        }

        // 2. If entity is TASK (Change Request), fetch logs of linked bugs
        List<Long> linkedBugIds = new ArrayList<>();
        if ("TASK".equals(targetType)) {
            List<Bug> bugs = bugRepository.findByBugTaskId(entityId);
            if (bugs != null && !bugs.isEmpty()) {
                linkedBugIds = bugs.stream().map(Bug::getId).collect(Collectors.toList());
                for (Long bugId : linkedBugIds) {
                    List<AuditLog> bugLogs = auditLogRepository.findByEntityTypeAndEntityId("BUG", bugId);
                    if (bugLogs != null) {
                        allLogs.addAll(bugLogs);
                    }
                }
            }
        }

        // 3. Fetch Comments and project as transient AuditLog records
        List<Comment> comments = new ArrayList<>();
        List<Comment> directComments = commentRepository.findByEntityTypeAndEntityId(targetType, entityId);
        if (directComments != null) {
            comments.addAll(directComments);
        }
        for (Long bugId : linkedBugIds) {
            List<Comment> bugComments = commentRepository.findByEntityTypeAndEntityId("BUG", bugId);
            if (bugComments != null) {
                comments.addAll(bugComments);
            }
        }

        for (Comment comment : comments) {
            AuditLog temp = new AuditLog();
            temp.setId(-comment.getId()); // Negative ID to avoid collision
            temp.setEntityType("COMMENT");
            temp.setEntityId(comment.getEntityId());
            temp.setFieldName("comment");
            temp.setOldValue("");
            temp.setNewValue(comment.getText());
            temp.setChangedBy(comment.getUser());
            temp.setChangedDate(comment.getCreatedDate());
            temp.setRemarks("Comment added");
            allLogs.add(temp);
        }

        // 4. Filter search and exact criteria
        List<AuditLog> filteredLogs = allLogs.stream()
                .filter(log -> {
                    // Search term filter
                    if (search != null && !search.trim().isEmpty()) {
                        String s = search.trim().toLowerCase();
                        boolean actorMatch = log.getChangedBy() != null && log.getChangedBy().getFullName() != null 
                                && log.getChangedBy().getFullName().toLowerCase().contains(s);
                        boolean fieldMatch = log.getFieldName() != null && log.getFieldName().toLowerCase().contains(s);
                        boolean oldMatch = log.getOldValue() != null && log.getOldValue().toLowerCase().contains(s);
                        boolean newMatch = log.getNewValue() != null && log.getNewValue().toLowerCase().contains(s);
                        boolean remarksMatch = log.getRemarks() != null && log.getRemarks().toLowerCase().contains(s);
                        if (!actorMatch && !fieldMatch && !oldMatch && !newMatch && !remarksMatch) {
                            return false;
                        }
                    }

                    // Actor filter
                    if (actorId != null) {
                        if (log.getChangedBy() == null || !actorId.equals(log.getChangedBy().getId())) {
                            return false;
                        }
                    }

                    // Action type (FieldName) filter
                    if (actionType != null && !actionType.trim().isEmpty()) {
                        if (log.getFieldName() == null || !actionType.equalsIgnoreCase(log.getFieldName())) {
                            return false;
                        }
                    }

                    // Date range filters
                    if (startDate != null) {
                        if (log.getChangedDate() == null || log.getChangedDate().isBefore(startDate)) {
                            return false;
                        }
                    }
                    if (endDate != null) {
                        if (log.getChangedDate() == null || log.getChangedDate().isAfter(endDate)) {
                            return false;
                        }
                    }

                    return true;
                })
                .sorted(Comparator.comparing(AuditLog::getChangedDate).reversed())
                .collect(Collectors.toList());

        // 5. Group into designated expandable categories
        String[] predefinedGroups = {
                "Created", "Assigned", "Development", "Approval", "SIT",
                "Testing", "Bug", "Retest", "UAT", "Deployment", "Comments", "Notifications"
        };

        Map<String, List<AuditLog>> groupedMap = new LinkedHashMap<>();
        for (String group : predefinedGroups) {
            groupedMap.put(group, new ArrayList<>());
        }

        for (AuditLog log : filteredLogs) {
            String category = classifyIntoGroup(log);
            groupedMap.computeIfAbsent(category, k -> new ArrayList<>()).add(log);
        }

        List<AuditGroupDto> dtoList = new ArrayList<>();
        for (Map.Entry<String, List<AuditLog>> entry : groupedMap.entrySet()) {
            dtoList.add(new AuditGroupDto(entry.getKey(), entry.getValue()));
        }

        return dtoList;
    }

    private String classifyIntoGroup(AuditLog log) {
        String fieldName = log.getFieldName() != null ? log.getFieldName().toUpperCase() : "";
        String entityType = log.getEntityType() != null ? log.getEntityType().toUpperCase() : "";
        String newValue = log.getNewValue() != null ? log.getNewValue().toUpperCase() : "";
        String remarks = log.getRemarks() != null ? log.getRemarks().toUpperCase() : "";

        if ("COMMENT".equals(entityType)) {
            return "Comments";
        }
        if ("NOTIFICATION".equals(entityType) || fieldName.contains("NOTIFICATION")) {
            return "Notifications";
        }
        if ("BUG".equals(entityType)) {
            return "Bug";
        }

        if ("CREATED".equals(fieldName) || ("STATUS".equals(fieldName) && (log.getOldValue() == null || log.getOldValue().trim().isEmpty() || "OPEN".equalsIgnoreCase(log.getOldValue())))) {
            return "Created";
        }

        if (fieldName.contains("DEVELOPER") || fieldName.contains("TESTER") || fieldName.contains("ASSIGNEE") || fieldName.contains("ASSIGNED") || fieldName.contains("DEVELOPERS")) {
            return "Assigned";
        }

        if (fieldName.contains("APPROVE") || fieldName.contains("REJECT") || fieldName.contains("DECISION") || fieldName.contains("WORKFLOW") || fieldName.contains("OVERRIDE")) {
            return "Approval";
        }

        if (newValue.contains("SIT_") || fieldName.contains("SIT") || remarks.contains("SIT")) {
            return "SIT";
        }

        if (newValue.contains("UAT_") || fieldName.contains("UAT") || remarks.contains("UAT")) {
            return "UAT";
        }

        if (newValue.contains("PROD_") || fieldName.contains("PROD") || fieldName.contains("DEPLOY") || remarks.contains("PROD")) {
            return "Deployment";
        }

        if (newValue.contains("BUG_FOUND") || newValue.contains("CHANGES_REQUESTED") || "RETEST".equals(fieldName) || fieldName.contains("RETEST")) {
            return "Retest";
        }

        if (fieldName.contains("TEST") || remarks.contains("TEST")) {
            return "Testing";
        }

        return "Development"; // Fallback to Development so every log is classified
    }
}
