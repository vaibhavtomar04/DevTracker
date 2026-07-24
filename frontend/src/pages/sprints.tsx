import { useState, useEffect, useRef, useCallback } from "react"
import { getAssignedDevNames } from "@/utils/devUtils"
import { motion, AnimatePresence } from "framer-motion"
import { useSprintStore } from "@/store/sprintStore"
import type { Sprint } from "@/store/sprintStore"
import { useTaskStore } from "@/store/taskStore"
import { useAuthStore } from "@/store/authStore"
import type { Task, User } from "@/services/mockData"
import { QualityRiskBadge } from "@/components/shared/QualityRiskBadge"
import { getCRStatusBadgeClass } from "@/utils/statusColors"
import {
  Zap, Plus, Play, CheckCircle2, Trash2, ChevronDown, ChevronUp,
  Calendar, Target, LayoutGrid, List, AlertTriangle,
  Flag, User as UserIcon, X, Edit3, Archive, BarChart2,
  Clock, Download, FileText, TrendingDown, Activity, Layers,
  ChevronLeft, ChevronRight, GitBranch, Loader2, Cpu,
} from "lucide-react"

/* ─── constants ─── */
const STATUS_COLUMNS = [
  { id: "OPEN",          label: "Open",        color: "bg-slate-500",   hex: "#64748b" },
  { id: "IN_PROGRESS",   label: "In Progress", color: "bg-sky-500",     hex: "#0ea5e9" },
  { id: "SIT_DEPLOYED",  label: "SIT",         color: "bg-yellow-500",  hex: "#eab308" },
  { id: "CODE_REVIEW",   label: "Code Review", color: "bg-purple-500",  hex: "#a855f7" },
  { id: "MOVE_TO_UAT",   label: "UAT",         color: "bg-orange-500",  hex: "#f97316" },
  { id: "PROD_DEPLOYED", label: "Prod",        color: "bg-emerald-500", hex: "#10b981" },
  { id: "CLOSED",        label: "Closed",      color: "bg-teal-400",    hex: "#2dd4bf" },
]

const PRIORITY_COLORS: Record<string, string> = {
  Highest: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
  HIGHEST: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
  High:   "text-rose-600 dark:text-rose-400   bg-rose-500/10    border-rose-500/20",
  HIGH:   "text-rose-600 dark:text-rose-400   bg-rose-500/10    border-rose-500/20",
  Medium: "text-amber-600 dark:text-amber-400  bg-amber-500/10   border-amber-500/20",
  MEDIUM: "text-amber-600 dark:text-amber-400  bg-amber-500/10   border-amber-500/20",
  Low:    "text-teal-600 dark:text-teal-400   bg-teal-500/10    border-teal-500/20",
  LOW:    "text-teal-600 dark:text-teal-400   bg-teal-500/10    border-teal-500/20",
}

const glass = "rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md"

const inputCls =
  "w-full bg-white dark:bg-[#0d1525] border border-slate-300 dark:border-white/[0.10] rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition-all"

/* ─── Sprint status badge ─── */
function SprintStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    FUTURE:    { label: "Future",    cls: "bg-slate-500/20    text-slate-300    border-slate-500/30" },
    ACTIVE:    { label: "Active",    cls: "bg-emerald-500/20  text-emerald-300  border-emerald-500/30 animate-pulse" },
    COMPLETED: { label: "Completed", cls: "bg-teal-500/20     text-teal-300     border-teal-500/30" },
  }
  const c = config[status] ?? config["FUTURE"]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wider uppercase ${c.cls}`}>
      {c.label}
    </span>
  )
}

/* ─── Create / Edit Sprint Modal ─── */
interface CreateSprintModalProps {
  onClose: () => void
  onSave: (data: { name: string; goal: string; startDate: string; endDate: string }) => Promise<void>
  initial?: Sprint | null
}

function CreateSprintModal({ onClose, onSave, initial }: CreateSprintModalProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [goal, setGoal] = useState(initial?.goal ?? "")
  const today = new Date().toISOString().split("T")[0]
  const twoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]
  const [startDate, setStartDate] = useState(initial?.startDate ?? today)
  const [endDate, setEndDate] = useState(initial?.endDate ?? twoWeeks)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim() || !startDate || !endDate) return
    setSaving(true)
    await onSave({ name: name.trim(), goal: goal.trim(), startDate, endDate })
    setSaving(false)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className={`${glass} w-full max-w-lg shadow-2xl p-6 space-y-5 mx-4`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center shadow-[0_0_16px_rgba(14,165,233,0.4)]">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">{initial ? "Edit Sprint" : "Create Sprint"}</h2>
              <p className="text-xs text-muted-foreground">Define scope and timeline</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Sprint Name</label>
            <input className={inputCls} placeholder="e.g. Sprint 1 – Authentication Module" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Sprint Goal</label>
            <textarea rows={2} className={`${inputCls} resize-none`} placeholder="What is the main objective of this sprint?" value={goal} onChange={e => setGoal(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Start Date</label>
              <input type="date" className={inputCls} value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">End Date</label>
              <input type="date" className={inputCls} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-white/[0.08] text-muted-foreground hover:bg-white/[0.04] transition-colors">Cancel</button>
          <button
            onClick={handleSave} disabled={saving || !name.trim()}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50 shadow-[0_0_16px_rgba(14,165,233,0.3)]"
          >
            {saving ? "Saving…" : initial ? "Update Sprint" : "Create Sprint"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Update Task Modal ─── */
interface UpdateTaskModalProps {
  task: Task
  sprints: Sprint[]
  users: User[]
  onClose: () => void
  onSave: (taskId: number, data: Partial<Task>) => Promise<void>
}

function UpdateTaskModal({ task, sprints, users, onClose, onSave }: UpdateTaskModalProps) {
  const [title, setTitle]       = useState(task.title)
  const [desc, setDesc]         = useState(task.description)
  const [priority, setPriority] = useState(task.priority)
  const [status, setStatus]     = useState(task.status)
  const [efforts, setEfforts]   = useState(String(task.efforts))
  const [sprintId, setSprintId] = useState<string>(task.sprintId ? String(task.sprintId) : "")
  const [assigneeId, setAssigneeId] = useState<string>(task.assignedDeveloper ? String(task.assignedDeveloper.id) : "")
  const [expectedSitDeploymentDate, setExpectedSitDeploymentDate] = useState(task.expectedSitDeploymentDate || "")
  const [expectedUatDeploymentDate, setExpectedUatDeploymentDate] = useState(task.expectedUatDeploymentDate || "")
  const [saving, setSaving]     = useState(false)

  const developers = users.filter(u => u.roles?.includes("DEVELOPER") || u.roles?.includes("DEVADMIN"))

  const allStatuses = [
    "OPEN","IN_PROGRESS","CHANGES_REQUESTED","SIT_DEPLOYED","SIT_TESTING","SIT_COMPLETED",
    "CODE_REVIEW","CODE_REVIEW_DONE","MOVE_TO_UAT","UAT_TESTING",
    "BUG_FOUND",
    "UAT_COMPLETED","PROD_DEPLOYED","PROD_COMPLETED","CLOSED",
  ]

  const handleSave = async () => {
    setSaving(true)
    const assignedDev = assigneeId ? users.find(u => String(u.id) === assigneeId) : undefined
    await onSave(task.id, {
      title: title.trim(),
      description: desc.trim(),
      priority: priority as "High" | "Medium" | "Low",
      status,
      efforts: parseFloat(efforts) || 0,
      sprintId: sprintId ? parseInt(sprintId) : null,
      assignedDeveloper: assignedDev,
      expectedSitDeploymentDate: expectedSitDeploymentDate || undefined,
      expectedUatDeploymentDate: expectedUatDeploymentDate || undefined,
    })
    setSaving(false)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.90, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className={`${glass} w-full max-w-xl shadow-2xl mx-4 overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center shadow-[0_0_14px_rgba(14,165,233,0.4)]">
              <Edit3 className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-mono font-bold text-sky-400">{task.jtrackId}</p>
              <h2 className="font-bold text-foreground text-sm">Update Scrum Task</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Title</label>
            <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Description</label>
            <textarea rows={3} className={`${inputCls} resize-none`} value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Priority</label>
              <select className={inputCls} value={priority} onChange={e => setPriority(e.target.value as any)}>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Status</label>
              <select className={inputCls} value={status} onChange={e => setStatus(e.target.value)}>
                {allStatuses.map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Story Points</label>
              <input type="number" min={0} step={0.5} className={inputCls} value={efforts} onChange={e => setEfforts(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Sprint</label>
              <select className={inputCls} value={sprintId} onChange={e => setSprintId(e.target.value)}>
                <option value="">— Backlog (unassigned) —</option>
                {sprints.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Assigned Developer</label>
            <select className={inputCls} value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
              <option value="">— Unassigned —</option>
              {developers.map(u => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Expected SIT Deployment Date</label>
              <input type="date" lang="en-GB" className={`${inputCls} hide-calendar-picker`} value={expectedSitDeploymentDate} onChange={e => setExpectedSitDeploymentDate(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Expected UAT Deployment Date</label>
              <input type="date" lang="en-GB" className={`${inputCls} hide-calendar-picker`} value={expectedUatDeploymentDate} onChange={e => setExpectedUatDeploymentDate(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-white/[0.06]">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-white/[0.08] text-muted-foreground hover:bg-white/[0.04] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave} disabled={saving || !title.trim()}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 text-white hover:opacity-90 disabled:opacity-50 shadow-[0_0_14px_rgba(14,165,233,0.3)] flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ─── Task Details Modal ─── */
function TaskDetailsModal({ task, onClose }: { task: Task | null; onClose: () => void }) {
  if (!task) return null
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className={`${glass} w-full max-w-lg shadow-2xl p-6 space-y-5 mx-4 relative`}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-xs font-bold text-white font-mono shadow-[0_0_16px_rgba(14,165,233,0.4)]">CR</div>
          <div>
            <span className="text-[10px] font-mono font-bold text-sky-400">{task.jtrackId}</span>
            <h2 className="font-bold text-foreground text-base tracking-tight leading-snug">{task.title}</h2>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Description / Scope</span>
            <p className="text-xs text-foreground/80 bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 leading-relaxed max-h-48 overflow-y-auto">
              {task.description || "No description provided."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Status</span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getCRStatusBadgeClass(task.status)}`}>
                {task.status === "BUG_FOUND" ? "Bug Found" : task.status.replace(/_/g, " ")}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Priority</span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS["Medium"]}`}>
                {task.priority}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Story Points</span>
              <span className="text-xs text-foreground/90 font-medium">{task.efforts || 0} pts</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Assigned Developer(s)</span>
              <div className="flex items-center gap-1.5 pt-0.5">
                <div className="h-5 w-5 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-[9px] font-bold text-sky-400">
                  {(getAssignedDevNames(task)[0] || 'D').toUpperCase()}
                </div>
                <span className="text-xs text-foreground/90 truncate">{getAssignedDevNames(task)}</span>
              </div>
            </div>
          </div>
          {task.branchName && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Branch</span>
              <code className="text-[11px] font-mono bg-white/[0.04] border border-white/[0.06] px-2 py-1 rounded-md text-sky-400 block truncate select-all">
                {task.branchName}
              </code>
            </div>
          )}

          {/* Rejection / Change Requested Remarks Banner */}
          {(task.status === "CHANGES_REQUESTED" || task.remarks) && (
            <div className="rounded-2xl border-2 border-rose-500/40 bg-gradient-to-r from-rose-500/15 via-amber-500/10 to-rose-500/15 p-4 shadow-[0_0_20px_rgba(244,63,94,0.15)] space-y-2.5 text-left">
              <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-rose-400 text-sm">⚠️</span>
                  <span className="text-xs font-black uppercase tracking-wider text-rose-300">
                    Code Review Rejection & Remarks
                  </span>
                </div>
                <span className="text-[10px] font-bold text-rose-200 bg-rose-500/20 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
                  Reviewer: {task.codeReviewer?.fullName || "Code Approver"}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                  Reviewer Remarks:
                </span>
                <p className="text-xs font-semibold text-rose-100 bg-black/50 border border-rose-500/25 p-3 rounded-xl leading-relaxed whitespace-pre-wrap">
                  {task.remarks || "Changes requested during code review. Please review and resubmit."}
                </p>
              </div>
              <p className="text-[10px] text-rose-300/90 italic text-right">
                Sent back by <strong className="text-rose-100 font-bold">{task.codeReviewer?.fullName || "Code Approver"}</strong>
              </p>
            </div>
          )}
        </div>
        <button onClick={onClose} className="w-full py-2.5 text-xs font-bold rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-foreground transition-colors">
          Close
        </button>
      </motion.div>
    </motion.div>
  )
}

/* ─── Task Card (Kanban) ─── */
/* ─── Task Card (Kanban) ─── */
function TaskCard({
  task,
  onClick,
  onEdit,
  onDragStart
}: {
  task: Task;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const getRemainingDays = (dueDateStr?: string) => {
    if (!dueDateStr) return "N/A"
    const diff = new Date(dueDateStr).getTime() - new Date().getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days > 0 ? `${days}d left` : days === 0 ? "Today" : `${Math.abs(days)}d overdue`
  }

  const getProgressPct = (status: string) => {
    const p: Record<string, number> = {
      OPEN: 0,
      IN_PROGRESS: 20,
      SIT_DEPLOYED: 40,
      SIT_TESTING: 45,
      SIT_COMPLETED: 50,
      CODE_REVIEW: 60,
      CODE_REVIEW_DONE: 65,
      MOVE_TO_UAT: 75,
      UAT_TESTING: 80,
      UAT_COMPLETED: 85,
      PROD_DEPLOYED: 90,
      CLOSED: 100
    }
    return p[status] ?? 10
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "OPEN": return <List className="h-3 w-3 text-slate-400" />
      case "IN_PROGRESS": return <Activity className="h-3 w-3 text-sky-400 animate-pulse" />
      case "SIT_DEPLOYED": return <Cpu className="h-3 w-3 text-yellow-400" />
      case "CODE_REVIEW": return <GitBranch className="h-3 w-3 text-purple-400" />
      case "MOVE_TO_UAT": return <Layers className="h-3 w-3 text-orange-400" />
      case "PROD_DEPLOYED": return <Zap className="h-3 w-3 text-emerald-400" />
      case "CLOSED": return <CheckCircle2 className="h-3 w-3 text-teal-400" />
      default: return <List className="h-3 w-3 text-slate-400" />
    }
  }

  const progress = getProgressPct(task.status)
  const remaining = getRemainingDays((task as any).dueDate ? String((task as any).dueDate) : undefined)

  return (
    <motion.div
      layout
      draggable
      onDragStart={onDragStart as any}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ borderColor: "rgba(14,165,233,0.5)", boxShadow: "0 0 20px rgba(14,165,233,0.15)" }}
      className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3.5 cursor-grab active:cursor-grabbing transition-all group relative text-left"
      onClick={onClick}
    >
      {/* Hover Details Card (Tooltip) */}
      <div className="absolute left-full ml-3 top-0 bg-slate-900 border border-slate-700/80 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all pointer-events-none w-72 z-[100] space-y-2.5 hidden md:block text-left">
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-xs text-sky-400 font-mono tracking-wider">{task.jtrackId}</span>
          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase ${PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS["Medium"]}`}>
            {task.priority}
          </span>
        </div>

        <h4 className="font-extrabold text-xs text-slate-100 leading-snug line-clamp-2">{task.title}</h4>

        {task.description && (
          <div className="bg-slate-950/80 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 leading-relaxed line-clamp-4 max-h-32 overflow-hidden">
            {task.description}
          </div>
        )}

        <div className="text-[10px] space-y-1 pt-2 border-t border-slate-800 text-slate-300">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-400">Branch:</span>
            <span className="font-mono text-sky-300 font-semibold truncate max-w-[150px]">{task.branchName || "None"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-400">Story Points:</span>
            <span className="font-mono text-slate-100 font-bold">{task.efforts || 0} pts</span>
          </div>
          {task.createdBy && (
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-400">Created By:</span>
              <span className="text-slate-200 font-medium">{task.createdBy.fullName || task.createdBy.username}</span>
            </div>
          )}
          {task.expectedSitDeploymentDate && (
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-400">Exp. SIT Date:</span>
              <span className="font-mono text-amber-300 font-bold">{task.expectedSitDeploymentDate}</span>
            </div>
          )}
          {task.expectedUatDeploymentDate && (
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-400">Exp. UAT Date:</span>
              <span className="font-mono text-amber-300 font-bold">{task.expectedUatDeploymentDate}</span>
            </div>
          )}
        </div>
      </div>

      {/* Row 1: CR Code, Edit/Quick Actions, Priority */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-mono font-bold text-sky-400 hover:underline">{task.jtrackId}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(e); }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/[0.08] text-muted-foreground hover:text-sky-400 transition-all"
            title="Edit CR"
          >
            <Edit3 className="h-3 w-3" />
          </button>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS["Medium"]}`}>
            {task.priority}
          </span>
        </div>
      </div>

      {/* Row 2: Title */}
      <p className="text-xs font-bold text-foreground leading-snug line-clamp-2">{task.title}</p>

      {/* Row 3: Status Badge & Linked Sprint Tasks */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full px-2 py-0.5 text-muted-foreground font-semibold">
          {getStatusIcon(task.status)}
          <span className="text-[9px] uppercase tracking-wider">{task.status.replace(/_/g, " ")}</span>
        </div>

        {((task as any).sprintTasks && (task as any).sprintTasks.length > 0) ? (
          <span className="text-[8px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded-md font-mono font-bold">
            ⚙️ {((task as any).sprintTasks || []).map((st: any) => st.taskCode).join(", ")}
          </span>
        ) : (
          <span className="text-[8px] text-muted-foreground italic">No Sprint Tasks</span>
        )}
      </div>

      {/* Row 4: Progress Bar & Remaining Days */}
      <div className="space-y-1 pt-0.5">
        <div className="flex justify-between text-[9px] text-muted-foreground font-medium">
          <span>Progress ({progress}%)</span>
          <span className="font-mono text-slate-400">{remaining}</span>
        </div>
        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-sky-500 to-teal-400 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Row 5: Risk Indicator, Developers, and Testers */}
      <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
        {/* Risk Badge */}
        <QualityRiskBadge taskId={task.id} isQualityRisk={(task as any).isQualityRisk} />

        {/* User Avatars */}
        <div className="flex items-center gap-2">
          {/* Tester Avatar */}
          {task.tester && (
            <div className="flex items-center gap-1" title={`Tester: ${task.tester.fullName}`}>
              <div className="h-4.5 w-4.5 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-[8px] text-teal-300 font-bold px-1 font-mono">
                T
              </div>
            </div>
          )}

          {/* Developer Avatars */}
          {task.assignedDeveloper && (
            <div className="h-4.5 w-4.5 rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center text-[8px] font-black text-white" title={`Developer: ${task.assignedDeveloper.fullName}`}>
              {task.assignedDeveloper.fullName?.charAt(0)}
            </div>
          )}
        </div>
      </div>

      {/* Row 6: Mini Milestone Timeline Preview */}
      <div className="flex items-center justify-between text-[8px] text-muted-foreground pt-1 border-t border-dashed border-white/[0.04] w-full">
        <div className={`px-1 rounded ${task.devStartDate ? "bg-sky-500/10 text-sky-400 font-bold" : "bg-white/5 text-slate-500"}`}>Dev</div>
        <span className="text-slate-700">→</span>
        <div className={`px-1 rounded ${task.sitDate ? "bg-yellow-500/10 text-yellow-400 font-bold" : "bg-white/5 text-slate-500"}`}>SIT</div>
        <span className="text-slate-700">→</span>
        <div className={`px-1 rounded ${task.uatDate ? "bg-orange-500/10 text-orange-400 font-bold" : "bg-white/5 text-slate-500"}`}>UAT</div>
        <span className="text-slate-700">→</span>
        <div className={`px-1 rounded ${task.productionDate ? "bg-emerald-500/10 text-emerald-400 font-bold" : "bg-white/5 text-slate-500"}`}>Prod</div>
      </div>
    </motion.div>
  )
}

/* ─── Kanban Board ─── */
function KanbanBoard({
  tasks,
  onTaskClick,
  onTaskEdit,
  onTaskUpdate
}: {
  tasks: Task[];
  onTaskClick: (t: Task) => void;
  onTaskEdit: (t: Task) => void;
  onTaskUpdate: (taskId: number, data: Partial<Task>) => Promise<void>;
}) {
  const tasksByStatus = STATUS_COLUMNS.reduce((acc, col) => {
    if (col.id === "IN_PROGRESS") acc[col.id] = tasks.filter(t => ["IN_PROGRESS", "CHANGES_REQUESTED"].includes(t.status))
    else if (col.id === "SIT_DEPLOYED") acc[col.id] = tasks.filter(t => ["SIT_DEPLOYED","SIT_TESTING","SIT_COMPLETED"].includes(t.status))
    else if (col.id === "MOVE_TO_UAT") acc[col.id] = tasks.filter(t => ["MOVE_TO_UAT","UAT_TESTING","TESTING_POOL","TESTING_IN_PROGRESS","TESTING_COMPLETED","BUG_FOUND","UAT_COMPLETED"].includes(t.status))
    else if (col.id === "CODE_REVIEW") acc[col.id] = tasks.filter(t => ["CODE_REVIEW","CODE_REVIEW_DONE"].includes(t.status))
    else acc[col.id] = tasks.filter(t => t.status === col.id)
    return acc
  }, {} as Record<string, Task[]>)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    const taskIdStr = e.dataTransfer.getData("taskId")
    if (!taskIdStr) return
    const taskId = parseInt(taskIdStr)
    
    // Check if status is actually changing to avoid redundant updates
    const taskObj = tasks.find(t => t.id === taskId)
    if (taskObj && taskObj.status !== targetStatus) {
      try {
        await onTaskUpdate(taskId, {
          status: targetStatus,
          remarks: `Moved to ${targetStatus.replace(/_/g, " ")} via Sprint Board Drag & Drop`
        })
      } catch (err: any) {
        console.error(err)
      }
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
      {STATUS_COLUMNS.map(col => (
        <div key={col.id} className="flex-shrink-0 w-60">
          <div className="flex items-center gap-2 mb-3">
            <span className={`h-2 w-2 rounded-full ${col.color}`} />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">{col.label}</span>
            <span className="ml-auto text-[10px] bg-white/[0.06] text-muted-foreground px-1.5 py-0.5 rounded-full font-bold">
              {tasksByStatus[col.id]?.length ?? 0}
            </span>
          </div>
          <div
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            className="space-y-2 min-h-[400px] bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] rounded-2xl p-2.5 transition-all"
          >
            <AnimatePresence>
              {(tasksByStatus[col.id] ?? []).map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                  onEdit={e => { e.stopPropagation(); onTaskEdit(task) }}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("taskId", task.id.toString())
                  }}
                />
              ))}
            </AnimatePresence>
            {(tasksByStatus[col.id]?.length ?? 0) === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground/30 text-xs gap-1.5 border border-dashed border-white/5 rounded-xl">
                <LayoutGrid className="h-5 w-5" /><span>No tasks</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Gantt Timeline ─── */
function GanttTimeline({ sprints, tasks, onTaskClick }: { sprints: Sprint[]; tasks: Task[]; onTaskClick: (t: Task) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [offsetDays, setOffsetDays] = useState(-14)
  const visibleDays = 60
  const dayPx = 28

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() + offsetDays)

  const days = Array.from({ length: visibleDays }, (_, i) => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    return d
  })

  const getX = (dateStr: string) => {
    const d = new Date(dateStr)
    d.setHours(0, 0, 0, 0)
    const diff = Math.floor((d.getTime() - startDate.getTime()) / 86400000)
    return diff * dayPx
  }

  const getWidth = (start: string, end: string) => {
    const s = new Date(start); s.setHours(0,0,0,0)
    const e = new Date(end);   e.setHours(0,0,0,0)
    const days = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1)
    return days * dayPx
  }

  const todayX = Math.floor((today.getTime() - startDate.getTime()) / 86400000) * dayPx

  const months: { label: string; x: number; span: number }[] = []
  let currentMonth = ""
  let monthStartX = 0
  days.forEach((d, i) => {
    const key = d.toLocaleString("default", { month: "short", year: "numeric" })
    if (key !== currentMonth) {
      if (currentMonth) months.push({ label: currentMonth, x: monthStartX, span: i * dayPx - monthStartX })
      currentMonth = key
      monthStartX = i * dayPx
    }
  })
  if (currentMonth) months.push({ label: currentMonth, x: monthStartX, span: visibleDays * dayPx - monthStartX })

  const ROW_H = 36
  const LABEL_W = 180

  const rows: { type: "sprint" | "task"; sprint?: Sprint; task?: Task; y: number }[] = []
  let y = 0
  sprints.forEach(sprint => {
    rows.push({ type: "sprint", sprint, y })
    y += ROW_H
    const sprintTasks = tasks.filter(t => t.sprintId === sprint.id)
    sprintTasks.forEach(task => {
      rows.push({ type: "task", task, y })
      y += ROW_H
    })
  })

  const statusColor: Record<string, string> = {
    OPEN: "#64748b", IN_PROGRESS: "#0ea5e9", SIT_DEPLOYED: "#eab308",
    CODE_REVIEW: "#a855f7", MOVE_TO_UAT: "#f97316", PROD_DEPLOYED: "#10b981",
    CLOSED: "#2dd4bf", COMPLETED: "#14b8a6", ACTIVE: "#22c55e", FUTURE: "#475569",
    BUG_FOUND: "#f43f5e",
  }

  return (
    <div className={`${glass} overflow-hidden`}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-sky-400" />
          <span className="font-bold text-sm text-foreground">Timeline</span>
          <span className="text-xs text-muted-foreground">Gantt view of sprints & tasks</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setOffsetDays(o => o - 14)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setOffsetDays(-14)} className="px-2 py-1 rounded-lg hover:bg-white/[0.06] text-xs text-muted-foreground transition-colors">Today</button>
          <button onClick={() => setOffsetDays(o => o + 14)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={containerRef} className="overflow-x-auto scrollbar-thin">
        <div style={{ minWidth: LABEL_W + visibleDays * dayPx }}>
          {/* Month row */}
          <div className="flex sticky top-0 z-10 bg-[#080b18]" style={{ height: 24 }}>
            <div style={{ width: LABEL_W, flexShrink: 0 }} className="border-r border-white/[0.06]" />
            <div className="relative flex-1" style={{ height: 24 }}>
              {months.map(m => (
                <div key={m.label} style={{ position: "absolute", left: m.x, width: m.span, height: 24 }}
                  className="flex items-center px-2 border-r border-white/[0.04]">
                  <span className="text-[10px] font-bold text-sky-400/70 uppercase tracking-wider">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Day header row */}
          <div className="flex sticky top-6 z-10 bg-[#080b18] border-b border-white/[0.06]" style={{ height: 28 }}>
            <div style={{ width: LABEL_W, flexShrink: 0 }} className="border-r border-white/[0.06] flex items-center px-3">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Task / Sprint</span>
            </div>
            <div className="relative flex-1">
              {days.map((d, i) => {
                const isToday = d.getTime() === today.getTime()
                const isSun = d.getDay() === 0
                const isSat = d.getDay() === 6
                return (
                  <div
                    key={i}
                    style={{ position: "absolute", left: i * dayPx, width: dayPx, height: 28 }}
                    className={`flex flex-col items-center justify-center border-r border-white/[0.03] ${isSat || isSun ? "bg-white/[0.015]" : ""} ${isToday ? "bg-sky-500/10" : ""}`}
                  >
                    <span className={`text-[9px] font-bold ${isToday ? "text-sky-400" : "text-muted-foreground/60"}`}>
                      {d.getDate()}
                    </span>
                    <span className={`text-[8px] ${isToday ? "text-sky-400/70" : "text-muted-foreground/30"}`}>
                      {d.toLocaleString("default", { weekday: "narrow" })}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Rows */}
          <div style={{ position: "relative", height: rows.length * ROW_H }}>
            {/* Today line */}
            {todayX >= 0 && todayX <= visibleDays * dayPx && (
              <div
                style={{ position: "absolute", left: LABEL_W + todayX + dayPx / 2, top: 0, bottom: 0, width: 2, background: "rgba(14,165,233,0.7)", zIndex: 5 }}
                className="pointer-events-none"
              >
                <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 8, height: 8, borderRadius: "50%", background: "#0ea5e9" }} />
              </div>
            )}

            {rows.map((row, idx) => (
              <div
                key={idx}
                style={{ position: "absolute", top: row.y, left: 0, right: 0, height: ROW_H }}
                className={`flex border-b border-white/[0.03] ${row.type === "sprint" ? "bg-white/[0.02]" : ""} hover:bg-white/[0.015] transition-colors`}
              >
                {/* Label */}
                <div style={{ width: LABEL_W, flexShrink: 0 }} className={`flex items-center px-3 border-r border-white/[0.06] gap-2 ${row.type === "task" ? "pl-6" : ""}`}>
                  {row.type === "sprint" ? (
                    <>
                      <Zap className="h-3 w-3 text-sky-400 flex-shrink-0" />
                      <span className="text-xs font-bold text-foreground truncate">{row.sprint!.name}</span>
                    </>
                  ) : (
                    <>
                      <GitBranch className="h-3 w-3 text-teal-400/60 flex-shrink-0" />
                      <span className="text-[11px] text-muted-foreground truncate">{row.task!.jtrackId}: {row.task!.title}</span>
                    </>
                  )}
                </div>

                {/* Bar */}
                <div className="relative flex-1">
                  {row.type === "sprint" && row.sprint!.startDate && row.sprint!.endDate && (() => {
                    const x = getX(row.sprint!.startDate)
                    const w = getWidth(row.sprint!.startDate, row.sprint!.endDate)
                    const color = statusColor[row.sprint!.status] || "#475569"
                    return (
                      <div
                        style={{ position: "absolute", left: x, width: w, top: 6, height: ROW_H - 12, background: `${color}22`, border: `1px solid ${color}55`, borderRadius: 6 }}
                        className="flex items-center px-2"
                      >
                        <span className="text-[9px] font-bold truncate" style={{ color }}>{row.sprint!.name}</span>
                      </div>
                    )
                  })()}

                  {row.type === "task" && row.task && (() => {
                    const startStr = row.task!.devStartDate || row.task!.createdDate?.split("T")[0]
                    const endStr = row.task!.productionDate || row.task!.updatedDate?.split("T")[0] || startStr
                    if (!startStr) return null
                    const x = getX(startStr)
                    const w = getWidth(startStr, endStr)
                    const col = STATUS_COLUMNS.find(c => c.id === row.task!.status)
                    const color = col?.hex || "#64748b"
                    return (
                      <div
                        onClick={() => onTaskClick(row.task!)}
                        style={{ position: "absolute", left: x, width: Math.max(w, dayPx * 2), top: 8, height: ROW_H - 16, background: `${color}33`, border: `1px solid ${color}66`, borderRadius: 4, cursor: "pointer" }}
                        className="flex items-center px-2 hover:brightness-125 transition-all"
                      >
                        <span className="text-[9px] font-semibold truncate" style={{ color }}>{row.task!.title}</span>
                      </div>
                    )
                  })()}
                </div>
              </div>
            ))}

            {rows.length === 0 && (
              <div className="flex items-center justify-center h-32 text-muted-foreground/40 text-sm">
                No sprint data to display on timeline.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Sprint Reports ─── */
function SprintReports({ sprints, tasks }: { sprints: Sprint[]; tasks: Task[] }) {
  const [selectedSprintId, setSelectedSprintId] = useState<number | "all">("all")

  const filteredTasks = selectedSprintId === "all"
    ? tasks
    : tasks.filter(t => t.sprintId === selectedSprintId)

  // Status distribution
  const statusCounts = filteredTasks.reduce((acc, t) => {
    const key = STATUS_COLUMNS.find(c => {
      if (c.id === "SIT_DEPLOYED") return ["SIT_DEPLOYED","SIT_TESTING","SIT_COMPLETED"].includes(t.status)
      if (c.id === "MOVE_TO_UAT") return ["MOVE_TO_UAT","UAT_TESTING","TESTING_POOL","TESTING_IN_PROGRESS","TESTING_COMPLETED","BUG_FOUND","UAT_COMPLETED"].includes(t.status)
      if (c.id === "CODE_REVIEW") return ["CODE_REVIEW","CODE_REVIEW_DONE"].includes(t.status)
      return c.id === t.status
    })?.label || "Other"
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Priority breakdown
  const priorityCounts = filteredTasks.reduce((acc, t) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Velocity per sprint (story points done vs planned)
  const velocityData = sprints.slice(-6).map(s => {
    const sTasks = tasks.filter(t => t.sprintId === s.id)
    const planned = sTasks.reduce((sum, t) => sum + (t.efforts || 0), 0)
    const done = sTasks.filter(t => ["CLOSED","PROD_COMPLETED","PROD_DEPLOYED"].includes(t.status))
      .reduce((sum, t) => sum + (t.efforts || 0), 0)
    return { name: s.name.replace(/Sprint\s*/i, "S"), planned, done }
  })
  const maxVelocity = Math.max(...velocityData.flatMap(d => [d.planned, d.done]), 1)

  // Real Burndown: Calculate remaining story points day-by-day for active sprint
  const activeSprint = sprints.find(s => s.status === "ACTIVE")
  const burndownPoints: { day: string; remaining: number; ideal: number }[] = []
  if (activeSprint?.startDate && activeSprint?.endDate) {
    const s = new Date(activeSprint.startDate)
    const e = new Date(activeSprint.endDate)
    const sprintLen = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000))
    const sprintTasks = tasks.filter(t => t.sprintId === activeSprint.id)
    const totalPts = sprintTasks.reduce((sum, t) => sum + (t.efforts || 0), 0)

    for (let i = 0; i <= Math.min(sprintLen, 14); i++) {
      const currentDay = new Date(s.getTime() + i * 86400000)
      currentDay.setHours(23, 59, 59, 999)

      const donePtsSoFar = sprintTasks
        .filter(t => {
          const isDone = ["CLOSED", "PROD_DEPLOYED", "PROD_COMPLETED"].includes(t.status)
          if (!isDone) return false
          const completedDateStr = t.productionDate || t.updatedDate || t.createdDate
          if (!completedDateStr) return false
          const compDate = new Date(completedDateStr)
          return compDate <= currentDay
        })
        .reduce((sum, t) => sum + (t.efforts || 0), 0)

      burndownPoints.push({
        day: `D${i + 1}`,
        remaining: Math.max(0, totalPts - donePtsSoFar),
        ideal: Math.max(0, Math.round(totalPts - (totalPts * (i / sprintLen)))),
      })
    }
  }
  const maxBurndown = Math.max(...burndownPoints.flatMap(b => [b.remaining, b.ideal]), 1)

  // Donut helpers
  const donutItems = STATUS_COLUMNS.slice(0, 6).map(col => ({
    label: col.label,
    value: statusCounts[col.label] || 0,
    color: col.hex,
  })).filter(d => d.value > 0)

  const donutRadius = 54
  const donutCx = 70
  const donutCy = 70
  let cumAngle = -Math.PI / 2
  const donutSegments = donutItems.map(item => {
    const fraction = item.value / (donutItems.reduce((a, d) => a + d.value, 0) || 1)
    const angle = fraction * 2 * Math.PI
    const x1 = donutCx + donutRadius * Math.cos(cumAngle)
    const y1 = donutCy + donutRadius * Math.sin(cumAngle)
    cumAngle += angle
    const x2 = donutCx + donutRadius * Math.cos(cumAngle)
    const y2 = donutCy + donutRadius * Math.sin(cumAngle)
    const largeArc = angle > Math.PI ? 1 : 0
    return { ...item, path: `M ${donutCx} ${donutCy} L ${x1} ${y1} A ${donutRadius} ${donutRadius} 0 ${largeArc} 1 ${x2} ${y2} Z`, fraction }
  })

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-sky-400" />
          <span className="font-bold text-sm text-foreground">Interactive Reports</span>
        </div>
        <select
          className="bg-white/[0.04] border border-white/[0.10] rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          value={selectedSprintId === "all" ? "all" : String(selectedSprintId)}
          onChange={e => setSelectedSprintId(e.target.value === "all" ? "all" : parseInt(e.target.value))}
        >
          <option value="all">All Sprints</option>
          {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Velocity Chart */}
        <div className={`${glass} p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-sky-400" />
            <span className="text-sm font-bold text-foreground">Sprint Velocity</span>
            <span className="text-xs text-muted-foreground ml-auto">Story points</span>
          </div>
          {velocityData.length === 0 ? (
            <div className="h-36 flex items-center justify-center text-muted-foreground/40 text-xs">No sprint data yet</div>
          ) : (
            <div className="h-40">
              <svg width="100%" height="100%" viewBox="0 0 320 160" preserveAspectRatio="xMidYMid meet">
                {/* Grid lines */}
                {[0.25, 0.5, 0.75, 1].map(f => (
                  <line key={f} x1="32" y1={140 - f * 120} x2="312" y2={140 - f * 120}
                    stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                ))}
                {velocityData.map((d, i) => {
                  const bw = (280 / velocityData.length) * 0.4
                  const gap = (280 / velocityData.length)
                  const cx = 32 + gap * i + gap / 2
                  const plannedH = (d.planned / maxVelocity) * 120
                  const doneH = (d.done / maxVelocity) * 120
                  return (
                    <g key={i}>
                      <rect x={cx - bw - 2} y={140 - plannedH} width={bw} height={plannedH} rx="3"
                        fill="rgba(14,165,233,0.25)" stroke="rgba(14,165,233,0.5)" strokeWidth="1">
                        <animate attributeName="height" from="0" to={plannedH} dur="0.7s" fill="freeze" />
                        <animate attributeName="y" from="140" to={140 - plannedH} dur="0.7s" fill="freeze" />
                      </rect>
                      <rect x={cx + 2} y={140 - doneH} width={bw} height={doneH} rx="3"
                        fill="rgba(20,184,166,0.3)" stroke="rgba(20,184,166,0.6)" strokeWidth="1">
                        <animate attributeName="height" from="0" to={doneH} dur="0.7s" fill="freeze" />
                        <animate attributeName="y" from="140" to={140 - doneH} dur="0.7s" fill="freeze" />
                      </rect>
                      <text x={cx} y={155} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8">{d.name}</text>
                    </g>
                  )
                })}
              </svg>
            </div>
          )}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-sky-500/50 border border-sky-500/70" /><span className="text-[10px] text-muted-foreground">Planned</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-teal-500/50 border border-teal-500/70" /><span className="text-[10px] text-muted-foreground">Completed</span></div>
          </div>
        </div>

        {/* Status Donut */}
        <div className={`${glass} p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-4 w-4 text-teal-400" />
            <span className="text-sm font-bold text-foreground">Status Distribution</span>
          </div>
          {filteredTasks.length === 0 ? (
            <div className="h-36 flex items-center justify-center text-muted-foreground/40 text-xs">No tasks to display</div>
          ) : (
            <div className="flex items-center gap-4">
              <svg width="140" height="140" viewBox="0 0 140 140">
                {donutSegments.map((seg, i) => (
                  <path key={i} d={seg.path} fill={seg.color + "88"} stroke={seg.color} strokeWidth="1.5">
                    <animate attributeName="opacity" from="0" to="1" dur={`${0.3 + i * 0.1}s`} fill="freeze" />
                  </path>
                ))}
                <circle cx={donutCx} cy={donutCy} r={28} fill="rgba(8,11,24,0.9)" />
                <text x={donutCx} y={donutCy - 4} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{filteredTasks.length}</text>
                <text x={donutCx} y={donutCy + 10} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8">tasks</text>
              </svg>
              <div className="space-y-1.5 flex-1">
                {donutSegments.map((seg, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: seg.color }} />
                      <span className="text-[10px] text-muted-foreground">{seg.label}</span>
                    </div>
                    <span className="text-[10px] font-bold text-foreground">{seg.value} <span className="text-muted-foreground/60">({Math.round(seg.fraction * 100)}%)</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Burndown Chart */}
        <div className={`${glass} p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="h-4 w-4 text-rose-400" />
            <span className="text-sm font-bold text-foreground">Burndown Chart</span>
            <span className="text-xs text-muted-foreground ml-auto">Active sprint</span>
          </div>
          {burndownPoints.length === 0 ? (
            <div className="h-36 flex items-center justify-center text-muted-foreground/40 text-xs">No active sprint burndown data</div>
          ) : (
            <div className="h-36">
              <svg width="100%" height="100%" viewBox="0 0 320 144" preserveAspectRatio="none">
                {/* Grid */}
                {[0.25,0.5,0.75,1].map(f => (
                  <line key={f} x1="0" y1={132 - f * 120} x2="320" y2={132 - f * 120} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                ))}
                {/* Ideal line */}
                <polyline
                  points={burndownPoints.map((b, i) => `${(i / (burndownPoints.length - 1)) * 300 + 10},${132 - (b.ideal / maxBurndown) * 120}`).join(" ")}
                  fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="5,3"
                />
                {/* Actual line */}
                <polyline
                  points={burndownPoints.map((b, i) => `${(i / (burndownPoints.length - 1)) * 300 + 10},${132 - (b.remaining / maxBurndown) * 120}`).join(" ")}
                  fill="none" stroke="#f43f5e" strokeWidth="2"
                />
                {/* Area fill */}
                <polygon
                  points={[
                    ...burndownPoints.map((b, i) => `${(i / (burndownPoints.length - 1)) * 300 + 10},${132 - (b.remaining / maxBurndown) * 120}`),
                    "310,132", "10,132"
                  ].join(" ")}
                  fill="rgba(244,63,94,0.08)"
                />
                {burndownPoints.map((b, i) => (
                  <circle key={i} cx={(i / (burndownPoints.length - 1)) * 300 + 10} cy={132 - (b.remaining / maxBurndown) * 120} r="3" fill="#f43f5e" />
                ))}
              </svg>
            </div>
          )}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-5 border-t border-dashed border-white/30" /><span className="text-[10px] text-muted-foreground">Ideal</span></div>
            <div className="flex items-center gap-1.5"><div className="w-5 border-t-2 border-rose-500" /><span className="text-[10px] text-muted-foreground">Actual</span></div>
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className={`${glass} p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <Flag className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-bold text-foreground">Priority Breakdown</span>
          </div>
          <div className="space-y-3">
            {[
              { label: "High",   color: "#f43f5e", count: priorityCounts["High"]   || 0 },
              { label: "Medium", color: "#f59e0b", count: priorityCounts["Medium"] || 0 },
              { label: "Low",    color: "#14b8a6", count: priorityCounts["Low"]    || 0 },
            ].map(p => (
              <div key={p.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold" style={{ color: p.color }}>{p.label}</span>
                  <span className="text-muted-foreground">{p.count} tasks</span>
                </div>
                <div className="h-3 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${p.color}99, ${p.color})` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(p.count / (filteredTasks.length || 1)) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/[0.06] grid grid-cols-3 gap-3">
            {[
              { label: "Total Tasks",   val: filteredTasks.length,                   color: "text-sky-400" },
              { label: "Story Points",  val: filteredTasks.reduce((a,t) => a + (t.efforts||0), 0), color: "text-teal-400" },
              { label: "Completed",     val: filteredTasks.filter(t => ["CLOSED", "PROD_DEPLOYED", "PROD_COMPLETED"].includes(t.status)).length, color: "text-emerald-400" },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className={`text-lg font-black ${stat.color}`}>{stat.val}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

/* ─── Export Utils ─── */
function exportCSV(tasks: Task[], filename: string, setDownloadTarget: (target: any) => void) {
  const headers = ["ID", "Title", "Status", "Priority", "Story Points", "Assignee", "Sprint ID", "Created"]
  const rows = tasks.map(t => [
    t.jtrackId,
    `"${t.title.replace(/"/g, '""')}"`,
    t.status,
    t.priority,
    t.efforts,
    getAssignedDevNames(t),
    t.sprintId || "",
    t.createdDate?.split("T")[0] || "",
  ])
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
  const base64Data = "data:text/csv;base64," + btoa(unescape(encodeURIComponent(csv)))
  setDownloadTarget({ base64Data, defaultFileName: filename })
}

async function exportPDF(elementId: string, filename: string, setDownloadTarget: (target: any) => void) {
  try {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import("jspdf"),
      import("html2canvas"),
    ])
    const el = document.getElementById(elementId)
    if (!el) return
    const canvas = await html2canvas(el, { backgroundColor: "#080b18", scale: 1.5 })
    const imgData = canvas.toDataURL("image/png")
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width / 1.5, canvas.height / 1.5] })
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 1.5, canvas.height / 1.5)
    const base64Data = pdf.output("datauristring")
    setDownloadTarget({ base64Data, defaultFileName: filename })
  } catch (err) {
    console.error("PDF export failed", err)
  }
}

/* ─── Main Sprints Page ─── */
export default function SprintsPage() {
  const { sprints, fetchSprints, createSprint, updateSprint, deleteSprint, startSprint, completeSprint, assignTaskToSprint } = useSprintStore()
  const { tasks, users, fetchData, updateTask, addToast, setDownloadTarget } = useTaskStore()
  const { user } = useAuthStore()

  const [showCreate, setShowCreate]   = useState(false)
  const [editSprint, setEditSprint]   = useState<Sprint | null>(null)
  const [view, setView]               = useState<"board" | "backlog" | "timeline" | "reports">("board")
  const [expandedSprint, setExpandedSprint] = useState<number | null>(null)
  const [actionLoading, setActionLoading]   = useState<number | null>(null)
  const [errorMsg, setErrorMsg]       = useState("")
  const [selectedTask, setSelectedTask]     = useState<Task | null>(null)
  const [editTask, setEditTask]       = useState<Task | null>(null)
  const [exporting, setExporting]     = useState(false)

  const isAdmin = user?.roles?.some(r => ["DEVADMIN","TESTADMIN"].includes(r))
  const activeSprint    = sprints.find(s => s.status === "ACTIVE")
  const backlogTasks    = tasks.filter(t => !t.sprintId)
  const activeSprintTasks = tasks.filter(t => t.sprintId === activeSprint?.id)
  const futureSprints   = sprints.filter(s => s.status === "FUTURE")
  const completedSprints = sprints.filter(s => s.status === "COMPLETED")

  useEffect(() => { fetchSprints(); fetchData() }, [])

  const handleStart = async (sprint: Sprint) => {
    setActionLoading(sprint.id); setErrorMsg("")
    try { await startSprint(sprint.id); addToast(`Sprint "${sprint.name}" started!`, "success") }
    catch (e: any) { setErrorMsg(e.message || "Failed to start sprint"); addToast(e.message || "Failed to start sprint", "error") }
    setActionLoading(null)
  }

  const handleComplete = async (sprint: Sprint) => {
    setActionLoading(sprint.id); setErrorMsg("")
    try { await completeSprint(sprint.id); await fetchData(); addToast(`Sprint "${sprint.name}" completed! 🎉`, "success") }
    catch (e: any) { setErrorMsg(e.message || "Failed to complete sprint"); addToast(e.message || "Failed to complete sprint", "error") }
    setActionLoading(null)
  }

  const handleDelete = async (sprint: Sprint) => {
    if (!window.confirm(`Delete "${sprint.name}"? Tasks will be moved to backlog.`)) return
    setActionLoading(sprint.id)
    try { await deleteSprint(sprint.id); await fetchData(); addToast(`Sprint deleted`, "info") }
    catch (e: any) { setErrorMsg(e.message || "Failed to delete sprint"); addToast(e.message || "Failed to delete sprint", "error") }
    setActionLoading(null)
  }

  const handleAssign = async (taskId: number, sprintId: number | null) => {
    try { await assignTaskToSprint(taskId, sprintId); await fetchData(); addToast("Task sprint assignment updated", "success") }
    catch (e: any) { setErrorMsg(e.message || "Failed to assign task"); addToast(e.message || "Failed to assign task", "error") }
  }

  const handleUpdateTask = useCallback(async (taskId: number, data: Partial<Task>) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || !user) return
    try {
      await updateTask(taskId, data, "Updated via Sprint Board", user as any)
      // If sprint changed, also update sprint assignment
      if (data.sprintId !== undefined && data.sprintId !== task.sprintId) {
        await assignTaskToSprint(taskId, data.sprintId ?? null)
      }
      fetchData()
      addToast(`Task "${task.jtrackId}" updated successfully`, "success")
    } catch (e: any) {
      addToast(e.message || "Failed to update task", "error")
    }
  }, [tasks, user, updateTask, assignTaskToSprint, fetchData, addToast])

  const handleExportCSV = () => {
    const toExport = view === "backlog" ? backlogTasks : view === "board" && activeSprint ? activeSprintTasks : tasks
    exportCSV(toExport, `sprint-export-${Date.now()}.csv`, setDownloadTarget)
  }

  const handleExportPDF = async () => {
    setExporting(true)
    await exportPDF("sprint-print-area", `sprint-report-${Date.now()}.pdf`, setDownloadTarget)
    setExporting(false)
  }

  const doneTasks = activeSprintTasks.filter(t => ["CLOSED","PROD_COMPLETED","PROD_DEPLOYED"].includes(t.status))
  const progressPct = activeSprintTasks.length > 0 ? Math.round((doneTasks.length / activeSprintTasks.length) * 100) : 0

  const TABS = [
    { id: "board",    icon: LayoutGrid,  label: "Board" },
    { id: "backlog",  icon: List,        label: "Backlog" },
    { id: "timeline", icon: Calendar,    label: "Timeline" },
    { id: "reports",  icon: BarChart2,   label: "Reports" },
  ] as const

  return (
    <div className="space-y-6" id="sprint-print-area">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <Zap className="h-5 w-5 text-sky-500" />
            <span className="bg-gradient-to-r from-sky-600 via-sky-500 to-teal-500 dark:from-sky-300 dark:via-sky-200 dark:to-teal-300 bg-clip-text text-transparent">
              Sprint Board
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Agile sprint planning · backlog · timeline · reports</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tab Switcher */}
          <div className="relative flex items-center bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 gap-0.5">
            {TABS.map(tab => {
              const Icon = tab.icon
              const active = view === tab.id
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setView(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all z-10 ${active ? "bg-gradient-to-r from-sky-600/30 to-teal-500/20 text-sky-300 border border-sky-500/30" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon className="h-3.5 w-3.5" />{tab.label}
                </button>
              )
            })}
          </div>

          {/* Export Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all">
              <Download className="h-3.5 w-3.5" /> Export
              <ChevronDown className="h-3 w-3" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-white/[0.08] bg-[#0d1425]/95 backdrop-blur-xl shadow-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30">
              <button onClick={handleExportCSV} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-foreground hover:bg-white/[0.06] transition-colors">
                <FileText className="h-3.5 w-3.5 text-teal-400" /> Export CSV
              </button>
              <button onClick={handleExportPDF} disabled={exporting} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-foreground hover:bg-white/[0.06] transition-colors disabled:opacity-50">
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" /> : <FileText className="h-3.5 w-3.5 text-sky-400" />}
                {exporting ? "Generating…" : "Export PDF"}
              </button>
            </div>
          </div>

          {isAdmin && (
            <button
              id="create-sprint-btn"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 text-white text-xs font-bold shadow-[0_0_16px_rgba(14,165,233,0.35)] hover:opacity-90 transition-all"
            >
              <Plus className="h-3.5 w-3.5" /> New Sprint
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm"
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg("")}><X className="h-4 w-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BOARD VIEW ── */}
      {view === "board" && (
        <div className="space-y-4">
          {activeSprint ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Active sprint banner */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md p-5 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-400 to-teal-500 rounded-l-2xl" />
                <div className="pl-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <SprintStatusBadge status="ACTIVE" />
                        <h2 className="font-bold text-lg text-foreground">{activeSprint.name}</h2>
                      </div>
                      {activeSprint.goal && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Target className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-teal-400" />
                          <span>{activeSprint.goal}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{activeSprint.startDate} → {activeSprint.endDate}</span>
                        <span className="flex items-center gap-1"><Flag className="h-3 w-3" />{activeSprintTasks.length} tasks</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{activeSprintTasks.reduce((s, t) => s + (t.efforts || 0), 0)} pts</span>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditSprint(activeSprint)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] text-xs font-semibold text-muted-foreground hover:bg-white/[0.04] transition-all"
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleComplete(activeSprint)}
                          disabled={actionLoading === activeSprint.id}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {actionLoading === activeSprint.id ? "Completing…" : "Complete Sprint"}
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Progress */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                      <span>Sprint Progress</span>
                      <span>{doneTasks.length} / {activeSprintTasks.length} done · {progressPct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-sky-500 to-teal-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <KanbanBoard tasks={activeSprintTasks} onTaskClick={setSelectedTask} onTaskEdit={setEditTask} onTaskUpdate={handleUpdateTask} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-64 text-center space-y-4 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01]"
            >
              <div className="h-12 w-12 rounded-2xl bg-white/[0.05] flex items-center justify-center">
                <Zap className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <div>
                <p className="font-semibold text-foreground">No Active Sprint</p>
                <p className="text-xs text-muted-foreground mt-1">Start a sprint from the backlog to begin tracking tasks on the board.</p>
              </div>
              {isAdmin && futureSprints.length > 0 && (
                <button
                  onClick={() => handleStart(futureSprints[0])}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 text-white text-xs font-bold shadow-[0_0_16px_rgba(14,165,233,0.3)]"
                >
                  <Play className="h-3.5 w-3.5" /> Start "{futureSprints[0].name}"
                </button>
              )}
            </motion.div>
          )}

          {/* Future sprints */}
          {futureSprints.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Upcoming Sprints</h3>
              {futureSprints.map(sprint => {
                const sprintTasks = tasks.filter(t => t.sprintId === sprint.id)
                const isExpanded = expandedSprint === sprint.id
                return (
                  <motion.div key={sprint.id} layout className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                      onClick={() => setExpandedSprint(isExpanded ? null : sprint.id)}
                    >
                      <div className="flex items-center gap-3">
                        <SprintStatusBadge status={sprint.status} />
                        <div>
                          <span className="font-semibold text-sm text-foreground">{sprint.name}</span>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{sprint.startDate} → {sprint.endDate}</span>
                            <span>{sprintTasks.length} tasks · {sprintTasks.reduce((s, t) => s + (t.efforts || 0), 0)} pts</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <>
                            <button onClick={e => { e.stopPropagation(); setEditSprint(sprint) }} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground transition-colors">
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            {!activeSprint && (
                              <button
                                onClick={e => { e.stopPropagation(); handleStart(sprint) }}
                                disabled={actionLoading === sprint.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/20 text-sky-400 text-xs font-bold hover:bg-sky-600/30 border border-sky-600/30 transition-colors"
                              >
                                <Play className="h-3 w-3" /> Start
                              </button>
                            )}
                            <button onClick={e => { e.stopPropagation(); handleDelete(sprint) }} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="border-t border-white/[0.06]">
                          <div className="p-4 space-y-2">
                            {sprintTasks.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-4">No tasks. Add from Backlog view.</p>
                            ) : (
                              sprintTasks.map(task => (
                                <div key={task.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04] text-xs group">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-sky-400">{task.jtrackId}</span>
                                    <span className="text-foreground truncate max-w-xs">{task.title}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS["Medium"]}`}>{task.priority}</span>
                                    <button
                                      onClick={() => setEditTask(task)}
                                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/[0.1] text-muted-foreground hover:text-sky-400 transition-all"
                                    >
                                      <Edit3 className="h-3 w-3" />
                                    </button>
                                    <button onClick={() => handleAssign(task.id, null)} className="text-muted-foreground hover:text-rose-400 transition-colors">
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Completed sprints */}
          {completedSprints.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Completed Sprints ({completedSprints.length})</h3>
              {completedSprints.slice(0, 3).map(sprint => {
                const sprintTasks = tasks.filter(t => t.sprintId === sprint.id)
                return (
                  <div key={sprint.id} className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.02] text-sm">
                    <div className="flex items-center gap-3">
                      <SprintStatusBadge status="COMPLETED" />
                      <span className="font-medium text-foreground/80">{sprint.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{sprint.startDate} → {sprint.endDate}</span>
                      <span className="flex items-center gap-1"><Archive className="h-3 w-3" />{sprintTasks.length} tasks</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── BACKLOG VIEW ── */}
      {view === "backlog" && (
        <div className="space-y-6">
          {/* Active sprint tasks in backlog mode */}
          {activeSprint && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4 text-sky-400" />
                    {activeSprint.name}
                    <SprintStatusBadge status="ACTIVE" />
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{activeSprintTasks.length} work items · {activeSprint.startDate} → {activeSprint.endDate}</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleComplete(activeSprint)}
                    disabled={actionLoading === activeSprint.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-400 text-xs font-bold border border-emerald-600/30 hover:bg-emerald-600/30 transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Complete Sprint
                  </button>
                )}
              </div>
              {activeSprintTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4 rounded-xl border border-dashed border-white/[0.06]">No tasks in active sprint. Add from backlog below.</p>
              ) : (
                <div className="space-y-1.5">
                  {activeSprintTasks.map(task => (
                    <motion.div key={task.id} layout whileHover={{ borderColor: "rgba(14,165,233,0.3)" }}
                      className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] transition-all group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-[10px] font-mono font-bold text-sky-400 shrink-0">{task.jtrackId}</span>
                        <span className="text-sm text-foreground truncate">{task.title}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS["Medium"]}`}>{task.priority}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        {task.assignedDeveloper && (
                          <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
                            <UserIcon className="h-3 w-3" />
                            <span>{task.assignedDeveloper.fullName}</span>
                          </div>
                        )}
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getCRStatusBadgeClass(task.status)}`}>{task.status.replace(/_/g, " ")}</span>
                        <button
                          id={`edit-task-${task.id}`}
                          onClick={() => setEditTask(task)}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-500/10 text-sky-400 text-[10px] font-bold border border-sky-500/20 hover:bg-sky-500/20 transition-all"
                        >
                          <Edit3 className="h-3 w-3" /> Edit
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Future sprints in backlog */}
          {futureSprints.map(sprint => {
            const sprintTasks = tasks.filter(t => t.sprintId === sprint.id)
            return (
              <div key={sprint.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {sprint.name}
                      <SprintStatusBadge status="FUTURE" />
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{sprintTasks.length} work items</p>
                  </div>
                  {isAdmin && !activeSprint && (
                    <button
                      onClick={() => handleStart(sprint)}
                      disabled={actionLoading === sprint.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-600/20 text-sky-400 text-xs font-bold border border-sky-600/30 hover:bg-sky-600/30 transition-colors"
                    >
                      <Play className="h-3.5 w-3.5" /> Start Sprint
                    </button>
                  )}
                </div>
                {sprintTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 rounded-xl border border-dashed border-white/[0.06]">Plan this sprint by dragging work items into it, or assign from backlog.</p>
                ) : (
                  <div className="space-y-1.5">
                    {sprintTasks.map(task => (
                      <motion.div key={task.id} layout whileHover={{ borderColor: "rgba(14,165,233,0.3)" }}
                        className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] transition-all group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-[10px] font-mono font-bold text-sky-400 shrink-0">{task.jtrackId}</span>
                          <span className="text-sm text-foreground truncate">{task.title}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS["Medium"]}`}>{task.priority}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          <button onClick={() => setEditTask(task)} className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-500/10 text-sky-400 text-[10px] font-bold border border-sky-500/20 hover:bg-sky-500/20 transition-all">
                            <Edit3 className="h-3 w-3" /> Edit
                          </button>
                          <button onClick={() => handleAssign(task.id, null)} className="text-muted-foreground hover:text-rose-400 transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Pure Backlog */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-foreground flex items-center gap-2">
                  <Archive className="h-4 w-4 text-muted-foreground" /> Backlog
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{backlogTasks.length} unassigned tasks</p>
              </div>
              {isAdmin && (
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600/20 text-sky-400 text-xs font-bold border border-sky-600/30 hover:bg-sky-600/30 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Create Sprint
                </button>
              )}
            </div>
            {backlogTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 rounded-2xl border border-dashed border-white/[0.06] text-muted-foreground/40 space-y-2">
                <CheckCircle2 className="h-8 w-8" />
                <p className="text-sm">All tasks are assigned to sprints!</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {backlogTasks.map(task => (
                  <motion.div key={task.id} layout whileHover={{ borderColor: "rgba(14,165,233,0.3)" }}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] transition-all group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-[10px] font-mono font-bold text-sky-400 shrink-0">{task.jtrackId}</span>
                      <span className="text-sm text-foreground truncate">{task.title}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS["Medium"]}`}>{task.priority}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {task.assignedDeveloper && (
                        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
                          <UserIcon className="h-3 w-3" />
                          <span>{task.assignedDeveloper.fullName}</span>
                        </div>
                      )}
                      {(activeSprint || futureSprints.length > 0) && (
                        <select
                          onChange={e => e.target.value && handleAssign(task.id, parseInt(e.target.value))}
                          className="bg-white dark:bg-[#0d1525] border border-slate-300 dark:border-white/[0.15] rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all"
                          defaultValue=""
                        >
                          <option value="" disabled>Add to sprint…</option>
                          {[...(activeSprint ? [activeSprint] : []), ...futureSprints].map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      )}
                      <button
                        id={`edit-backlog-${task.id}`}
                        onClick={() => setEditTask(task)}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-500/10 text-sky-400 text-[10px] font-bold border border-sky-500/20 hover:bg-sky-500/20 transition-all"
                      >
                        <Edit3 className="h-3 w-3" /> Edit
                      </button>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getCRStatusBadgeClass(task.status)}`}>{task.status.replace(/_/g, " ")}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TIMELINE VIEW ── */}
      {view === "timeline" && (
        <GanttTimeline sprints={sprints} tasks={tasks} onTaskClick={setSelectedTask} />
      )}

      {/* ── REPORTS VIEW ── */}
      {view === "reports" && (
        <SprintReports sprints={sprints} tasks={tasks} />
      )}

      {/* Modals */}
      <AnimatePresence>
        {(showCreate || editSprint) && (
          <CreateSprintModal
            initial={editSprint}
            onClose={() => { setShowCreate(false); setEditSprint(null) }}
            onSave={async (data) => {
              if (editSprint) {
                await updateSprint(editSprint.id, data)
                addToast(`Sprint "${data.name}" updated`, "success")
              } else {
                await createSprint(data)
                addToast(`Sprint "${data.name}" created`, "success")
              }
            }}
          />
        )}
        {selectedTask && <TaskDetailsModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
        {editTask && (
          <UpdateTaskModal
            task={editTask}
            sprints={sprints}
            users={users}
            onClose={() => setEditTask(null)}
            onSave={handleUpdateTask}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
