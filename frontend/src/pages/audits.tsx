import { useEffect, useState } from "react"
import { useTaskStore } from "@/store/taskStore"
import APP_CONFIG from "@/config/appConfig"
import { Card, CardContent } from "@/components/ui/card"
import {
  Search, Filter, ShieldAlert, History, User, FileText, ArrowRight, ArrowLeft,
  Download, Folder, FolderOpen, Clock, Activity, Users, Fingerprint, ShieldCheck,
  ChevronRight, Layers, CalendarClock, ArrowRightLeft
} from "lucide-react"
import { motion } from "framer-motion"
import { Pagination, paginate } from "@/components/shared/Pagination"

/* ── helpers ─────────────────────────────────────────────── */
const fmtRelative = (ms: number) => {
  if (!ms) return "—"
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

const typeStyles = (t: string) =>
  t === "TASK"
    ? "bg-violet-500/10 text-violet-300 border-violet-500/25"
    : t === "BUG"
      ? "bg-rose-500/10 text-rose-300 border-rose-500/25"
      : "bg-amber-500/10 text-amber-300 border-amber-500/25"

const typeDot = (t: string) =>
  t === "TASK" ? "bg-violet-400" : t === "BUG" ? "bg-rose-400" : "bg-amber-400"

function StatCard({
  icon, label, value, sub, accent,
}: { icon: React.ReactNode; label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="relative overflow-hidden p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md group hover:border-white/[0.12] transition-colors">
      <div className={`absolute -top-8 -right-8 w-24 h-24 blur-[60px] rounded-full pointer-events-none ${accent}`} />
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-200 shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold text-white leading-tight">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground/70 truncate">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

export default function Audits() {
  const { auditLogs: auditLogsRaw, fetchData, tasks: tasksRaw } = useTaskStore()
  const auditLogs = Array.isArray(auditLogsRaw) ? auditLogsRaw : []
  const tasks = Array.isArray(tasksRaw) ? tasksRaw : []

  const [search, setSearch] = useState("")
  const [entityFilter, setEntityFilter] = useState("all")

  const [selectedEntity, setSelectedEntity] = useState<{ entityType: string; entityId: number; jtrackId: string } | null>(null)
  const [groupedLogs, setGroupedLogs] = useState<any[]>([])
  const [timelineMode, setTimelineMode] = useState<'tree' | 'chrono'>('tree')
  const [timelineSearch, setTimelineSearch] = useState('')
  const [timelineActor, setTimelineActor] = useState('')
  const [timelineAction, setTimelineAction] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Created: true, Bug: true, Retest: true
  })

  const [auditPage, setAuditPage] = useState(0)
  const [auditPageSize, setAuditPageSize] = useState(20)

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    if (selectedEntity) {
      const params = new URLSearchParams()
      if (timelineSearch) params.append('search', timelineSearch)
      if (timelineActor) params.append('actorId', timelineActor)
      if (timelineAction) params.append('actionType', timelineAction)

      fetch(`${APP_CONFIG.apiUrl}/api/audit/groups/${selectedEntity.entityType}/${selectedEntity.entityId}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
        .then(r => r.json())
        .then(d => setGroupedLogs(Array.isArray(d) ? d : []))
        .catch(() => setGroupedLogs([]))
    }
  }, [selectedEntity, timelineSearch, timelineActor, timelineAction])

  const getEntityJtrackId = (type: string, id: number) => {
    if (type === "TASK" || type === "BUG_TASK") {
      const task = tasks.find(t => t.id === id)
      return task ? task.jtrackId : `DT-${100 + id}`
    } else {
      const bugsRaw = useTaskStore.getState().bugs
      const bugs = Array.isArray(bugsRaw) ? bugsRaw : []
      const bug = bugs.find(b => b.id === id)
      return bug ? bug.jtrackId : `BUG-${200 + id}`
    }
  }

  // Latest record per entity
  const uniqueLogsMap = new Map<string, typeof auditLogs[0]>()
  const sortedLogs = [...auditLogs].sort((a, b) => new Date(a.changedDate).getTime() - new Date(b.changedDate).getTime())
  sortedLogs.forEach(log => { uniqueLogsMap.set(`${log.entityType}_${log.entityId}`, log) })
  const latestLogs = Array.from(uniqueLogsMap.values())

  const filteredLogs = latestLogs.filter(log => {
    const jtrackId = getEntityJtrackId(log.entityType, log.entityId)
    const q = search.toLowerCase()
    const matchesSearch =
      (log.changedBy?.fullName?.toLowerCase().includes(q) ?? false) ||
      (log.fieldName?.toLowerCase().includes(q) ?? false) ||
      jtrackId.toLowerCase().includes(q) ||
      (log.remarks?.toLowerCase().includes(q) ?? false)
    const matchesEntity = entityFilter === "all" || log.entityType === entityFilter
    return matchesSearch && matchesEntity
  })

  const reversedFilteredLogs = [...filteredLogs].reverse()
  const pagedLogs = paginate(reversedFilteredLogs, auditPage, auditPageSize)

  /* ── KPI stats (derived, no extra API) ── */
  const totalEvents = auditLogs.length
  const trackedEntities = uniqueLogsMap.size
  const totalAuditors = new Set(auditLogs.map(l => l.changedBy?.fullName).filter(Boolean)).size
  const latestMs = auditLogs.reduce((mx, l) => Math.max(mx, new Date(l.changedDate).getTime() || 0), 0)

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.035 } }
  }
  const rowVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 130, damping: 15 } }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4 sm:px-6">
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden p-6 rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03),0_20px_60px_-30px_rgba(124,58,237,0.4)]">
        <div className="absolute top-0 right-0 w-96 h-40 bg-indigo-500/10 blur-[110px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-28 bg-violet-600/10 blur-[90px] rounded-full pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border border-violet-500/25 text-violet-300 shadow-[0_0_25px_rgba(124,58,237,0.2)]">
              <History className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-violet-300/80">Compliance & Traceability</span>
                <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                  <ShieldCheck className="h-2.5 w-2.5" /> Tamper-evident
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Audit <span className="text-glow font-extrabold bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">Trails</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                Immutable record of every status transition, rollback, and configuration change — for security policy and timeline compliance.
              </p>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <StatCard icon={<Activity className="h-4 w-4 text-violet-300" />} label="Total Events" value={totalEvents} sub="all recorded changes" accent="bg-violet-500/20" />
          <StatCard icon={<Layers className="h-4 w-4 text-indigo-300" />} label="Tracked Entities" value={trackedEntities} sub="CRs & bugs with history" accent="bg-indigo-500/20" />
          <StatCard icon={<Users className="h-4 w-4 text-cyan-300" />} label="Auditors" value={totalAuditors} sub="unique actors" accent="bg-cyan-500/20" />
          <StatCard icon={<CalendarClock className="h-4 w-4 text-emerald-300" />} label="Last Activity" value={fmtRelative(latestMs)} sub={latestMs ? new Date(latestMs).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "no activity"} accent="bg-emerald-500/20" />
        </div>
      </div>

      {selectedEntity ? (
        <GroupedAuditTimeline
          entity={selectedEntity}
          onBack={() => setSelectedEntity(null)}
          groupedLogs={groupedLogs}
          timelineMode={timelineMode}
          setTimelineMode={setTimelineMode}
          timelineSearch={timelineSearch}
          setTimelineSearch={setTimelineSearch}
          timelineActor={timelineActor}
          setTimelineActor={setTimelineActor}
          timelineAction={timelineAction}
          setTimelineAction={setTimelineAction}
          expandedGroups={expandedGroups}
          setExpandedGroups={setExpandedGroups}
        />
      ) : (
        <>
          {/* ── Filters toolbar ── */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/[0.02] p-3 rounded-2xl border border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.2)] text-xs backdrop-blur-md">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
              <input
                placeholder="Search by auditor, ticket ID, field, or remarks..."
                className="h-9 w-full bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 rounded-xl pl-10 pr-3 text-xs text-foreground focus:outline-none transition-all placeholder:text-muted-foreground/50"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setAuditPage(0) }}
              />
            </div>
            <div className="flex items-center space-x-2 text-muted-foreground font-semibold shrink-0 w-full sm:w-auto justify-end">
              <Filter className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-slate-300">Entity:</span>
              <select
                value={entityFilter}
                onChange={(e) => { setEntityFilter(e.target.value); setAuditPage(0) }}
                className="h-9 bg-[#0c0f1d] border border-white/[0.10] focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 rounded-xl px-3 py-1 outline-none text-foreground font-medium transition-all text-xs cursor-pointer"
              >
                <option value="all">All Logs</option>
                <option value="TASK">CR Tasks (TASK)</option>
                <option value="BUG">Bugs (BUG)</option>
                <option value="BUG_TASK">Tester Bug Tasks (BUG_TASK)</option>
              </select>
            </div>
          </div>

          {/* ── Audits table ── */}
          <Card variant="glass" className="border-white/[0.06] bg-white/[0.02] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden rounded-2xl">
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                  <Fingerprint className="h-4 w-4 text-violet-400" />
                  Latest change per entity
                </div>
                <span className="text-[11px] text-muted-foreground">{filteredLogs.length} record{filteredLogs.length === 1 ? '' : 's'}</span>
              </div>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-xs text-left border-collapse min-w-[960px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-white/[0.08] bg-[#0b0e1a]/90 backdrop-blur-md text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                      <th className="p-4 font-semibold">Changed</th>
                      <th className="p-4 font-semibold">Ticket</th>
                      <th className="p-4 font-semibold">Auditor</th>
                      <th className="p-4 font-semibold">Type</th>
                      <th className="p-4 font-semibold">Field</th>
                      <th className="p-4 font-semibold">Transition</th>
                      <th className="p-4 font-semibold">Remarks / Reason</th>
                      <th className="p-4 w-8" />
                    </tr>
                  </thead>
                  <motion.tbody variants={containerVariants} initial="hidden" animate="show" className="divide-y divide-white/[0.04]">
                    {filteredLogs.length === 0 ? (
                      <tr className="hover:bg-transparent">
                        <td colSpan={8} className="p-16 text-center text-muted-foreground font-medium">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-muted-foreground/60">
                              <ShieldAlert className="h-7 w-7 stroke-[1.5]" />
                            </div>
                            <p className="text-sm text-zinc-300">No audit logs match your query.</p>
                            <p className="text-[11px] text-muted-foreground/60">Try adjusting your filters or search term.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      pagedLogs.map((log) => (
                        <motion.tr
                          key={log.id}
                          variants={rowVariants}
                          onClick={() => setSelectedEntity({
                            entityType: log.entityType,
                            entityId: log.entityId,
                            jtrackId: getEntityJtrackId(log.entityType, log.entityId)
                          })}
                          className="group hover:bg-white/[0.03] transition-colors cursor-pointer"
                        >
                          <td className="p-4 whitespace-nowrap">
                            <div className="font-mono text-zinc-300">{new Date(log.changedDate).toLocaleDateString([], { day: '2-digit', month: 'short', year: '2-digit' })}</div>
                            <div className="font-mono text-[10px] text-muted-foreground/60">{new Date(log.changedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td className="p-4">
                            <span className="font-mono font-bold text-violet-300 bg-violet-400/5 border border-violet-400/15 px-2 py-1 rounded-lg shadow-sm">
                              {getEntityJtrackId(log.entityType, log.entityId)}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 font-semibold text-white">
                              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-[10px] text-cyan-200 shrink-0">
                                {(log.changedBy?.fullName ?? 'S').charAt(0)}
                              </span>
                              <span className="truncate max-w-[140px]">{log.changedBy?.fullName ?? 'System'}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold text-[9px] border ${typeStyles(log.entityType)}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${typeDot(log.entityType)}`} />
                              {log.entityType}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-slate-300 whitespace-nowrap">{log.fieldName}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="text-rose-300/90 font-medium bg-rose-500/5 px-2 py-0.5 rounded-md border border-rose-500/15 max-w-[120px] truncate" title={log.oldValue || 'None'}>
                                {log.oldValue || "None"}
                              </span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                              <span className="text-emerald-300 font-bold bg-emerald-500/5 px-2 py-0.5 rounded-md border border-emerald-500/15 max-w-[120px] truncate" title={log.newValue || 'None'}>
                                {log.newValue || "None"}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground/90 max-w-xs truncate font-medium" title={log.remarks}>
                            <div className="flex items-center gap-1.5">
                              <FileText className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                              <span className="truncate">{log.remarks || "—"}</span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all inline" />
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </motion.tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Pagination
            currentPage={auditPage}
            totalItems={filteredLogs.length}
            pageSize={auditPageSize}
            onPageChange={(p) => { setAuditPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            onPageSizeChange={(s) => { setAuditPageSize(s); setAuditPage(0) }}
            className="border border-white/[0.06] bg-white/[0.02] rounded-2xl backdrop-blur-md"
          />
        </>
      )}
    </div>
  )
}

function GroupedAuditTimeline({
  entity, onBack, groupedLogs, timelineMode, setTimelineMode,
  timelineSearch, setTimelineSearch, timelineActor, setTimelineActor,
  timelineAction, setTimelineAction, expandedGroups, setExpandedGroups
}: {
  entity: { entityType: string; entityId: number; jtrackId: string }
  onBack: () => void
  groupedLogs: any[]
  timelineMode: 'tree' | 'chrono'
  setTimelineMode: (m: 'tree' | 'chrono') => void
  timelineSearch: string
  setTimelineSearch: (s: string) => void
  timelineActor: string
  setTimelineActor: (a: string) => void
  timelineAction: string
  setTimelineAction: (a: string) => void
  expandedGroups: Record<string, boolean>
  setExpandedGroups: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}) {
  const toggleGroup = (groupName: string) =>
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))

  const safeGroups = Array.isArray(groupedLogs) ? groupedLogs : []
  const allFlatLogs = safeGroups.flatMap(g => g.logs || [])
  const uniqueActorsMap = new Map<number, string>()
  allFlatLogs.forEach((log: any) => { if (log.changedBy) uniqueActorsMap.set(log.changedBy.id, log.changedBy.fullName) })
  const uniqueActors = Array.from(uniqueActorsMap.entries())
  const uniqueActions = Array.from(new Set(allFlatLogs.map((log: any) => log.fieldName).filter(Boolean)))

  const { setDownloadTarget, addToast } = useTaskStore()

  const handleExport = () => {
    const params = new URLSearchParams()
    if (timelineSearch) params.append('search', timelineSearch)
    if (timelineActor) params.append('actorId', timelineActor)
    if (timelineAction) params.append('actionType', timelineAction)

    fetch(`${APP_CONFIG.apiUrl}/api/audit/groups/${entity.entityType}/${entity.entityId}/export?${params.toString()}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(res => { if (!res.ok) throw new Error("Failed to export audit logs"); return res.blob() })
      .then(blob => {
        const reader = new FileReader()
        reader.onloadend = () => {
          setDownloadTarget({
            base64Data: reader.result as string,
            defaultFileName: `audit_history_${entity.entityType}_${entity.entityId}.xlsx`
          })
        }
        reader.readAsDataURL(blob)
      })
      .catch(err => addToast("Export failed: " + err.message, "error"))
  }

  const renderLogCard = (log: any) => (
    <div key={log.id} className="flex gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] transition-colors shadow-md">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/25 to-fuchsia-500/20 border border-white/10 flex items-center justify-center text-sm font-bold text-violet-300 shrink-0">
        {log.changedBy?.fullName?.charAt(0) ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm font-semibold text-zinc-200">
            {log.changedBy?.fullName ?? 'System'}
            <span className="font-normal text-zinc-400 ml-1.5">changed</span>
            <span className="font-mono text-xs text-violet-300 bg-violet-500/5 px-2 py-0.5 rounded ml-2 border border-violet-500/15">{log.fieldName}</span>
          </p>
          <span className="text-[10px] text-zinc-500 font-mono">
            {new Date(log.changedDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        </div>
        <div className="flex items-center gap-2.5 mt-2.5 text-xs flex-wrap">
          {log.oldValue && (
            <>
              <span className="text-rose-300 bg-rose-500/5 px-2 py-0.5 rounded-md border border-rose-500/15">{log.oldValue}</span>
              <ArrowRightLeft className="h-3 w-3 text-zinc-600" />
            </>
          )}
          <span className="text-emerald-300 font-bold bg-emerald-500/5 px-2 py-0.5 rounded-md border border-emerald-500/15">{log.newValue}</span>
        </div>
        {log.remarks && (
          <p className="text-xs text-zinc-400 mt-3 bg-black/30 p-2.5 rounded-xl border border-white/[0.04] italic">"{log.remarks}"</p>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Drill-down header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.07] p-5 rounded-3xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 bg-white/[0.04] border border-white/[0.1] rounded-xl hover:bg-white/[0.09] hover:border-violet-500/30 text-slate-300 hover:text-white transition-all"
            title="Back to all logs"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-violet-300 bg-violet-400/5 border border-violet-400/15 px-2 py-0.5 rounded">{entity.jtrackId}</span>
              <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">{entity.entityType} · {allFlatLogs.length} events</span>
            </div>
            <h2 className="text-lg font-bold text-zinc-100 mt-1">Audit History &amp; Trail</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="flex bg-black/40 p-0.5 rounded-xl border border-white/[0.06] text-xs">
            <button
              onClick={() => setTimelineMode('tree')}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${timelineMode === 'tree' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Folder className="h-3.5 w-3.5" /> Tree View
            </button>
            <button
              onClick={() => setTimelineMode('chrono')}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${timelineMode === 'chrono' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Clock className="h-3.5 w-3.5" /> Chrono
            </button>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-1.5 text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 rounded-xl font-bold transition-all flex items-center gap-1.5 shadow"
          >
            <Download className="h-3.5 w-3.5" /> Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/[0.02] border border-white/[0.06] p-4 rounded-2xl text-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search within history..."
            value={timelineSearch}
            onChange={(e) => setTimelineSearch(e.target.value)}
            className="w-full bg-black/40 border border-white/[0.1] focus:ring-1 focus:ring-violet-500/50 rounded-xl pl-9 pr-3 py-2 outline-none text-zinc-300 focus:border-violet-500"
          />
        </div>
        <select value={timelineActor} onChange={(e) => setTimelineActor(e.target.value)}
          className="w-full bg-[#0c0f1d] border border-white/[0.1] rounded-xl px-3 py-2 outline-none text-zinc-300 cursor-pointer">
          <option value="">All Actors</option>
          {uniqueActors.map(([id, name]) => (<option key={id} value={id}>{name}</option>))}
        </select>
        <select value={timelineAction} onChange={(e) => setTimelineAction(e.target.value)}
          className="w-full bg-[#0c0f1d] border border-white/[0.1] rounded-xl px-3 py-2 outline-none text-zinc-300 cursor-pointer">
          <option value="">All Fields / Action Types</option>
          {uniqueActions.map((act: any) => (<option key={act} value={act}>{act}</option>))}
        </select>
      </div>

      {/* Timeline */}
      {timelineMode === 'chrono' ? (
        <div className="relative pl-6 border-l-2 border-white/[0.06] ml-4 space-y-6">
          {allFlatLogs.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">No records matching filters.</div>
          ) : (
            allFlatLogs
              .slice()
              .sort((a, b) => new Date(b.changedDate).getTime() - new Date(a.changedDate).getTime())
              .map((log: any) => (
                <div key={log.id} className="relative">
                  <div className="absolute -left-[31px] top-5 w-3 h-3 rounded-full bg-violet-500 border-2 border-[#060814] shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                  {renderLogCard(log)}
                </div>
              ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {safeGroups.map((group) => {
            const isExpanded = !!expandedGroups[group.groupName]
            const logsCount = group.logs?.length ?? 0
            if (logsCount === 0) return null
            return (
              <div key={group.groupName} className="border border-white/[0.06] rounded-2xl bg-white/[0.01] overflow-hidden hover:border-white/[0.10] transition-colors">
                <button onClick={() => toggleGroup(group.groupName)} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    {isExpanded ? <FolderOpen className="h-4 w-4 text-violet-400" /> : <Folder className="h-4 w-4 text-zinc-500" />}
                    <span className="text-sm font-bold text-zinc-200">{group.groupName}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 font-bold text-violet-300">{logsCount}</span>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-zinc-500 font-semibold">
                    {isExpanded ? 'Collapse' : 'Expand'}
                    <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </span>
                </button>
                {isExpanded && (
                  <div className="p-4 border-t border-white/[0.04] bg-black/20 space-y-3">
                    {group.logs.map((log: any) => renderLogCard(log))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}