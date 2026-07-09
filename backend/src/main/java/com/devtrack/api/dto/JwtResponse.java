package com.devtrack.api.dto;

import java.util.List;

public class JwtResponse {
    private String token;
    private String type = "Bearer";
    private String refreshToken;
    private Long id;
    private String username;
    private String fullName;
    private String email;
    private String avatar;
    private List<String> roles;
    private Boolean mustChangePassword = false;
    private Boolean mfaEnabled = false;
    private String theme;

    public JwtResponse(String accessToken, String refreshToken, Long id, String username, String fullName, String email, String avatar, List<String> roles, Boolean mustChangePassword, Boolean mfaEnabled, String theme) {
        this.token = accessToken;
        this.refreshToken = refreshToken;
        this.id = id;
        this.username = username;
        this.fullName = fullName;
        this.email = email;
        this.avatar = avatar;
        this.roles = roles;
        this.mustChangePassword = mustChangePassword != null ? mustChangePassword : false;
        this.mfaEnabled = mfaEnabled != null ? mfaEnabled : false;
        this.theme = theme;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    public List<String> getRoles() { return roles; }
    public void setRoles(List<String> roles) { this.roles = roles; }

    public Boolean getMustChangePassword() { return mustChangePassword; }
    public void setMustChangePassword(Boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }

    public Boolean getMfaEnabled() { return mfaEnabled; }
    public void setMfaEnabled(Boolean mfaEnabled) { this.mfaEnabled = mfaEnabled; }

    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }
}
