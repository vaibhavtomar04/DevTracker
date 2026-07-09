import React, { useState, useEffect } from "react"
import { useTaskStore } from "@/store/taskStore"
import { useAuthStore } from "@/store/authStore"
import { apiClient } from "@/utils/apiClient"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  ExternalLink,
  Clock,
  Bug,
  RotateCcw,
  Calendar,
  ArrowUpDown,
  AlertCircle,
  GitBranch
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { CRDetailSlideOver } from "@/components/shared/CRDetailSlideOver"
import { CRTimelinePopup } from "@/components/shared/CRTimelinePopup"
import type { Task } from "@/services/mockData"
import { QualityRiskBadge } from "@/components/shared/QualityRiskBadge"

interface TestedCr {
  id: number
  jtrackId: string
  title: string
  project: string
  sprintId: number | null
  sprintName: string
  priority: string
  developers: string[]
  testingStartedDate: string | null
  testingCompletedDate: string | null
  testingDuration: string
  totalBugsRaised: number
  totalRetests: number
  productionStatus: string
  finalStatus: string
  devStartDate: string | null
  sitDate: string | null
  uatDate: string | null
  productionDate: string | null
  isQualityRisk: boolean
}

const PRIORITY_COLORS: Record<string, string> = {
  Highest: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
  HIGHEST: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
  High: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
  HIGH: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
  Medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  Low: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  LOW: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-zinc-100 dark:bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-500/30",
  IN_PROGRESS: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30",
  CHANGES_REQUESTED: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30",
  SIT_DEPLOYED: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30",
  SIT_TESTING: "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30",
  SIT_COMPLETED: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30",
  CODE_REVIEW: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30",
  CODE_REVIEW_DONE: "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/30",
  MOVE_TO_UAT: "bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30",
  UAT_TESTING: "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30",
  UAT_COMPLETED: "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30",
  TESTING_COMPLETED: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30",
  PROD_DEPLOYED: "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30",
  PROD_COMPLETED: "bg-lime-50 dark:bg-lime-500/10 text-lime-700 dark:text-lime-400 border border-lime-200 dark:border-lime-500/30",
  CLOSED: "bg-emerald-100 dark:bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-600/30",
}

export default function TestedCrs() {
  const { fetchTestedCrs, requestTestedCrsExport, addToast } = useTaskStore()
  const { user } = useAuthStore()

  // State
  const [data, setData] = useState<TestedCr[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)

  // Query / Filters
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(50)
  const [sortField, setSortField] = useState("testingCompletedDate")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [search, setSearch] = useState("")
  const [project, setProject] = useState("")
  const [sprintId, setSprintId] = useState("")
  const [priority, setPriority] = useState("")
  const [status, setStatus] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Available metadata for filters
  const [sprints, setSprints] = useState<any[]>([])
  const [projects, setProjects] = useState<string[]>([])

  // UI state
  const [expandedTimelines, setExpandedTimelines] = useState<Record<number, boolean>>({})
  const [selectedCrId, setSelectedCrId] = useState<number | null>(null)
  const [selectedCrTask, setSelectedCrTask] = useState<Task | null>(null)
  const [initialSlideOverTab, setInitialSlideOverTab] = useState<"overview" | "timeline" | "documents" | "activity" | "comments" | "bugs" | "approval">("overview")
  const [exportingJobId, setExportingJobId] = useState<string | null>(null)
  const [exportProgress, setExportProgress] = useState("")
  const [timelineTask, setTimelineTask] = useState<Task | null>(null)

  // Load Tested CRs
  const loadTestedCrs = async () => {
    setLoading(true)
    try {
      const sortParam = `${sortField},${sortDir}`
      const formattedStartDate = startDate ? `${startDate}T00:00:00` : undefined
      const formattedEndDate = endDate ? `${endDate}T23:59:59` : undefined

      const res = await fetchTestedCrs({
        page,
        size,
        sort: sortParam,
        search: search || undefined,
        project: project || undefined,
        sprintId: sprintId ? parseInt(sprintId) : undefined,
        priority: priority || undefined,
        status: status || undefined,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
      })

      if (res) {
        setData(res.content || [])
        setTotalPages(res.totalPages || 0)
        setTotalElements(res.totalElements || 0)
      }
    } catch (err: any) {
      addToast(err?.message || "Failed to load tested CRs.", "error")
    } finally {
      setLoading(false)
    }
  }

  // Load Filter Lookups
  useEffect(() => {
    // Sprints
    apiClient("/api/sprints")
      .then(setSprints)
      .catch(() => { })

    // Unique Projects from Tasks
    apiClient("/api/tasks")
      .then((tasks: any[]) => {
        const unique = Array.from(new Set(tasks.map(t => t.project).filter(Boolean)))
        setProjects(unique)
      })
      .catch(() => { })
  }, [])

  // Trigger load on filter/pagination changes
  useEffect(() => {
    loadTestedCrs()
  }, [page, size, sortField, sortDir, project, sprintId, priority, status, startDate, endDate])

  // Simple debounce for search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(0)
      loadTestedCrs()
    }, 400)
    return () => clearTimeout(handler)
  }, [search])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("desc")
    }
    setPage(0)
  }

  // Open CR Detail Slide-Over
  const handleOpenCr = async (id: number, tab: "overview" | "timeline" | "documents" | "activity" | "comments" | "bugs" | "approval" = "overview") => {
    try {
      const taskObj = await apiClient(`/api/tasks/${id}`)
      setSelectedCrTask(taskObj)
      setSelectedCrId(id)
      setInitialSlideOverTab(tab)
    } catch (err) {
      addToast("Failed to retrieve CR details.", "error")
    }
  }

  // Open CR Timeline Popup (animated slides)
  const handleOpenTimeline = async (id: number) => {
    try {
      const taskObj = await apiClient(`/api/tasks/${id}`)
      setTimelineTask(taskObj)
    } catch (err) {
      addToast("Failed to retrieve CR timeline.", "error")
    }
  }

  // Poll report job status
  const pollExportStatus = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const job = await apiClient(`/api/reports/jobs/${jobId}`)
        if (job.status === "READY") {
          clearInterval(interval)
          setExportingJobId(null)
          setExportProgress("")
          addToast("Export completed successfully. Downloading...", "success")
          // Stream raw Excel via download URL
          window.open(`/api/reports/download/${job.downloadToken}`, "_blank")
        } else if (job.status === "FAILED") {
          clearInterval(interval)
          setExportingJobId(null)
          setExportProgress("")
          addToast(`Export failed: ${job.errorReason || "Unknown reason"}`, "error")
        } else {
          setExportProgress(`Generating report... (${job.status})`)
        }
      } catch (err) {
        clearInterval(interval)
        setExportingJobId(null)
        setExportProgress("")
        addToast("Error polling report status.", "error")
      }
    }, 2000)
  }

  // Trigger Async Export
  const handleExport = async () => {
    if (exportingJobId) return
    setExportProgress("Initiating export...")
    try {
      const formattedStartDate = startDate ? `${startDate}T00:00:00` : undefined
      const formattedEndDate = endDate ? `${endDate}T23:59:59` : undefined

      const res = await requestTestedCrsExport({
        search: search || undefined,
        project: project || undefined,
        sprintId: sprintId ? parseInt(sprintId) : undefined,
        priority: priority || undefined,
        status: status || undefined,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
      })

      if (res && res.jobId) {
        setExportingJobId(res.jobId)
        pollExportStatus(res.jobId)
      } else {
        addToast("Failed to initiate export job.", "error")
        setExportProgress("")
      }
    } catch (err: any) {
      addToast(err?.message || "Export request failed.", "error")
      setExportProgress("")
    }
  }

  // Format Helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—"
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    } catch {
      return dateStr
    }
  }

  const toggleTimeline = (id: number) => {
    setExpandedTimelines(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  // E6 Timeline Render
  const renderHorizontalTimeline = (cr: TestedCr) => {
    const milestones = [
      { label: "Dev Started", date: cr.devStartDate, key: "dev" },
      { label: "SIT Deploy", date: cr.sitDate, key: "sit" },
      { label: "UAT Deploy", date: cr.uatDate, key: "uat" },
      { label: "Production", date: cr.productionDate, key: "prod" }
    ]

    const parseLocalDate = (dateStr?: string | null) => {
      if (!dateStr) return null
      return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
    }

    return (
      <div className="flex flex-col gap-2 py-4 px-6 bg-slate-900/60 rounded-xl border border-white/[0.04] mt-2 mb-4">
        <h4 className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider mb-2">
          <Calendar className="w-3.5 h-3.5" /> Release Milestones
        </h4>
        <div className="relative flex items-center justify-between w-full mt-4 mb-2 max-w-xl mx-auto">
          {/* Base progress line */}
          <div className="absolute left-0 right-0 h-1 bg-white/10 -z-10 rounded-full" />

          {milestones.map((m, idx) => {
            const isCompleted = !!m.date
            const dateFormatted = parseLocalDate(m.date)

            return (
              <div key={m.key} className="flex flex-col items-center relative">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-[10px] transition-all duration-300 ${isCompleted
                      ? "bg-indigo-600/30 border-indigo-400 text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                      : "bg-[#0b0f19] border-white/10 text-zinc-600"
                    }`}
                  title={m.label}
                >
                  {isCompleted ? "✓" : idx + 1}
                </div>
                <span className="text-[11px] font-semibold text-zinc-300 mt-2 whitespace-nowrap">
                  {m.label}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono mt-0.5 whitespace-nowrap">
                  {dateFormatted || "Pending"}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-none text-zinc-200 bg-[#060814]">
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
        initialTab={initialSlideOverTab}
      />

      {/* CR Timeline Popup — animated slides */}
      <AnimatePresence>
        {timelineTask && (
          <CRTimelinePopup
            task={timelineTask}
            onClose={() => setTimelineTask(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-sky-400 bg-clip-text text-transparent">
            Tester Workspace
          </h1>
          <p className="text-xs text-zinc-500 mt-1 font-medium">
            Manage, audit, and export verified Change Requests (CRs) tested by you.
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={!!exportingJobId || loading}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-50 rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.25)] select-none shrink-0"
        >
          {exportingJobId ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{exportProgress || "Exporting..."}</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Search bar */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search CR number, title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>

          {/* Project filter */}
          <select
            value={project}
            onChange={e => { setProject(e.target.value); setPage(0); }}
            className="bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Sprint filter */}
          <select
            value={sprintId}
            onChange={e => { setSprintId(e.target.value); setPage(0); }}
            className="bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50"
          >
            <option value="">All Sprints</option>
            {sprints.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={priority}
            onChange={e => { setPriority(e.target.value); setPage(0); }}
            className="bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50"
          >
            <option value="">All Priorities</option>
            <option value="Highest">Highest</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Status filter */}
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(0); }}
            className="bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50"
          >
            <option value="">All Statuses</option>
            <option value="TESTING_COMPLETED">Testing Completed</option>
            <option value="PROD_DEPLOYED">Prod Deployed</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Date Start */}
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-[10px] text-zinc-500 pointer-events-none">Start:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setPage(0); }}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-12 pr-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          {/* Date End */}
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-[10px] text-zinc-500 pointer-events-none">End:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setPage(0); }}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          {/* Reset Filters */}
          {(project || sprintId || priority || status || startDate || endDate || search) && (
            <button
              onClick={() => {
                setProject("")
                setSprintId("")
                setPriority("")
                setStatus("")
                setStartDate("")
                setEndDate("")
                setSearch("")
                setPage(0)
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-200 border border-white/10 hover:bg-white/5 rounded-xl transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="relative rounded-2xl border border-white/[0.06] bg-white/[0.01] overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-[#060814]/40 backdrop-blur-sm z-30 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th onClick={() => handleSort("jtrackId")} className="cursor-pointer select-none px-4 py-3 text-[11px] font-bold text-zinc-400 hover:text-zinc-200">
                  <div className="flex items-center gap-1">CR Number <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-zinc-400">CR Title</th>
                <th className="px-4 py-3 text-[11px] font-bold text-zinc-400">Project</th>
                <th className="px-4 py-3 text-[11px] font-bold text-zinc-400">Sprint</th>
                <th className="px-4 py-3 text-[11px] font-bold text-zinc-400">Developers</th>
                <th onClick={() => handleSort("priority")} className="cursor-pointer select-none px-4 py-3 text-[11px] font-bold text-zinc-400 hover:text-zinc-200">
                  <div className="flex items-center gap-1">Priority <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th onClick={() => handleSort("testingStartedDate")} className="cursor-pointer select-none px-4 py-3 text-[11px] font-bold text-zinc-400 hover:text-zinc-200">
                  <div className="flex items-center gap-1">Testing Started <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th onClick={() => handleSort("testingCompletedDate")} className="cursor-pointer select-none px-4 py-3 text-[11px] font-bold text-zinc-400 hover:text-zinc-200">
                  <div className="flex items-center gap-1">Testing Completed <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-zinc-400">Duration</th>
                <th className="px-4 py-3 text-[11px] font-bold text-zinc-400">Bugs Raised</th>
                <th className="px-4 py-3 text-[11px] font-bold text-zinc-400">Retests</th>
                <th className="px-4 py-3 text-[11px] font-bold text-zinc-400">Prod Status</th>
                <th className="px-4 py-3 text-[11px] font-bold text-zinc-400">Final Status</th>
                <th className="px-4 py-3 text-[11px] font-bold text-zinc-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-zinc-600" />
                      <p className="text-sm font-semibold text-zinc-500">No tested CRs found</p>
                      <p className="text-xs text-zinc-600">Try adjusting your filters or search criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map(cr => {
                  const isTimelineExpanded = !!expandedTimelines[cr.id]

                  return (
                    <React.Fragment key={cr.id}>
                      <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        {/* CR Number */}
                        <td className="px-4 py-3 font-mono text-[11px] font-semibold text-indigo-400">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenTimeline(cr.id)}
                              className="hover:underline flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors"
                              title="View CR Timeline"
                            >
                              <GitBranch className="w-3 h-3" />
                              {cr.jtrackId}
                            </button>
                            <button
                              onClick={() => handleOpenCr(cr.id)}
                              className="hover:underline flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                              title="View Full Details"
                            >
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </button>
                            <QualityRiskBadge taskId={cr.id} isQualityRisk={cr.isQualityRisk} />
                          </div>
                        </td>

                        {/* CR Title */}
                        <td className="px-4 py-3 text-xs max-w-[200px] truncate" title={cr.title}>
                          <span className="font-semibold text-zinc-200">{cr.title}</span>
                        </td>

                        {/* Project */}
                        <td className="px-4 py-3 text-xs text-zinc-400 font-medium">
                          {cr.project}
                        </td>

                        {/* Sprint */}
                        <td className="px-4 py-3 text-xs text-zinc-400 font-medium">
                          {cr.sprintName}
                        </td>

                        {/* Developers */}
                        <td className="px-4 py-3 text-xs text-zinc-400 max-w-[150px] truncate" title={cr.developers.join(", ")}>
                          {cr.developers.length > 0 ? cr.developers.join(", ") : "—"}
                        </td>

                        {/* Priority */}
                        <td className="px-4 py-3 text-xs">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[cr.priority] || "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/50"}`}>
                            {cr.priority}
                          </span>
                        </td>

                        {/* Testing Started */}
                        <td className="px-4 py-3 text-xs text-zinc-500 font-mono">
                          {formatDate(cr.testingStartedDate)}
                        </td>

                        {/* Testing Completed */}
                        <td className="px-4 py-3 text-xs text-zinc-500 font-mono">
                          {formatDate(cr.testingCompletedDate)}
                        </td>

                        {/* Duration */}
                        <td className="px-4 py-3 text-xs text-zinc-400 font-medium">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            {cr.testingDuration?.replace(/-/g, "")}
                          </div>
                        </td>

                        {/* Bugs Raised */}
                        <td className="px-4 py-3 text-xs font-semibold text-rose-400">
                          {cr.totalBugsRaised > 0 ? (
                            <button
                              onClick={() => handleOpenCr(cr.id, "bugs")}
                              className="flex items-center gap-1 hover:underline text-rose-400 font-bold"
                            >
                              <Bug className="w-3.5 h-3.5 text-rose-400" />
                              {cr.totalBugsRaised}
                            </button>
                          ) : "0"}
                        </td>

                        {/* Retests */}
                        <td className="px-4 py-3 text-xs font-semibold text-amber-400">
                          {cr.totalRetests}
                        </td>

                        {/* Prod Status */}
                        <td className="px-4 py-3 text-xs">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cr.productionStatus === "DEPLOYED"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                            }`}>
                            {cr.productionStatus}
                          </span>
                        </td>

                        {/* Final Status */}
                        <td className="px-4 py-3 text-xs">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[cr.finalStatus] || "bg-zinc-800 text-zinc-400"}`}>
                            {cr.finalStatus.replace(/_/g, " ")}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-xs text-right">
                          <button
                            onClick={() => toggleTimeline(cr.id)}
                            className="px-2 py-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-md transition-colors"
                          >
                            {isTimelineExpanded ? "Hide Timeline" : "View Timeline"}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Timeline row */}
                      <AnimatePresence>
                        {isTimelineExpanded && (
                          <tr>
                            <td colSpan={14} className="p-0 bg-white/[0.005]">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden px-4"
                              >
                                {renderHorizontalTimeline(cr)}
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalElements > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06] bg-white/[0.02] text-xs text-zinc-500">
            <div>
              Showing <span className="font-semibold text-zinc-300">{page * size + 1}</span> to{" "}
              <span className="font-semibold text-zinc-300">
                {Math.min((page + 1) * size, totalElements)}
              </span>{" "}
              of <span className="font-semibold text-zinc-300">{totalElements}</span> entries
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span>Page Size:</span>
                <select
                  value={size}
                  onChange={e => {
                    setSize(parseInt(e.target.value))
                    setPage(0)
                  }}
                  className="bg-[#0b0f19] border border-white/10 rounded-lg px-2 py-1 text-xs text-zinc-300 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent text-zinc-400 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 font-semibold text-zinc-300">
                  {page + 1} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent text-zinc-400 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
