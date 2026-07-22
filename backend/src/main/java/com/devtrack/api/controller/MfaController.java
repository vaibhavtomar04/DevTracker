package com.devtrack.api.controller;

import com.devtrack.api.dto.MessageResponse;
import com.devtrack.api.dto.JwtResponse;
import com.devtrack.api.event.EmailEvent;
import com.devtrack.api.model.*;
import com.devtrack.api.repository.*;
import com.devtrack.api.security.JwtUtils;
import com.devtrack.api.services.AuditLogHelper;
import com.devtrack.api.services.RefreshTokenService;
import com.devtrack.api.services.TotpService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/mfa")
@Slf4j
@Tag(name = "Multi-Factor Authentication", description = "RFC 6238 TOTP enrollment, QR code, verification, backup codes, trusted devices")
@CrossOrigin(origins = "*")
@Transactional
public class MfaController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TotpService totpService;

    @Autowired
    private MfaBackupCodeRepository backupCodeRepository;

    @Autowired
    private MfaTrustedDeviceRepository trustedDeviceRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private ConfigRepository configRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Value("${server.servlet.context-path:/}")
    private String contextPath;

    private final SecureRandom random = new SecureRandom();

    @PostMapping("/enable")
    @Operation(summary = "Begin MFA Enrollment", description = "Generates temporary TOTP secret key for setup")
    public ResponseEntity<?> enableMfa() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        String rawSecret = totpService.generateSecretKey();
        String encryptedSecret = totpService.encryptSecret(rawSecret);
        user.setMfaSecret(encryptedSecret);
        userRepository.save(user);

        String otpAuthUri = totpService.getOtpAuthUri(user.getEmail() != null ? user.getEmail() : user.getUsername(), rawSecret);

        return ResponseEntity.ok(Map.of(
                "secretKey", rawSecret,
                "otpAuthUri", otpAuthUri,
                "message", "MFA enrollment initialized. Scan QR or enter secret key into Microsoft Authenticator."
        ));
    }

    @GetMapping("/qr")
    @Operation(summary = "Get MFA QR Payload", description = "Returns OTP Auth URI and raw secret for display in wizard")
    public ResponseEntity<?> getQrPayload() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        if (user.getMfaSecret() == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("MFA enrollment not started. Call /mfa/enable first."));
        }

        String rawSecret = totpService.decryptSecret(user.getMfaSecret());
        String otpAuthUri = totpService.getOtpAuthUri(user.getEmail() != null ? user.getEmail() : user.getUsername(), rawSecret);

        return ResponseEntity.ok(Map.of(
                "secretKey", rawSecret,
                "otpAuthUri", otpAuthUri
        ));
    }

    @PostMapping("/verify")
    @Operation(summary = "Verify TOTP Code", description = "Verifies 6-digit code during setup or step-up authentication")
    public ResponseEntity<?> verifyMfa(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String code = (String) body.get("code");
        String stepUpToken = (String) body.get("stepUpToken");
        Boolean rememberDevice = (Boolean) body.getOrDefault("rememberDevice", false);
        Integer trustDays = (Integer) body.getOrDefault("trustDays", 15);

        User user = null;
        if (stepUpToken != null && !stepUpToken.isBlank()) {
            if (jwtUtils.validateJwtToken(stepUpToken)) {
                String username = jwtUtils.getUserNameFromJwtToken(stepUpToken);
                user = userRepository.findByUsername(username).orElse(null);
            }
        }

        if (user == null) {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (!"anonymousUser".equalsIgnoreCase(username)) {
                user = userRepository.findByUsername(username).orElse(null);
            }
        }

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new MessageResponse("Invalid or expired authentication session."));
        }

        if (user.getMfaSecret() == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("MFA secret not configured."));
        }

        String rawSecret = totpService.decryptSecret(user.getMfaSecret());
        boolean isValid = totpService.verifyTotpCode(rawSecret, code);

        if (!isValid) {
            int failed = user.getFailedMfaAttempts() + 1;
            user.setFailedMfaAttempts(failed);
            userRepository.save(user);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new MessageResponse("Invalid verification code. Please check your authenticator app."));
        }

        // OTP Validated Successfully!
        user.setFailedMfaAttempts(0);
        user.setLastMfaVerifiedAt(LocalDateTime.now());
        if (!user.getMfaEnabled()) {
            user.setMfaEnabled(true);
            user.setMfaEnabledAt(LocalDateTime.now());
        }
        userRepository.save(user);

        // Generate full JWT & Refresh token
        String jwt = jwtUtils.generateJwtTokenFromUsername(user.getUsername());
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());

        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken.getToken())
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path(contextPath.isEmpty() || "/".equals(contextPath) ? "/" : contextPath)
                .maxAge(24 * 60 * 60)
                .build();

        String trustedDeviceToken = null;
        if (Boolean.TRUE.equals(rememberDevice)) {
            trustedDeviceToken = UUID.randomUUID().toString();
            MfaTrustedDevice device = new MfaTrustedDevice();
            device.setUser(user);
            device.setTokenHash(passwordEncoder.encode(trustedDeviceToken));
            device.setLabel("Browser Session (" + request.getRemoteAddr() + ")");
            device.setIp(request.getRemoteAddr());
            device.setUserAgent(request.getHeader("User-Agent"));
            device.setExpiresAt(LocalDateTime.now().plusDays(trustDays));
            trustedDeviceRepository.save(device);
        }

        List<String> roles = user.getRoles().stream()
                .map(r -> "ROLE_" + r.name())
                .collect(Collectors.toList());

        AuditLog auditLog = new AuditLog();
        auditLog.setEntityType("USER");
        auditLog.setEntityId(user.getId());
        auditLog.setFieldName("mfa_verified");
        auditLog.setNewValue("SUCCESS");
        auditLog.setRemarks("MFA verified via TOTP authenticator");
        auditLog.setChangedBy(user);
        AuditLogHelper.enrich(auditLog);
        auditLogRepository.save(auditLog);

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("accessToken", jwt);
        responseBody.put("token", jwt);
        responseBody.put("refreshToken", refreshToken.getToken());
        responseBody.put("id", user.getId());
        responseBody.put("username", user.getUsername());
        responseBody.put("fullName", user.getFullName());
        responseBody.put("email", user.getEmail());
        responseBody.put("avatar", user.getAvatar());
        responseBody.put("roles", roles);
        responseBody.put("mustChangePassword", user.getMustChangePassword());
        responseBody.put("mfaEnabled", user.getMfaEnabled());
        if (trustedDeviceToken != null) {
            responseBody.put("trustedDeviceToken", trustedDeviceToken);
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
        .body(responseBody);
    }

    @PostMapping("/disable")
    @Operation(summary = "Disable MFA", description = "Disables MFA after verifying user password")
    public ResponseEntity<?> disableMfa(@RequestBody Map<String, String> body) {
        String password = body.get("password");
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        if (!passwordEncoder.matches(password, user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new MessageResponse("Invalid password re-authentication failed."));
        }

        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        userRepository.save(user);

        backupCodeRepository.deleteByUserId(user.getId());
        trustedDeviceRepository.deleteByUserId(user.getId());

        AuditLog logEntity = new AuditLog();
        logEntity.setEntityType("USER");
        logEntity.setEntityId(user.getId());
        logEntity.setFieldName("mfa_disabled");
        logEntity.setNewValue("DISABLED");
        logEntity.setRemarks("User disabled MFA");
        logEntity.setChangedBy(user);
        AuditLogHelper.enrich(logEntity);
        auditLogRepository.save(logEntity);

        return ResponseEntity.ok(new MessageResponse("MFA disabled successfully. All trusted devices and backup codes revoked."));
    }

    @PostMapping("/backup-codes")
    @Operation(summary = "Generate/Regenerate Backup Codes", description = "Generates 10 single-use recovery codes")
    public ResponseEntity<?> generateBackupCodes() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        backupCodeRepository.deleteByUserId(user.getId());

        List<String> rawCodes = new ArrayList<>();
        List<MfaBackupCode> entities = new ArrayList<>();

        for (int i = 0; i < 10; i++) {
            String code = String.format("%04X-%04X", random.nextInt(0x10000), random.nextInt(0x10000));
            rawCodes.add(code);

            MfaBackupCode entity = new MfaBackupCode();
            entity.setUser(user);
            entity.setCodeHash(passwordEncoder.encode(code));
            entities.add(entity);
        }

        backupCodeRepository.saveAll(entities);

        return ResponseEntity.ok(Map.of(
                "backupCodes", rawCodes,
                "message", "10 new single-use backup codes generated. Store them in a safe place."
        ));
    }

    @PostMapping("/backup-codes/verify")
    @Operation(summary = "Verify Single-Use Backup Code", description = "Authenticates using a single-use recovery code")
    public ResponseEntity<?> verifyBackupCode(@RequestBody Map<String, String> body) {
        String code = body.get("code");
        String stepUpToken = body.get("stepUpToken");

        User user = null;
        if (stepUpToken != null && !stepUpToken.isBlank() && jwtUtils.validateJwtToken(stepUpToken)) {
            String username = jwtUtils.getUserNameFromJwtToken(stepUpToken);
            user = userRepository.findByUsername(username).orElse(null);
        }

        if (user == null) {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            user = userRepository.findByUsername(username).orElse(null);
        }

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new MessageResponse("Session expired."));
        }

        List<MfaBackupCode> activeCodes = backupCodeRepository.findByUserIdAndUsedAtIsNull(user.getId());
        MfaBackupCode matchedCode = null;

        for (MfaBackupCode bc : activeCodes) {
            if (passwordEncoder.matches(code, bc.getCodeHash())) {
                matchedCode = bc;
                break;
            }
        }

        if (matchedCode == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new MessageResponse("Invalid backup recovery code."));
        }

        matchedCode.setUsedAt(LocalDateTime.now());
        backupCodeRepository.save(matchedCode);

        String jwt = jwtUtils.generateJwtTokenFromUsername(user.getUsername());
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());

        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken.getToken())
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path(contextPath.isEmpty() || "/".equals(contextPath) ? "/" : contextPath)
                .maxAge(24 * 60 * 60)
                .build();

        List<String> roles = user.getRoles().stream().map(r -> "ROLE_" + r.name()).collect(Collectors.toList());

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new JwtResponse(jwt, refreshToken.getToken(), user.getId(), user.getUsername(), user.getFullName(), user.getEmail(), user.getAvatar(), roles, user.getMustChangePassword(), user.getMfaEnabled(), user.getTheme()));
    }

    @GetMapping("/trusted-devices")
    @Operation(summary = "List Trusted Devices", description = "Returns active trusted devices for user")
    public ResponseEntity<?> getTrustedDevices() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username).orElseThrow();

        List<MfaTrustedDevice> devices = trustedDeviceRepository.findByUserId(user.getId());
        return ResponseEntity.ok(devices);
    }

    @DeleteMapping("/trusted-devices/{id}")
    @Operation(summary = "Revoke Trusted Device", description = "Removes trusted device authorization")
    public ResponseEntity<?> revokeTrustedDevice(@PathVariable Long id) {
        trustedDeviceRepository.deleteById(id);
        return ResponseEntity.ok(new MessageResponse("Trusted device revoked successfully."));
    }

    @PostMapping("/admin/reset/{userId}")
    @PreAuthorize("hasAnyRole('DEVADMIN', 'ADMIN')")
    @Operation(summary = "Admin MFA Reset", description = "Resets user MFA enrollment and emails user")
    public ResponseEntity<?> adminResetMfa(@PathVariable Long userId) {
        User user = userRepository.findById(userId).orElseThrow();
        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        userRepository.save(user);

        backupCodeRepository.deleteByUserId(userId);
        trustedDeviceRepository.deleteByUserId(userId);

        String mailBody = String.format("Hello %s,\n\nYour Multi-Factor Authentication (MFA) configuration has been reset by an administrator. You will be required to configure MFA on your next login.", user.getFullName() != null ? user.getFullName() : user.getUsername());
        eventPublisher.publishEvent(new EmailEvent(this, user.getEmail(), "DevTrack 2.0 - MFA Reset Notification", mailBody));

        return ResponseEntity.ok(new MessageResponse("MFA reset successfully for user " + user.getUsername()));
    }
}
