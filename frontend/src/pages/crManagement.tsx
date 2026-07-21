import React, { useState } from "react"
import { useTaskStore } from "@/store/taskStore"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/button"
import {
  Plus,
  Search,
  Filter,
  History,
  X,
  ChevronUp,
  ChevronDown,
  Download,
  Bug as BugIcon,
  ExternalLink,
  AlertTriangle,
  Trash2,
  ShieldAlert
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { Task } from "@/services/mockData"
import { QualityRiskBadge } from "@/components/shared/QualityRiskBadge"
import RaiseBugModal from "@/components/shared/RaiseBugModal"
import BugDetailModal from "@/components/shared/BugDetailModal"
import { CreateCRModal } from "@/components/shared/CreateCRModal"
import { Pagination, paginate } from "@/components/shared/Pagination"

export default function CrManagement() {
  const { 
    tasks, 
    deleteTask, 
    auditLogs, 
    bugs, 
    searchQuery, 
    addToast, 
    setDownloadTarget, 
    users, 
    reassignTester, 
    updateTask, 
    fetchData,
    bugReviews,
    adminAcceptRejection,
    adminForceAccept
  } = useTaskStore()
  const { user } = useAuthStore()

  React.useEffect(() => {
    fetchData()
  }, [])

  const [deleteModalTask, setDeleteModalTask] = useState<any>(null)
  const [deleteRemarks, setDeleteRemarks] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  const getAuditDate = (taskId: number, status: string) => {
    const log = auditLogs
      .filter(l => l.entityType === "TASK" && l.entityId === taskId && l.fieldName === "status" && l.newValue === status)
      .sort((a, b) => new Date(a.changedDate || 0).getTime() - new Date(b.changedDate || 0).getTime())[0]
    return log?.changedDate ? new Date(log.changedDate).toISOString().split('T')[0] : "—";
  }

  const getBugResolveDate = (bugId: number) => {
    const log = auditLogs
      .filter(l => l.entityType === "BUG" && l.entityId === bugId && l.fieldName === "status" && l.newValue === "RESOLVED")
      .sort((a, b) => new Date(a.changedDate || 0).getTime() - new Date(b.changedDate || 0).getTime())[0]
    return log?.changedDate ? new Date(log.changedDate).toISOString().split('T')[0] : "—";
  }

  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isRaiseBugOpen, setIsRaiseBugOpen] = useState(false)
  const [selectedBugId, setSelectedBugId] = useState<number | null>(null)
  const [selectedTaskForBugs, setSelectedTaskForBugs] = useState<Task | null>(null)
  
  // Reassignment Form State
  const [newTesterUsername, setNewTesterUsername] = useState("")
  const [reassignReason, setReassignReason] = useState("")

  // Creation Form State
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Sorting State
  const [sortColumn, setSortColumn] = useState<string>("jtrackId")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // Pagination
  const [crPage, setCrPage] = useState(0)
  const [crPageSize, setCrPageSize] = useState(25)

  // Column Filters State
  const [colFilterPriority, setColFilterPriority] = useState("all")
  const [colFilterStatus, setColFilterStatus] = useState("all")
  const [colFilterDev, setColFilterDev] = useState("all")
  const [colFilterTester, setColFilterTester] = useState("all")
  const [colFilterHasBugs, setColFilterHasBugs] = useState("all")
  const [activeColFilter, setActiveColFilter] = useState<string | null>(null)



  // Export State
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [exportStartDate, setExportStartDate] = useState("")
  const [exportEndDate, setExportEndDate] = useState("")
  const [exportDateType, setExportDateType] = useState<"created" | "production" | "sit_deploy" | "sit_completed" | "code_review" | "uat_deploy" | "prod_deployed">("created")
  const [exportPriority, setExportPriority] = useState("all")
  const [exportStatus, setExportStatus] = useState("all")
  const [exportCategory, setExportCategory] = useState("all")
  const [exportDev, setExportDev] = useState("all")
  const [exportHasBugs, setExportHasBugs] = useState("all")

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const handleExportData = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const filteredExport = tasks.filter(t => {
      // Date filter
      if (exportStartDate || exportEndDate) {
        let dateVal: string | undefined | null
        if (exportDateType === "created") dateVal = t.createdDate
        else if (exportDateType === "production") dateVal = t.productionDate
        else if (exportDateType === "sit_deploy") dateVal = getAuditDate(t.id, "SIT_DEPLOYED") !== "—" ? getAuditDate(t.id, "SIT_DEPLOYED") : null
        else if (exportDateType === "sit_completed") dateVal = getAuditDate(t.id, "SIT_COMPLETED") !== "—" ? getAuditDate(t.id, "SIT_COMPLETED") : null
        else if (exportDateType === "code_review") dateVal = getAuditDate(t.id, "CODE_REVIEW") !== "—" ? getAuditDate(t.id, "CODE_REVIEW") : null
        else if (exportDateType === "uat_deploy") dateVal = getAuditDate(t.id, "MOVE_TO_UAT") !== "—" ? getAuditDate(t.id, "MOVE_TO_UAT") : null
        else if (exportDateType === "prod_deployed") dateVal = getAuditDate(t.id, "PROD_DEPLOYED") !== "—" ? getAuditDate(t.id, "PROD_DEPLOYED") : null
        if (!dateVal) return false
        const taskDateStr = typeof dateVal === "string" && dateVal.length === 10 ? dateVal : new Date(dateVal as string).toISOString().split('T')[0]
        if (exportStartDate && taskDateStr < exportStartDate) return false
        if (exportEndDate && taskDateStr > exportEndDate) return false
      }
      // Priority filter
      if (exportPriority !== "all" && t.priority !== exportPriority) return false
      // Status filter
      if (exportStatus !== "all" && t.status !== exportStatus) return false
      // Category filter
      if (exportCategory !== "all" && (t.type?.name || "CR") !== exportCategory) return false
      // Developer filter
      if (exportDev !== "all" && (t.assignedDeveloper?.fullName || "Unassigned") !== exportDev) return false
      // Bugs filter
      if (exportHasBugs !== "all") {
        const taskBugCount = bugs.filter(b => b.crTaskId === t.id).length
        if (exportHasBugs === "yes" && taskBugCount === 0) return false
        if (exportHasBugs === "no" && taskBugCount > 0) return false
      }
      return true
    })

    if (filteredExport.length === 0) {
      addToast("No data found for the selected date range", "error")
      return
    }

    const headers = [
      "CR Number", "Title", "Description", "Category", "Priority", "Workflow State", 
      "Assigned Dev", "Created By", "Created Date", "SIT Deploy Date", "SIT Completed Date", 
      "Code Review Date", "UAT Deploy Date", "Testing Completed Date", "Bugs", 
      "Bug Raised Date", "Bug Resolved Date", "UAT Completed Date", "Prod Deploy Date", "Efforts (Days)"
    ]
    const rows = filteredExport.map(t => {
      const taskBugs = bugs.filter(b => b.crTaskId === t.id)
      const bugCount = taskBugs.length > 0 ? `Yes (${taskBugs.length})` : "None"
      const bugRaised = taskBugs.map(b => b.createdDate ? new Date(b.createdDate).toISOString().split('T')[0] : "—").join("; ") || "—"
      const bugResolved = taskBugs.map(b => getBugResolveDate(b.id)).filter(d => d !== "—").join("; ") || "—"

      return [
        t.jtrackId,
        t.title,
        t.description,
        t.type?.name || "CR",
        t.priority,
        t.status,
        t.assignedDeveloper?.fullName || "Unassigned",
        t.createdBy.fullName,
        t.createdDate ? new Date(t.createdDate).toISOString().split('T')[0] : "NA",
        getAuditDate(t.id, "SIT_DEPLOYED"),
        getAuditDate(t.id, "SIT_COMPLETED"),
        getAuditDate(t.id, "CODE_REVIEW"),
        getAuditDate(t.id, "MOVE_TO_UAT"),
        getAuditDate(t.id, "UAT_COMPLETED"),
        bugCount,
        bugRaised,
        bugResolved,
        getAuditDate(t.id, "UAT_COMPLETED"),
        getAuditDate(t.id, "PROD_DEPLOYED"),
        t.efforts
      ]
    })
    
    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n")

    try {
      const base64Data = "data:text/csv;base64," + btoa(unescape(encodeURIComponent(csvContent)))
      setDownloadTarget({
        base64Data,
        defaultFileName: `DevTracker_CR_Export_${new Date().toISOString().split('T')[0]}.csv`
      })
      setIsExportOpen(false)
    } catch (err: any) {
      addToast("Export failed: " + err.message, "error")
    }
  }




  const filteredTasks = tasks.filter(t => {
    const s = (search || searchQuery).toLowerCase()
    const matchesSearch = t.title.toLowerCase().includes(s) || 
                          t.jtrackId.toLowerCase().includes(s) ||
                          t.description.toLowerCase().includes(s)
    const matchesCategory = filterCategory === "all" || (t.type?.name || "CR") === filterCategory
    const matchesPriority = colFilterPriority === "all" || t.priority === colFilterPriority
    const matchesStatus = colFilterStatus === "all" || t.status === colFilterStatus
    const matchesDev = colFilterDev === "all" || (t.assignedDeveloper?.fullName || "Unassigned") === colFilterDev
    const matchesTester = colFilterTester === "all" || (t.tester?.fullName || "Unassigned") === colFilterTester
    const taskBugCount = bugs.filter(b => b.crTaskId === t.id).length
    const matchesHasBugs = colFilterHasBugs === "all" || (colFilterHasBugs === "yes" ? taskBugCount > 0 : taskBugCount === 0)



    return matchesSearch && matchesCategory && matchesPriority && matchesStatus && matchesDev && matchesTester && matchesHasBugs
  })

  // Unique values for column filter dropdowns
  const allDevNames = Array.from(new Set(tasks.map(t => t.assignedDeveloper?.fullName || "Unassigned"))).sort()
  const allTesterNames = Array.from(new Set(tasks.map(t => t.tester?.fullName || "Unassigned"))).sort()
  const allStatuses = Array.from(new Set(tasks.map(t => t.status))).sort()
  const allDevNamesForExport = Array.from(new Set(tasks.map(t => t.assignedDeveloper?.fullName || "Unassigned"))).sort()

  const activeFilterCount = [colFilterPriority, colFilterStatus, colFilterDev, colFilterTester, colFilterHasBugs].filter(f => f !== "all").length + 
    (filterCategory !== "all" ? 1 : 0)

  const clearAllColFilters = () => {
    setColFilterPriority("all")
    setColFilterStatus("all")
    setColFilterDev("all")
    setColFilterTester("all")
    setColFilterHasBugs("all")
    setFilterCategory("all")
  }

  const sortedTasks = [...filteredTasks].sort((a: any, b: any) => {
    if (sortColumn === "jtrackId") {
      // Natural numeric sort: extract the numeric part after any prefix (e.g. "CR-18" → 18)
      const numA = parseInt((a.jtrackId || "").replace(/^[^\d]*/, ""), 10)
      const numB = parseInt((b.jtrackId || "").replace(/^[^\d]*/, ""), 10)
      const nA = isNaN(numA) ? 0 : numA
      const nB = isNaN(numB) ? 0 : numB
      return sortDirection === "asc" ? nA - nB : nB - nA
    }

    let valA = ""
    let valB = ""

    if (sortColumn === "title") {
      valA = a.title || ""
      valB = b.title || ""
    } else if (sortColumn === "category") {
      valA = a.type?.name || ""
      valB = b.type?.name || ""
    } else if (sortColumn === "priority") {
      const priorityMap = { "High": 3, "Medium": 2, "Low": 1 }
      const pA = priorityMap[a.priority as keyof typeof priorityMap] || 0
      const pB = priorityMap[b.priority as keyof typeof priorityMap] || 0
      return sortDirection === "asc" ? pA - pB : pB - pA
    } else if (sortColumn === "status") {
      valA = a.status || ""
      valB = b.status || ""
    } else if (sortColumn === "createdDate") {
      valA = a.createdDate || ""
      valB = b.createdDate || ""
    } else if (sortColumn === "assignedDev") {
      valA = a.assignedDeveloper?.fullName || ""
      valB = b.assignedDeveloper?.fullName || ""
    } else if (sortColumn === "efforts") {
      const effA = a.efforts || 0
      const effB = b.efforts || 0
      return sortDirection === "asc" ? effA - effB : effB - effA
    }

    return sortDirection === "asc"
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA))
  })

  // Paginate sorted tasks
  const pagedTasks = paginate(sortedTasks, crPage, crPageSize)

  const activeLogs = selectedTask ? auditLogs.filter(l => l.entityType === "TASK" && l.entityId === selectedTask.id) : []
  const relatedBugs = selectedTask ? bugs.filter(b => b.crTaskId === selectedTask.id) : []
  const isTester = user?.roles?.some(r => r === "TESTER" || r === "TESTADMIN")
  const isAdmin = user?.roles?.some(r => r === "DEVADMIN" || r === "TESTADMIN")

  const handleReassign = () => {
    if (!newTesterUsername) {
      addToast("Please select a new tester.", "error")
      return
    }
    if (!reassignReason.trim()) {
      addToast("Reassignment reason is mandatory.", "error")
      return
    }
    reassignTester(selectedTask!.id, newTesterUsername, reassignReason)
      .then((updated) => {
        setSelectedTask(updated)
        setNewTesterUsername("")
        setReassignReason("")
        addToast("Tester reassigned successfully!", "success")
      })
      .catch((err: any) => {
        addToast(err?.message || "Failed to reassign tester", "error")
      })
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 120, damping: 14 } }
  }

  return (
    <div className="flex h-full space-x-6 relative max-w-7xl mx-auto pb-12 text-slate-100">
      {/* Left side: CR list */}
      <div className="flex-1 space-y-5 overflow-y-auto pr-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-amber-400 via-emerald-200 to-teal-400 bg-clip-text text-transparent">
              CR Management
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Log Change Requests, define code review targets, and manage developer pools in a unified environment.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {(user?.roles?.includes("DEVADMIN") || user?.roles?.includes("CODEREVIEWER")) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExportOpen(true)}
                className="border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-slate-200 transition-all rounded-xl"
              >
                <Download className="mr-1.5 h-4 w-4 text-emerald-400" />
                Export CR Data
              </Button>
            )}
            <Button
              variant="glow"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="rounded-xl shadow-lg shadow-emerald-500/20 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-500/30 text-white"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Create Task
            </Button>
          </div>
        </div>

        {/* Filters and search */}
        <div className="space-y-2 border border-white/[0.06] bg-white/[0.03] backdrop-blur-md rounded-2xl p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search CR numbers, titles, descriptions..."
                className="h-10 w-full bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 rounded-xl pl-10 pr-3 text-sm text-foreground focus:outline-none transition-all placeholder:text-slate-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2.5 text-xs text-slate-400 font-semibold shrink-0">
              <Filter className="h-4 w-4 text-emerald-400" />
              <span>Category:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-10 bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none transition-all cursor-pointer font-medium"
              >
                <option value="all" className="bg-[#0b0e1a] text-slate-200">All Categories</option>
                <option value="CR" className="bg-[#0b0e1a] text-slate-200">Change Request (CR)</option>
                <option value="NEW_REQ" className="bg-[#0b0e1a] text-slate-200">Requirement (NEW_REQ)</option>
                <option value="FIX" className="bg-[#0b0e1a] text-slate-200">Bug Fix (FIX)</option>
                <option value="SR" className="bg-[#0b0e1a] text-slate-200">Service Request (SR)</option>
              </select>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllColFilters}
                className="shrink-0 h-10 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Clear ({activeFilterCount})
              </button>
            )}
          </div>



          {/* Active Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {filterCategory !== "all" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                  Category: {filterCategory}
                  <button onClick={() => setFilterCategory("all")} className="hover:text-white"><X className="h-2.5 w-2.5" /></button>
                </span>
              )}
              {colFilterPriority !== "all" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                  Priority: {colFilterPriority}
                  <button onClick={() => setColFilterPriority("all")} className="hover:text-white"><X className="h-2.5 w-2.5" /></button>
                </span>
              )}
              {colFilterStatus !== "all" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-400 text-[10px] font-bold">
                  Status: {colFilterStatus.replace(/_/g, " ")}
                  <button onClick={() => setColFilterStatus("all")} className="hover:text-white"><X className="h-2.5 w-2.5" /></button>
                </span>
              )}
              {colFilterDev !== "all" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-400 text-[10px] font-bold">
                  Dev: {colFilterDev}
                  <button onClick={() => setColFilterDev("all")} className="hover:text-white"><X className="h-2.5 w-2.5" /></button>
                </span>
              )}
              {colFilterTester !== "all" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold">
                  Tester: {colFilterTester}
                  <button onClick={() => setColFilterTester("all")} className="hover:text-white"><X className="h-2.5 w-2.5" /></button>
                </span>
              )}
              {colFilterHasBugs !== "all" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-bold">
                  Bugs: {colFilterHasBugs === "yes" ? "Has Bugs" : "No Bugs"}
                  <button onClick={() => setColFilterHasBugs("all")} className="hover:text-white"><X className="h-2.5 w-2.5" /></button>
                </span>
              )}
              <span className="text-[10px] text-slate-500 self-center">{filteredTasks.length} of {tasks.length} CRs</span>
            </div>
          )}
        </div>

        {/* Glass Card Table Container */}
        <div className="border border-white/[0.06] bg-white/[0.02] backdrop-blur-md rounded-2xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.04] text-slate-300 font-semibold">
                  <th className="p-4 cursor-pointer hover:bg-white/[0.05] select-none transition-colors sticky left-0 bg-[#060814] z-20 min-w-[125px] border-r border-white/[0.06]" onClick={() => handleSort("jtrackId")}>
                    <div className="flex items-center space-x-1.5 justify-start">
                      <span>CR Number</span>
                      {sortColumn === "jtrackId" && (
                        sortDirection === "asc" ? <ChevronUp className="h-4 w-4 text-emerald-400" /> : <ChevronDown className="h-4 w-4 text-emerald-400" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-white/[0.05] select-none transition-colors" onClick={() => handleSort("title")}>
                    <div className="flex items-center space-x-1.5 justify-start">
                      <span>Title</span>
                      {sortColumn === "title" && (
                        sortDirection === "asc" ? <ChevronUp className="h-4 w-4 text-emerald-400" /> : <ChevronDown className="h-4 w-4 text-emerald-400" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-white/[0.05] select-none transition-colors" onClick={() => handleSort("category")}>
                    <div className="flex items-center space-x-1.5 justify-start">
                      <span>Category</span>
                      {sortColumn === "category" && (
                        sortDirection === "asc" ? <ChevronUp className="h-4 w-4 text-emerald-400" /> : <ChevronDown className="h-4 w-4 text-emerald-400" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 select-none transition-colors relative" style={{ minWidth: 110 }}>
                    <div className="flex items-center justify-between gap-1">
                      <button className="flex items-center space-x-1.5" onClick={() => handleSort("priority")}>
                        <span>Priority</span>
                        {sortColumn === "priority" && (sortDirection === "asc" ? <ChevronUp className="h-4 w-4 text-emerald-400" /> : <ChevronDown className="h-4 w-4 text-emerald-400" />)}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveColFilter(activeColFilter === "priority" ? null : "priority") }}
                        className={`p-0.5 rounded transition-colors ${colFilterPriority !== "all" ? "text-amber-400" : "text-slate-500 hover:text-slate-300"}`}
                        title="Filter Priority"
                      >
                        <Filter className="h-3 w-3" />
                      </button>
                    </div>
                    {activeColFilter === "priority" && (
                      <div className="absolute top-full left-0 z-50 mt-1 w-40 bg-[#0d1117] border border-white/[0.12] rounded-xl shadow-2xl overflow-hidden">
                        {["all", "High", "Medium", "Low"].map(v => (
                          <button key={v} onClick={() => { setColFilterPriority(v); setActiveColFilter(null) }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-white/[0.05] transition-colors ${colFilterPriority === v ? "text-amber-400 font-bold bg-amber-500/10" : "text-slate-300"}`}>
                            {v === "all" ? "All Priorities" : v}
                          </button>
                        ))}
                      </div>
                    )}
                  </th>
                  <th className="p-4 select-none transition-colors relative" style={{ minWidth: 160 }}>
                    <div className="flex items-center justify-between gap-1">
                      <button className="flex items-center space-x-1.5" onClick={() => handleSort("status")}>
                        <span>Workflow State</span>
                        {sortColumn === "status" && (sortDirection === "asc" ? <ChevronUp className="h-4 w-4 text-emerald-400" /> : <ChevronDown className="h-4 w-4 text-emerald-400" />)}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveColFilter(activeColFilter === "status" ? null : "status") }}
                        className={`p-0.5 rounded transition-colors ${colFilterStatus !== "all" ? "text-sky-400" : "text-slate-500 hover:text-slate-300"}`}
                        title="Filter Status"
                      >
                        <Filter className="h-3 w-3" />
                      </button>
                    </div>
                    {activeColFilter === "status" && (
                      <div className="absolute top-full left-0 z-50 mt-1 w-52 bg-[#0d1117] border border-white/[0.12] rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
                        <button onClick={() => { setColFilterStatus("all"); setActiveColFilter(null) }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-white/[0.05] transition-colors ${colFilterStatus === "all" ? "text-sky-400 font-bold bg-sky-500/10" : "text-slate-300"}`}>
                          All Statuses
                        </button>
                        {allStatuses.map(v => (
                          <button key={v} onClick={() => { setColFilterStatus(v); setActiveColFilter(null) }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-white/[0.05] transition-colors ${colFilterStatus === v ? "text-sky-400 font-bold bg-sky-500/10" : "text-slate-300"}`}>
                            {v.replace(/_/g, " ")}
                          </button>
                        ))}
                      </div>
                    )}
                  </th>
                  <th className="p-4 cursor-pointer hover:bg-white/[0.05] select-none transition-colors" onClick={() => handleSort("createdDate")}>
                    <div className="flex items-center space-x-1.5 justify-start">
                      <span>Created Date</span>
                      {sortColumn === "createdDate" && (
                        sortDirection === "asc" ? <ChevronUp className="h-4 w-4 text-emerald-400" /> : <ChevronDown className="h-4 w-4 text-emerald-400" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 select-none whitespace-nowrap text-slate-400 font-bold uppercase tracking-wider text-[10px]">SIT Deploy Date</th>
                  <th className="p-4 select-none whitespace-nowrap text-slate-400 font-bold uppercase tracking-wider text-[10px]">SIT Completed Date</th>
                  <th className="p-4 select-none whitespace-nowrap text-slate-400 font-bold uppercase tracking-wider text-[10px]">Code Review Date</th>
                  <th className="p-4 select-none whitespace-nowrap text-slate-400 font-bold uppercase tracking-wider text-[10px]">UAT Deploy Date</th>
                  <th className="p-4 select-none whitespace-nowrap text-slate-400 font-bold uppercase tracking-wider text-[10px]">Testing Completed</th>
                  <th className="p-4 select-none transition-colors relative" style={{ minWidth: 100 }}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Bugs</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveColFilter(activeColFilter === "hasBugs" ? null : "hasBugs") }}
                        className={`p-0.5 rounded transition-colors ${colFilterHasBugs !== "all" ? "text-rose-400" : "text-slate-500 hover:text-slate-300"}`}
                        title="Filter by Bugs"
                      >
                        <Filter className="h-3 w-3" />
                      </button>
                    </div>
                    {activeColFilter === "hasBugs" && (
                      <div className="absolute top-full left-0 z-50 mt-1 w-40 bg-[#0d1117] border border-white/[0.12] rounded-xl shadow-2xl overflow-hidden">
                        {[{ v: "all", label: "All" }, { v: "yes", label: "Has Bugs" }, { v: "no", label: "No Bugs" }].map(({ v, label }) => (
                          <button key={v} onClick={() => { setColFilterHasBugs(v); setActiveColFilter(null) }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-white/[0.05] transition-colors ${colFilterHasBugs === v ? "text-rose-400 font-bold bg-rose-500/10" : "text-slate-300"}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </th>
                  <th className="p-4 select-none whitespace-nowrap text-slate-400 font-bold uppercase tracking-wider text-[10px]">Bug Raised Date</th>
                  <th className="p-4 select-none whitespace-nowrap text-slate-400 font-bold uppercase tracking-wider text-[10px]">Bug Resolved Date</th>
                  <th className="p-4 select-none whitespace-nowrap text-slate-400 font-bold uppercase tracking-wider text-[10px]">UAT Completed</th>
                  <th className="p-4 select-none whitespace-nowrap text-slate-400 font-bold uppercase tracking-wider text-[10px]">Prod Deploy Date</th>
                  <th className="p-4 select-none transition-colors relative" style={{ minWidth: 160 }}>
                    <div className="flex items-center justify-between gap-1">
                      <button className="flex items-center space-x-1.5" onClick={() => handleSort("assignedDev")}>
                        <span>Assigned Developer</span>
                        {sortColumn === "assignedDev" && (sortDirection === "asc" ? <ChevronUp className="h-4 w-4 text-emerald-400" /> : <ChevronDown className="h-4 w-4 text-emerald-400" />)}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveColFilter(activeColFilter === "dev" ? null : "dev") }}
                        className={`p-0.5 rounded transition-colors ${colFilterDev !== "all" ? "text-violet-400" : "text-slate-500 hover:text-slate-300"}`}
                        title="Filter Developer"
                      >
                        <Filter className="h-3 w-3" />
                      </button>
                    </div>
                    {activeColFilter === "dev" && (
                      <div className="absolute top-full right-0 z-50 mt-1 w-52 bg-[#0d1117] border border-white/[0.12] rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
                        <button onClick={() => { setColFilterDev("all"); setActiveColFilter(null) }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-white/[0.05] transition-colors ${colFilterDev === "all" ? "text-violet-400 font-bold bg-violet-500/10" : "text-slate-300"}`}>
                          All Developers
                        </button>
                        {allDevNames.map(v => (
                          <button key={v} onClick={() => { setColFilterDev(v); setActiveColFilter(null) }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-white/[0.05] transition-colors ${colFilterDev === v ? "text-violet-400 font-bold bg-violet-500/10" : "text-slate-300"}`}>
                            {v}
                          </button>
                        ))}
                      </div>
                    )}
                  </th>
                  <th className="p-4 select-none transition-colors relative" style={{ minWidth: 150 }}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Assigned Tester</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveColFilter(activeColFilter === "tester" ? null : "tester") }}
                        className={`p-0.5 rounded transition-colors ${colFilterTester !== "all" ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"}`}
                        title="Filter Tester"
                      >
                        <Filter className="h-3 w-3" />
                      </button>
                    </div>
                    {activeColFilter === "tester" && (
                      <div className="absolute top-full right-0 z-50 mt-1 w-52 bg-[#0d1117] border border-white/[0.12] rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
                        <button onClick={() => { setColFilterTester("all"); setActiveColFilter(null) }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-white/[0.05] transition-colors ${colFilterTester === "all" ? "text-cyan-400 font-bold bg-cyan-500/10" : "text-slate-300"}`}>
                          All Testers
                        </button>
                        {allTesterNames.map(v => (
                          <button key={v} onClick={() => { setColFilterTester(v); setActiveColFilter(null) }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-white/[0.05] transition-colors ${colFilterTester === v ? "text-cyan-400 font-bold bg-cyan-500/10" : "text-slate-300"}`}>
                            {v}
                          </button>
                        ))}
                      </div>
                    )}
                  </th>
                  <th className="p-4 text-right cursor-pointer hover:bg-white/[0.05] select-none transition-colors" onClick={() => handleSort("efforts")}>
                    <div className="flex items-center space-x-1.5 justify-end">
                      <span>Efforts (Days)</span>
                      {sortColumn === "efforts" && (
                        sortDirection === "asc" ? <ChevronUp className="h-4 w-4 text-emerald-400" /> : <ChevronDown className="h-4 w-4 text-emerald-400" />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <motion.tbody
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="divide-y divide-white/[0.04]"
              >
                {sortedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="p-10 text-center text-slate-400 font-medium">
                      No Change Requests match the query.
                    </td>
                  </tr>
                ) : (
                  pagedTasks.map((task) => {
                    const isSelected = selectedTask?.id === task.id
                    return (
                      <motion.tr
                        key={task.id}
                        variants={itemVariants}
                        onClick={() => setSelectedTask(task)}
                        className={`hover:bg-white/[0.03] transition-all cursor-pointer relative group ${
                          isSelected ? "bg-emerald-500/10 hover:bg-emerald-500/12" : ""
                        }`}
                      >
                        <td className={`p-4 font-mono font-bold text-emerald-400 group-hover:text-emerald-300 sticky left-0 z-10 border-r border-white/[0.06] ${
                          isSelected ? "bg-[#0f1b15]" : "bg-[#060814] group-hover:bg-[#111e18]"
                        }`}>
                          <div className="flex items-center gap-2">
                            <span>{task.jtrackId}</span>
                            <QualityRiskBadge taskId={task.id} isQualityRisk={(task as any).isQualityRisk} />
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-slate-200">
                          {task.title}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-slate-300 text-[10px] font-bold tracking-wider">
                            {task.type?.name || "CR"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wider ${
                            task.priority === "High" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                            task.priority === "Medium" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                          }`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="p-4">
                          {(() => {
                            const latestReject = auditLogs
                              .filter(l => l.entityType === "TASK" && l.entityId === task.id && l.fieldName === "workflow_reject")
                              .sort((a: any, b: any) => new Date(b.changedDate || 0).getTime() - new Date(a.changedDate || 0).getTime())[0]
                            return (
                              <div className="flex flex-wrap gap-1.5 items-center">
                                 {!(task.status === "CHANGES_REQUESTED" && latestReject) && (
                                   <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider ${
                                    task.status === "OPEN" ? "bg-slate-500/10 text-slate-400 border border-slate-500/20" :
                                    task.status === "IN_PROGRESS" ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" :
                                    task.status === "CHANGES_REQUESTED" ? "bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]" :
                                    task.status === "SIT_DEPLOYED" ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]" :
                                    task.status === "SIT_TESTING" ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" :
                                    task.status === "SIT_COMPLETED" ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" :
                                    task.status === "CODE_REVIEW" ? "bg-purple-500/15 text-purple-300 border border-purple-500/30" :
                                    task.status === "CODE_REVIEW_DONE" ? "bg-pink-500/15 text-pink-300 border border-pink-500/30" :
                                    task.status === "MOVE_TO_UAT" ? "bg-teal-500/15 text-teal-300 border border-teal-500/30" :
                                    task.status === "TESTING_POOL" ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" :
                                    task.status === "TESTING_IN_PROGRESS" ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30" :
                                    task.status === "TESTING_COMPLETED" ? "bg-emerald-600/15 text-emerald-300 border border-emerald-600/30" :
                                    task.status === "UAT_TESTING" ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30" :
                                    task.status === "UAT_COMPLETED" ? "bg-emerald-600/15 text-emerald-300 border border-emerald-600/30" :
                                    task.status === "PROD_DEPLOYED" ? "bg-rose-500/15 text-rose-300 border border-rose-500/30" :
                                    task.status === "BUG_FOUND" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                                    "bg-zinc-600/10 text-zinc-400 border border-zinc-600/20"
                                  }`}>
                                    {task.status === "BUG_FOUND" ? "OPEN" : task.status.replace(/_/g, " ")}
                                  </span>
                                 )}
                                {latestReject && (task.status === "IN_PROGRESS" || task.status === "CHANGES_REQUESTED") && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-bold tracking-wider animate-pulse">
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    Change Requested
                                  </span>
                                )}
                              </div>
                            )
                          })()}
                        </td>
                        <td className="p-4 font-mono text-slate-400">
                          {task.createdDate ? new Date(task.createdDate).toISOString().split('T')[0] : "NA"}
                        </td>
                        <td className="p-4 font-semibold text-slate-300 whitespace-nowrap">
                          {(() => {
                            const d = getAuditDate(task.id, "SIT_DEPLOYED")
                            return d !== "—" ? d : ""
                          })()}
                        </td>
                        <td className="p-4 font-semibold text-slate-300 whitespace-nowrap">
                          {(() => {
                            const d = getAuditDate(task.id, "SIT_COMPLETED")
                            return d !== "—" ? d : ""
                          })()}
                        </td>
                        <td className="p-4 font-semibold text-slate-300 whitespace-nowrap">
                          {(() => {
                            const d = getAuditDate(task.id, "CODE_REVIEW")
                            return d !== "—" ? d : ""
                          })()}
                        </td>
                        <td className="p-4 font-semibold text-slate-300 whitespace-nowrap">
                          {(() => {
                            const d = getAuditDate(task.id, "MOVE_TO_UAT")
                            return d !== "—" ? d : ""
                          })()}
                        </td>
                        <td className="p-4 font-semibold text-slate-300 whitespace-nowrap">
                          {(() => {
                            const rawD = task.testingCompletedDate ? new Date(task.testingCompletedDate).toISOString().split('T')[0] : getAuditDate(task.id, "TESTING_COMPLETED")
                            return rawD !== "—" ? rawD : ""
                          })()}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          {(() => {
                            const taskBugs = bugs.filter(b => b.crTaskId === task.id)
                            return taskBugs.length > 0 ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedTaskForBugs(task)
                                }}
                                className="px-2.5 py-0.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 text-[10px] font-bold transition-all cursor-pointer"
                              >
                                Yes ({taskBugs.length})
                              </button>
                            ) : (
                              <span className="text-slate-500 italic text-[10px]">None</span>
                            )
                          })()}
                        </td>
                        <td className="p-4 font-semibold text-slate-300 whitespace-nowrap">
                          {(() => {
                            const taskBugs = bugs.filter(b => b.crTaskId === task.id)
                            return taskBugs.map(b => b.createdDate ? new Date(b.createdDate).toISOString().split('T')[0] : "").filter(Boolean).join(", ")
                          })()}
                        </td>
                        <td className="p-4 font-semibold text-slate-300 whitespace-nowrap">
                          {(() => {
                            const taskBugs = bugs.filter(b => b.crTaskId === task.id)
                            return taskBugs.map(b => getBugResolveDate(b.id)).filter(d => d !== "—").join(", ")
                          })()}
                        </td>
                        <td className="p-4 font-semibold text-slate-300 whitespace-nowrap">
                          {(() => {
                            const rawD = task.testingCompletedDate ? new Date(task.testingCompletedDate).toISOString().split('T')[0] : getAuditDate(task.id, "TESTING_COMPLETED")
                            return rawD !== "—" ? rawD : ""
                          })()}
                        </td>
                        <td className="p-4 font-semibold text-slate-300 whitespace-nowrap">
                          {(() => {
                            const d = getAuditDate(task.id, "PROD_DEPLOYED")
                            return d !== "—" ? d : ""
                          })()}
                        </td>
                        <td className="p-4 font-semibold text-slate-300">
                          {task.assignedDeveloper ? task.assignedDeveloper.fullName : <span className="text-slate-500 text-[10px] italic">Unassigned</span>}
                        </td>
                        <td className="p-4 font-semibold">
                          {task.tester
                            ? <span className="flex items-center gap-1.5">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                                <span className="text-cyan-300">{task.tester.fullName}</span>
                              </span>
                            : <span className="text-slate-500 text-[10px] italic">Unassigned</span>
                          }
                        </td>
                        <td className="p-4 text-right font-bold font-mono text-slate-300">
                          {task.efforts}d
                        </td>
                      </motion.tr>
                    )
                  })
                )}
              </motion.tbody>
            </table>
          </div>
        </div>

        {/* CR Table Pagination */}
        <Pagination
          currentPage={crPage}
          totalItems={sortedTasks.length}
          pageSize={crPageSize}
          onPageChange={(p) => { setCrPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          onPageSizeChange={(s) => { setCrPageSize(s); setCrPage(0) }}
          pageSizeOptions={[10, 25, 50, 100]}
          className="border border-white/[0.06] bg-white/[0.02] rounded-2xl backdrop-blur-md -mt-1"
        />

        {/* ─── Challenged Bug Reviews ─────────────────────────────── */}
        {(() => {
          const challengedReviews = (bugReviews || []).filter(r => ["CHALLENGED", "BUG_REVIEW_PENDING"].includes(r.status))
          if (challengedReviews.length === 0) return null
          return (
            <div className="space-y-3 mt-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-black tracking-wider animate-pulse">
                  <BugIcon className="h-3 w-3" />
                  Challenged Bug Reviews (Pending Admin Decision)
                </span>
                <span className="text-[10px] text-slate-500">({challengedReviews.length})</span>
              </div>
              <div className="border border-amber-500/20 bg-amber-500/[0.03] backdrop-blur-md rounded-2xl shadow-[inset_0_0_0_1px_rgba(245,158,11,0.08)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-amber-500/15 bg-amber-500/[0.04] text-slate-400 font-semibold">
                        <th className="p-3 min-w-[120px]">CR Number</th>
                        <th className="p-3">Title</th>
                        <th className="p-3">Proposed Status</th>
                        <th className="p-3">Raised By</th>
                        <th className="p-3">Rejection Reason</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-500/[0.08]">
                      {challengedReviews.map(review => {
                        return (
                          <tr
                            key={review.id}
                            className="hover:bg-amber-500/[0.05] transition-all"
                          >
                            <td className="p-3 font-mono font-bold text-amber-400">{review.crJtrackId || "CR"}</td>
                            <td className="p-3 font-semibold text-slate-200">
                              <div>{review.title}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{review.description}</div>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold uppercase tracking-wider">
                                {review.status}
                              </span>
                            </td>
                            <td className="p-3 text-slate-300 font-semibold">
                              {review.raisedBy?.fullName || "—"}
                            </td>
                            <td className="p-3 text-slate-300">
                              <div className="font-semibold text-rose-400">{review.rejectionReason}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5 italic">"{review.justification}"</div>
                            </td>
                            <td className="p-3 font-medium">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-8 rounded-lg px-2.5 text-[10px]"
                                  onClick={() => {
                                    adminForceAccept(review.id)
                                      .then(() => {
                                        addToast("Bug review accepted and forced. Bug created successfully!", "success");
                                        fetchData();
                                      })
                                      .catch(err => addToast(err?.message || "Failed to force accept", "error"));
                                  }}
                                >
                                  Force Bug
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold h-8 rounded-lg px-2.5 text-[10px]"
                                  onClick={() => {
                                    adminAcceptRejection(review.id)
                                      .then(() => {
                                        addToast("Developer decision accepted. Bug review closed.", "info");
                                        fetchData();
                                      })
                                      .catch(err => addToast(err?.message || "Failed to accept decision", "error"));
                                  }}
                                >
                                  Accept Explanation
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Right side: Detail Drawer */}
      {/* Detail Drawer Popup Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            {/* Modal Backdrop Click Handler */}
            <div className="absolute inset-0 cursor-pointer" onClick={() => setSelectedTask(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-5 overflow-y-auto max-h-[90vh] text-foreground"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border pb-3.5">
                <div>
                  <span className="font-mono text-xs font-bold text-primary tracking-widest">{selectedTask.jtrackId}</span>
                  <h3 className="font-black text-foreground text-sm tracking-tight truncate max-w-[200px] mt-0.5">{selectedTask.title}</h3>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-xl"
                  onClick={() => setSelectedTask(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Admin Feedback / Change Requested Banner */}
              {(() => {
                const rejectLog = auditLogs
                  .filter(l => l.entityType === "TASK" && l.entityId === selectedTask.id && l.fieldName === "workflow_reject")
                  .sort((a: any, b: any) => new Date(b.changedDate || 0).getTime() - new Date(a.changedDate || 0).getTime())[0]

                const reviewerName = typeof rejectLog?.changedBy === 'object' && rejectLog?.changedBy?.fullName 
                  ? rejectLog.changedBy.fullName 
                  : (typeof rejectLog?.changedBy === 'string' ? rejectLog.changedBy : (selectedTask.codeReviewer?.fullName || 'Code Reviewer'));

                const displayRemarks = rejectLog?.remarks || selectedTask.remarks;

                return (rejectLog || selectedTask.status === "CHANGES_REQUESTED") && (selectedTask.status === "IN_PROGRESS" || selectedTask.status === "CHANGES_REQUESTED") ? (
                  <div className="rounded-2xl border-2 border-rose-500/40 bg-gradient-to-r from-rose-500/15 via-amber-500/10 to-rose-500/15 p-4 shadow-[0_0_25px_rgba(244,63,94,0.15)] space-y-2.5 text-left">
                    <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-wider text-rose-300">
                          Change Requested by {reviewerName}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-rose-200 bg-rose-500/20 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
                        Reviewer: {reviewerName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                        Reviewer Remarks:
                      </span>
                      <p className="text-sm font-semibold text-rose-100 bg-black/50 border border-rose-500/25 p-3.5 rounded-xl leading-relaxed whitespace-pre-wrap">
                        {displayRemarks || "Changes requested during code review. Please review and resubmit."}
                      </p>
                    </div>
                    <p className="text-[10px] text-rose-300/90 italic text-right">
                      Sent back by <strong className="text-rose-100 font-bold">{reviewerName}</strong>
                    </p>
                  </div>
                ) : null
              })()}

              {/* Description */}
              <div className="space-y-2 text-xs">
                <span className="text-muted-foreground block font-bold uppercase tracking-wider text-[10px]">Description</span>
                <p className="p-3.5 rounded-xl border border-border bg-muted/40 leading-relaxed text-[11px] text-foreground">
                  {selectedTask.description}
                </p>
              </div>

              {/* Unit Testing Document */}
              {selectedTask.unitTestDocUrl && (
                <div className="space-y-2 text-xs border-t border-border pt-4">
                  <span className="text-muted-foreground block font-bold uppercase tracking-wider text-[10px]">Unit Testing Document</span>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-muted/40">
                    {selectedTask.unitTestDocUrl.startsWith("data:image/") ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-border shrink-0 bg-background">
                        <img src={selectedTask.unitTestDocUrl} alt={selectedTask.unitTestDocName || "Unit Test"} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center border border-border bg-background text-lg shrink-0">
                        📄
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <span className="block truncate font-mono text-foreground text-[11px]">{selectedTask.unitTestDocName}</span>
                      <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider block mt-0.5">Unit Testing Document</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setDownloadTarget({ base64Data: selectedTask.unitTestDocUrl!, defaultFileName: selectedTask.unitTestDocName! })}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-sky-500 transition-colors"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Core Fields */}
              <div className="grid grid-cols-3 gap-3 text-[11px]">
                <div className="space-y-1 p-3 rounded-xl border border-border bg-muted/40">
                  <span className="text-muted-foreground block font-bold uppercase tracking-wider text-[9px]">Priority</span>
                  <span className="font-bold text-foreground">{selectedTask.priority}</span>
                </div>
                <div className="space-y-1 p-3 rounded-xl border border-border bg-muted/40">
                  <span className="text-muted-foreground block font-bold uppercase tracking-wider text-[9px]">Est efforts</span>
                  <span className="font-bold text-foreground">{selectedTask.efforts} days</span>
                </div>
                <div className="space-y-1 p-3 rounded-xl border border-border bg-muted/40">
                  <span className="text-muted-foreground block font-bold uppercase tracking-wider text-[9px]">Module</span>
                  <span className="font-bold text-foreground">{selectedTask.module || "Core"}</span>
                </div>
              </div>

              {/* Workflow Transition Dates — Event-Driven */}
              {(() => {
                const devStartDate = selectedTask.devStartDate || getAuditDate(selectedTask.id, "IN_PROGRESS")
                const sitDeployDate = getAuditDate(selectedTask.id, "SIT_DEPLOYED")
                const sitCompletedDate = getAuditDate(selectedTask.id, "SIT_COMPLETED")
                const codeReviewDate = getAuditDate(selectedTask.id, "CODE_REVIEW")
                const uatDeployDate = getAuditDate(selectedTask.id, "MOVE_TO_UAT")
                const testingCompletedDate = getAuditDate(selectedTask.id, "UAT_COMPLETED")
                const prodDeployDate = getAuditDate(selectedTask.id, "PROD_DEPLOYED")

                const hasDevStartDate = devStartDate && devStartDate !== "—"
                const hasSitDeployDate = sitDeployDate && sitDeployDate !== "—"
                const hasSitCompletedDate = sitCompletedDate && sitCompletedDate !== "—"
                const hasCodeReviewDate = codeReviewDate && codeReviewDate !== "—"
                const hasUatDeployDate = uatDeployDate && uatDeployDate !== "—"
                const hasTestingCompletedDate = testingCompletedDate && testingCompletedDate !== "—"
                const hasProdDeployDate = prodDeployDate && prodDeployDate !== "—"

                const hasAnyDate = hasDevStartDate || hasSitDeployDate || hasSitCompletedDate || hasCodeReviewDate || hasUatDeployDate || hasTestingCompletedDate || hasProdDeployDate

                if (!hasAnyDate) return null

                return (
                  <div className="space-y-3 border-t border-border pt-4 text-xs">
                    <span className="text-muted-foreground block font-bold uppercase tracking-wider text-[10px]">Workflow Dates</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-foreground">
                      {hasDevStartDate && (
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                          <span className="text-muted-foreground block">Dev Start</span>
                          <span className="font-bold text-foreground">{devStartDate}</span>
                        </div>
                      )}
                      {hasSitDeployDate && (
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                          <span className="text-muted-foreground block">SIT Deploy</span>
                          <span className="font-bold text-foreground">{sitDeployDate}</span>
                        </div>
                      )}
                      {hasSitCompletedDate && (
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                          <span className="text-muted-foreground block">SIT Completed</span>
                          <span className="font-bold text-foreground">{sitCompletedDate}</span>
                        </div>
                      )}
                      {hasCodeReviewDate && (
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                          <span className="text-muted-foreground block">Code Review</span>
                          <span className="font-bold text-foreground">{codeReviewDate}</span>
                        </div>
                      )}
                      {hasUatDeployDate && (
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                          <span className="text-muted-foreground block">UAT Deploy</span>
                          <span className="font-bold text-foreground">{uatDeployDate}</span>
                        </div>
                      )}
                      {hasTestingCompletedDate && (
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/40 col-span-2">
                          <span className="text-muted-foreground block">Testing Completed</span>
                          <span className="font-bold text-foreground">{testingCompletedDate}</span>
                        </div>
                      )}
                      {hasProdDeployDate && (
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                          <span className="text-muted-foreground block">Prod Deploy</span>
                          <span className="font-bold text-foreground">{prodDeployDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Testing Information — Event-Driven */}
              {(() => {
                const uatDeployDate = getAuditDate(selectedTask.id, "MOVE_TO_UAT")
                const hasUatDeployDate = uatDeployDate && uatDeployDate !== "—"
                const isUatOrLater = hasUatDeployDate || ["MOVE_TO_UAT", "UAT_TESTING", "BUG_FOUND", "UAT_COMPLETED", "PROD_DEPLOYED", "CLOSED"].includes(selectedTask.status)

                if (!isUatOrLater) return null

                const hasTester = !!selectedTask.tester
                const hasTestingStart = !!selectedTask.testingStartedDate
                const hasTestingEnd = !!selectedTask.testingCompletedDate
                const hasDuration = !!selectedTask.testingDuration
                const bugsRaisedCount = bugs.filter(b => b.crTaskId === selectedTask.id).length
                const hasReassignment = !!selectedTask.previousTester
                const hasRemarks = !!selectedTask.testingComments

                const hasAnyTestingInfo = hasTester || hasTestingStart || hasTestingEnd || hasDuration || bugsRaisedCount > 0 || hasReassignment || hasRemarks
                if (!hasAnyTestingInfo) return null

                return (
                  <div className="space-y-3 border-t border-border pt-4 text-xs">
                    <span className="text-muted-foreground block font-bold uppercase tracking-wider text-[10px]">Testing Information</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-foreground">
                      {hasTester && (
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/40 col-span-2 flex justify-between items-center">
                          <span className="text-muted-foreground">Assigned Tester:</span>
                          <span className="font-bold text-violet-600 dark:text-violet-400">{selectedTask.tester!.fullName}</span>
                        </div>
                      )}
                      {hasTestingStart && (
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                          <span className="text-muted-foreground block">Testing Start</span>
                          <span className="font-bold text-foreground">
                            {new Date(selectedTask.testingStartedDate!).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {hasTestingEnd && (
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                          <span className="text-muted-foreground block">Testing End</span>
                          <span className="font-bold text-foreground">
                            {new Date(selectedTask.testingCompletedDate!).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {hasDuration && (
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                          <span className="text-muted-foreground block">Duration</span>
                          <span className="font-bold text-foreground">
                            {selectedTask.testingDuration?.replace(/-/g, "")}
                          </span>
                        </div>
                      )}
                      {bugsRaisedCount > 0 && (
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                          <span className="text-muted-foreground block">Bugs Raised</span>
                          <span className="font-bold text-rose-500">{bugsRaisedCount}</span>
                        </div>
                      )}
                      {hasReassignment && (
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/40 col-span-2 space-y-1">
                          <span className="text-muted-foreground block font-bold uppercase text-[8px] tracking-wider">Reassignment Audit</span>
                          <div className="flex justify-between text-[9px]">
                            <span className="text-muted-foreground">Previous Tester:</span>
                            <span className="text-foreground">{selectedTask.previousTester!.fullName}</span>
                          </div>
                          {selectedTask.reassignedBy && (
                            <div className="flex justify-between text-[9px]">
                              <span className="text-muted-foreground">Reassigned By:</span>
                              <span className="text-foreground">{selectedTask.reassignedBy.fullName}</span>
                            </div>
                          )}
                          {selectedTask.reassignmentDate && (
                            <div className="flex justify-between text-[9px]">
                              <span className="text-muted-foreground">Date:</span>
                              <span className="text-foreground">
                                {new Date(selectedTask.reassignmentDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {selectedTask.reassignmentReason && (
                            <div className="text-[9.5px] italic text-amber-600 dark:text-amber-300 bg-muted/40 p-1.5 rounded border border-border/40 mt-1 leading-relaxed">
                              "{selectedTask.reassignmentReason}"
                            </div>
                          )}
                        </div>
                      )}
                      {hasRemarks && (
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/40 col-span-2">
                          <span className="text-muted-foreground block">Tester Remarks</span>
                          <span className="text-foreground font-medium">{selectedTask.testingComments}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Admin Reassignment Form */}
              {isAdmin && (() => {
                const uatDeployDate = getAuditDate(selectedTask.id, "MOVE_TO_UAT")
                const hasUatDeployDate = uatDeployDate && uatDeployDate !== "—"
                const isUatOrLater = hasUatDeployDate || ["MOVE_TO_UAT", "UAT_TESTING", "BUG_FOUND", "UAT_COMPLETED", "PROD_DEPLOYED", "CLOSED"].includes(selectedTask.status)

                if (!isUatOrLater) return null

                return (
                  <div className="space-y-3.5 border-t border-border pt-4 text-xs">
                    <span className="text-muted-foreground block font-bold uppercase tracking-wider text-[10px]">Admin Reassign Tester</span>
                    <div className="space-y-2.5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Select Tester</label>
                        <select
                          value={newTesterUsername}
                          onChange={(e) => setNewTesterUsername(e.target.value)}
                          className="w-full h-9 bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/50 rounded-xl px-3 text-xs text-foreground outline-none cursor-pointer"
                        >
                          <option value="">-- Choose Tester --</option>
                          {users
                            .filter(u => u.roles?.some(r => r.includes("TESTER") || r.includes("TESTADMIN")))
                            .map(u => (
                              <option key={u.id} value={u.username}>{u.fullName}</option>
                            ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Reassignment Reason</label>
                        <input
                          placeholder="Mandatory reason for reassigning..."
                          value={reassignReason}
                          onChange={(e) => setReassignReason(e.target.value)}
                          className="w-full h-9 bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary/50 rounded-xl px-3 text-xs text-foreground outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      <Button
                        className="w-full text-xs h-8.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 border border-amber-500/30 text-white font-bold"
                        onClick={handleReassign}
                      >
                        Reassign Tester
                      </Button>
                    </div>
                  </div>
                )
              })()}

              {/* Pipeline History */}
              <div className="space-y-3.5 border-t border-border pt-4">
                <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">
                  Pipeline History
                </span>
                <div className="space-y-3 max-h-40 overflow-y-auto py-1 scrollbar-none pr-1">
                  {activeLogs.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground block italic text-center py-2">No audits recorded.</span>
                  ) : (
                    activeLogs.map((log) => (
                      <div key={log.id} className="flex space-x-2.5 items-start text-[10px]">
                        <div className="h-5 w-5 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 mt-0.5">
                          <History className="h-3 w-3 text-primary" />
                        </div>
                        <div className="flex-1 space-y-0.5 leading-relaxed text-foreground">
                          <span className="font-bold text-foreground">
                            {log.changedBy.fullName}
                          </span>{" "}
                          <span className="text-muted-foreground">changed</span>{" "}
                          <span className="font-bold text-primary">{log.fieldName}</span>{" "}
                          <span className="text-muted-foreground">from</span>{" "}
                          <span className="line-through text-rose-500/80">{log.oldValue}</span>{" "}
                          <span className="text-muted-foreground">to</span>{" "}
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{log.newValue}</span>
                          {log.remarks && (
                            <span className="block text-[9.5px] text-muted-foreground italic mt-1 bg-muted p-1.5 rounded-lg border border-border leading-normal">
                              "{log.remarks}"
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Raise Bug Button — Tester only */}
              {isTester && selectedTask && (
                <div className="border-t border-border pt-4">
                  {(() => {
                    const hasActiveBug = bugs.some(b => b.crTaskId === selectedTask.id && b.status !== "CLOSED")
                    const hasPendingReview = (bugReviews || []).some(r => r.crTaskId === selectedTask.id && ["PENDING_DEV_REVIEW", "CHALLENGED", "BUG_REVIEW_PENDING"].includes(r.status))
                    const isBugRaised = hasActiveBug || hasPendingReview

                    return isBugRaised ? (
                      <div className="w-full text-xs text-muted-foreground border border-border rounded-xl flex items-center gap-2 justify-center py-2 px-3 bg-muted/20 cursor-not-allowed select-none">
                        <BugIcon className="h-3.5 w-3.5" />
                        Bug Already Raised
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        className="w-full text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 justify-center cursor-pointer"
                        onClick={() => setIsRaiseBugOpen(true)}
                      >
                        <BugIcon className="h-3.5 w-3.5" />
                        Raise Bug Against This CR
                      </Button>
                    )
                  })()}
                </div>
              )}

              {/* Bugs Summary Section */}
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <BugIcon className="h-3 w-3 text-rose-500" />
                    Bugs Summary ({relatedBugs.length})
                  </span>
                </div>
                {relatedBugs.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic text-center py-2">No bugs have been raised against this CR.</p>
                ) : (
                  <div className="space-y-2">
                    {relatedBugs.map(bug => (
                      <div key={bug.id} className="p-3 rounded-xl border border-border bg-muted/40 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => setSelectedBugId(bug.id)}
                            className="font-mono text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {bug.jtrackId}
                          </button>
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ${
                            bug.status === 'OPEN' ? 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20' :
                            bug.status === 'RESOLVED' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                            bug.status === 'CLOSED' ? 'text-slate-500 dark:text-slate-400 bg-slate-500/10 border-slate-500/20' :
                            'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
                          }`}>{bug.status}</span>
                        </div>
                        <p className="text-[10px] text-foreground font-semibold truncate">{bug.title}</p>
                        <div className="flex justify-between text-[9px] text-muted-foreground">
                          <span>By {bug.raisedBy?.fullName || "—"}</span>
                          <span>{bug.createdDate ? new Date(bug.createdDate).toLocaleDateString() : "—"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Delete CR Section */}
              <div className="border-t border-border pt-4">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border border-rose-500/20 rounded-xl py-2.5 px-4 transition-all duration-200 group cursor-pointer"
                  onClick={() => { setDeleteModalTask(selectedTask); setDeleteRemarks("") }}
                >
                  <Trash2 className="h-3.5 w-3.5 group-hover:animate-pulse" />
                  Delete Change Request
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* Export Modal Sheet */}
      <AnimatePresence>
        {isExportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="bg-[#0b0e1a] border border-white/[0.08] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-xs text-slate-200 p-6 space-y-4 shadow-violet-500/5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <Download className="h-5 w-5 text-violet-400" />
                  <div>
                    <h3 className="text-sm font-black tracking-tight text-slate-100">Export Change Requests</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Apply filters to export a targeted dataset as CSV</p>
                  </div>
                </div>
                <button
                  className="p-1 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
                  onClick={() => setIsExportOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleExportData} className="space-y-4">
                {/* Date Filters */}
                <div className="space-y-3 p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">📅 Date Filter</p>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date Field</label>
                    <select
                      value={exportDateType}
                      onChange={(e) => setExportDateType(e.target.value as any)}
                      className="h-10 bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 rounded-xl px-2 w-full text-xs text-slate-200 outline-none"
                    >
                      <option value="created" className="bg-[#0b0e1a] text-slate-200">Created Date</option>
                      <option value="production" className="bg-[#0b0e1a] text-slate-200">Production Deployment Date</option>
                      <option value="sit_deploy" className="bg-[#0b0e1a] text-slate-200">SIT Deploy Date</option>
                      <option value="sit_completed" className="bg-[#0b0e1a] text-slate-200">SIT Completed Date</option>
                      <option value="code_review" className="bg-[#0b0e1a] text-slate-200">Code Review Date</option>
                      <option value="uat_deploy" className="bg-[#0b0e1a] text-slate-200">UAT Deploy Date</option>
                      <option value="prod_deployed" className="bg-[#0b0e1a] text-slate-200">Prod Deploy Date</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Date</label>
                      <input
                        type="date"
                        value={exportStartDate}
                        onChange={(e) => setExportStartDate(e.target.value)}
                        onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) {} }}
                        className="h-10 w-full bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-all cursor-pointer [color-scheme:dark]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End Date</label>
                      <input
                        type="date"
                        value={exportEndDate}
                        onChange={(e) => setExportEndDate(e.target.value)}
                        onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) {} }}
                        className="h-10 w-full bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-all cursor-pointer [color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Filters */}
                <div className="space-y-3 p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">🎛️ Additional Filters</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority</label>
                      <select
                        value={exportPriority}
                        onChange={(e) => setExportPriority(e.target.value)}
                        className="h-10 bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-emerald-500/30 rounded-xl px-2 w-full text-xs text-slate-200 outline-none"
                      >
                        <option value="all" className="bg-[#0b0e1a]">All Priorities</option>
                        <option value="High" className="bg-[#0b0e1a]">High</option>
                        <option value="Medium" className="bg-[#0b0e1a]">Medium</option>
                        <option value="Low" className="bg-[#0b0e1a]">Low</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
                      <select
                        value={exportCategory}
                        onChange={(e) => setExportCategory(e.target.value)}
                        className="h-10 bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-emerald-500/30 rounded-xl px-2 w-full text-xs text-slate-200 outline-none"
                      >
                        <option value="all" className="bg-[#0b0e1a]">All Categories</option>
                        <option value="CR" className="bg-[#0b0e1a]">CR</option>
                        <option value="NEW_REQ" className="bg-[#0b0e1a]">NEW_REQ</option>
                        <option value="FIX" className="bg-[#0b0e1a]">FIX</option>
                        <option value="SR" className="bg-[#0b0e1a]">SR</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workflow Status</label>
                      <select
                        value={exportStatus}
                        onChange={(e) => setExportStatus(e.target.value)}
                        className="h-10 bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-emerald-500/30 rounded-xl px-2 w-full text-xs text-slate-200 outline-none"
                      >
                        <option value="all" className="bg-[#0b0e1a]">All Statuses</option>
                        {allStatuses.map(s => (
                          <option key={s} value={s} className="bg-[#0b0e1a]">{s.replace(/_/g, " ")}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bug Status</label>
                      <select
                        value={exportHasBugs}
                        onChange={(e) => setExportHasBugs(e.target.value)}
                        className="h-10 bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-emerald-500/30 rounded-xl px-2 w-full text-xs text-slate-200 outline-none"
                      >
                        <option value="all" className="bg-[#0b0e1a]">All CRs</option>
                        <option value="yes" className="bg-[#0b0e1a]">Has Bugs Only</option>
                        <option value="no" className="bg-[#0b0e1a]">No Bugs Only</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Developer</label>
                      <select
                        value={exportDev}
                        onChange={(e) => setExportDev(e.target.value)}
                        className="h-10 bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-emerald-500/30 rounded-xl px-2 w-full text-xs text-slate-200 outline-none"
                      >
                        <option value="all" className="bg-[#0b0e1a]">All Developers</option>
                        {allDevNamesForExport.map(d => (
                          <option key={d} value={d} className="bg-[#0b0e1a]">{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Preview count */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] text-slate-400">
                    Estimated rows: <span className="font-bold text-violet-300">
                      {tasks.filter(t => {
                        if (exportPriority !== "all" && t.priority !== exportPriority) return false
                        if (exportStatus !== "all" && t.status !== exportStatus) return false
                        if (exportCategory !== "all" && (t.type?.name || "CR") !== exportCategory) return false
                        if (exportDev !== "all" && (t.assignedDeveloper?.fullName || "Unassigned") !== exportDev) return false
                        if (exportHasBugs !== "all") {
                          const bc = bugs.filter(b => b.crTaskId === t.id).length
                          if (exportHasBugs === "yes" && bc === 0) return false
                          if (exportHasBugs === "no" && bc > 0) return false
                        }
                        return true
                      }).length} CR(s)
                    </span>
                  </span>
                  <button type="button" onClick={() => { setExportStartDate(""); setExportEndDate(""); setExportPriority("all"); setExportStatus("all"); setExportCategory("all"); setExportDev("all"); setExportHasBugs("all") }}
                    className="text-[10px] text-slate-500 hover:text-slate-300 underline">
                    Reset filters
                  </button>
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-white/[0.08]">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setIsExportOpen(false)}
                    className="h-9 px-4 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="glow"
                    type="submit"
                    className="h-9 px-5 rounded-xl shadow-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border border-violet-500/30 text-white font-bold"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Export CSV
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Raise Bug Modal */}
      <AnimatePresence>
        {isRaiseBugOpen && selectedTask && (
          <RaiseBugModal
            crTaskId={selectedTask.id}
            crJtrackId={selectedTask.jtrackId}
            onClose={() => setIsRaiseBugOpen(false)}
            onSuccess={() => {
              // Mark CR as BUG_FOUND so it appears in Bugs & Defective CRs section
              updateTask(selectedTask.id, { status: "BUG_FOUND" }, "Bug raised — CR moved to Bugs & Defective CRs", user!)
                .then((updated: any) => {
                  setSelectedTask(updated)
                  fetchData()
                })
                .catch(() => fetchData())
              setIsRaiseBugOpen(false)
            }}
          />
        )}
      </AnimatePresence>

      {/* Bug Detail Modal */}
      <AnimatePresence>
        {selectedBugId !== null && (
          <BugDetailModal
            bugId={selectedBugId}
            onClose={() => setSelectedBugId(null)}
          />
        )}
      </AnimatePresence>

      {/* Bugs List Popup Modal */}
      <AnimatePresence>
        {selectedTaskForBugs && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-xs text-slate-100"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4 bg-rose-500/5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
                    <BugIcon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight text-slate-100">Bugs List</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Bugs raised for {selectedTaskForBugs.jtrackId}</p>
                  </div>
                </div>
                <button
                  className="p-1.5 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  onClick={() => setSelectedTaskForBugs(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3.5">
                {(() => {
                  const taskBugs = bugs.filter(b => b.crTaskId === selectedTaskForBugs.id)
                  if (taskBugs.length === 0) {
                    return (
                      <div className="text-center py-10 text-slate-400 italic">
                        No bugs found for this CR.
                      </div>
                    )
                  }
                  return (
                    <div className="space-y-3">
                      {taskBugs.map(bug => (
                        <div
                          key={bug.id}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="space-y-1.5 text-left min-w-0 flex-1 pr-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedBugId(bug.id)
                                }}
                                className="font-mono font-bold text-rose-400 hover:text-rose-300 hover:underline text-xs cursor-pointer transition-colors"
                              >
                                {bug.jtrackId}
                              </button>
                              <span className="px-2 py-0.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[9px] font-bold text-slate-400 uppercase">
                                {bug.severity || "Medium"}
                              </span>
                            </div>
                            <p className="font-semibold text-slate-200 text-xs truncate">{bug.title}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider ${
                            bug.status === "RESOLVED" || bug.status === "VERIFIED" || bug.status === "CLOSED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}>
                            {bug.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>

              {/* Footer */}
              <div className="flex justify-end px-6 py-4 border-t border-white/[0.08] bg-white/[0.02]">
                <button
                  onClick={() => setSelectedTaskForBugs(null)}
                  className="px-5 py-2 rounded-xl border border-white/[0.08] text-slate-200 hover:bg-white/[0.06] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enterprise Create CR Modal */}
      <CreateCRModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* ── Premium Animated Delete Confirmation Modal ───────────────── */}

      <AnimatePresence>
        {deleteModalTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ backdropFilter: "blur(16px)", background: "rgba(0,0,0,0.75)" }}
            onClick={() => !isDeleting && setDeleteModalTask(null)}
          >
            {/* Red ambient glow behind card */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
              className="absolute w-80 h-80 rounded-full bg-rose-600/20 blur-[80px] pointer-events-none"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl border border-rose-500/30 overflow-hidden shadow-2xl bg-card dark:bg-[#1a0a0a]"
              style={{
                boxShadow: "0 0 60px rgba(239,68,68,0.12), 0 25px 50px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)"
              }}
            >
              {/* Top accent line */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/60 to-transparent" />

              {/* Animated background orbs inside card */}
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-rose-600/10 blur-[60px] pointer-events-none animate-pulse" style={{ animationDuration: "3s" }} />
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-rose-800/10 blur-[40px] pointer-events-none animate-pulse" style={{ animationDuration: "5s" }} />

              <div className="relative z-10 p-6 space-y-5">
                {/* Header */}
                <div className="flex items-start gap-4">
                  {/* Animated warning icon */}
                  <motion.div
                    animate={{ rotate: [0, -5, 5, -5, 0] }}
                    transition={{ duration: 0.5, delay: 0.3, repeat: Infinity, repeatDelay: 3 }}
                    className="flex-shrink-0 w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center"
                  >
                    <ShieldAlert className="h-6 w-6 text-rose-400" />
                  </motion.div>

                  <div className="flex-1">
                    <h2 className="text-base font-bold text-foreground leading-tight">
                      Delete Change Request
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      You are about to permanently delete{" "}
                      <span className="text-rose-400 dark:text-rose-400 font-bold font-mono">{deleteModalTask.jtrackId}</span>.
                      This action <span className="text-rose-500 dark:text-rose-300 font-semibold">cannot be undone</span>.
                    </p>
                  </div>

                  <button
                    onClick={() => !isDeleting && setDeleteModalTask(null)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* CR Info Card */}
                <div className="rounded-xl bg-muted/50 border border-border p-3 space-y-1">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">CR Details</p>
                  <p className="text-sm text-foreground font-medium truncate">{deleteModalTask.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-mono font-bold">{deleteModalTask.jtrackId}</span>
                    <span className="text-[10px] text-muted-foreground">{deleteModalTask.status}</span>
                  </div>
                </div>

                {/* Remarks Input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                    Audit Remarks <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={deleteRemarks}
                    onChange={e => setDeleteRemarks(e.target.value)}
                    placeholder="Enter reason for deletion (required for audit trail)..."
                    rows={3}
                    disabled={isDeleting}
                    className="w-full rounded-xl bg-background border border-border focus:border-rose-500/50 text-sm text-foreground placeholder:text-muted-foreground px-3 py-2.5 outline-none resize-none transition-colors focus:bg-muted/30"
                    style={{ fontFamily: "inherit" }}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-1">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => !isDeleting && setDeleteModalTask(null)}
                    disabled={isDeleting}
                    className="flex-1 py-2.5 rounded-xl border border-border bg-muted/50 hover:bg-muted text-xs text-muted-foreground hover:text-foreground font-semibold transition-all disabled:opacity-50"
                  >
                    Cancel
                  </motion.button>

                  <motion.button
                    whileHover={deleteRemarks.trim() && !isDeleting ? { scale: 1.02 } : {}}
                    whileTap={deleteRemarks.trim() && !isDeleting ? { scale: 0.97 } : {}}
                    disabled={!deleteRemarks.trim() || isDeleting}
                    onClick={async () => {
                      if (!deleteRemarks.trim() || isDeleting) return
                      setIsDeleting(true)
                      try {
                        await deleteTask(deleteModalTask.id, deleteRemarks)
                        setSelectedTask(null)
                        setDeleteModalTask(null)
                        setDeleteRemarks("")
                        addToast(`CR ${deleteModalTask.jtrackId} has been permanently deleted.`, "success")
                      } catch (err: any) {
                        addToast(err.message || "Failed to delete CR", "error")
                      } finally {
                        setIsDeleting(false)
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: deleteRemarks.trim() && !isDeleting
                        ? "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
                        : "rgba(220,38,38,0.2)",
                      color: deleteRemarks.trim() ? "#fff" : "#f87171",
                      boxShadow: deleteRemarks.trim() && !isDeleting ? "0 4px 20px rgba(220,38,38,0.3)" : "none"
                    }}
                  >
                    {isDeleting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"
                        />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3.5 w-3.5" />
                        Permanently Delete
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

