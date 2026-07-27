import { useEffect, useMemo, useState, useCallback } from "react"
import { useTaskStore } from "@/store/taskStore"
import { Card, CardContent } from "@/components/ui/card"
import {
  Search, Filter, ShieldAlert, History, FileText, ArrowRight, ArrowLeft,
  Download, Folder, FolderOpen, Clock, Activity, Users, Fingerprint, ShieldCheck,
  ChevronRight, ChevronDown, Layers, CalendarClock, ArrowRightLeft,
  Sparkles, UserPlus, Code2, Eye, FlaskConical, Bug, Wrench, TestTube2, Rocket,
  Ship, Lock, Settings2, MessageSquare, Paperclip, FileDown, Crown, CircleSlash,
  Hash, X, ListTree, AlignLeft, Table2
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Pagination, paginate } from "@/components/shared/Pagination"
import { APP_CONFIG, FEATURES } from '@/config/appConfig';

/* ══════════════════════════════════════════════════════════════════
   AUDIT TRAIL — Enterprise redesign
   Grounded strictly on the real AuditLog record:
     { entityType, entityId, fieldName, oldValue, newValue,
       remarks?, changedBy(User), changedDate }
   Everything else (category, icon, duration, related ticket, role) is
   DERIVED — never fabricated. No fake IP / commit / hash metadata.
   ══════════════════════════════════════════════════════════════════ */

/* ── time + text helpers ─────────────────────────────────────────── */
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
const fmtDuration = (ms: number) => {
  if (!ms || ms < 0) return ""
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${m % 60}m`
  const d = Math.floor(h / 24)
  return `${d}d ${h % 24}h`
}
const humanize = (s?: string) =>
  (s || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
const initials = (name?: string) =>
  (name || "System")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase()
const prettyRole = (u?: any) => {
  const r: string | undefined = u?.roles?.[0]
  if (!r) return "System"
  const map: Record<string, string> = {
    DEVELOPER: "Developer", TESTER: "Tester", TESTADMIN: "QA Lead",
    CODEREVIEWER: "Code Reviewer", DEVADMIN: "Administrator", ADMIN: "Administrator",
  }
  return map[r] || humanize(r)
}
const dateGroupLabel = (d: Date) => {
  const now = new Date()
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const dayMs = 86400000
  const delta = Math.round((startOf(now) - startOf(d)) / dayMs)
  if (delta === 0) return "Today"
  if (delta === 1) return "Yesterday"
  if (delta > 1 && delta < 7) return d.toLocaleDateString([], { weekday: "long" })
  return d.toLocaleDateString([], { day: "2-digit", month: "long", year: "numeric" })
}

/* ── event category registry (derived → icon + color) ────────────── */
type CatKey =
  | "created" | "assignment" | "development" | "review" | "sit"
  | "bug_raised" | "bug_fixed" | "testing" | "uat" | "production"
  | "approval" | "rejection" | "config" | "comment" | "attachment"
  | "export" | "admin" | "default"
type CatDef = {
  label: string
  Icon: React.ComponentType<{ className?: string }>
  text: string; bg: string; border: string; dot: string; glow: string
}
const CATEGORIES: Record<CatKey, CatDef> = {
  created: { label: "Created", Icon: Sparkles, text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400", glow: "shadow-[0_0_12px_rgba(16,185,129,0.5)]" },
  assignment: { label: "Assignment", Icon: UserPlus, text: "text-sky-300", bg: "bg-sky-500/10", border: "border-sky-500/30", dot: "bg-sky-400", glow: "shadow-[0_0_12px_rgba(56,189,248,0.5)]" },
  development: { label: "Development", Icon: Code2, text: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-500/30", dot: "bg-violet-400", glow: "shadow-[0_0_12px_rgba(139,92,246,0.5)]" },
  review: { label: "Code Review", Icon: Eye, text: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/30", dot: "bg-cyan-400", glow: "shadow-[0_0_12px_rgba(34,211,238,0.5)]" },
  sit: { label: "SIT", Icon: FlaskConical, text: "text-teal-300", bg: "bg-teal-500/10", border: "border-teal-500/30", dot: "bg-teal-400", glow: "shadow-[0_0_12px_rgba(45,212,191,0.5)]" },
  bug_raised: { label: "Bug Raised", Icon: Bug, text: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/30", dot: "bg-rose-400", glow: "shadow-[0_0_12px_rgba(251,113,133,0.5)]" },
  bug_fixed: { label: "Bug Fixed", Icon: Wrench, text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/30", dot: "bg-amber-400", glow: "shadow-[0_0_12px_rgba(251,191,36,0.5)]" },
  testing: { label: "Testing", Icon: TestTube2, text: "text-blue-300", bg: "bg-blue-500/10", border: "border-blue-500/30", dot: "bg-blue-400", glow: "shadow-[0_0_12px_rgba(96,165,250,0.5)]" },
  uat: { label: "UAT", Icon: Rocket, text: "text-fuchsia-300", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/30", dot: "bg-fuchsia-400", glow: "shadow-[0_0_12px_rgba(232,121,249,0.5)]" },
  production: { label: "Production", Icon: Ship, text: "text-green-300", bg: "bg-green-500/10", border: "border-green-500/30", dot: "bg-green-400", glow: "shadow-[0_0_12px_rgba(74,222,128,0.5)]" },
  approval: { label: "Approval", Icon: Lock, text: "text-indigo-300", bg: "bg-indigo-500/10", border: "border-indigo-500/30", dot: "bg-indigo-400", glow: "shadow-[0_0_12px_rgba(129,140,248,0.5)]" },
  rejection: { label: "Rejection", Icon: CircleSlash, text: "text-red-300", bg: "bg-red-500/10", border: "border-red-500/30", dot: "bg-red-400", glow: "shadow-[0_0_12px_rgba(248,113,113,0.5)]" },
  config: { label: "Configuration", Icon: Settings2, text: "text-slate-300", bg: "bg-slate-500/10", border: "border-slate-500/30", dot: "bg-slate-400", glow: "shadow-[0_0_12px_rgba(148,163,184,0.4)]" },
  comment: { label: "Comment", Icon: MessageSquare, text: "text-zinc-300", bg: "bg-zinc-500/10", border: "border-zinc-500/30", dot: "bg-zinc-400", glow: "shadow-[0_0_12px_rgba(161,161,170,0.4)]" },
  attachment: { label: "Attachment", Icon: Paperclip, text: "text-orange-300", bg: "bg-orange-500/10", border: "border-orange-500/30", dot: "bg-orange-400", glow: "shadow-[0_0_12px_rgba(251,146,60,0.5)]" },
  export: { label: "Export", Icon: FileDown, text: "text-lime-300", bg: "bg-lime-500/10", border: "border-lime-500/30", dot: "bg-lime-400", glow: "shadow-[0_0_12px_rgba(163,230,53,0.5)]" },
  admin: { label: "Admin Action", Icon: Crown, text: "text-yellow-300", bg: "bg-yellow-500/10", border: "border-yellow-500/30", dot: "bg-yellow-400", glow: "shadow-[0_0_12px_rgba(250,204,21,0.5)]" },
  default: { label: "Change", Icon: Activity, text: "text-zinc-300", bg: "bg-white/[0.04]", border: "border-white/[0.12]", dot: "bg-zinc-400", glow: "shadow-[0_0_10px_rgba(255,255,255,0.15)]" },
}

/** Map a real audit log to a category — pure derivation, no invented data. */
const categorize = (log: any): CatKey => {
  const f = (log?.fieldName || "").toLowerCase()
  const nv = (log?.newValue || "").toUpperCase()
  const isBug = log?.entityType === "BUG" || log?.entityType === "BUG_TASK"
  // field-name signals take priority (explicit actions)
  if (/(comment)/.test(f)) return "comment"
  if (/(attach|file|screenshot|document|artifact|upload)/.test(f)) return "attachment"
  if (/(export|download)/.test(f)) return "export"
  if (/(config|setting|flag)/.test(f)) return "config"
  if (/(force|admin|override)/.test(f)) return "admin"
  if (/(reject)/.test(f)) return "rejection"
  if (/(approv|review_status|reviewstatus)/.test(f)) return "approval"
  if (/(assign|tester|reviewer|developer)/.test(f) && f !== "assigned_developer_id") return "assignment"
  // status-transition signals (newValue)
  if (nv) {
    if (/RESOLVED|FIXED/.test(nv)) return "bug_fixed"
    if (isBug && /(OPEN|BUG_FOUND|REOPEN)/.test(nv)) return "bug_raised"
    if (/BUG_FOUND|REOPEN/.test(nv)) return "bug_raised"
    if (/^OPEN$/.test(nv)) return "created"
    if (/(IN_PROGRESS|CHANGES_REQUESTED)/.test(nv)) return "development"
    if (/CODE_REVIEW/.test(nv)) return "review"
    if (/SIT/.test(nv)) return "sit"
    if (/(PROD|CLOSED)/.test(nv)) return "production"
    if (/UAT/.test(nv)) return "uat"
    if (/(TEST)/.test(nv)) return "testing"
  }
  if (/status/.test(f) && !nv) return "created"
  return "default"
}

/** Human sentence describing what happened — from real fields only. */
const eventTitle = (log: any, cat: CatKey): string => {
  const nv = humanize(log?.newValue)
  switch (cat) {
    case "created": return "Record created"
    case "assignment": return nv ? `Assigned · ${nv}` : "Assignment updated"
    case "development": return nv === "In Progress" ? "Development started" : `Development · ${nv}`
    case "review": return /Done/i.test(nv) ? "Code review completed" : "Sent for code review"
    case "sit": return nv ? `SIT · ${nv}` : "SIT stage"
    case "bug_raised": return "Bug raised"
    case "bug_fixed": return "Bug fixed"
    case "testing": return nv ? `Testing · ${nv}` : "Testing"
    case "uat": return nv ? `UAT · ${nv}` : "UAT"
    case "production": return /Closed/i.test(nv) ? "Closed" : `Production · ${nv}`
    case "approval": return "Approved"
    case "rejection": return "Rejected"
    case "comment": return "Comment added"
    case "attachment": return "Attachment updated"
    case "export": return "Exported"
    case "config": return `Configuration · ${humanize(log?.fieldName)}`
    case "admin": return `Admin action · ${humanize(log?.fieldName)}`
    default: return nv ? `${humanize(log?.fieldName)} → ${nv}` : humanize(log?.fieldName) || "Change"
  }
}

/* ── entity type styling (kept) ──────────────────────────────────── */
const typeStyles = (t: string) =>
  t === "TASK"
    ? "bg-violet-500/10 text-violet-300 border-violet-500/25"
    : t === "BUG"
      ? "bg-rose-500/10 text-rose-300 border-rose-500/25"
      : "bg-amber-500/10 text-amber-300 border-amber-500/25"
const typeDot = (t: string) =>
  t === "TASK" ? "bg-violet-400" : t === "BUG" ? "bg-rose-400" : "bg-amber-400"

/* ══════════════════ reusable: ActivityBadge ═════════════════════ */
export function ActivityBadge({ cat, size = "md" }: { cat: CatKey; size?: "sm" | "md" }) {
  const def = CATEGORIES[cat]
  const Icon = def.Icon
  const dim = size === "sm" ? "w-7 h-7" : "w-10 h-10"
  const ic = size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5"
  return (
    <div className={`${dim} rounded-xl grid place-items-center border ${def.bg} ${def.border} ${def.text} shrink-0`}>
      <Icon className={ic} />
    </div>
  )
}

/* ══════════════════ reusable: StatCard / AuditSummary ═══════════ */
function StatCard({
  icon, label, value, sub, accent,
}: { icon: React.ReactNode; label: string; value: string | number; sub?: string; accent: string }) {
  return (
    <div className="relative overflow-hidden p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md group hover:border-white/[0.12] transition-colors">
      <div className={`absolute -top-8 -right-8 w-24 h-24 blur-[60px] rounded-full pointer-events-none ${accent}`} />
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-200 shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold text-white leading-tight">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground/70 truncate">{sub}</p>}
        </div>
      </div>
    </div>
  )
}
export function AuditSummary({ logs }: { logs: any[] }) {
  const s = useMemo(() => {
    const times = logs.map((l) => new Date(l.changedDate).getTime()).filter(Boolean).sort((a, b) => a - b)
    const contributors = new Set(logs.map((l) => l.changedBy?.id ?? l.changedBy?.fullName).filter(Boolean)).size
    let workflow = 0, approvals = 0, bugs = 0
    logs.forEach((l) => {
      const c = categorize(l)
      if ((l.fieldName || "").toLowerCase().includes("status")) workflow++
      if (c === "approval") approvals++
      if (c === "bug_raised" || c === "bug_fixed") bugs++
    })
    const span = times.length > 1 ? fmtDuration(times[times.length - 1] - times[0]) : "—"
    return { total: logs.length, contributors, workflow, approvals, bugs, span, last: times[times.length - 1] || 0 }
  }, [logs])
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
      <StatCard icon={<Activity className="h-4 w-4 text-violet-300" />} label="Total Events" value={s.total} accent="bg-violet-500/20" />
      <StatCard icon={<Users className="h-4 w-4 text-cyan-300" />} label="Contributors" value={s.contributors} accent="bg-cyan-500/20" />
      <StatCard icon={<ArrowRightLeft className="h-4 w-4 text-indigo-300" />} label="Workflow" value={s.workflow} sub="status changes" accent="bg-indigo-500/20" />
      <StatCard icon={<Lock className="h-4 w-4 text-emerald-300" />} label="Approvals" value={s.approvals} accent="bg-emerald-500/20" />
      <StatCard icon={<Bug className="h-4 w-4 text-rose-300" />} label="Bug Events" value={s.bugs} accent="bg-rose-500/20" />
      <StatCard icon={<Clock className="h-4 w-4 text-amber-300" />} label="Time Span" value={s.span} accent="bg-amber-500/20" />
      <StatCard icon={<CalendarClock className="h-4 w-4 text-fuchsia-300" />} label="Last Activity" value={fmtRelative(s.last)} accent="bg-fuchsia-500/20" />
    </div>
  )
}

/* ══════════════════ reusable: AuditFilters ══════════════════════ */
export function AuditFilters({
  search, setSearch, actor, setActor, actors, activeCats, toggleCat, presentCats, onClear,
}: {
  search: string; setSearch: (s: string) => void
  actor: string; setActor: (a: string) => void
  actors: [number, string][]
  activeCats: Set<CatKey>; toggleCat: (c: CatKey) => void; presentCats: CatKey[]
  onClear: () => void
}) {
  const hasFilters = !!search || !!actor || activeCats.size > 0
  return (
    <div className="space-y-3 bg-white/[0.02] border border-white/[0.06] p-3.5 rounded-2xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search ticket, developer, field, status, branch, or remark…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search audit history"
            className="w-full h-9 bg-black/30 border border-white/[0.1] focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 rounded-xl pl-9 pr-3 text-xs text-zinc-200 outline-none transition-all placeholder:text-muted-foreground/50"
          />
        </div>
        <select
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          aria-label="Filter by actor"
          className="h-9 bg-[#0c0f1d] border border-white/[0.1] rounded-xl px-3 text-xs text-zinc-200 outline-none cursor-pointer focus:border-violet-500/50 sm:w-56"
        >
          <option value="">All actors</option>
          {actors.map(([id, name]) => (<option key={id} value={id}>{name}</option>))}
        </select>
        {hasFilters && (
          <button onClick={onClear} className="h-9 px-3 text-xs font-semibold text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] rounded-xl flex items-center gap-1.5 transition-colors shrink-0">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>
      {presentCats.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presentCats.map((c) => {
            const def = CATEGORIES[c]
            const on = activeCats.has(c)
            const Icon = def.Icon
            return (
              <button
                key={c}
                onClick={() => toggleCat(c)}
                aria-pressed={on}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${on ? `${def.bg} ${def.border} ${def.text}` : "bg-white/[0.02] border-white/[0.08] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.15]"
                  }`}
              >
                <Icon className="h-3 w-3" /> {def.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ══════════════════ reusable: AuditExpandableDetails ════════════ */
export function AuditExpandableDetails({ log, jtrackId }: { log: any; jtrackId: string }) {
  const Row = ({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) => (
    <div className="flex items-start gap-3 py-1.5">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 w-28 shrink-0 pt-0.5">{k}</span>
      <span className={`text-xs text-zinc-200 min-w-0 break-words ${mono ? "font-mono" : ""}`}>{v}</span>
    </div>
  )
  return (
    <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/25 p-4 divide-y divide-white/[0.04]">
      <Row k="Changed by" v={<span className="font-semibold text-white">{log.changedBy?.fullName ?? "System"} <span className="text-zinc-500 font-normal">· {prettyRole(log.changedBy)}</span></span>} />
      <Row k="When" v={new Date(log.changedDate).toLocaleString([], { dateStyle: "full", timeStyle: "medium" })} />
      <Row k="Transition" v={
        <span className="flex items-center gap-2 flex-wrap">
          <span className="text-rose-300 bg-rose-500/5 px-2 py-0.5 rounded-md border border-rose-500/15">{log.oldValue || "None"}</span>
          <ArrowRight className="h-3 w-3 text-zinc-600" />
          <span className="text-emerald-300 font-bold bg-emerald-500/5 px-2 py-0.5 rounded-md border border-emerald-500/15">{log.newValue || "None"}</span>
        </span>
      } />
      <Row k="Field" v={<span className="font-mono text-violet-300">{log.fieldName || "—"}</span>} mono />
      <Row k="Reason" v={log.remarks ? <span className="italic text-zinc-300">“{log.remarks}”</span> : <span className="text-zinc-600">No reason recorded</span>} />
      <Row k="Related" v={<span className="font-mono font-bold text-violet-300">{jtrackId}</span>} mono />
      <Row k="Entity" v={<span>{log.entityType} · #{log.entityId}</span>} />
      <Row k="Audit ID" v={<span className="text-zinc-400">#{log.id}</span>} mono />
    </div>
  )
}

/* ══════════════════ reusable: AuditEventCard ════════════════════ */
const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 140, damping: 16 } },
}
export function AuditEventCard({
  log, jtrackId, gapMs, expanded, onToggle,
}: { log: any; jtrackId: string; gapMs: number; expanded: boolean; onToggle: () => void }) {
  const cat = categorize(log)
  const def = CATEGORIES[cat]
  const when = new Date(log.changedDate)
  return (
    <motion.div variants={cardVariants} className="relative pl-12">
      {/* rail dot */}
      <span className={`absolute left-[13px] top-4 w-3 h-3 rounded-full ${def.dot} ${def.glow} ring-4 ring-[#060814]`} />
      {gapMs > 0 && (
        <span className="absolute left-9 top-[-14px] text-[9px] font-mono text-zinc-600">+{fmtDuration(gapMs)}</span>
      )}
      <motion.div
        whileHover={{ y: -2 }}
        className={`rounded-2xl border bg-white/[0.02] hover:bg-white/[0.035] transition-colors ${expanded ? def.border : "border-white/[0.06] hover:border-white/[0.12]"}`}
      >
        <button onClick={onToggle} aria-expanded={expanded} className="w-full text-left p-3.5 flex gap-3.5 items-start">
          <ActivityBadge cat={cat} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${def.bg} ${def.border} ${def.text}`}>{def.label}</span>
                <h4 className="text-sm font-semibold text-zinc-100 truncate">{eventTitle(log, cat)}</h4>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono shrink-0" title={when.toLocaleString()}>
                {when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {/* transition + meta */}
            <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px]">
              {log.oldValue && (
                <>
                  <span className="text-rose-300/90 bg-rose-500/5 px-1.5 py-0.5 rounded border border-rose-500/15 max-w-[140px] truncate">{log.oldValue}</span>
                  <ArrowRight className="h-3 w-3 text-zinc-600 shrink-0" />
                </>
              )}
              {log.newValue && (
                <span className="text-emerald-300 font-semibold bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/15 max-w-[160px] truncate">{log.newValue}</span>
              )}
              <span className="flex items-center gap-1 text-zinc-500"><Hash className="h-2.5 w-2.5" />{log.fieldName}</span>
            </div>
            {/* actor + remarks preview */}
            <div className="flex items-center justify-between gap-2 mt-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500/30 to-violet-500/30 border border-white/10 grid place-items-center text-[9px] text-cyan-200 shrink-0">{initials(log.changedBy?.fullName)}</span>
                <span className="text-[11px] text-zinc-300 truncate">{log.changedBy?.fullName ?? "System"}</span>
                <span className="text-[10px] text-zinc-600">· {prettyRole(log.changedBy)}</span>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`} />
            </div>
            {log.remarks && !expanded && (
              <p className="text-[11px] text-zinc-500 mt-2 truncate italic">“{log.remarks}”</p>
            )}
          </div>
        </button>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="overflow-hidden px-3.5 pb-3.5"
            >
              <AuditExpandableDetails log={log} jtrackId={jtrackId} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

/* ══════════════════ reusable: AuditTimeline ═════════════════════ */
const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.03 } } }
export function AuditTimeline({ logs, jtrackId }: { logs: any[]; jtrackId: string }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const toggle = (id: number) =>
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const groups = useMemo(() => {
    const sorted = [...logs].sort((a, b) => new Date(a.changedDate).getTime() - new Date(b.changedDate).getTime())
    const byDay = new Map<string, any[]>()
    sorted.forEach((l) => {
      const d = new Date(l.changedDate)
      const key = dateGroupLabel(d)
      if (!byDay.has(key)) byDay.set(key, [])
      byDay.get(key)!.push(l)
    })
    return Array.from(byDay.entries())
  }, [logs])
  if (logs.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500 border border-white/[0.05] rounded-2xl bg-white/[0.01]">
        <ShieldAlert className="h-7 w-7 mx-auto mb-3 text-zinc-600" />
        <p className="text-sm text-zinc-300">No events match your filters.</p>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      {groups.map(([day, dayLogs], gi) => {
        let prev = 0
        return (
          <div key={day}>
            <div className="flex items-center gap-3 mb-3 sticky top-2 z-10">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400 bg-[#0b0e1a]/80 backdrop-blur px-2.5 py-1 rounded-full border border-white/[0.06]">{day}</span>
              <span className="text-[10px] text-zinc-600">{dayLogs.length} event{dayLogs.length === 1 ? "" : "s"}</span>
              <div className="flex-1 h-px bg-gradient-to-r from-white/[0.08] to-transparent" />
            </div>
            <motion.div variants={listVariants} initial="hidden" animate="show" className="relative space-y-3">
              {/* continuous rail */}
              <span className="absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-white/[0.12] via-white/[0.06] to-transparent" />
              {dayLogs.map((log) => {
                const t = new Date(log.changedDate).getTime()
                const gap = prev ? t - prev : 0
                prev = t
                return (
                  <AuditEventCard
                    key={log.id}
                    log={log}
                    jtrackId={jtrackId}
                    gapMs={gi === 0 ? 0 : gap}
                    expanded={expanded.has(log.id)}
                    onToggle={() => toggle(log.id)}
                  />
                )
              })}
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}

/* ══════════════════ master list (entity index) ═════════════════ */
export default function Audits() {
  const AUDIT_PAGINATION = FEATURES.ENABLE_AUDIT_PAGINATION

  const { fetchData, tasks: tasksRaw } = useTaskStore()
  const auditLogs: any[] = []
  const tasks = Array.isArray(tasksRaw) ? tasksRaw : []

  const [search, setSearch] = useState("")
  const [entityFilter, setEntityFilter] = useState("all")
  const [selectedEntity, setSelectedEntity] = useState<{ entityType: string; entityId: number; jtrackId: string } | null>(null)
  const [groupedLogs, setGroupedLogs] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<"timeline" | "grouped" | "table">("timeline")
  const [timelineSearch, setTimelineSearch] = useState("")
  const [timelineActor, setTimelineActor] = useState("")
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ Created: true, Bug: true, Retest: true })
  const [auditPage, setAuditPage] = useState(0)
  const [auditPageSize, setAuditPageSize] = useState(20)

  // ── server-aggregation state (used only when flag ON) ──
  const [serverRows, setServerRows] = useState<any[]>([])
  const [serverTotal, setServerTotal] = useState(0)
  const [serverSummary, setServerSummary] = useState<{
    totalEvents: number; distinctEntities: number; distinctAuditors: number; lastActivity: string | null
  } | null>(null)

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` })

  const fetchEntityIndex = useCallback(async () => {
    if (!AUDIT_PAGINATION) return
    const safePage = Math.max(0, auditPage)
    const params = new URLSearchParams({ page: String(safePage), size: String(auditPageSize) })
    if (search.trim()) params.set("search", search.trim())
    if (entityFilter && entityFilter !== "all") params.set("entityType", entityFilter)
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/api/audit/entity-index?${params.toString()}`, { headers: authHeaders() })
      const data = await res.json()
      setServerRows(Array.isArray(data.content) ? data.content : [])
      setServerTotal(data.totalElements ?? 0)
    } catch {
      setServerRows([])
      setServerTotal(0)
    }
  }, [AUDIT_PAGINATION, auditPage, auditPageSize, search, entityFilter])

  const fetchSummary = useCallback(async () => {
    if (!AUDIT_PAGINATION) return
    try {
      const res = await fetch(`${APP_CONFIG.apiUrl}/api/audit/summary`, { headers: authHeaders() })
      setServerSummary(await res.json())
    } catch {
      setServerSummary(null)
    }
  }, [AUDIT_PAGINATION])

  // Mount: flag OFF → keep legacy store bootstrap; flag ON → load summary only.
  // NOTE: on flag ON we intentionally do NOT call fetchData() (that pulls the full /api/audit table).
  // tasks/bugs for jTrackId labels are expected from the app/dashboard bootstrap.
  useEffect(() => {
    if (AUDIT_PAGINATION) fetchSummary()
    else fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Flag ON: (re)fetch the page whenever page/size/search/filter change (debounced for typing).
  useEffect(() => {
    if (!AUDIT_PAGINATION) return
    const t = setTimeout(fetchEntityIndex, 250)
    return () => clearTimeout(t)
  }, [AUDIT_PAGINATION, fetchEntityIndex])

  // Drill-down groups fetch (unchanged — per-entity endpoint).
  useEffect(() => {
    if (selectedEntity) {
      const params = new URLSearchParams()
      if (timelineSearch) params.append("search", timelineSearch)
      if (timelineActor) params.append("actorId", timelineActor)
      fetch(`${APP_CONFIG.apiUrl}/api/audit/groups/${selectedEntity.entityType}/${selectedEntity.entityId}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
        .then((r) => r.json())
        .then((d) => setGroupedLogs(Array.isArray(d) ? d : []))
        .catch(() => setGroupedLogs([]))
    }
  }, [selectedEntity, timelineSearch, timelineActor])

  const getEntityJtrackId = (type: string, id: number) => {
    if (type === "TASK" || type === "BUG_TASK") {
      const task = tasks.find((t) => t.id === id)
      return task ? task.jtrackId : `DT-${100 + id}`
    } else {
      const bugsRaw = useTaskStore.getState().bugs
      const bugs = Array.isArray(bugsRaw) ? bugsRaw : []
      const bug = bugs.find((b) => b.id === id)
      return bug ? bug.jtrackId : `BUG-${200 + id}`
    }
  }

  // ── legacy client-side aggregation (only meaningful when flag OFF) ──
  const uniqueLogsMap = new Map<string, any>()
  const sortedLogs = [...auditLogs].sort((a, b) => new Date(a.changedDate).getTime() - new Date(b.changedDate).getTime())
  sortedLogs.forEach((log) => { uniqueLogsMap.set(`${log.entityType}_${log.entityId}`, log) })
  const latestLogs = Array.from(uniqueLogsMap.values())
  const filteredLogs = latestLogs.filter((log) => {
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

  // ── unified view model (server when flag ON, client when OFF) ──
  const displayLogs = AUDIT_PAGINATION
    ? serverRows                                              // already latest-per-entity, sorted desc, paged by server
    : paginate(reversedFilteredLogs, auditPage, auditPageSize) // legacy client path
  const totalItems = AUDIT_PAGINATION ? serverTotal : filteredLogs.length

  const clientTotalEvents = auditLogs.length
  const clientTrackedEntities = uniqueLogsMap.size
  const clientAuditors = new Set(auditLogs.map((l) => l.changedBy?.fullName).filter(Boolean)).size
  const clientLatestMs = auditLogs.reduce((mx, l) => Math.max(mx, new Date(l.changedDate).getTime() || 0), 0)

  const stats = (AUDIT_PAGINATION && serverSummary)
    ? {
      totalEvents: serverSummary.totalEvents,
      trackedEntities: serverSummary.distinctEntities,
      auditors: serverSummary.distinctAuditors,
      lastActivityMs: serverSummary.lastActivity ? new Date(serverSummary.lastActivity).getTime() : 0,
    }
    : {
      totalEvents: clientTotalEvents,
      trackedEntities: clientTrackedEntities,
      auditors: clientAuditors,
      lastActivityMs: clientLatestMs,
    }

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.035 } } }
  const rowVariants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 130, damping: 15 } } }

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
                  <ShieldCheck className="h-2.5 w-2.5" /> Append-only
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Audit <span className="text-glow font-extrabold bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">Trails</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                Immutable record of every status transition, assignment, review, and deployment change — for security policy and timeline compliance.
              </p>
            </div>
          </div>
        </div>
        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <StatCard icon={<Activity className="h-4 w-4 text-violet-300" />} label="Total Events" value={stats.totalEvents} sub="all recorded changes" accent="bg-violet-500/20" />
          <StatCard icon={<Layers className="h-4 w-4 text-indigo-300" />} label="Tracked Entities" value={stats.trackedEntities} sub="CRs & bugs with history" accent="bg-indigo-500/20" />
          <StatCard icon={<Users className="h-4 w-4 text-cyan-300" />} label="Auditors" value={stats.auditors} sub="unique actors" accent="bg-cyan-500/20" />
          <StatCard icon={<CalendarClock className="h-4 w-4 text-emerald-300" />} label="Last Activity" value={fmtRelative(stats.lastActivityMs)} sub={stats.lastActivityMs ? new Date(stats.lastActivityMs).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "no activity"} accent="bg-emerald-500/20" />
        </div>
      </div>

      {selectedEntity ? (
        <AuditTrailDetail
          entity={selectedEntity}
          onBack={() => setSelectedEntity(null)}
          groupedLogs={groupedLogs}
          viewMode={viewMode}
          setViewMode={setViewMode}
          timelineSearch={timelineSearch}
          setTimelineSearch={setTimelineSearch}
          timelineActor={timelineActor}
          setTimelineActor={setTimelineActor}
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

          {/* ── Entity index table ── */}
          <Card variant="glass" className="border-white/[0.06] bg-white/[0.02] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden rounded-2xl">
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                  <Fingerprint className="h-4 w-4 text-violet-400" />
                  Latest change per entity — click a row to open its full trail
                </div>
                <span className="text-[11px] text-muted-foreground">{totalItems} record{totalItems === 1 ? "" : "s"}</span>
              </div>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-xs text-left border-collapse min-w-[960px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-white/[0.08] bg-[#0b0e1a]/90 backdrop-blur-md text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                      <th className="p-4 font-semibold">Changed</th>
                      <th className="p-4 font-semibold">Ticket</th>
                      <th className="p-4 font-semibold">Auditor</th>
                      <th className="p-4 font-semibold">Type</th>
                      <th className="p-4 font-semibold">Event</th>
                      <th className="p-4 font-semibold">Transition</th>
                      <th className="p-4 font-semibold">Remarks / Reason</th>
                      <th className="p-4 w-8" />
                    </tr>
                  </thead>
                  <motion.tbody variants={containerVariants} initial="hidden" animate="show" className="divide-y divide-white/[0.04]">
                    {displayLogs.length === 0 ? (
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
                      displayLogs.map((log) => {
                        const cat = categorize(log)
                        const def = CATEGORIES[cat]
                        return (
                          <motion.tr
                            key={log.id}
                            variants={rowVariants}
                            onClick={() => setSelectedEntity({ entityType: log.entityType, entityId: log.entityId, jtrackId: getEntityJtrackId(log.entityType, log.entityId) })}
                            className="group hover:bg-white/[0.03] transition-colors cursor-pointer"
                          >
                            <td className="p-4 whitespace-nowrap">
                              <div className="font-mono text-zinc-300">{new Date(log.changedDate).toLocaleDateString([], { day: "2-digit", month: "short", year: "2-digit" })}</div>
                              <div className="font-mono text-[10px] text-muted-foreground/60">{new Date(log.changedDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                            </td>
                            <td className="p-4">
                              <span className="font-mono font-bold text-violet-300 bg-violet-400/5 border border-violet-400/15 px-2 py-1 rounded-lg shadow-sm">{getEntityJtrackId(log.entityType, log.entityId)}</span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2 font-semibold text-white">
                                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-[10px] text-cyan-200 shrink-0">{initials(log.changedBy?.fullName)}</span>
                                <div className="min-w-0">
                                  <span className="block truncate max-w-[140px]">{log.changedBy?.fullName ?? "System"}</span>
                                  <span className="block text-[9px] text-zinc-500 font-normal">{prettyRole(log.changedBy)}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold text-[9px] border ${typeStyles(log.entityType)}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${typeDot(log.entityType)}`} />
                                {log.entityType}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-[9px] border ${def.bg} ${def.border} ${def.text}`}>
                                <def.Icon className="h-3 w-3" /> {def.label}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className="text-rose-300/90 font-medium bg-rose-500/5 px-2 py-0.5 rounded-md border border-rose-500/15 max-w-[120px] truncate" title={log.oldValue || "None"}>{log.oldValue || "None"}</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                                <span className="text-emerald-300 font-bold bg-emerald-500/5 px-2 py-0.5 rounded-md border border-emerald-500/15 max-w-[120px] truncate" title={log.newValue || "None"}>{log.newValue || "None"}</span>
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
                        )
                      })
                    )}
                  </motion.tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Pagination
            currentPage={auditPage}
            totalItems={totalItems}
            pageSize={auditPageSize}
            onPageChange={(p) => { setAuditPage(p); window.scrollTo({ top: 0, behavior: "smooth" }) }}
            onPageSizeChange={(s) => { setAuditPageSize(s); setAuditPage(0) }}
            className="border border-white/[0.06] bg-white/[0.02] rounded-2xl backdrop-blur-md"
          />
        </>
      )}
    </div>
  )
}

/* ══════════════════ drill-down: full audit trail ═══════════════ */
function AuditTrailDetail({
  entity, onBack, groupedLogs, viewMode, setViewMode,
  timelineSearch, setTimelineSearch, timelineActor, setTimelineActor,
  expandedGroups, setExpandedGroups,
}: {
  entity: { entityType: string; entityId: number; jtrackId: string }
  onBack: () => void
  groupedLogs: any[]
  viewMode: "timeline" | "grouped" | "table"
  setViewMode: (m: "timeline" | "grouped" | "table") => void
  timelineSearch: string; setTimelineSearch: (s: string) => void
  timelineActor: string; setTimelineActor: (a: string) => void
  expandedGroups: Record<string, boolean>
  setExpandedGroups: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}) {
  const { setDownloadTarget, addToast } = useTaskStore()
  const [activeCats, setActiveCats] = useState<Set<CatKey>>(new Set())
  const safeGroups = Array.isArray(groupedLogs) ? groupedLogs : []
  const allFlatLogs = useMemo(() => safeGroups.flatMap((g) => g.logs || []), [safeGroups])
  const actors = useMemo(() => {
    const m = new Map<number, string>()
    allFlatLogs.forEach((l: any) => { if (l.changedBy) m.set(l.changedBy.id, l.changedBy.fullName) })
    return Array.from(m.entries())
  }, [allFlatLogs])
  const presentCats = useMemo(() => {
    const s = new Set<CatKey>()
    allFlatLogs.forEach((l: any) => s.add(categorize(l)))
    const order = Object.keys(CATEGORIES) as CatKey[]
    return order.filter((c) => s.has(c))
  }, [allFlatLogs])
  const visibleLogs = useMemo(
    () => (activeCats.size === 0 ? allFlatLogs : allFlatLogs.filter((l: any) => activeCats.has(categorize(l)))),
    [allFlatLogs, activeCats]
  )
  const toggleCat = (c: CatKey) =>
    setActiveCats((prev) => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n })
  const toggleGroup = (g: string) => setExpandedGroups((prev) => ({ ...prev, [g]: !prev[g] }))
  const handleExport = () => {
    const params = new URLSearchParams()
    if (timelineSearch) params.append("search", timelineSearch)
    if (timelineActor) params.append("actorId", timelineActor)
    fetch(`${APP_CONFIG.apiUrl}/api/audit/groups/${entity.entityType}/${entity.entityId}/export?${params.toString()}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => { if (!res.ok) throw new Error("Failed to export audit logs"); return res.blob() })
      .then((blob) => {
        const reader = new FileReader()
        reader.onloadend = () => setDownloadTarget({ base64Data: reader.result as string, defaultFileName: `audit_history_${entity.entityType}_${entity.entityId}.xlsx` })
        reader.readAsDataURL(blob)
      })
      .catch((err) => addToast("Export failed: " + err.message, "error"))
  }
  const modes: { key: "timeline" | "grouped" | "table"; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "timeline", label: "Timeline", Icon: AlignLeft },
    { key: "grouped", label: "Grouped", Icon: ListTree },
    { key: "table", label: "Table", Icon: Table2 },
  ]
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.07] p-5 rounded-3xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={onBack} aria-label="Back to all logs" className="p-2.5 bg-white/[0.04] border border-white/[0.1] rounded-xl hover:bg-white/[0.09] hover:border-violet-500/30 text-slate-300 hover:text-white transition-all">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-violet-300 bg-violet-400/5 border border-violet-400/15 px-2 py-0.5 rounded">{entity.jtrackId}</span>
              <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">{entity.entityType} · {allFlatLogs.length} events</span>
            </div>
            <h2 className="text-lg font-bold text-zinc-100 mt-1">Lifecycle Audit Trail</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="flex bg-black/40 p-0.5 rounded-xl border border-white/[0.06] text-xs">
            {modes.map((m) => (
              <button
                key={m.key}
                onClick={() => setViewMode(m.key)}
                aria-pressed={viewMode === m.key}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${viewMode === m.key ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                <m.Icon className="h-3.5 w-3.5" /> {m.label}
              </button>
            ))}
          </div>
          <button onClick={handleExport} className="px-4 py-1.5 text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 rounded-xl font-bold transition-all flex items-center gap-1.5 shadow">
            <Download className="h-3.5 w-3.5" /> Export Excel
          </button>
        </div>
      </div>

      {/* Summary */}
      <AuditSummary logs={allFlatLogs} />

      {/* Filters */}
      <AuditFilters
        search={timelineSearch} setSearch={setTimelineSearch}
        actor={timelineActor} setActor={setTimelineActor} actors={actors}
        activeCats={activeCats} toggleCat={toggleCat} presentCats={presentCats}
        onClear={() => { setTimelineSearch(""); setTimelineActor(""); setActiveCats(new Set()) }}
      />

      {/* Body */}
      {viewMode === "timeline" && <AuditTimeline logs={visibleLogs} jtrackId={entity.jtrackId} />}
      {viewMode === "table" && (
        <Card variant="glass" className="border-white/[0.06] bg-white/[0.02] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs text-left min-w-[820px]">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#0b0e1a]/90 text-muted-foreground uppercase tracking-wider text-[10px]">
                  <th className="p-3 font-semibold">Time</th>
                  <th className="p-3 font-semibold">Event</th>
                  <th className="p-3 font-semibold">Actor</th>
                  <th className="p-3 font-semibold">Field</th>
                  <th className="p-3 font-semibold">Transition</th>
                  <th className="p-3 font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {visibleLogs.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-zinc-500">No events match your filters.</td></tr>
                ) : (
                  [...visibleLogs].sort((a, b) => new Date(b.changedDate).getTime() - new Date(a.changedDate).getTime()).map((log) => {
                    const cat = categorize(log); const def = CATEGORIES[cat]
                    return (
                      <tr key={log.id} className="hover:bg-white/[0.03]">
                        <td className="p-3 font-mono text-zinc-400 whitespace-nowrap">{new Date(log.changedDate).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</td>
                        <td className="p-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold border ${def.bg} ${def.border} ${def.text}`}><def.Icon className="h-3 w-3" /> {def.label}</span></td>
                        <td className="p-3 text-zinc-300">{log.changedBy?.fullName ?? "System"}</td>
                        <td className="p-3 font-mono text-violet-300">{log.fieldName}</td>
                        <td className="p-3"><span className="text-rose-300/80">{log.oldValue || "—"}</span> <span className="text-zinc-600">→</span> <span className="text-emerald-300 font-semibold">{log.newValue || "—"}</span></td>
                        <td className="p-3 text-zinc-400 max-w-xs truncate" title={log.remarks}>{log.remarks || "—"}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {viewMode === "grouped" && (
        <div className="grid grid-cols-1 gap-3">
          {safeGroups.map((group) => {
            const logs = (group.logs || []).filter((l: any) => activeCats.size === 0 || activeCats.has(categorize(l)))
            if (logs.length === 0) return null
            const isExpanded = !!expandedGroups[group.groupName]
            return (
              <div key={group.groupName} className="border border-white/[0.06] rounded-2xl bg-white/[0.01] overflow-hidden hover:border-white/[0.10] transition-colors">
                <button onClick={() => toggleGroup(group.groupName)} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    {isExpanded ? <FolderOpen className="h-4 w-4 text-violet-400" /> : <Folder className="h-4 w-4 text-zinc-500" />}
                    <span className="text-sm font-bold text-zinc-200">{group.groupName}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 font-bold text-violet-300">{logs.length}</span>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-zinc-500 font-semibold">
                    {isExpanded ? "Collapse" : "Expand"}
                    <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                      <div className="p-4 border-t border-white/[0.04] bg-black/20 space-y-3">
                        <AuditTimeline logs={logs} jtrackId={entity.jtrackId} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}