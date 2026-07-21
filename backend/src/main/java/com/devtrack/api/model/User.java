package com.devtrack.api.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "users")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password"})
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(name = "full_name")
    private String fullName;
    private String email;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "role")
    @Enumerated(EnumType.STRING)
    private Set<Role> roles;

    @Column(name = "must_change_password")
    private Boolean mustChangePassword = false;

    @Column(name = "failed_login_attempts", nullable = false)
    private int failedLoginAttempts = 0;

    @Column(name = "account_locked", nullable = false)
    private boolean accountLocked = false;

    @Column(name = "lock_time")
    private LocalDateTime lockTime;

    @Column(name = "password_reset_required", nullable = false)
    private boolean passwordResetRequired = false;

    @Column(name = "temp_password_expires_at")
    private LocalDateTime tempPasswordExpiresAt;

    @Column(name = "mfa_enabled")
    private Boolean mfaEnabled = false;

    @Column(name = "mfa_secret")
    private String mfaSecret;

    @Column(name = "last_mfa_verified_at")
    private LocalDateTime lastMfaVerifiedAt;

    @Column(name = "failed_mfa_attempts")
    private int failedMfaAttempts = 0;

    @Column(name = "mfa_enabled_at")
    private LocalDateTime mfaEnabledAt;

    @Column(name = "avatar", columnDefinition = "LONGTEXT")
    private String avatar;

    @Column(name = "status")
    private String status = "ACTIVE";

    @Column(name = "theme")
    private String theme = "light";

    public User() {}

    public User(String username, String password, String fullName, String email, Set<Role> roles) {
        this.username = username;
        this.password = password;
        this.fullName = fullName;
        this.email = email;
        this.roles = roles;
        this.mustChangePassword = false;
        this.status = "ACTIVE";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Set<Role> getRoles() { return roles; }
    public void setRoles(Set<Role> roles) { this.roles = roles; }

    public Boolean getMustChangePassword() { return mustChangePassword; }
    public void setMustChangePassword(Boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }

    public int getFailedLoginAttempts() { return failedLoginAttempts; }
    public void setFailedLoginAttempts(int failedLoginAttempts) { this.failedLoginAttempts = failedLoginAttempts; }

    public boolean isAccountLocked() { return accountLocked; }
    public void setAccountLocked(boolean accountLocked) { this.accountLocked = accountLocked; }

    public LocalDateTime getLockTime() { return lockTime; }
    public void setLockTime(LocalDateTime lockTime) { this.lockTime = lockTime; }

    public boolean isPasswordResetRequired() { return passwordResetRequired; }
    public void setPasswordResetRequired(boolean passwordResetRequired) { this.passwordResetRequired = passwordResetRequired; }

    public LocalDateTime getTempPasswordExpiresAt() { return tempPasswordExpiresAt; }
    public void setTempPasswordExpiresAt(LocalDateTime tempPasswordExpiresAt) { this.tempPasswordExpiresAt = tempPasswordExpiresAt; }

    public Boolean getMfaEnabled() { return mfaEnabled != null && mfaEnabled; }
    public void setMfaEnabled(Boolean mfaEnabled) { this.mfaEnabled = mfaEnabled; }

    public String getMfaSecret() { return mfaSecret; }
    public void setMfaSecret(String mfaSecret) { this.mfaSecret = mfaSecret; }

    public LocalDateTime getLastMfaVerifiedAt() { return lastMfaVerifiedAt; }
    public void setLastMfaVerifiedAt(LocalDateTime lastMfaVerifiedAt) { this.lastMfaVerifiedAt = lastMfaVerifiedAt; }

    public int getFailedMfaAttempts() { return failedMfaAttempts; }
    public void setFailedMfaAttempts(int failedMfaAttempts) { this.failedMfaAttempts = failedMfaAttempts; }

    public LocalDateTime getMfaEnabledAt() { return mfaEnabledAt; }
    public void setMfaEnabledAt(LocalDateTime mfaEnabledAt) { this.mfaEnabledAt = mfaEnabledAt; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }
}
