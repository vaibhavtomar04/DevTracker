import { create } from "zustand"
import { apiClient } from "@/utils/apiClient"

export interface Sprint {
  id: number
  name: string
  goal: string
  startDate: string
  endDate: string
  status: "FUTURE" | "ACTIVE" | "COMPLETED"
  createdDate?: string
}

interface SprintState {
  sprints: Sprint[]
  loading: boolean
  error: string | null

  fetchSprints: () => Promise<void>
  createSprint: (data: Omit<Sprint, "id" | "createdDate" | "status">) => Promise<Sprint>
  updateSprint: (id: number, data: Partial<Sprint>) => Promise<Sprint>
  deleteSprint: (id: number) => Promise<void>
  startSprint: (id: number) => Promise<void>
  completeSprint: (id: number) => Promise<void>
  assignTaskToSprint: (taskId: number, sprintId: number | null) => Promise<void>
}

export const useSprintStore = create<SprintState>((set, get) => ({
  sprints: [],
  loading: false,
  error: null,

  fetchSprints: async () => {
    set({ loading: true, error: null })
    try {
      const data = await apiClient("/api/sprints")
      set({ sprints: data, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  createSprint: async (data) => {
    const newSprint: Sprint = await apiClient("/api/sprints", {
      method: "POST",
      body: JSON.stringify(data)
    })
    set(state => ({ sprints: [newSprint, ...state.sprints] }))
    return newSprint
  },

  updateSprint: async (id, data) => {
    const current = get().sprints.find(s => s.id === id)
    if (!current) throw new Error("Sprint not found")
    const merged = { ...current, ...data }
    const updated: Sprint = await apiClient(`/api/sprints/${id}`, {
      method: "PUT",
      body: JSON.stringify(merged)
    })
    set(state => ({ sprints: state.sprints.map(s => s.id === id ? updated : s) }))
    return updated
  },

  deleteSprint: async (id) => {
    await apiClient(`/api/sprints/${id}`, { method: "DELETE" })
    set(state => ({ sprints: state.sprints.filter(s => s.id !== id) }))
  },

  startSprint: async (id) => {
    await apiClient(`/api/sprints/${id}/start`, { method: "POST" })
    set(state => ({
      sprints: state.sprints.map(s =>
        s.id === id ? { ...s, status: "ACTIVE" as const } : s
      )
    }))
  },

  completeSprint: async (id) => {
    await apiClient(`/api/sprints/${id}/complete`, { method: "POST" })
    set(state => ({
      sprints: state.sprints.map(s =>
        s.id === id ? { ...s, status: "COMPLETED" as const } : s
      )
    }))
  },

  assignTaskToSprint: async (taskId, sprintId) => {
    await apiClient(`/api/tasks/${taskId}/sprint`, {
      method: "PUT",
      body: JSON.stringify({ sprintId })
    })
  }
}))
