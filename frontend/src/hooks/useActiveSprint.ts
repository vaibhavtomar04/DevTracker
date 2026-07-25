import { useEffect } from "react"
import { useSprintStore, type Sprint } from "@/store/sprintStore"

export interface ActiveSprintResult {
  sprint: Sprint | null
  hasActiveSprint: boolean
  loading: boolean
}

export function useActiveSprint(): ActiveSprintResult {
  const { sprints, loading, fetchSprints } = useSprintStore()

  useEffect(() => {
    fetchSprints()
  }, [fetchSprints])

  const activeSprint = sprints.find((s) => s.status === "ACTIVE") || null

  return {
    sprint: activeSprint,
    hasActiveSprint: activeSprint !== null,
    loading,
  }
}
