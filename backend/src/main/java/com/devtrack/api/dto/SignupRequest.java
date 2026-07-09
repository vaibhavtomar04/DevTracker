package com.devtrack.api.dto;

public class SignupRequest {
    private String username;
    private String password;
    private String email;
    private String fullName;
    private String role; // Role name as string

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    private String secure;
    public String getSecure() { return secure; }
    public void setSecure(String secure) { this.secure = secure; }
}

