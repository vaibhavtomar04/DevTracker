package com.devtrack.api.dto;

public class LoginRequest {
    private String username;
    private String password;
    private String secure;
    private String trustedDeviceToken;

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getSecure() { return secure; }
    public void setSecure(String secure) { this.secure = secure; }

    public String getTrustedDeviceToken() { return trustedDeviceToken; }
    public void setTrustedDeviceToken(String trustedDeviceToken) { this.trustedDeviceToken = trustedDeviceToken; }
}

