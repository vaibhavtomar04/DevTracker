import { create } from "zustand"
import { authService } from "@/services/auth.service"
import type { JwtResponse } from "@/services/auth.service"
import type { User } from "@/services/mockData"
import { useThemeStore } from "./themeStore"

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
  loggingOut: boolean
  initialized: boolean
  mustChangePassword: boolean
  login: (usernameOrEmail: string, password: string, trustedDeviceToken?: string) => Promise<JwtResponse>
  setSession: (user: User, token: string, mustChangePassword?: boolean) => void
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  clearError: () => void
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  setNewPassword: (newPassword: string, confirmPassword: string) => Promise<void>
  startInactivityTracking: () => void
  stopInactivityTracking: () => void
}

let inactivityTimeoutId: any = null;
let resetTimerListener: (() => void) | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: false,
  error: null,
  loggingOut: false,
  initialized: false,
  mustChangePassword: false,

  login: async (usernameOrEmail, password, trustedDeviceToken) => {
    set({ loading: true, error: null })
    try {
      const response = await authService.login(usernameOrEmail, password, trustedDeviceToken)
      set({ loading: false, initialized: true, mustChangePassword: !!response.mustChangePassword })
      return response
    } catch (err: any) {
      set({ error: err.message || "Authentication failed", loading: false, initialized: true })
      throw err
    }
  },

  setSession: (user, token, mustChangePassword = false) => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
    if (user && user.theme) {
      useThemeStore.getState().setTheme(user.theme as "light" | "dark");
    }
    set({ user, token, mustChangePassword: !!mustChangePassword })
    get().startInactivityTracking()
  },

  logout: async () => {
    set({ loggingOut: true })
    get().stopInactivityTracking()
    await new Promise((resolve) => setTimeout(resolve, 2200))
    try {
      await authService.logout()
      localStorage.removeItem("token");
      set({ user: null, token: null, loggingOut: false, initialized: true })
    } catch (err) {
      localStorage.removeItem("token");
      set({ user: null, token: null, loggingOut: false, initialized: true })
    }
  },

  checkAuth: async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "";

      // 1. First try to restore from the stored JWT Bearer token (survives page reload)
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        const meRes = await window.fetch(`${API_BASE}/api/auth/me`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${storedToken}`,
            "Content-Type": "application/json"
          }
        });
        if (meRes.ok) {
          const data = await meRes.json();
          if (data && Array.isArray(data.roles)) {
            data.roles = data.roles.map((r: string) => r.replace(/^ROLE_/, ""));
          }
          if (data && data.theme) {
            useThemeStore.getState().setTheme(data.theme as "light" | "dark");
          }
          set({ user: data, token: storedToken, initialized: true });
          get().startInactivityTracking();
          return;
        }
        // Token expired or invalid — clear it
        localStorage.removeItem("token");
      }

      // 2. Fall back to refresh cookie if no stored token
      const res = await window.fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.roles)) {
          data.roles = data.roles.map((r: string) => r.replace(/^ROLE_/, ""));
        }
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        if (data && data.theme) {
          useThemeStore.getState().setTheme(data.theme as "light" | "dark");
        }
        set({ user: data, token: data.token, initialized: true });
        get().startInactivityTracking();
      } else {
        localStorage.removeItem("token");
        set({ initialized: true });
      }
    } catch (e) {
      localStorage.removeItem("token");
      set({ initialized: true });
    }
  },

  clearError: () => set({ error: null }),

  changePassword: async (currentPassword, newPassword) => {
    set({ loading: true, error: null })
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "";
      const res = await window.fetch(`${API_BASE}/api/auth/change-password`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${get().token}`
        },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: "include"
      })
      if (!res.ok) {
        throw new Error(await res.text())
      }
      set({ loading: false })
    } catch (err: any) {
      set({ error: err.message || "Password change failed", loading: false })
      throw err
    }
  },

  forgotPassword: async (email) => {
    set({ loading: true, error: null })
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "";
      const res = await window.fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      })
      if (!res.ok) {
        throw new Error(await res.text())
      }
      set({ loading: false })
    } catch (err: any) {
      set({ error: err.message || "Failed to send reset email", loading: false })
      throw err
    }
  },

  setNewPassword: async (newPassword, confirmPassword) => {
    set({ loading: true, error: null })
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "";
      const res = await window.fetch(`${API_BASE}/api/auth/set-new-password`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${get().token}`
        },
        body: JSON.stringify({ newPassword, confirmPassword }),
        credentials: "include"
      })
      if (!res.ok) {
        throw new Error(await res.text())
      }
      // Clear session — user must re-login with new password
      localStorage.removeItem("token");
      set({ loading: false, mustChangePassword: false, user: null, token: null })
    } catch (err: any) {
      set({ error: err.message || "Failed to set new password", loading: false })
      throw err
    }
  },

  startInactivityTracking: () => {
    get().stopInactivityTracking();

    const resetTimer = () => {
      if (inactivityTimeoutId) clearTimeout(inactivityTimeoutId);
      inactivityTimeoutId = setTimeout(() => {
        get().logout().then(() => {
          window.location.href = "/login";
        });
      }, 15 * 60 * 1000); // 15 minutes of inactivity
    };

    resetTimerListener = resetTimer;

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("scroll", resetTimer);
    window.addEventListener("click", resetTimer);

    resetTimer();
  },

  stopInactivityTracking: () => {
    if (inactivityTimeoutId) {
      clearTimeout(inactivityTimeoutId);
      inactivityTimeoutId = null;
    }
    if (resetTimerListener) {
      window.removeEventListener("mousemove", resetTimerListener);
      window.removeEventListener("keydown", resetTimerListener);
      window.removeEventListener("scroll", resetTimerListener);
      window.removeEventListener("click", resetTimerListener);
      resetTimerListener = null;
    }
  }
}))

