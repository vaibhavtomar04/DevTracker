import { create } from "zustand"
import { useAuthStore } from "./authStore"

interface ThemeState {
  theme: "light" | "dark"
  toggleTheme: () => void
  initTheme: () => void
  setTheme: (theme: "light" | "dark") => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "light", // Default to premium light mode

  toggleTheme: () => {
    const newTheme = get().theme === "light" ? "dark" : "light"
    set({ theme: newTheme })
    localStorage.setItem("dlms_theme", newTheme)
    
    const root = window.document.documentElement
    if (newTheme === "dark") {
      root.classList.add("dark")
      root.classList.remove("light")
    } else {
      root.classList.add("light")
      root.classList.remove("dark")
    }

    // Sync to authStore user object if logged in
    const authStore = useAuthStore.getState()
    if (authStore.user) {
      useAuthStore.setState({ user: { ...authStore.user, theme: newTheme } })
    }

    // Send theme update to backend if logged in
    const token = localStorage.getItem("token")
    if (token) {
      const API_BASE = import.meta.env.VITE_API_URL || ""
      fetch(`${API_BASE}/api/users/theme`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ theme: newTheme })
      }).catch(err => console.error("Failed to save theme to backend:", err))
    }
  },

  setTheme: (newTheme: "light" | "dark") => {
    set({ theme: newTheme })
    localStorage.setItem("dlms_theme", newTheme)
    
    const root = window.document.documentElement
    if (newTheme === "dark") {
      root.classList.add("dark")
      root.classList.remove("light")
    } else {
      root.classList.add("light")
      root.classList.remove("dark")
    }
  },

  initTheme: () => {
    const storedTheme = localStorage.getItem("dlms_theme") as "light" | "dark" | null
    const theme = storedTheme || "light" // Enforce light as default
    
    set({ theme })
    localStorage.setItem("dlms_theme", theme)
    
    const root = window.document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
      root.classList.remove("light")
    } else {
      root.classList.add("light")
      root.classList.remove("dark")
    }
  }
}))
