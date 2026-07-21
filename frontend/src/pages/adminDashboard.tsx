import { useEffect, useState, Fragment } from "react"
import { useNavigate } from "react-router-dom"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useTaskStore } from "@/store/taskStore"
import {
  Users,
  Sparkles,
  Code,
  Trash2,
  Rocket,
  Bug as BugIcon,
  ExternalLink,
  ShieldAlert,
  X,
  GitBranch,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react"
import BugDetailModal from "@/components/shared/BugDetailModal"
import { CRTimelinePopup } from "@/components/shared/CRTimelinePopup"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend
} from "recharts"
import APP_CONFIG from "@/config/appConfig"
import type { Task } from "@/services/mockData"

/* ─── tiny helpers ─── */
const glassCard =
  "rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] shadow-sm dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"

const BAR_COLORS = [
  "#64748b", "#3b82f6", "#06b6d4", "#14b8a6", "#10b981",
  "#8b5cf6", "#a78bfa", "#d946ef", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e",
]

/* ─── KPI Detail Popup ─── */
interface KpiPopupItem {
  id: number
  label: string
  subLabel?: string
  badge?: { text: string; color: string }
  onClick?: () => void
}

interface KpiPopupProps {
  title: string
  subtitle: string
  iconBg: string
  iconColor: string
  Icon: React.ElementType
  items: KpiPopupItem[]
  emptyText: string
  onClose: () => void
}

function KpiDetailPopup({ title, subtitle, iconBg, iconColor, Icon, items, emptyText, onClose }: KpiPopupProps) {
  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 16 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="relative bg-white dark:bg-[#080c18] border border-slate-200 dark:border-white/[0.08] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden z-10"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center ${iconColor}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100">{title}</h3>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Item list */}
        <div className="p-4 max-h-80 overflow-y-auto space-y-2">
          {items.length === 0 ? (
            <p className="text-center text-xs text-slate-400 dark:text-zinc-500 py-8 italic">{emptyText}</p>
          ) : (
            items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] ${
                  item.onClick
                    ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:border-violet-300 dark:hover:border-violet-500/20 transition-all'
                    : ''
                }`}
                onClick={item.onClick}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate">{item.label}</p>
                  {item.subLabel && <p className="text-[10px] text-slate-500 dark:text-zinc-500 truncate mt-0.5">{item.subLabel}</p>}
                </div>
                {item.badge && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${item.badge.color}`}>
                    {item.badge.text}
                  </span>
                )}
                {item.onClick && <ExternalLink className="h-3 w-3 text-slate-400 dark:text-zinc-600 shrink-0" />}
              </motion.div>
            ))
          )}
        </div>

        <div className="px-6 pb-4 pt-1 border-t border-slate-200 dark:border-white/[0.04]">
          <p className="text-[10px] text-slate-400 dark:text-zinc-600 text-center">{items.length} item{items.length !== 1 ? 's' : ''} total</p>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { tasks, bugs, fetchData, deleteTask, addToast } = useTaskStore()
  const [selectedBugDetailId, setSelectedBugDetailId] = useState<number | null>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [deadlineAnalytics, setDeadlineAnalytics] = useState<any>(null)
  const [activeKpi, setActiveKpi] = useState<string | null>(null)
  const [timelineTask, setTimelineTask] = useState<Task | null>(null)
  const [deleteRemarksTask, setDeleteRemarksTask] = useState<Task | null>(null)
  const [deleteRemarks, setDeleteRemarks] = useState("")

  // Column filters for Change Request Audit & Pipeline Tracking
  const [colFilterCr, setColFilterCr] = useState("")
  const [colFilterTitle, setColFilterTitle] = useState("")
  const [colFilterPriority, setColFilterPriority] = useState("")
  const [colFilterStatus, setColFilterStatus] = useState("")
  const [colFilterDeveloper, setColFilterDeveloper] = useState("")

  const filteredAuditTasks = [...tasks]
    .sort((a, b) => b.id - a.id)
    .filter(cr => {
    if (colFilterCr.trim() && !cr.jtrackId.toLowerCase().includes(colFilterCr.toLowerCase().trim())) return false
    if (colFilterTitle.trim() && !cr.title.toLowerCase().includes(colFilterTitle.toLowerCase().trim())) return false
    if (colFilterPriority && cr.priority !== colFilterPriority) return false
    if (colFilterStatus && cr.status !== colFilterStatus) return false
    if (colFilterDeveloper.trim()) {
      const devName = cr.assignedDeveloper?.fullName || "Unassigned"
      if (!devName.toLowerCase().includes(colFilterDeveloper.toLowerCase().trim())) return false
    }
    return true
  })

  useEffect(() => {
    fetchData()
    fetch(`${APP_CONFIG.apiUrl}/api/analytics/dashboard`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(r => r.json())
      .then(setAnalytics)
      .catch(() => {});

    fetch(`${APP_CONFIG.apiUrl}/api/analytics/deadlines`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(r => r.json())
      .then(setDeadlineAnalytics)
      .catch(() => {});
  }, [])

  /* ── chart ── */
  const statusCounts = tasks.reduce((acc: Record<string, number>, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {})

  const chartData = [
    { name: "OPEN", count: statusCounts["OPEN"] || 0 },
    { name: "DEV", count: statusCounts["IN_PROGRESS"] || 0 },
    { name: "SIT_DEP", count: statusCounts["SIT_DEPLOYED"] || 0 },
    { name: "SIT_TEST", count: statusCounts["SIT_TESTING"] || 0 },
    { name: "SIT_DONE", count: statusCounts["SIT_COMPLETED"] || 0 },
    { name: "REVIEW", count: statusCounts["CODE_REVIEW"] || 0 },
    { name: "REV_DONE", count: statusCounts["CODE_REVIEW_DONE"] || 0 },
    { name: "UAT_DEP", count: statusCounts["MOVE_TO_UAT"] || 0 },
    { name: "UAT_TEST", count: statusCounts["UAT_TESTING"] || 0 },
    { name: "UAT_DONE", count: statusCounts["UAT_COMPLETED"] || 0 },
    { name: "PROD_DEP", count: statusCounts["PROD_DEPLOYED"] || 0 },
    { name: "PROD_DONE", count: statusCounts["PROD_COMPLETED"] || 0 },
    { name: "CLOSED", count: statusCounts["CLOSED"] || 0 },
  ]

  const totalTasksCount = tasks.filter((t) => ["CR", "FIX", "SR", "NEW_REQ"].includes(t.type?.name)).length

  const priorityBadge = (priority: string) => {
    if (priority === "High")
      return "bg-rose-500/10 text-rose-400 border border-rose-500/20"
    if (priority === "Medium")
      return "bg-amber-500/10 text-amber-400 border border-amber-500/20"
    return "bg-slate-500/10 text-slate-400 border border-slate-500/20"
  }

  /* ── kpi card config ── */
  type KpiKey = "total" | "quality" | "bugs" | "sprint" | "acceptance" | "rejection" | "testingSla" | "missedDeadlines"

  const kpiCards: Array<{
    key: KpiKey
    title: string
    count: string | number
    icon: React.ElementType
    iconBg: string
    iconColor: string
    glow: string
    trendIcon: React.ElementType
    getItems: () => KpiPopupItem[]
    popupSubtitle: string
    emptyText: string
  }> = [
    {
      key: "total",
      title: "Total Tasks / CRs",
      count: analytics?.totalCRs ?? totalTasksCount,
      icon: Users,
      iconBg: "bg-blue-500/15",
      iconColor: "text-blue-400",
      glow: "shadow-[0_0_18px_rgba(59,130,246,0.12)]",
      trendIcon: TrendingUp,
      popupSubtitle: "All active CRs and tasks in the pipeline",
      emptyText: "No tasks found.",
      getItems: () => [...tasks].sort((a, b) => b.id - a.id).map(t => ({
        id: t.id,
        label: `${t.jtrackId} — ${t.title}`,
        subLabel: `${t.status.replace(/_/g,' ')} · ${t.priority}`,
        badge: { text: t.status.replace(/_/g,' '), color: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/20" },
        onClick: () => setTimelineTask(t)
      }))
    },
    {
      key: "quality",
      title: "Quality Risks",
      count: analytics?.qualityRiskCrCount ?? tasks.filter(t => (t as any).isQualityRisk).length,
      icon: ShieldAlert,
      iconBg: "bg-rose-500/15",
      iconColor: "text-rose-400",
      glow: "shadow-[0_0_18px_rgba(244,63,94,0.12)]",
      trendIcon: AlertCircle,
      popupSubtitle: "CRs flagged as quality-at-risk",
      emptyText: "No quality risks identified.",
      getItems: () => [...tasks].filter(t => (t as any).isQualityRisk).sort((a, b) => b.id - a.id).map(t => ({
        id: t.id,
        label: `${t.jtrackId} — ${t.title}`,
        subLabel: `Priority: ${t.priority} · Status: ${t.status.replace(/_/g,' ')}`,
        badge: { text: "QUALITY RISK", color: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20" },
        onClick: () => setTimelineTask(t)
      }))
    },
    {
      key: "bugs",
      title: "Total Raised Bugs",
      count: analytics?.totalBugs ?? bugs.length,
      icon: BugIcon,
      iconBg: "bg-red-500/15",
      iconColor: "text-red-400",
      glow: "shadow-[0_0_18px_rgba(239,68,68,0.12)]",
      trendIcon: BugIcon,
      popupSubtitle: "All bugs raised across all CRs",
      emptyText: "No bugs raised yet.",
      getItems: () => [...bugs].sort((a, b) => b.id - a.id).map(b => ({
        id: b.id,
        label: `${b.jtrackId} — ${b.title}`,
        subLabel: `Severity: ${b.severity} · By: ${b.raisedBy?.fullName}`,
        badge: {
          text: b.status,
          color: b.status === 'OPEN' ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/20' :
                 b.status === 'RESOLVED' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20' :
                 'bg-zinc-100 dark:bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-500/20'
        },
        onClick: () => setSelectedBugDetailId(b.id)
      }))
    },
    {
      key: "sprint",
      title: "Sprint Task Completion",
      count: analytics?.sprintTaskCompletionRate != null ? `${analytics.sprintTaskCompletionRate}%` : "—",
      icon: Rocket,
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-400",
      glow: "shadow-[0_0_18px_rgba(16,185,129,0.12)]",
      trendIcon: CheckCircle2,
      popupSubtitle: "Sprint task completion rates",
      emptyText: "No sprint completion data available.",
      getItems: () => []
    },
    {
      key: "acceptance",
      title: "Bug Acceptance %",
      count: analytics?.bugAcceptanceRate != null ? `${analytics.bugAcceptanceRate}%` : "—",
      icon: Sparkles,
      iconBg: "bg-violet-500/15",
      iconColor: "text-violet-400",
      glow: "shadow-[0_0_18px_rgba(139,92,246,0.12)]",
      trendIcon: CheckCircle2,
      popupSubtitle: "Percentage of bugs accepted by developers",
      emptyText: "No acceptance data available.",
      getItems: () => [...bugs].filter(b => b.status !== 'OPEN').sort((a, b) => b.id - a.id).map(b => ({
        id: b.id,
        label: `${b.jtrackId} — ${b.title}`,
        subLabel: `Status: ${b.status} · By: ${b.raisedBy?.fullName}`,
        badge: { text: b.status, color: "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/20" },
        onClick: () => setSelectedBugDetailId(b.id)
      }))
    },
    {
      key: "rejection",
      title: "Bug Rejection %",
      count: analytics?.bugRejectionRate != null ? `${analytics.bugRejectionRate}%` : "—",
      icon: Trash2,
      iconBg: "bg-slate-500/15",
      iconColor: "text-slate-400",
      glow: "shadow-[0_0_18px_rgba(100,116,139,0.12)]",
      trendIcon: AlertCircle,
      popupSubtitle: "Percentage of bugs rejected by developers",
      emptyText: "No rejection data available.",
      getItems: () => []
    },
    {
      key: "testingSla",
      title: "Testing SLA (48h)",
      count: analytics?.testingSlaComplianceRate != null ? `${analytics.testingSlaComplianceRate}%` : "—",
      icon: Code,
      iconBg: "bg-cyan-500/15",
      iconColor: "text-cyan-400",
      glow: "shadow-[0_0_18px_rgba(6,182,212,0.12)]",
      trendIcon: Clock,
      popupSubtitle: "CRs that completed testing within 48 hour SLA",
      emptyText: "No SLA data available.",
      getItems: () => [...tasks].filter(t => t.testingDuration).sort((a, b) => b.id - a.id).map(t => ({
        id: t.id,
        label: `${t.jtrackId} — ${t.title}`,
        subLabel: `Testing Duration: ${t.testingDuration?.replace(/-/g, '')}`,
        badge: { text: t.status.replace(/_/g,' '), color: "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/20" },
        onClick: () => setTimelineTask(t)
      }))
    },
    {
      key: "missedDeadlines",
      title: "Missed Deadlines",
      count: deadlineAnalytics?.totalMissedDeadlines ?? 0,
      icon: AlertCircle,
      iconBg: "bg-rose-500/15",
      iconColor: "text-rose-400",
      glow: "shadow-[0_0_18px_rgba(244,63,94,0.12)]",
      trendIcon: AlertCircle,
      popupSubtitle: "CRs that missed expected SIT or UAT deployment commitments",
      emptyText: "No missed deadlines.",
      getItems: () => []
    },
  ]

  const activeKpiCard = activeKpi ? kpiCards.find(c => c.key === activeKpi) : null

  return (
    <>
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-transparent dark:bg-gradient-to-r dark:from-white dark:via-slate-200 dark:to-slate-400 dark:bg-clip-text">
            Admin Operations
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Configure workflows, audit multi-developer collaborations, and
            review code approvals.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-violet-400/30 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/[0.07] text-violet-700 dark:text-violet-300 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Principal Dashboard Enabled</span>
        </div>
      </motion.div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08, duration: 0.4 }}
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => card.key === "missedDeadlines" ? navigate("/dashboard/missed-deadlines") : setActiveKpi(card.key)}
            className={`${glassCard} p-4 flex items-center justify-between ${card.glow} cursor-pointer hover:border-slate-300 dark:hover:border-white/[0.1] transition-all relative overflow-hidden group`}
          >
            {/* Animated background shimmer on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
            <div className="space-y-1 relative z-10">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {card.title}
              </span>
              <h2 className="text-3xl font-black tracking-tight text-foreground">
                {card.count}
              </h2>
              <p className="text-[9px] text-muted-foreground/60 font-medium">Click to view details</p>
            </div>
            <div
              className={`h-11 w-11 rounded-xl ${card.iconBg} flex items-center justify-center ${card.iconColor} flex-shrink-0 relative z-10 transition-transform group-hover:scale-110`}
            >
              <card.icon className="h-5 w-5" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Analytics & Charts Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1: Workflow Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className={`${glassCard} p-5`}
        >
          <div className="mb-4">
            <h2 className="text-sm font-bold text-foreground">Workflow Distribution</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">Active tasks distributed across sequential workflow stages</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(7,13,26,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "11px", color: "white" }}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Chart 2: Quality Risk Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className={`${glassCard} p-5`}
        >
          <div className="mb-4">
            <h2 className="text-sm font-bold text-foreground">Quality Risk Trend</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">Active quality-at-risk Change Requests flagged over the past week</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.qualityTrend || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRisks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(7,13,26,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "11px", color: "white" }}
                />
                <Area type="monotone" dataKey="Quality Risks" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorRisks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Chart 3: SLA Compliance Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className={`${glassCard} p-5`}
        >
          <div className="mb-4">
            <h2 className="text-sm font-bold text-foreground">SLA Compliance Trends</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">SLA achievement rates (48h Testing & 24h Deploy/Approval) across Sprints</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.slaCompliance || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: "rgba(7,13,26,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "11px", color: "white" }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px' }} />
                <Line type="monotone" dataKey="Testing SLA" stroke="#06b6d4" strokeWidth={2.5} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Approval SLA" stroke="#eab308" strokeWidth={2.5} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Chart 4: Bug Conversion Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className={`${glassCard} p-5`}
        >
          <div className="mb-4">
            <h2 className="text-sm font-bold text-foreground">Bug Conversion Analysis</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">Distribution of tester-proposed bugs reviewed by developers</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.bugConversion || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(7,13,26,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "11px", color: "white" }}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]}>
                  {analytics?.bugConversion?.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[(index + 4) % BAR_COLORS.length]} />
                  )) || null}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Chart 5: Developer / Tester Response Times */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className={`${glassCard} p-5`}
        >
          <div className="mb-4">
            <h2 className="text-sm font-bold text-foreground">Collaboration Response Times (Hours)</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">Average time for Developers (Fixing) and Testers (Verifying)</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[...(analytics?.developerResponseTimes || []), ...(analytics?.testerResponseTimes || [])]}
                layout="vertical"
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <XAxis type="number" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(7,13,26,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "11px", color: "white" }}
                />
                <Bar dataKey="Response Time" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Chart 6: Sprint Burndown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className={`${glassCard} p-5`}
        >
          <div className="mb-4">
            <h2 className="text-sm font-bold text-foreground">Sprint Burndown</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">Sprint remaining work compared against ideal line</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.sprintBurndown || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(7,13,26,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "11px", color: "white" }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px' }} />
                <Line type="monotone" dataKey="Remaining" stroke="#f43f5e" strokeWidth={2} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="Ideal" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* ── CR Tracking Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5 }}
        className={`${glassCard} overflow-hidden`}
      >
        <div className="flex items-center gap-2.5 p-5 border-b border-slate-200 dark:border-white/[0.06]">
          <div className="h-8 w-8 rounded-lg bg-violet-500/15 flex items-center justify-center text-violet-400">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Change Request Audit & Pipeline Tracking
            </h2>
            <p className="text-[10px] text-muted-foreground">
              Click on a CR to view its full pipeline timeline as an animated walkthrough
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-y border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02]">
                <th className="p-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                  CR Number
                </th>
                <th className="p-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                  Title
                </th>
                <th className="p-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                  Priority
                </th>
                <th className="p-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                  Status
                </th>
                <th className="p-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                  Assigned Developer
                </th>
                <th className="p-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap text-right">
                  Actions
                </th>
              </tr>

              {/* Column Filters Row */}
              <tr className="border-b border-slate-200 dark:border-white/[0.06] bg-slate-100/50 dark:bg-black/30">
                <td className="p-2">
                  <input
                    type="text"
                    placeholder="Filter CR..."
                    value={colFilterCr}
                    onChange={(e) => setColFilterCr(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-[10px] text-foreground outline-none focus:border-violet-500/50"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    placeholder="Filter Title..."
                    value={colFilterTitle}
                    onChange={(e) => setColFilterTitle(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-[10px] text-foreground outline-none focus:border-violet-500/50"
                  />
                </td>
                <td className="p-2">
                  <select
                    value={colFilterPriority}
                    onChange={(e) => setColFilterPriority(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-[10px] text-foreground outline-none focus:border-violet-500/50"
                  >
                    <option value="">All Priorities</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </td>
                <td className="p-2">
                  <select
                    value={colFilterStatus}
                    onChange={(e) => setColFilterStatus(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-[10px] text-foreground outline-none focus:border-violet-500/50"
                  >
                    <option value="">All Statuses</option>
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="SIT_DEPLOYED">SIT_DEPLOYED</option>
                    <option value="SIT_TESTING">SIT_TESTING</option>
                    <option value="SIT_COMPLETED">SIT_COMPLETED</option>
                    <option value="CODE_REVIEW">CODE_REVIEW</option>
                    <option value="CODE_REVIEW_DONE">CODE_REVIEW_DONE</option>
                    <option value="MOVE_TO_UAT">MOVE_TO_UAT</option>
                    <option value="UAT_TESTING">UAT_TESTING</option>
                    <option value="UAT_COMPLETED">UAT_COMPLETED</option>
                    <option value="PROD_DEPLOYED">PROD_DEPLOYED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    placeholder="Filter Dev..."
                    value={colFilterDeveloper}
                    onChange={(e) => setColFilterDeveloper(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-[10px] text-foreground outline-none focus:border-violet-500/50"
                  />
                </td>
                <td className="p-2 text-right">
                  {(colFilterCr || colFilterTitle || colFilterPriority || colFilterStatus || colFilterDeveloper) && (
                    <button
                      onClick={() => {
                        setColFilterCr("")
                        setColFilterTitle("")
                        setColFilterPriority("")
                        setColFilterStatus("")
                        setColFilterDeveloper("")
                      }}
                      className="text-[9px] font-bold text-rose-400 hover:underline px-2 py-1"
                    >
                      Clear
                    </button>
                  )}
                </td>
              </tr>
            </thead>
            <tbody>
              {filteredAuditTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground italic">
                    No Change Requests match the selected column filters.
                  </td>
                </tr>
              ) : (
                filteredAuditTasks.map((cr) => (
                <Fragment key={cr.id}>
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-slate-200 dark:border-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-3">
                      <button
                        onClick={() => setTimelineTask(cr)}
                        className="font-mono font-bold text-violet-400 text-xs hover:text-violet-300 hover:underline flex items-center gap-1 transition-colors"
                      >
                        <GitBranch className="h-3 w-3" />
                        {cr.jtrackId}
                      </button>
                    </td>
                    <td className="p-3 font-semibold text-xs text-foreground max-w-[200px] truncate">
                      {cr.title}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${priorityBadge(cr.priority)}`}
                      >
                        {cr.priority}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground font-medium">
                      {cr.status.replace(/_/g, " ")}
                    </td>
                    <td className="p-3 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                      {cr.assignedDeveloper ? cr.assignedDeveloper.fullName : <span className="text-slate-400 dark:text-slate-500 text-[10px] italic">Unassigned</span>}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setTimelineTask(cr)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-violet-400 hover:bg-violet-500/10 transition-colors"
                        >
                          <GitBranch className="h-3 w-3" />
                          Timeline
                        </button>
                        {/* Bug Summary button */}
                        {(() => {
                          const relBugs = bugs.filter(b => b.crTaskId === cr.id)
                          return relBugs.length > 0 ? (
                            <button
                              onClick={() => {
                                const firstBug = relBugs[0]
                                setSelectedBugDetailId(firstBug.id)
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <BugIcon className="h-3 w-3" />
                              {relBugs.length} Bug{relBugs.length > 1 ? 's' : ''}
                            </button>
                          ) : null
                        })()}
                        <button
                          onClick={() => {
                            setDeleteRemarksTask(cr)
                            setDeleteRemarks("")
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                </Fragment>
              ))
            )}
          </tbody>
          </table>
        </div>
      </motion.div>
    </div>

    {/* KPI Detail Popup */}
    <AnimatePresence>
      {activeKpi && activeKpiCard && (
        <KpiDetailPopup
          title={activeKpiCard.title}
          subtitle={activeKpiCard.popupSubtitle}
          iconBg={activeKpiCard.iconBg}
          iconColor={activeKpiCard.iconColor}
          Icon={activeKpiCard.icon}
          items={activeKpiCard.getItems()}
          emptyText={activeKpiCard.emptyText}
          onClose={() => setActiveKpi(null)}
        />
      )}
    </AnimatePresence>

    {/* CR Timeline Popup */}
    <AnimatePresence>
      {timelineTask && (
        <CRTimelinePopup
          task={timelineTask}
          onClose={() => setTimelineTask(null)}
        />
      )}
    </AnimatePresence>

    {/* Bug Detail Modal */}
    {selectedBugDetailId !== null && (
      <BugDetailModal
        bugId={selectedBugDetailId}
        onClose={() => setSelectedBugDetailId(null)}
      />
    )}

    {/* Delete Confirmation Modal */}
    <AnimatePresence>
      {deleteRemarksTask && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="absolute inset-0" onClick={() => setDeleteRemarksTask(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            className="relative bg-[#080c18] border border-rose-500/30 rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 space-y-4"
          >
            <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
              <div className="h-10 w-10 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-100">Delete Change Request</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">{deleteRemarksTask.jtrackId}</p>
              </div>
              <button
                onClick={() => setDeleteRemarksTask(null)}
                className="ml-auto w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This action is irreversible. Please provide mandatory audit remarks explaining the reason for deletion of <span className="text-zinc-200 font-semibold">{deleteRemarksTask.title}</span>.
            </p>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Audit Remarks *</label>
              <textarea
                value={deleteRemarks}
                onChange={e => setDeleteRemarks(e.target.value)}
                rows={3}
                placeholder="Explain why this CR is being deleted..."
                className="w-full bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/50 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none transition-all placeholder:text-zinc-600 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setDeleteRemarksTask(null)}
                className="flex-1 h-9 rounded-xl border border-white/[0.08] text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!deleteRemarks.trim()) {
                    addToast("Deletion cancelled: Remarks are required.", "error")
                    return
                  }
                  deleteTask(deleteRemarksTask.id, deleteRemarks)
                    .then(() => {
                      addToast(`CR ${deleteRemarksTask.jtrackId} deleted.`, "success")
                      setDeleteRemarksTask(null)
                      setDeleteRemarks("")
                    })
                    .catch((err: Error) => addToast(err.message || "Failed to delete CR", "error"))
                }}
                className="flex-1 h-9 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold border border-rose-500/30 transition-all"
              >
                Confirm Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  )
}
