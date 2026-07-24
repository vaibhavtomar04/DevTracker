import { useEffect, useState } from "react"
import { useTaskStore } from "@/store/taskStore"
import { useAuthStore } from "@/store/authStore"
import { getAssignedDevNames } from "@/utils/devUtils"
import { getCRStatusBadgeClass } from "@/utils/statusColors"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ShieldCheck,
  Calendar,
  Undo2,
  Server,
  GitBranch,
  AlertTriangle,
  User,
  Users,
  ExternalLink,
  FileText
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { Task } from "@/services/mockData"

export default function Deployments() {
  const { tasks, fetchData, updateTask, searchQuery, testCases, addToast, auditLogs } = useTaskStore()
  const { user } = useAuthStore()
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Task | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const handleRollback = async (task: Task) => {
    if (!user) return
    const reason = prompt("Enter rollback reason:")
    if (reason === null) return // Canceled
    if (!reason.trim()) {
      addToast("Rollback reason is mandatory!", "error")
      return
    }

    let prevStatus = "IN_PROGRESS"
    if (task.status === "PROD_DEPLOYED" || task.status === "CLOSED") {
      prevStatus = "UAT_COMPLETED"
    } else if (task.status === "MOVE_TO_UAT" || task.status === "UAT_TESTING" || task.status === "TESTING_POOL" || task.status === "TESTING_IN_PROGRESS" || task.status === "TESTING_COMPLETED" || task.status === "BUG_FOUND" || task.status === "UAT_COMPLETED") {
      prevStatus = "SIT_COMPLETED"
    } else if (task.status === "SIT_DEPLOYED") {
      prevStatus = "IN_PROGRESS"
    }

    try {
      await updateTask(task.id, { status: prevStatus }, `ROLLBACK TRIGGERED: Environment rollback from ${task.status} to ${prevStatus}. Reason: ${reason}`, user)
      addToast("Rollback executed successfully! Pipeline state updated.", "success")
      fetchData()
    } catch (err: any) {
      addToast(err.message || "Rollback failed", "error")
    }
  }

  // Group tasks by pipeline stages and filter by searchQuery
  const getStageTasks = (stage: "DEV" | "SIT" | "UAT" | "PROD") => {
    return tasks.filter(t => {
      // global search query filter
      if (searchQuery) {
        const s = searchQuery.toLowerCase()
        const matchesSearch = t.title.toLowerCase().includes(s) || 
                              t.jtrackId.toLowerCase().includes(s) || 
                              t.description.toLowerCase().includes(s)
        if (!matchesSearch) return false
      }

      switch (stage) {
        case "DEV":
          return t.status === "OPEN" || t.status === "IN_PROGRESS" || t.status === "CHANGES_REQUESTED"
        case "SIT":
          return t.status === "SIT_DEPLOYED" || t.status === "SIT_TESTING" || t.status === "SIT_COMPLETED"
        case "UAT":
          return t.status === "CODE_REVIEW" || t.status === "CODE_REVIEW_DONE" || t.status === "MOVE_TO_UAT" || t.status === "UAT_TESTING" || t.status === "TESTING_POOL" || t.status === "TESTING_IN_PROGRESS" || t.status === "TESTING_COMPLETED" || t.status === "BUG_FOUND" || t.status === "UAT_COMPLETED"
        case "PROD":
          return t.status === "PROD_DEPLOYED" || t.status === "PROD_COMPLETED" || t.status === "CLOSED"
        default:
          return false
      }
    })
  }

  const stages = [
    { key: "DEV", title: "DEV Environment", desc: "Local & Dev Builds", color: "border-sky-500/20 bg-sky-500/5 text-sky-400 glow-sky" },
    { key: "SIT", title: "SIT Sandbox", desc: "System Integration Testing", color: "border-violet-500/20 bg-violet-500/5 text-violet-400 glow-violet" },
    { key: "UAT", title: "UAT Environment", desc: "User Acceptance Testing", color: "border-indigo-500/20 bg-indigo-500/5 text-indigo-400 glow-indigo" },
    { key: "PROD", title: "PROD System", desc: "Live Enterprise Release", color: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400 glow-emerald" },
  ] as const

  // Container motion configuration
  const boardVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring" as const, stiffness: 100, damping: 15 }
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4 sm:px-6">
      {/* Page Header */}
      <div className="relative overflow-hidden p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="absolute top-0 right-0 w-80 h-32 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-60 h-24 bg-violet-600/5 blur-[80px] rounded-full pointer-events-none" />

        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 shadow-[0_0_15px_rgba(124,58,237,0.15)]">
            <Server className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Deployment <span className="text-glow font-extrabold">Tracking</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
              Monitor active builds across server pipelines, verify version gates, and trigger emergency code rollbacks.
            </p>
          </div>
        </div>
      </div>

      {/* Pipeline Board */}
      <motion.div 
        variants={boardVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start"
      >
        {stages.map((stage) => {
          const stageTasks = getStageTasks(stage.key)
          return (
            <div key={stage.key} className="space-y-3 bg-white/[0.01] border border-white/[0.04] p-3 rounded-2xl backdrop-blur-sm shadow-[inset_0_0_0_1px_rgba(255,255,255,0.01)] min-h-[250px]">
              {/* Column Header */}
              <div className={`p-3 rounded-xl border ${stage.color} flex flex-col space-y-0.5 relative overflow-hidden`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">{stage.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950/40 border border-white/10 font-bold text-white shadow-inner">
                    {stageTasks.length}
                  </span>
                </div>
                <span className="text-[9px] opacity-75">{stage.desc}</span>
              </div>

              {/* Column Cards Container */}
              <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1 scrollbar-thin">
                {stageTasks.length === 0 ? (
                  <div className="text-center py-10 text-[10px] text-muted-foreground/60 border border-dashed border-white/[0.06] rounded-xl font-medium">
                    No active builds in lane
                  </div>
                ) : (
                  stageTasks.map(task => (
                    <motion.div
                      key={task.id}
                      variants={cardVariants}
                      whileHover={{ scale: 1.015, y: -1 }}
                      onClick={() => setSelectedTaskForDetails(task)}
                      className="p-3 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] shadow-sm space-y-2.5 text-xs hover:border-white/[0.12] transition-all cursor-pointer relative group"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-bold text-violet-400 bg-violet-400/5 border border-violet-400/10 px-1.5 py-0.5 rounded text-[9px] shadow-sm">
                          {task.jtrackId}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${getCRStatusBadgeClass(task.status)}`}>
                          {task.status === "BUG_FOUND" ? "Bug Found" : task.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="font-semibold block leading-snug text-white group-hover:text-violet-300 transition-colors">
                        {task.title}
                      </span>
                      
                      <div className="border-t border-white/[0.04] pt-2 flex items-center justify-between text-[10px] text-muted-foreground/80">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 shrink-0 text-cyan-400" />
                          <span className="font-mono">Build v{(1.0 + task.id * 0.1).toFixed(1)}</span>
                        </div>
                        
                        {/* Rollback button (Admin & Developer and only for deployed states) */}
                        {(user?.roles?.includes("DEVADMIN") || user?.roles?.includes("DEVELOPER")) && 
                         (task.status === "SIT_DEPLOYED" || task.status === "MOVE_TO_UAT" || task.status === "UAT_TESTING" || task.status === "BUG_FOUND" || task.status === "UAT_COMPLETED" || task.status === "PROD_DEPLOYED" || task.status === "CLOSED" || task.status === "CHANGES_REQUESTED") && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRollback(task); }}
                            className="text-rose-400 hover:text-rose-300 font-bold flex items-center space-x-0.5 transition-colors cursor-pointer border border-rose-500/10 hover:border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 px-1.5 py-0.5 rounded-md"
                            title="Trigger Rollback"
                          >
                            <Undo2 className="h-2.5 w-2.5 shrink-0" />
                            <span>Rollback</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </motion.div>

      {/* Active Release Auditing Log */}
      <Card variant="glass" className="border-white/[0.06] bg-white/[0.02] shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden">
        <CardHeader className="p-5 border-b border-white/[0.06]">
          <CardTitle className="text-base font-bold flex items-center space-x-2 text-white">
            <ShieldCheck className="h-4 w-4 text-violet-400" />
            <span>Active Release Audits</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            SIT/UAT/PROD audit logs detailing version promotions, gate approvals, and environment rollback events.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-64 overflow-y-auto scrollbar-thin">
            <table className="w-full text-xs text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.01] text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Event Date</th>
                  <th className="p-4">Target CR</th>
                  <th className="p-4">Auditor</th>
                  <th className="p-4">Event Type</th>
                  <th className="p-4">Rollback details / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {auditLogs
                  .filter(log => log.fieldName.includes("workflow") || log.remarks?.includes("ROLLBACK"))
                  .slice(0, 8)
                  .map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="p-4 text-muted-foreground/80 font-mono">
                        {new Date(log.changedDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="p-4">
                        <span className="font-mono font-bold text-violet-400 bg-violet-400/5 border border-violet-400/10 px-2 py-0.5 rounded shadow-sm">
                          {tasks.find(t => t.id === log.entityId)?.jtrackId || `DT-${100 + log.entityId}`}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-white">{log.changedBy.fullName}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${
                          log.remarks?.includes("ROLLBACK") 
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.05)]" 
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]"
                        }`}>
                          {log.remarks?.includes("ROLLBACK") ? "ROLLBACK" : "PROMOTION"}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-slate-300 max-w-sm truncate" title={log.remarks}>
                        {log.remarks}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CR Details Modal */}
      <AnimatePresence>
        {selectedTaskForDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="absolute inset-0" onClick={() => setSelectedTaskForDetails(null)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-lg glass-panel border border-white/[0.08] bg-[#070a14]/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-y-auto max-h-[90vh] text-xs text-foreground p-6 space-y-4 scrollbar-thin"
            >
              {/* Accent top line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500" />

              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                    <FileText className="h-4 w-4 text-violet-400" />
                    <span>Change Request Details</span>
                  </h3>
                  <span className="font-mono text-xs text-cyan-400 font-bold mt-1 block">
                    {selectedTaskForDetails.jtrackId}
                  </span>
                </div>
                <button
                  className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-white transition-all cursor-pointer font-bold"
                  onClick={() => setSelectedTaskForDetails(null)}
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="space-y-4 text-xs">
                {/* Title */}
                <div className="space-y-1">
                  <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider block">Title</span>
                  <span className="font-bold text-xs text-white leading-snug block">{selectedTaskForDetails.title}</span>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider block">Description / Scope</span>
                  <p className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.01] leading-relaxed text-[11px] text-slate-300">
                    {selectedTaskForDetails.description}
                  </p>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 gap-3 bg-white/[0.02] p-3.5 rounded-xl border border-white/[0.06] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.01)]">
                  <div>
                    <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider block">Workflow State</span>
                    <span className={`font-bold text-xs mt-0.5 block uppercase ${
                      selectedTaskForDetails.status === "BUG_FOUND" ? "text-rose-400" :
                      selectedTaskForDetails.status === "CHANGES_REQUESTED" ? "text-rose-400" : "text-cyan-400"
                    }`}>
                      {selectedTaskForDetails.status === "BUG_FOUND" ? "Bug Found" :
                       selectedTaskForDetails.status === "CHANGES_REQUESTED" ? "Changes Requested" :
                       selectedTaskForDetails.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider block">Priority Rank</span>
                    <span className={`font-bold text-xs mt-0.5 block ${
                      selectedTaskForDetails.priority === "High" ? "text-rose-400" :
                      selectedTaskForDetails.priority === "Medium" ? "text-amber-400" : "text-muted-foreground"
                    }`}>{selectedTaskForDetails.priority}</span>
                  </div>
                  <div className="border-t border-white/[0.04] pt-2 mt-1">
                    <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider block">Effort Estimate</span>
                    <span className="font-semibold text-xs text-white mt-0.5 block">{selectedTaskForDetails.efforts} Days</span>
                  </div>
                  <div className="border-t border-white/[0.04] pt-2 mt-1">
                    <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider block">Created By</span>
                    <span className="font-semibold text-xs text-white mt-0.5 block">{selectedTaskForDetails.createdBy?.fullName || "System"}</span>
                  </div>
                  <div className="col-span-2 border-t border-white/[0.04] pt-2 mt-1">
                    <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider block">Developer Name</span>
                    <span className="font-semibold text-xs text-white mt-0.5 block flex items-center space-x-1">
                      <User className="h-3 w-3 text-violet-400" />
                      <span>
                        {getAssignedDevNames(selectedTaskForDetails)}
                      </span>
                    </span>
                  </div>
                  <div className="col-span-2 border-t border-white/[0.04] pt-2 mt-1">
                    <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider block">Branch Name</span>
                    <span className="font-mono text-xs text-slate-300 truncate mt-0.5 block flex items-center space-x-1" title={selectedTaskForDetails.branchName || selectedTaskForDetails.developers?.[0]?.branchName}>
                      <GitBranch className="h-3.5 w-3.5 text-cyan-400" />
                      <span>
                        {selectedTaskForDetails.branchName || 
                         selectedTaskForDetails.developers?.[0]?.branchName || 
                         "None"}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Git PR */}
                <div className="space-y-1 bg-white/[0.02] p-3 rounded-xl border border-white/[0.06]">
                  <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider block">Git PR Reference / Link</span>
                  {selectedTaskForDetails.gitLinks || selectedTaskForDetails.developers?.[0]?.prLink ? (
                    <a 
                      href={selectedTaskForDetails.gitLinks || selectedTaskForDetails.developers?.[0]?.prLink} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-cyan-400 hover:text-cyan-300 font-mono break-all text-xs flex items-center space-x-1 hover:underline mt-0.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                      <span>{selectedTaskForDetails.gitLinks || selectedTaskForDetails.developers?.[0]?.prLink}</span>
                    </a>
                  ) : (
                    <span className="text-muted-foreground italic text-xs block mt-0.5">No Git link available</span>
                  )}
                </div>

                {/* Deployment Dates */}
                <div className="space-y-1.5">
                  <span className="text-slate-300 block text-[10px] font-semibold uppercase tracking-wider">Deployment Dates / Stages</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex justify-between p-2 rounded-lg border border-white/[0.05] bg-white/[0.01]">
                      <span className="text-muted-foreground">DEV Start:</span>
                      <span className="font-semibold text-white">
                        {selectedTaskForDetails.devStartDate || selectedTaskForDetails.developers?.[0]?.devStartDate || "Not Started"}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg border border-white/[0.05] bg-white/[0.01]">
                      <span className="text-muted-foreground">SIT Deployment:</span>
                      <span className="font-semibold text-white">{selectedTaskForDetails.sitDate || "Not Deployed"}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg border border-white/[0.05] bg-white/[0.01]">
                      <span className="text-muted-foreground">UAT Deployment:</span>
                      <span className="font-semibold text-white">{selectedTaskForDetails.uatDate || "Not Deployed"}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg border border-white/[0.05] bg-white/[0.01]">
                      <span className="text-muted-foreground">PROD Deployment:</span>
                      <span className="font-semibold text-white">{selectedTaskForDetails.productionDate || "Not Deployed"}</span>
                    </div>
                  </div>
                </div>

                {/* QA Verification Scenarios */}
                <div className="space-y-1.5">
                  <span className="text-slate-300 block text-[10px] font-semibold uppercase tracking-wider">QA Verification Scenarios (Regression)</span>
                  {testCases.filter(tc => tc.testCaseTaskId === selectedTaskForDetails.id).length === 0 ? (
                    <span className="text-muted-foreground italic text-xs block bg-white/[0.01] p-2.5 rounded-lg border border-white/[0.05]">No regression scenarios tested.</span>
                  ) : (
                    <div className="space-y-2 max-h-32 overflow-y-auto border border-white/[0.06] rounded-xl p-2.5 bg-white/[0.01] scrollbar-thin">
                      {testCases
                        .filter(tc => tc.testCaseTaskId === selectedTaskForDetails.id)
                        .map(tc => (
                          <div key={tc.id} className="flex justify-between items-center border-b border-white/[0.04] pb-1.5 last:border-0 last:pb-0">
                            <div>
                              <span className="font-semibold text-white block">{tc.title}</span>
                              <span className="text-[9px] text-muted-foreground/80 block mt-0.5">{tc.description}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${
                              tc.status === "PASS" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              tc.status === "FAIL" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                              "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}>
                              {tc.status || "PENDING"}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Emergency Rollback History */}
                {auditLogs.filter(l => l.entityId === selectedTaskForDetails.id && l.entityType === "TASK" && l.remarks?.includes("ROLLBACK")).length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-rose-400 block text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                      <span>Rollback History / Alerts</span>
                    </span>
                    <div className="space-y-2 border border-rose-500/20 rounded-xl p-3 bg-rose-500/5 text-rose-300">
                      {auditLogs
                        .filter(l => l.entityId === selectedTaskForDetails.id && l.entityType === "TASK" && l.remarks?.includes("ROLLBACK"))
                        .map(l => (
                          <div key={l.id} className="border-b border-white/[0.04] pb-1.5 last:border-0 last:pb-0 text-[10px]">
                            <div className="flex justify-between items-center font-bold">
                              <span>Date: {new Date(l.changedDate).toLocaleString()}</span>
                              <span>By: {l.changedBy?.fullName}</span>
                            </div>
                            <p className="mt-1 leading-snug text-rose-200/90">{l.remarks}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Contributor contributions */}
                {selectedTaskForDetails.developers && selectedTaskForDetails.developers.length > 1 && (
                  <div className="space-y-1.5">
                    <span className="text-slate-300 block text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-violet-400" />
                      <span>All Assigned Contributors</span>
                    </span>
                    <div className="space-y-2">
                      {selectedTaskForDetails.developers.map((devMap: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl border border-white/[0.05] bg-white/[0.01] text-[11px]">
                          <div>
                            <span className="font-bold text-white block">{devMap.developer.fullName}</span>
                            <span className="text-[9px] text-muted-foreground font-mono mt-0.5 block">{devMap.branchName}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-violet-400 block">{devMap.progress}%</span>
                            <span className="text-[9px] text-muted-foreground">Progress</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end pt-3 border-t border-white/[0.06]">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedTaskForDetails(null)}
                >
                  Close Details
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
