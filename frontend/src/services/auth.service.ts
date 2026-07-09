
export interface JwtResponse {
  token: string
  type: string
  id: number
  username: string
  fullName: string
  email: string
  avatar?: string
  roles: string[]
  mustChangePassword?: boolean
  theme?: string
}

const API_BASE = import.meta.env.VITE_API_URL || "";

export const authService = {
  async login(usernameOrEmail: string, password: string, trustedDeviceToken?: string): Promise<JwtResponse> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (trustedDeviceToken) {
      headers["X-Trusted-Device-Token"] = trustedDeviceToken;
    }
    const res = await fetch(API_BASE + "/api/auth/login", {
      method: "POST",
      headers,
      body: JSON.stringify({ username: usernameOrEmail, password, trustedDeviceToken })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || "Invalid credentials");
    }
    const data = await res.json();
    if (data && Array.isArray(data.roles)) {
      data.roles = data.roles.map((r: string) => r.replace(/^ROLE_/, ""));
    }
    return data;
  },

  async logout(): Promise<void> {
    await fetch(API_BASE + "/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
  },

  async register(username: string, email: string, fullName: string, role: string): Promise<{ message: string }> {
    const res = await fetch(API_BASE + "/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password: "Password123!", fullName, email, role })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || "Registration failed");
    }
    return await res.json();
  },

  async resetPassword(username: string): Promise<{ message: string }> {
    const res = await fetch(API_BASE + "/api/auth/resetPassword", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password: "Password123!" })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || "Password reset failed");
    }
    return await res.json();
  }
}

