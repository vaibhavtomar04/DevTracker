import React, { useState, useEffect } from "react"
import { useTaskStore } from "@/store/taskStore"
import { useAuthStore } from "@/store/authStore"
import { useSprintStore } from "@/store/sprintStore"
import { apiClient } from "@/utils/apiClient"
import {
  Search,
  ExternalLink,
  GitBranch
} from "lucide-react"
import { AnimatePresence } from "framer-motion"
import { CRDetailSlideOver } from "@/components/shared/CRDetailSlideOver"
import { CRTimelinePopup } from "@/components/shared/CRTimelinePopup"
import type { Task } from "@/services/mockData"

const glassCard =
  "rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] shadow-sm dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"

export default function MissedDeadlinesPage() {
  const { tasks, fetchData, addToast } = useTaskStore()
  const { sprints, fetchSprints } = useSprintStore()
  const { user } = useAuthStore()

  // State
  const [selectedCrId, setSelectedCrId] = useState<number | null>(null)
  const [selectedCrTask, setSelectedCrTask] = useState<Task | null>(null)
  const [timelineTask, setTimelineTask] = useState<Task | null>(null)
  const [deadlineStats, setDeadlineStats] = useState<any>(null)

  // Filters state
  const [search, setSearch] = useState("")
  const [project, setProject] = useState("")
  const [sprintId, setSprintId] = useState("")
  const [priority, setPriority] = useState("")
  const [milestoneType, setMilestoneType] = useState<"ALL" | "SIT" | "UAT">("ALL")

  // Load deadline analytics for KPIs
  const loadAnalytics = async () => {
    try {
      const res = await apiClient("/api/analytics/deadlines")
      setDeadlineStats(res)
    } catch (err) {
      console.error("Failed to load deadline analytics", err)
    }
  }

  useEffect(() => {
    fetchData()
    fetchSprints()
    loadAnalytics()
  }, [])

  // Helper to calculate delay details
  const getTaskSla = (task: Task) => {
    const todayStr = new Date().toISOString().split("T")[0]
    
    let sitMissed = false
    let sitDelayDays = 0
    if (task.expectedSitDeploymentDate) {
      const expected = task.expectedSitDeploymentDate
      const actual = task.sitDate
      const comp = actual || todayStr
      if (comp > expected) {
        sitMissed = true
        sitDelayDays = Math.ceil((new Date(comp).getTime() - new Date(expected).getTime()) / (1000 * 60 * 60 * 24))
      }
    }

    let uatMissed = false
    let uatDelayDays = 0
    if (task.expectedUatDeploymentDate) {
      const expected = task.expectedUatDeploymentDate
      const actual = task.uatDate
      const comp = actual || todayStr
      if (comp > expected) {
        uatMissed = true
        uatDelayDays = Math.ceil((new Date(comp).getTime() - new Date(expected).getTime()) / (1000 * 60 * 60 * 24))
      }
    }

    return {
      sitMissed,
      sitDelayDays,
      uatMissed,
      uatDelayDays,
      isMissed: sitMissed || uatMissed
    }
  }

  // Filtered tasks representing missed deadlines
  const missedTasks = React.useMemo(() => {
    return tasks
      .map(t => ({ ...t, sla: getTaskSla(t) }))
      .filter(t => {
        if (!t.sla.isMissed) return false

        // Milestone type filter
        if (milestoneType === "SIT" && !t.sla.sitMissed) return false
        if (milestoneType === "UAT" && !t.sla.uatMissed) return false

        // Search text
        if (search.trim()) {
          const val = search.toLowerCase()
          const matchJtrack = t.jtrackId.toLowerCase().includes(val)
          const matchTitle = t.title.toLowerCase().includes(val)
          const matchDev = t.assignedDeveloper?.fullName?.toLowerCase().includes(val)
          if (!matchJtrack && !matchTitle && !matchDev) return false
        }

        // Project filter
        if (project && t.project !== project) return false

        // Sprint filter
        if (sprintId && String(t.sprintId) !== sprintId) return false

        // Priority filter
        if (priority && t.priority !== priority) return false

        return true
      })
  }, [tasks, search, project, sprintId, priority, milestoneType])

  // Unique projects lookup
  const projects = React.useMemo(() => {
    return Array.from(new Set(tasks.map(t => t.project).filter(Boolean)))
  }, [tasks])

  const handleOpenCr = async (id: number) => {
    try {
      const taskObj = await apiClient(`/api/tasks/${id}`)
      setSelectedCrTask(taskObj)
      setSelectedCrId(id)
    } catch (err) {
      addToast("Failed to retrieve CR details.", "error")
    }
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 text-zinc-200 bg-[#060814] relative">
      {/* Slide-over details */}
      <CRDetailSlideOver
        crId={selectedCrId}
        task={selectedCrTask}
        open={selectedCrId !== null}
        onClose={() => {
          setSelectedCrId(null)
          setSelectedCrTask(null)
        }}
        currentUser={user}
        initialTab="overview"
      />

      {/* CR Timeline Popup */}
      <AnimatePresence>
        {timelineTask && (
          <CRTimelinePopup
            task={timelineTask}
            onClose={() => setTimelineTask(null)}
          />
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-rose-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
            Missed Deployment Deadlines
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Audit and analyze missed SIT and UAT deployment deadlines across active Change Requests.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total Overdue CRs", count: deadlineStats?.totalMissedDeadlines ?? 0, bg: "bg-rose-500/10", color: "text-rose-400" },
          { label: "SIT Missed Deadlines", count: deadlineStats?.missedSitDeadlines ?? 0, bg: "bg-rose-500/10", color: "text-rose-400" },
          { label: "UAT Missed Deadlines", count: deadlineStats?.missedUatDeadlines ?? 0, bg: "bg-rose-500/10", color: "text-rose-400" },
          { label: "Avg SIT Delay", count: deadlineStats?.averageSitDelay != null ? `${deadlineStats.averageSitDelay}d` : "—", bg: "bg-amber-500/10", color: "text-amber-400" },
          { label: "Avg UAT Delay", count: deadlineStats?.averageUatDelay != null ? `${deadlineStats.averageUatDelay}d` : "—", bg: "bg-amber-500/10", color: "text-amber-400" },
        ].map((kpi, idx) => (
          <div key={idx} className={`${glassCard} p-4 text-left space-y-1.5`}>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">{kpi.label}</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black ${kpi.color}`}>{kpi.count}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Panel */}
      <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md mb-6 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search CR, title, developer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500/40 transition-colors"
            />
          </div>

          {/* Milestone filter */}
          <select
            value={milestoneType}
            onChange={e => setMilestoneType(e.target.value as any)}
            className="bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
          >
            <option value="ALL">All Milestones</option>
            <option value="SIT">SIT Overdue</option>
            <option value="UAT">UAT Overdue</option>
          </select>

          {/* Project filter */}
          <select
            value={project}
            onChange={e => setProject(e.target.value)}
            className="bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Sprint filter */}
          <select
            value={sprintId}
            onChange={e => setSprintId(e.target.value)}
            className="bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
          >
            <option value="">All Sprints</option>
            {sprints.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={priority}
            onChange={e => setPriority(e.target.value)}
            className="bg-[#0b0f19] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="Highest">Highest</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="px-4 py-3 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">CR Number</th>
                <th className="px-4 py-3 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">CR Title</th>
                <th className="px-4 py-3 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Developer</th>
                <th className="px-4 py-3 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Priority</th>
                <th className="px-4 py-3 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Milestone</th>
                <th className="px-4 py-3 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Expected Date</th>
                <th className="px-4 py-3 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Actual Date</th>
                <th className="px-4 py-3 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Delay (Days)</th>
                <th className="px-4 py-3 text-[11px] font-bold text-zinc-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {missedTasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500 italic">
                    No missed deadlines match the current filters.
                  </td>
                </tr>
              ) : (
                missedTasks.map(t => {
                  const milestonesToShow: Array<{
                    name: string;
                    expected: string;
                    actual: string | null;
                    delay: number;
                    isMissed: boolean;
                  }> = []

                  if (t.sla.sitMissed && (milestoneType === "ALL" || milestoneType === "SIT")) {
                    milestonesToShow.push({
                      name: "SIT",
                      expected: t.expectedSitDeploymentDate!,
                      actual: t.sitDate || null,
                      delay: t.sla.sitDelayDays,
                      isMissed: true
                    })
                  }

                  if (t.sla.uatMissed && (milestoneType === "ALL" || milestoneType === "UAT")) {
                    milestonesToShow.push({
                      name: "UAT",
                      expected: t.expectedUatDeploymentDate!,
                      actual: t.uatDate || null,
                      delay: t.sla.uatDelayDays,
                      isMissed: true
                    })
                  }

                  return milestonesToShow.map((m) => (
                    <tr key={`${t.id}-${m.name}`} className="border-b border-white/[0.04] hover:bg-white/[0.01] transition-colors">
                      {/* CR Number */}
                      <td className="px-4 py-3 font-mono text-[11px] font-semibold text-rose-400">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenCr(t.id)}
                            className="hover:underline flex items-center gap-1 hover:text-rose-350 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            {t.jtrackId}
                          </button>
                        </div>
                      </td>

                      {/* Title */}
                      <td className="px-4 py-3 text-xs max-w-[220px] truncate font-medium text-zinc-200">
                        {t.title}
                      </td>

                      {/* Developer */}
                      <td className="px-4 py-3 text-xs text-zinc-350 font-semibold">
                        {t.assignedDeveloper?.fullName || "—"}
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3 text-xs">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                          t.priority === "High" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                          t.priority === "Medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          "bg-zinc-800 text-zinc-400 border-zinc-700/50"
                        }`}>
                          {t.priority}
                        </span>
                      </td>

                      {/* Milestone */}
                      <td className="px-4 py-3 text-xs font-bold text-zinc-300">
                        {m.name}
                      </td>

                      {/* Expected */}
                      <td className="px-4 py-3 text-xs text-zinc-400 font-mono">
                        {formatDate(m.expected)}
                      </td>

                      {/* Actual */}
                      <td className="px-4 py-3 text-xs text-zinc-400 font-mono">
                        {m.actual ? formatDate(m.actual) : <span className="text-zinc-500 italic">Not Deployed</span>}
                      </td>

                      {/* Delay days */}
                      <td className="px-4 py-3 text-xs font-black text-rose-400">
                        {m.delay} days
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-xs text-right">
                        <button
                          onClick={() => setTimelineTask(t)}
                          className="px-2.5 py-1 text-[10px] font-bold text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 rounded-md transition-colors"
                        >
                          <GitBranch className="w-3.5 h-3.5 inline mr-1" /> Timeline
                        </button>
                      </td>
                    </tr>
                  ))
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
