package com.devtrack.api.controller;

import com.devtrack.api.dto.MessageResponse;
import com.devtrack.api.dto.ProfileUpdateRequest;
import com.devtrack.api.model.User;
import com.devtrack.api.model.AuditLog;
import com.devtrack.api.repository.UserRepository;
import com.devtrack.api.repository.AuditLogRepository;
import com.devtrack.api.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {
    @Autowired
    UserRepository userRepository;

    @Autowired
    AuditLogRepository auditLogRepository;

    @Autowired
    JwtUtils jwtUtils;

    @GetMapping
    @PreAuthorize("hasAnyRole('DEVADMIN', 'TESTADMIN', 'DEVELOPER', 'TESTER')")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @PutMapping("/profile")
    @PreAuthorize("hasAnyRole('DEVADMIN', 'TESTADMIN', 'DEVELOPER', 'TESTER')")
    public ResponseEntity<?> updateProfile(@RequestBody ProfileUpdateRequest request) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        boolean usernameChanged = false;
        if (request.getUsername() != null && !request.getUsername().trim().isEmpty()) {
            String newUsername = request.getUsername().trim();
            if (!newUsername.equalsIgnoreCase(user.getUsername())) {
                if (userRepository.findByUsername(newUsername).isPresent()) {
                    return ResponseEntity.badRequest().body(new MessageResponse("Username already taken"));
                }
                user.setUsername(newUsername);
                usernameChanged = true;
            }
        }

        if (request.getAvatar() != null) {
            user.setAvatar(request.getAvatar());
        }

        User savedUser = userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        // Strip password for security
        savedUser.setPassword(null);
        response.put("user", savedUser);

        if (usernameChanged) {
            String newToken = jwtUtils.generateJwtTokenFromUsername(savedUser.getUsername());
            response.put("token", newToken);
        }

        return ResponseEntity.ok(response);
    }

    @PutMapping("/theme")
    @PreAuthorize("hasAnyRole('DEVADMIN', 'TESTADMIN', 'DEVELOPER', 'TESTER')")
    public ResponseEntity<?> updateTheme(@RequestBody Map<String, String> body) {
        String theme = body.get("theme");
        if (theme == null || (!theme.equalsIgnoreCase("light") && !theme.equalsIgnoreCase("dark"))) {
            return ResponseEntity.badRequest().body(new MessageResponse("Theme must be light or dark"));
        }

        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        user.setTheme(theme.toLowerCase());
        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("Theme updated successfully"));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('DEVADMIN', 'TESTADMIN')")
    public ResponseEntity<?> changeUserStatus(@PathVariable Long id, @RequestBody UserStatusChangeRequest request) {
        if (request.getStatus() == null || request.getStatus().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Status is required"));
        }
        if (request.getReason() == null || request.getReason().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Reason is required"));
        }

        User targetUser = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        String oldStatus = targetUser.getStatus() != null ? targetUser.getStatus() : "ACTIVE";
        String newStatus = request.getStatus().trim().toUpperCase();

        targetUser.setStatus(newStatus);
        if ("BLOCKED".equalsIgnoreCase(newStatus) || "DEACTIVATED".equalsIgnoreCase(newStatus)) {
            targetUser.setAccountLocked(true);
        } else if ("ACTIVE".equalsIgnoreCase(newStatus)) {
            targetUser.setAccountLocked(false);
            targetUser.setFailedLoginAttempts(0); // reset lock counter
        }

        userRepository.save(targetUser);

        // Log status change audit
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User adminUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Admin user not found"));

        AuditLog audit = new AuditLog();
        audit.setEntityType("USER");
        audit.setEntityId(id);
        audit.setFieldName("status");
        audit.setOldValue(oldStatus);
        audit.setNewValue(newStatus);
        audit.setRemarks(request.getReason().trim());
        audit.setChangedBy(adminUser);
        auditLogRepository.save(audit);

        return ResponseEntity.ok(new MessageResponse("User status successfully updated to " + newStatus));
    }

    @GetMapping("/{id}/status-audit")
    @PreAuthorize("hasAnyRole('DEVADMIN', 'TESTADMIN')")
    public ResponseEntity<?> getUserStatusAudit(@PathVariable Long id) {
        List<AuditLog> logs = auditLogRepository.findByEntityTypeAndEntityId("USER", id);

        List<Map<String, Object>> response = logs.stream()
                .filter(log -> "status".equalsIgnoreCase(log.getFieldName()))
                .map(log -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", log.getId());
                    map.put("userId", log.getEntityId());
                    map.put("action", log.getNewValue());
                    map.put("performedBy", log.getChangedBy() != null ? log.getChangedBy().getUsername() : "system");
                    map.put("performedOn", log.getChangedDate());
                    map.put("reason", log.getRemarks());
                    return map;
                })
                .sorted((a, b) -> ((LocalDateTime) b.get("performedOn")).compareTo((LocalDateTime) a.get("performedOn")))
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    public static class UserStatusChangeRequest {
        private String status;
        private String reason;

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }
}

