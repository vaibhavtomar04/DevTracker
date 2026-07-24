/**
 * dashboardStore — Lightweight Zustand store for /api/dashboard/summary
 *
 * Design:
 *  - Fetches the pre-aggregated summary endpoint which resolves all KPI counts
 *    in parallel on the backend (CompletableFuture). Response in ~100–300ms.
 *  - Scope is SERVER-ENFORCED: admin users get ALL-scope counts, developers/testers
 *    get MINE-scope counts. The frontend renders whatever the backend returns.
 *  - KPI values are NEVER derived from client-side tasks[] filtering.
 *  - Called on dashboard mount BEFORE taskStore.fetchData() completes,
 *    so KPI cards render within 1-2s of login.
 */

import { create } from "zustand"
import APP_CONFIG from "@/config/appConfig"

const API_BASE = `${APP_CONFIG.apiUrl}/api`

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface DashboardStatsSummary {
  totalCrs: number
  pendingApprovals: number
  activeBugs: number
  completedUat: number
}

export interface DashboardUserSummary {
  id: number
  username: string
  fullName: string
  email: string
  roles: string[]
}

export interface DashboardSprintSummary {
  id: number
  name: string
  goal: string | null
  startDate: string | null
  endDate: string | null
  status: string
  totalTasks: number
  completedTasks: number
}

export interface DashboardRecentCr {
  id: number
  jtrackId: string
  title: string
  priority: string
  status: string
  updatedDate: string | null
  assignedDeveloperName: string | null
}

export interface DashboardPendingTask {
  id: number
  jtrackId: string
  title: string
  priority: string
  status: string
  dueDate: string | null
}

export interface DashboardSummary {
  stats: DashboardStatsSummary
  user: DashboardUserSummary | null
  activeSprint: DashboardSprintSummary | null
  unreadNotificationCount: number
  recentCrs: DashboardRecentCr[]
  pendingTasks: DashboardPendingTask[]
  /** Server-resolved scope: "ALL" (admin) or "MINE" (developer/tester) */
  scope: string
}

interface DashboardState {
  summary: DashboardSummary | null
  loading: boolean
  error: string | null
  lastFetched: number

  fetchSummary: (force?: boolean) => Promise<void>
  invalidate: () => void
}

const SUMMARY_TTL = 60_000 // 1 minute — shorter TTL than taskStore cache

export const useDashboardStore = create<DashboardState>((set, get) => ({
  summary: null,
  loading: false,
  error: null,
  lastFetched: 0,

  fetchSummary: async (force = false) => {
    const now = Date.now()
    const { loading, lastFetched } = get()

    // Skip if already loading or data is fresh (< 1 min)
    if (loading) return
    if (!force && lastFetched > 0 && now - lastFetched < SUMMARY_TTL) return

    set({ loading: true, error: null })

    try {
      const perfMark = `dashboardSummary:${now}`
      performance.mark(perfMark + ":start")

      const res = await fetch(`${API_BASE}/dashboard/summary`, {
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        }
      })

      if (!res.ok) {
        throw new Error(`Dashboard summary failed: ${res.status}`)
      }

      const data: DashboardSummary = await res.json()

      performance.mark(perfMark + ":end")
      try {
        performance.measure("dashboardSummary", perfMark + ":start", perfMark + ":end")
        const measure = performance.getEntriesByName("dashboardSummary").pop()
        if (measure) {
          console.info(`[DevTrack Perf] /api/dashboard/summary resolved in ${measure.duration.toFixed(0)}ms (scope=${data.scope})`)
        }
      } catch { /* ignore perf API errors in restricted envs */ }

      set({ summary: data, loading: false, error: null, lastFetched: Date.now() })
    } catch (err: any) {
      console.error("[dashboardStore] Failed to fetch summary:", err)
      set({ loading: false, error: err.message || "Failed to load dashboard" })
    }
  },

  /** Force the next fetchSummary() call to hit the server (e.g. after a mutation). */
  invalidate: () => set({ lastFetched: 0 })
}))
