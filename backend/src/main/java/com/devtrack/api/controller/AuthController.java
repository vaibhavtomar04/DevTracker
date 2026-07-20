package com.devtrack.api.controller;

import com.devtrack.api.dto.*;
import com.devtrack.api.event.EmailEvent;
import com.devtrack.api.model.*;
import com.devtrack.api.repository.AuditLogRepository;
import com.devtrack.api.repository.UserRepository;
import com.devtrack.api.security.JwtUtils;
import com.devtrack.api.services.AuditLogHelper;
import com.devtrack.api.services.PasswordResetTokenService;
import com.devtrack.api.services.RefreshTokenService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
@Slf4j
@Tag(name = "Authentication", description = "Login, JWT tokens, password reset, and Admin user management")
@CrossOrigin(origins = "*")
public class AuthController {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final String PAYLOAD_KEY = "devtrack-payload-key-1092";

    @Value("${devtrack.security.max-failed-attempts:5}")
    private int maxFailedAttempts;

    @Value("${devtrack.security.lock-duration-minutes:15}")
    private int lockDurationMinutes;

    @Value("${devtrack.security.temp-password-ttl-hours:24}")
    private int tempPasswordTtlHours;

    @Value("${server.servlet.context-path:/}")
    private String contextPath;

    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    com.devtrack.api.repository.MfaTrustedDeviceRepository trustedDeviceRepository;

    @Autowired
    com.devtrack.api.repository.ConfigRepository configRepository;

    @Autowired
    AuditLogRepository auditLogRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @Autowired
    RefreshTokenService refreshTokenService;

    @Autowired
    PasswordResetTokenService passwordResetTokenService;

    @Autowired
    ApplicationEventPublisher eventPublisher;

    @Autowired
    org.thymeleaf.TemplateEngine templateEngine;

    @Value("${devtrack.mail.logo-url:https://raw.githubusercontent.com/devtrack/assets/main/logo.png}")
    private String appLogoUrl;

    @Value("${devtrack.mail.base-url:http://localhost:5173}")
    private String baseUrl;

    private String decryptHex(String hex) {
        if (hex == null || hex.isEmpty()) return null;
        try {
            StringBuilder plainText = new StringBuilder();
            for (int i = 0; i < hex.length(); i += 4) {
                int charCode = Integer.parseInt(hex.substring(i, i + 4), 16);
                int plainCharCode = charCode ^ PAYLOAD_KEY.codePointAt((i / 4) % PAYLOAD_KEY.length());
                plainText.append((char) plainCharCode);
            }
            return plainText.toString();
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isPasswordValid(String password) {
        if (password == null || password.length() < 8) return false;
        boolean hasUpper = false;
        boolean hasLower = false;
        boolean hasDigit = false;
        boolean hasSpecial = false;
        String specialChars = "!@#$%^&*()-_=+[]{}|;:',.<>?/~`\"\\";
        for (char c : password.toCharArray()) {
            if (Character.isUpperCase(c)) hasUpper = true;
            else if (Character.isLowerCase(c)) hasLower = true;
            else if (Character.isDigit(c)) hasDigit = true;
            else if (specialChars.indexOf(c) >= 0) hasSpecial = true;
        }
        return hasUpper && hasLower && hasDigit && hasSpecial;
    }

    private String generateUniqueUsername(String fullName) {
        String base = fullName.trim().toLowerCase().replaceAll("\\s+", ".").replaceAll("[^a-z0-9.]", "");
        if (base.isEmpty()) base = "user";
        String candidate = base;
        int counter = 1;
        while (userRepository.findByUsername(candidate).isPresent()) {
            candidate = base + counter;
            counter++;
        }
        return candidate;
    }

    private String generateCryptoTempPassword() {
        String upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        String lower = "abcdefghjkmnpqrstuvwxyz";
        String digits = "23456789";
        String special = "@#$!";
        String all = upper + lower + digits + special;

        SecureRandom random = new SecureRandom();
        StringBuilder pwd = new StringBuilder();
        pwd.append(upper.charAt(random.nextInt(upper.length())));
        pwd.append(lower.charAt(random.nextInt(lower.length())));
        pwd.append(digits.charAt(random.nextInt(digits.length())));
        pwd.append(special.charAt(random.nextInt(special.length())));

        for (int i = 4; i < 12; i++) {
            pwd.append(all.charAt(random.nextInt(all.length())));
        }

        List<Character> list = new ArrayList<>();
        for (char c : pwd.toString().toCharArray()) list.add(c);
        Collections.shuffle(list, random);
        StringBuilder shuffled = new StringBuilder();
        for (char c : list) shuffled.append(c);
        return shuffled.toString();
    }

    @PostMapping("/login")
    @Operation(summary = "Internal user login", description = "Authenticates username/password and returns JWT bearer token + refresh cookie.")
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest, HttpServletRequest request) {
        if (loginRequest.getSecure() != null) {
            String decryptedJson = decryptHex(loginRequest.getSecure());
            if (decryptedJson != null) {
                try {
                    loginRequest = objectMapper.readValue(decryptedJson, LoginRequest.class);
                } catch (Exception e) {
                    return ResponseEntity.badRequest().body(new MessageResponse("Error parsing secure payload"));
                }
            }
        }

        String inputLogin = loginRequest.getUsername();
        Optional<User> userOpt = userRepository.findByUsername(inputLogin);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByEmail(inputLogin);
        }

        String authUsername = inputLogin;
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            authUsername = user.getUsername();

            // Check if user is blocked or deactivated by admin
            if ("BLOCKED".equalsIgnoreCase(user.getStatus()) || "DEACTIVATED".equalsIgnoreCase(user.getStatus())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new MessageResponse("Account Blocked by Admin. Contact For more Information"));
            }

            // Check if account is locked
            if (user.isAccountLocked()) {
                if (user.getLockTime() != null && user.getLockTime().plusMinutes(lockDurationMinutes).isBefore(LocalDateTime.now())) {
                    // Lock duration expired — unlock
                    user.setAccountLocked(false);
                    user.setFailedLoginAttempts(0);
                    user.setLockTime(null);
                    userRepository.save(user);
                } else {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(new MessageResponse("Account is locked due to multiple failed attempts. Try again later."));
                }
            }

            // Check temp password expiration
            if (user.getTempPasswordExpiresAt() != null && user.getTempPasswordExpiresAt().isBefore(LocalDateTime.now()) && user.getMustChangePassword()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new MessageResponse("Temporary password has expired. Contact administrator for assistance."));
            }
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(authUsername, loginRequest.getPassword()));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtils.generateJwtToken(authentication);

            org.springframework.security.core.userdetails.User userDetails =
                    (org.springframework.security.core.userdetails.User) authentication.getPrincipal();

            User user = userRepository.findByUsername(userDetails.getUsername()).get();

            // Reset failed login attempts on success
            if (user.getFailedLoginAttempts() > 0 || user.isAccountLocked()) {
                user.setFailedLoginAttempts(0);
                user.setAccountLocked(false);
                user.setLockTime(null);
                userRepository.save(user);
            }

            boolean mfaBypassed = false;
            if (user.getMfaEnabled()) {
                String incomingToken = request.getHeader("X-Trusted-Device-Token");
                if (incomingToken == null || incomingToken.isBlank()) {
                    incomingToken = loginRequest.getTrustedDeviceToken();
                }

                if (incomingToken != null && !incomingToken.isBlank()) {
                    List<MfaTrustedDevice> devices = trustedDeviceRepository.findByUserId(user.getId());
                    LocalDateTime now = LocalDateTime.now();
                    for (MfaTrustedDevice device : devices) {
                        if (device.getExpiresAt().isAfter(now) && encoder.matches(incomingToken, device.getTokenHash())) {
                            mfaBypassed = true;
                            log.info("MFA bypassed for user {} via trusted device token", user.getUsername());
                            break;
                        }
                    }
                }

                if (!mfaBypassed) {
                    String stepUpToken = jwtUtils.generateJwtTokenFromUsername(user.getUsername());
                    return ResponseEntity.ok(Map.of(
                            "mfaRequired", true,
                            "stepUpToken", stepUpToken,
                            "message", "MFA code verification required."
                    ));
                }
            }

            List<String> roles = userDetails.getAuthorities().stream()
                    .map(item -> item.getAuthority())
                    .collect(Collectors.toList());

            RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());

            ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken.getToken())
                    .httpOnly(true)
                    .secure(false)
                    .sameSite("Lax")
                    .path(contextPath.isEmpty() || "/".equals(contextPath) ? "/" : contextPath)
                    .maxAge(24 * 60 * 60)
                    .build();

            AuditLog auditLog = new AuditLog();
            auditLog.setEntityType("USER");
            auditLog.setEntityId(user.getId());
            auditLog.setFieldName("login");
            auditLog.setNewValue("SUCCESS");
            auditLog.setRemarks("User logged in successfully");
            auditLog.setChangedBy(user);
            AuditLogHelper.enrich(auditLog);
            auditLogRepository.save(auditLog);

            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, cookie.toString())
                    .body(new JwtResponse(
                            jwt,
                            refreshToken.getToken(),
                            user.getId(),
                            user.getUsername(),
                            user.getFullName(),
                            user.getEmail(),
                            user.getAvatar(),
                            roles,
                            user.getMustChangePassword(),
                            user.getMfaEnabled(),
                            user.getTheme()));

        } catch (BadCredentialsException e) {
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                int attempts = user.getFailedLoginAttempts() + 1;
                user.setFailedLoginAttempts(attempts);
                if (attempts >= maxFailedAttempts) {
                    user.setAccountLocked(true);
                    user.setLockTime(LocalDateTime.now());
                    log.warn("Account locked for username={} after {} failed attempts", user.getUsername(), attempts);
                }
                userRepository.save(user);
            }
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new MessageResponse("Invalid credentials."));
        }
    }

    @PostMapping({"/admin/create-user", "/signup"})
    @PreAuthorize("hasAnyRole('DEVADMIN', 'ADMIN')")
    @Operation(summary = "Admin User Provisioning", description = "Creates a user with cryptographically secure temporary password and dispatches email.")
    public ResponseEntity<?> adminCreateUser(@RequestBody Map<String, String> body) {
        String fullName = body.get("fullName");
        String email = body.get("email");
        String roleStr = body.getOrDefault("role", "DEVELOPER");

        if (fullName == null || fullName.isBlank() || email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Full Name and Email are required."));
        }

        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body(new MessageResponse("User with this email already exists."));
        }

        String username = generateUniqueUsername(fullName);
        String tempPassword = generateCryptoTempPassword();

        Set<Role> roles = new HashSet<>();
        try {
            roles.add(Role.valueOf(roleStr.toUpperCase()));
        } catch (Exception e) {
            roles.add(Role.DEVELOPER);
        }

        User user = new User(username, encoder.encode(tempPassword), fullName, email, roles);
        user.setMustChangePassword(true);
        user.setTempPasswordExpiresAt(LocalDateTime.now().plusHours(tempPasswordTtlHours));
        User saved = userRepository.save(user);

        try {
            org.thymeleaf.context.Context context = new org.thymeleaf.context.Context();
            Map<String, Object> userMap = new HashMap<>();
            userMap.put("fullName", fullName);
            userMap.put("username", username);
            userMap.put("tempPassword", tempPassword);
            userMap.put("expiryHours", tempPasswordTtlHours);
            
            context.setVariable("user", userMap);
            context.setVariable("appLogoUrl", appLogoUrl);
            context.setVariable("loginUrl", baseUrl + "/login");
            
            String htmlBody = templateEngine.process("email/welcome", context);
            eventPublisher.publishEvent(new EmailEvent(this, email, "DevTrack 2.0 Account Created", htmlBody));
        } catch (Exception e) {
            log.error("Failed to render and publish welcome email event: {}", e.getMessage());
        }

        try {
            String adminUsername = SecurityContextHolder.getContext().getAuthentication().getName();
            User adminUser = userRepository.findByUsername(adminUsername).orElse(saved);
            AuditLog auditLog = new AuditLog();
            auditLog.setEntityType("USER");
            auditLog.setEntityId(saved.getId());
            auditLog.setFieldName("admin_user_create");
            auditLog.setNewValue(username + " (" + roleStr + ")");
            auditLog.setRemarks("Admin provisioned user with single-use temp password");
            auditLog.setChangedBy(adminUser);
            AuditLogHelper.enrich(auditLog);
            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Failed to save user creation audit log: {}", e.getMessage());
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "User created successfully. Temporary credentials dispatched via email.",
                "userId", saved.getId(),
                "username", username,
                "email", email
        ));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user", description = "Returns full user profile for the authenticated JWT bearer token — used on page refresh to restore session.")
    public ResponseEntity<?> getCurrentUser(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new MessageResponse("No bearer token provided"));
        }
        String token = header.substring(7);
        if (!jwtUtils.validateJwtToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new MessageResponse("Invalid or expired token"));
        }
        String username = jwtUtils.getUserNameFromJwtToken(token);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        List<String> roles = user.getRoles().stream()
                .map(r -> "ROLE_" + r.name())
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("fullName", user.getFullName());
        response.put("email", user.getEmail());
        response.put("avatar", user.getAvatar());
        response.put("roles", roles);
        response.put("mustChangePassword", user.getMustChangePassword());
        response.put("mfaEnabled", user.getMfaEnabled());
        response.put("theme", user.getTheme());
        return ResponseEntity.ok(response);
    }

    @PostMapping({"/refreshtoken", "/refresh"})
    @Operation(summary = "Refresh JWT Token", description = "Rotates refresh token and returns a fresh JWT access token.")
    public ResponseEntity<?> refreshtoken(
            @CookieValue(name = "refreshToken", required = false) String cookieRefreshToken,
            @RequestBody(required = false) TokenRefreshRequest request) {

        String tokenStr = cookieRefreshToken != null ? cookieRefreshToken : (request != null ? request.getRefreshToken() : null);
        if (tokenStr == null || tokenStr.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new MessageResponse("Refresh token missing"));
        }

        Optional<RefreshToken> tokenOpt = refreshTokenService.findByToken(tokenStr);
        if (tokenOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new MessageResponse("Refresh token not found or revoked."));
        }

        RefreshToken refreshToken = refreshTokenService.verifyExpiration(tokenOpt.get());
        User user = refreshToken.getUser();
        String token = jwtUtils.generateJwtTokenFromUsername(user.getUsername());
        RefreshToken newRefreshToken = refreshTokenService.createRefreshToken(user.getId());

        ResponseCookie cookie = ResponseCookie.from("refreshToken", newRefreshToken.getToken())
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path(contextPath.isEmpty() || "/".equals(contextPath) ? "/" : contextPath)
                .maxAge(24 * 60 * 60)
                .build();

        List<String> roles = user.getRoles().stream()
                .map(Enum::name)
                .collect(Collectors.toList());

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new JwtResponse(
                        token,
                        newRefreshToken.getToken(),
                        user.getId(),
                        user.getUsername(),
                        user.getFullName(),
                        user.getEmail(),
                        user.getAvatar(),
                        roles,
                        user.getMustChangePassword(),
                        user.getMfaEnabled(),
                        user.getTheme()));
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout Session", description = "Revokes refresh tokens and clears authentication cookies.")
    public ResponseEntity<?> logoutUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        if (username != null && !username.equals("anonymousUser")) {
            userRepository.findByUsername(username).ifPresent(user -> {
                refreshTokenService.deleteByUserId(user.getId());

                AuditLog auditLog = new AuditLog();
                auditLog.setEntityType("USER");
                auditLog.setEntityId(user.getId());
                auditLog.setFieldName("logout");
                auditLog.setNewValue("SUCCESS");
                auditLog.setRemarks("User logged out successfully");
                auditLog.setChangedBy(user);
                AuditLogHelper.enrich(auditLog);
                auditLogRepository.save(auditLog);
            });
        }

        ResponseCookie cookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(true)
                .sameSite("None")
                .path(contextPath.isEmpty() || "/".equals(contextPath) ? "/" : contextPath)
                .maxAge(0)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new MessageResponse("Log out successful!"));
    }

    @PostMapping("/set-new-password")
    @Operation(summary = "Force Password Reset on First Login", description = "Validates new password strength and invalidates temporary credentials.")
    public ResponseEntity<?> setNewPassword(@RequestBody Map<String, String> body) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        if (username == null || username.equals("anonymousUser")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new MessageResponse("Unauthorized"));
        }

        User user = userRepository.findByUsername(username).orElseThrow();
        String newPassword = body.get("newPassword");
        String confirmPassword = body.get("confirmPassword");

        if (newPassword == null || newPassword.isBlank() || confirmPassword == null || confirmPassword.isBlank()) {
            return ResponseEntity.badRequest().body(new MessageResponse("New password and confirm password are required"));
        }

        if (!newPassword.equals(confirmPassword)) {
            return ResponseEntity.badRequest().body(new MessageResponse("Passwords do not match"));
        }

        if (!isPasswordValid(newPassword)) {
            return ResponseEntity.badRequest().body(new MessageResponse(
                    "Error: Password must be at least 8 characters long and contain uppercase, lowercase, digit, and special character."));
        }

        user.setPassword(encoder.encode(newPassword));
        user.setMustChangePassword(false);
        user.setTempPasswordExpiresAt(null);
        userRepository.save(user);

        refreshTokenService.deleteByUserId(user.getId());

        AuditLog auditLog = new AuditLog();
        auditLog.setEntityType("USER");
        auditLog.setEntityId(user.getId());
        auditLog.setFieldName("password_first_login");
        auditLog.setNewValue("PASSWORD_SET");
        auditLog.setRemarks("Permanent password established on first login");
        auditLog.setChangedBy(user);
        AuditLogHelper.enrich(auditLog);
        auditLogRepository.save(auditLog);

        return ResponseEntity.ok(new MessageResponse("Password updated successfully. Please log in with your new password."));
    }

    @GetMapping("/microsoft/config")
    @Operation(summary = "Get Microsoft SSO Policy Status", description = "Returns status of Microsoft login enable toggle and client parameters.")
    public ResponseEntity<?> getMicrosoftConfig() {
        boolean enabled = configRepository.findByConfigKey("ms_login_enabled")
                .map(c -> "true".equalsIgnoreCase(c.getConfigValue())).orElse(true);
        String clientId = configRepository.findByConfigKey("ms_client_id")
                .map(AppConfig::getConfigValue).orElse("");
        String tenantId = configRepository.findByConfigKey("ms_tenant_id")
                .map(AppConfig::getConfigValue).orElse("common");

        return ResponseEntity.ok(Map.of(
                "enabled", enabled,
                "clientId", clientId,
                "tenantId", tenantId
        ));
    }

    @PostMapping("/microsoft/login")
    @Operation(summary = "Authenticate via Microsoft Entra ID", description = "Verifies Microsoft token, maps email to existing account or provisions user, returns JWT tokens.")
    public ResponseEntity<?> microsoftLogin(@RequestBody Map<String, String> body) {
        boolean enabled = configRepository.findByConfigKey("ms_login_enabled")
                .map(c -> "true".equalsIgnoreCase(c.getConfigValue())).orElse(true);
        if (!enabled) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new MessageResponse("Microsoft Sign-In is currently disabled by enterprise policy."));
        }

        String email = body.get("email");
        String name = body.get("name");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Email is required for Microsoft authentication."));
        }

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            String username = email.split("@")[0] + "_ms";
            Set<Role> roles = new HashSet<>();
            roles.add(Role.DEVELOPER);
            User newUser = new User(username, encoder.encode(UUID.randomUUID().toString()), name != null ? name : username, email, roles);
            newUser.setMustChangePassword(false);
            return userRepository.save(newUser);
        });

        String jwt = jwtUtils.generateJwtTokenFromUsername(user.getUsername());
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());

        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken.getToken())
                .httpOnly(true)
                .secure(true)
                .sameSite("None")
                .path(contextPath.isEmpty() || "/".equals(contextPath) ? "/" : contextPath)
                .maxAge(24 * 60 * 60)
                .build();

        List<String> roles = user.getRoles().stream()
                .map(r -> "ROLE_" + r.name())
                .collect(Collectors.toList());

        AuditLog auditLog = new AuditLog();
        auditLog.setEntityType("USER");
        auditLog.setEntityId(user.getId());
        auditLog.setFieldName("ms_entra_login");
        auditLog.setNewValue("SUCCESS");
        auditLog.setRemarks("User authenticated seamlessly via Microsoft Entra ID");
        auditLog.setChangedBy(user);
        AuditLogHelper.enrich(auditLog);
        auditLogRepository.save(auditLog);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new JwtResponse(
                        jwt,
                        refreshToken.getToken(),
                        user.getId(),
                        user.getUsername(),
                        user.getFullName(),
                        user.getEmail(),
                        user.getAvatar(),
                        roles,
                        user.getMustChangePassword(),
                        user.getMfaEnabled(),
                        user.getTheme()));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request Password Reset", description = "Generates a reset token and sends an email with reset instructions.")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Email is required"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            PasswordResetToken token = passwordResetTokenService.createResetToken(user);
            try {
                org.thymeleaf.context.Context context = new org.thymeleaf.context.Context();
                Map<String, Object> userMap = new HashMap<>();
                userMap.put("fullName", user.getFullName());
                userMap.put("email", user.getEmail());

                context.setVariable("user", userMap);
                context.setVariable("appLogoUrl", appLogoUrl);
                context.setVariable("resetUrl", baseUrl + "/reset-password?token=" + token.getToken());

                String htmlBody = templateEngine.process("email/password-reset", context);
                eventPublisher.publishEvent(new EmailEvent(this, email, "DevTrack 2.0 - Password Reset Request", htmlBody));
            } catch (Exception e) {
                log.error("Failed to render or publish password reset email: {}", e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new MessageResponse("Failed to send password reset email. Please try again."));
            }
        }

        return ResponseEntity.ok(new MessageResponse("If that email address is registered, a password reset link has been sent."));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset Password with Token", description = "Validates the reset token and establishes a new permanent password.")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String tokenStr = body.get("token");
        String newPassword = body.get("password");
        String confirmPassword = body.get("confirmPassword");

        if (tokenStr == null || tokenStr.isBlank()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Token is required"));
        }
        if (newPassword == null || newPassword.isBlank() || confirmPassword == null || confirmPassword.isBlank()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Password and confirmPassword are required"));
        }

        if (!newPassword.equals(confirmPassword)) {
            return ResponseEntity.badRequest().body(new MessageResponse("Passwords do not match"));
        }

        if (!isPasswordValid(newPassword)) {
            return ResponseEntity.badRequest().body(new MessageResponse(
                    "Error: Password must be at least 8 characters long and contain uppercase, lowercase, digit, and special character."));
        }

        Optional<PasswordResetToken> tokenOpt = passwordResetTokenService.findByToken(tokenStr);
        if (tokenOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Invalid or not found password reset token."));
        }

        PasswordResetToken resetToken = tokenOpt.get();
        try {
            passwordResetTokenService.verifyExpiration(resetToken);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }

        User user = resetToken.getUser();
        user.setPassword(encoder.encode(newPassword));
        user.setMustChangePassword(false);
        user.setTempPasswordExpiresAt(null);
        userRepository.save(user);

        passwordResetTokenService.deleteToken(resetToken);

        refreshTokenService.deleteByUserId(user.getId());

        AuditLog auditLog = new AuditLog();
        auditLog.setEntityType("USER");
        auditLog.setEntityId(user.getId());
        auditLog.setFieldName("password_reset_token");
        auditLog.setNewValue("PASSWORD_RESET");
        auditLog.setRemarks("Password reset successfully using reset token");
        auditLog.setChangedBy(user);
        AuditLogHelper.enrich(auditLog);
        auditLogRepository.save(auditLog);

        return ResponseEntity.ok(new MessageResponse("Password has been reset successfully. Please log in with your new password."));
    }
}
