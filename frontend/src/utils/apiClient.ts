import { useAuthStore } from "@/store/authStore";

const API_BASE = import.meta.env.VITE_API_URL || "";

function extractErrorMessage(text: string, status: number): string {
  if (!text || !text.trim()) {
    return `API error (${status})`;
  }
  try {
    const parsed = JSON.parse(text);
    if (parsed.message) {
      return parsed.message;
    }
    if (parsed.error) {
      return parsed.error;
    }
    if (parsed.errors && Array.isArray(parsed.errors)) {
      return parsed.errors.map((e: any) => e.defaultMessage || e.message || JSON.stringify(e)).join(", ");
    }
    return text;
  } catch (e) {
    return text;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

export async function apiClient(endpoint: string, options: RequestOptions = {}): Promise<any> {
  const { token, logout, setSession } = useAuthStore.getState();

  // Construct URL with query parameters if present
  let url = `${API_BASE}${endpoint}`;
  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Set headers
  const headers: Record<string, string> = {};
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: "include", // essential for HTTP-only cookies
  };

  const response = await fetch(url, fetchOptions);

  if (response.status === 401 && endpoint !== "/api/auth/refresh" && endpoint !== "/api/auth/login") {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshResponse = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include"
        });

        if (!refreshResponse.ok) {
          throw new Error("Refresh failed");
        }

        const data = await refreshResponse.json();
        // Normalize roles: strip ROLE_ prefix
        if (data && Array.isArray(data.roles)) {
          data.roles = data.roles.map((r: string) => r.replace(/^ROLE_/, ""));
        }
        // Persist the new token
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        // Update session state in Zustand store
        setSession(data, data.token);
        
        isRefreshing = false;
        onRefreshed(data.token);
      } catch (err) {
        isRefreshing = false;
        refreshSubscribers = [];
        await logout();
        window.location.href = "/login";
        throw new Error("Session expired. Please log in again.");
      }
    }

    // Return a promise that resolves when the token is refreshed
    return new Promise((resolve, reject) => {
      subscribeTokenRefresh(async (newToken) => {
        try {
          headers["Authorization"] = `Bearer ${newToken}`;
          const retryOptions = { ...fetchOptions, headers };
          const retryResponse = await fetch(url, retryOptions);
          const retryText = await retryResponse.text();
          if (!retryResponse.ok) {
            reject(new Error(extractErrorMessage(retryText, retryResponse.status)));
          } else if (retryResponse.status === 204 || !retryText.trim()) {
            resolve(null);
          } else {
            try {
              resolve(JSON.parse(retryText));
            } catch (e) {
              resolve(retryText);
            }
          }
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  if (response.status === 401) {
    await logout();
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!response.ok) {
    throw new Error(extractErrorMessage(text, response.status));
  }

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}

