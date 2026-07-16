import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useTaskStore } from "@/store/taskStore"
import { useAuthStore } from "@/store/authStore"
import { Bug, X, Download, FileText, Image, Film, File, Clock, CheckCircle2, Circle, Play, Send } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import type { Bug as BugType } from "@/services/mockData"

interface BugDetailModalProps {
  bugId: number
  onClose: () => void
  /** When true, developer action buttons are shown (Start Investigation / Submit Fix) */
  showDeveloperActions?: boolean
}

function getFileIcon(type?: string) {
  if (!type) return <File className="h-4 w-4 text-muted-foreground" />
  if (type.startsWith("image/")) return <Image className="h-4 w-4 text-sky-400" />
  if (type.startsWith("video/")) return <Film className="h-4 w-4 text-violet-400" />
  if (type === "application/pdf") return <FileText className="h-4 w-4 text-rose-400" />
  return <File className="h-4 w-4 text-muted-foreground" />
}

const statusConfig: Record<string, { color: string; dot: string; icon: React.ReactNode }> = {
  OPEN:        { color: "text-sky-500 bg-sky-500/10 border-sky-500/30",       dot: "bg-sky-400",     icon: <Circle className="h-3 w-3" /> },
  IN_PROGRESS: { color: "text-amber-500 bg-amber-500/10 border-amber-500/30", dot: "bg-amber-400",   icon: <Clock className="h-3 w-3" /> },
  RESOLVED:    { color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30", dot: "bg-emerald-400", icon: <CheckCircle2 className="h-3 w-3" /> },
  VERIFIED:    { color: "text-teal-600 bg-teal-500/10 border-teal-500/30",    dot: "bg-teal-400",    icon: <CheckCircle2 className="h-3 w-3" /> },
  CLOSED:      { color: "text-muted-foreground bg-muted border-border",        dot: "bg-muted-foreground", icon: <CheckCircle2 className="h-3 w-3" /> },
}

const severityColor: Record<string, string> = {
  Critical: "text-rose-500 bg-rose-500/10 border-rose-500/30",
  High:     "text-orange-500 bg-orange-500/10 border-orange-500/30",
  Medium:   "text-amber-600 bg-amber-500/10 border-amber-500/30",
  Low:      "text-emerald-600 bg-emerald-500/10 border-emerald-500/30",
}

function fmt(d?: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}

export default function BugDetailModal({ bugId, onClose, showDeveloperActions = false }: BugDetailModalProps) {
  const { fetchBugDetail, setDownloadTarget, addToast, fetchFixSummary, updateBug, submitFixSummary } = useTaskStore()
  const { user } = useAuthStore()
  const [bug, setBug] = useState<BugType | null>(null)
  const [loading, setLoading] = useState(true)
  const [artLoading, setArtLoading] = useState<number | null>(null)
  const [fixSummary, setFixSummary] = useState<any | null>(null)

  // Developer action form state
  const [remarks, setRemarks] = useState("")
  const [rootCauseAnalysis, setRootCauseAnalysis] = useState("")
  const [fixSummaryText, setFixSummaryText] = useState("")
  const [filesModified, setFilesModified] = useState("")
  const [databaseChanges, setDatabaseChanges] = useState("")
  const [apiChanges, setApiChanges] = useState("")
  const [additionalNotes, setAdditionalNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const loadBug = () => {
    setLoading(true)
    setFixSummary(null)
    fetchBugDetail(bugId)
      .then(b => {
        setBug(b)
        if (b.status === "RESOLVED" || b.status === "VERIFIED" || b.status === "CLOSED") {
          fetchFixSummary(bugId)
            .then(fs => setFixSummary(fs))
            .catch(err => console.log("No fix summary found:", err))
        }
      })
      .catch(err => addToast(err.message || "Failed to load bug details", "error"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadBug() }, [bugId])

  const handleDownloadArtifact = async (artId: number, fileName: string) => {
    setArtLoading(artId)
    try {
      const res = await fetch(`/api/bugs/${bugId}/artifacts/${artId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
      if (!res.ok) throw new Error("Failed to fetch artifact")
      const data = await res.json()
      setDownloadTarget({ base64Data: data.fileData, defaultFileName: data.fileName || fileName })
    } catch (err: any) {
      addToast(err.message || "Failed to download artifact", "error")
    } finally {
      setArtLoading(null)
    }
  }

  const handleStartInvestigation = async () => {
    if (!bug || !user) return
    setSubmitting(true)
    try {
      await updateBug(bug.id, { status: "IN_PROGRESS" }, remarks || "Investigating code defect", user)
      loadBug()
    } catch (err: any) {
      addToast(err.message || "Failed to start investigation", "error")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitFix = async () => {
    if (!bug || !user) return
    if (!rootCauseAnalysis.trim() || !fixSummaryText.trim()) {
      addToast("Root Cause Analysis and Fix Summary are required", "error")
      return
    }
    setSubmitting(true)
    try {
      await submitFixSummary(bug.id, {
        rootCauseAnalysis,
        fixSummary: fixSummaryText,
        filesModified,
        databaseChanges,
        apiChanges,
        additionalNotes,
      })
      await updateBug(bug.id, { status: "RESOLVED" }, remarks || "Bug resolved", user)
      addToast("Bug marked RESOLVED with fix summary", "success")
      loadBug()
    } catch (err: any) {
      addToast(err.message || "Failed to submit fix", "error")
    } finally {
      setSubmitting(false)
    }
  }

  const sc = bug ? (statusConfig[bug.status] || statusConfig.OPEN) : statusConfig.OPEN
  const currentStatus = bug?.status
  const isTwoSideLayout = true

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className={`bg-card border border-border w-full rounded-2xl shadow-2xl overflow-hidden text-xs text-foreground transition-all duration-300 ${
          isTwoSideLayout ? "max-w-4xl" : "max-w-2xl"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-rose-500/5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
              <Bug className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-foreground">Bug Detail</h3>
              {bug && <p className="text-[10px] font-mono text-rose-500 mt-0.5">{bug.jtrackId}</p>}
            </div>
          </div>
          <button
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 rounded-full border-2 border-rose-500/30 border-t-rose-500 animate-spin" />
            </div>
          ) : !bug ? (
            <div className="text-center py-16 text-muted-foreground text-sm">Bug not found.</div>
          ) : isTwoSideLayout ? (
            /* ────────── TWO SIDE (TWO COLUMN) LAYOUT ────────── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              {/* Left Side: Standard bug details & Remarks */}
              <div className="space-y-5">
                {/* Title + Status */}
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-base font-black text-foreground leading-tight">{bug.title}</h2>
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border shrink-0 ${sc.color}`}>
                    {sc.icon}{bug.status}
                  </span>
                </div>

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Severity",    value: <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${severityColor[bug.severity] || ""}`}>{bug.severity}</span> },
                    { label: "Priority",    value: bug.priority },
                    { label: "Raised By",   value: bug.raisedBy?.fullName || "—" },
                    { label: "Raised On",   value: fmt(bug.createdDate) },
                    { label: "Resolved On", value: bug.resolvedOn ? fmt(bug.resolvedOn) : <span className="text-muted-foreground italic">Not yet resolved</span> },
                    { label: "Linked CR",   value: bug.crTaskId ? <span className="font-mono text-violet-500">CR #{bug.crTaskId}</span> : "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 rounded-xl border border-border bg-muted/40 space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
                      <div className="text-[11px] font-semibold text-foreground">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Reason for Raising */}
                {bug.reason && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Reason for Raising</span>
                    <p className="p-3.5 rounded-xl border border-border bg-muted/30 text-[11px] text-foreground leading-relaxed">{bug.reason}</p>
                  </div>
                )}

                {/* Steps to Reproduce */}
                {bug.stepsToReproduce && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Steps to Reproduce</span>
                    <pre className="p-3.5 rounded-xl border border-border bg-muted/30 text-[11px] text-foreground whitespace-pre-wrap font-mono leading-relaxed">{bug.stepsToReproduce}</pre>
                  </div>
                )}

                {/* Expected / Actual */}
                {(bug.expectedResult || bug.actualResult) && (
                  <div className="grid grid-cols-2 gap-4">
                    {bug.expectedResult && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Expected Result</span>
                        <p className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-[11px] text-foreground leading-relaxed">{bug.expectedResult}</p>
                      </div>
                    )}
                    {bug.actualResult && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Actual Result</span>
                        <p className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-[11px] text-foreground leading-relaxed">{bug.actualResult}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Attachments */}
                {bug.artifacts && bug.artifacts.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Attachments ({bug.artifacts.length})</span>
                    <div className="space-y-2">
                      {bug.artifacts.map(art => (
                        <div
                          key={art.id}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          {getFileIcon(art.fileType)}
                          <div className="flex-1 min-w-0">
                            <span className="block truncate font-mono text-foreground text-[11px]">{art.fileName}</span>
                            <span className="text-[9px] text-muted-foreground">{art.fileSize} · Uploaded {fmt(art.uploadedOn)}</span>
                          </div>
                          <button
                            onClick={() => handleDownloadArtifact(art.id, art.fileName)}
                            disabled={artLoading === art.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 text-[10px] font-bold transition-colors disabled:opacity-50"
                          >
                            <Download className="h-3 w-3" />
                            {artLoading === art.id ? "Loading..." : "Download"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-dashed border-border text-center text-muted-foreground text-[11px] italic">
                    No attachments uploaded for this bug.
                  </div>
                )}

                {/* Remarks input — placed at the end of the left side */}
                <div className="space-y-1.5 border-t border-border pt-4">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Bug Resolution Remarks</label>
                  <input
                    placeholder="Mandatory description of code fix / action taken"
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    className="h-10 w-full bg-background border border-border focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none transition-all placeholder:text-muted-foreground font-semibold"
                  />
                </div>
              </div>

              {/* Right Side: Developer Fix Summary form fields OR read-only summary */}
              <div className="space-y-4 border-t md:border-t-0 md:border-l border-border md:pl-6 pt-5 md:pt-0">
                {currentStatus === "IN_PROGRESS" && showDeveloperActions ? (
                  <>
                    <span className="text-rose-500 block font-black uppercase tracking-wider text-[10px]">Developer Fix Summary</span>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground block">Root Cause Analysis *</label>
                      <textarea
                        rows={3}
                        value={rootCauseAnalysis}
                        onChange={e => setRootCauseAnalysis(e.target.value)}
                        placeholder="Describe why this bug occurred..."
                        className="w-full bg-background border border-border focus:ring-2 focus:ring-rose-500/30 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground block">Fix Summary *</label>
                      <textarea
                        rows={3}
                        value={fixSummaryText}
                        onChange={e => setFixSummaryText(e.target.value)}
                        placeholder="Describe what you modified to fix it..."
                        className="w-full bg-background border border-border focus:ring-2 focus:ring-rose-500/30 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground block">Files Modified</label>
                      <input
                        type="text"
                        value={filesModified}
                        onChange={e => setFilesModified(e.target.value)}
                        placeholder="e.g. BugController.java, RaiseBugModal.tsx"
                        className="h-9 w-full bg-background border border-border focus:ring-2 focus:ring-rose-500/30 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground block">Database Changes</label>
                        <input
                          type="text"
                          value={databaseChanges}
                          onChange={e => setDatabaseChanges(e.target.value)}
                          placeholder="None or schema updates"
                          className="h-9 w-full bg-background border border-border focus:ring-2 focus:ring-rose-500/30 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground block">API Changes</label>
                        <input
                          type="text"
                          value={apiChanges}
                          onChange={e => setApiChanges(e.target.value)}
                          placeholder="None or new endpoints"
                          className="h-9 w-full bg-background border border-border focus:ring-2 focus:ring-rose-500/30 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground block">Additional Notes</label>
                      <input
                        type="text"
                        value={additionalNotes}
                        onChange={e => setAdditionalNotes(e.target.value)}
                        placeholder="Any verification instructions..."
                        className="h-9 w-full bg-background border border-border focus:ring-2 focus:ring-rose-500/30 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        className="w-full text-xs h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black"
                        onClick={handleSubmitFix}
                        disabled={submitting}
                      >
                        <Send className="mr-1.5 h-4 w-4" />
                        {submitting ? "Submitting..." : "Submit Fix (RESOLVED)"}
                      </Button>
                    </div>
                  </>
                ) : currentStatus === "OPEN" && showDeveloperActions ? (
                  <div className="space-y-4 text-left">
                    <span className="text-rose-500 block font-black uppercase tracking-wider text-[10px]">Developer Actions</span>
                    <div className="p-4 rounded-xl border border-dashed border-border text-center text-muted-foreground text-[11px] italic bg-muted/20">
                      This bug is currently open. Click below to start investigation.
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Bug Resolution Remarks (Optional)</label>
                      <input
                        placeholder="e.g. Starting investigation into code defect..."
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        className="h-10 w-full bg-background border border-border focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none transition-all placeholder:text-muted-foreground font-semibold"
                      />
                    </div>
                    <Button
                      className="w-full text-xs h-10 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold"
                      onClick={handleStartInvestigation}
                      disabled={submitting}
                    >
                      <Play className="mr-1.5 h-4 w-4" />
                      {submitting ? "Starting..." : "Start Investigation (IN_PROGRESS)"}
                    </Button>
                  </div>
                ) : fixSummary ? (
                  <div className="space-y-4 text-left">
                    <span className="text-emerald-500 block font-black uppercase tracking-wider text-[10px]">
                      Developer Fix Summary &amp; RCA
                    </span>
                    <div className="space-y-3.5">
                      <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Root Cause Analysis</span>
                        <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap font-medium">{fixSummary.rootCauseAnalysis}</p>
                      </div>
                      <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Fix Summary</span>
                        <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap font-medium">{fixSummary.fixSummary}</p>
                      </div>
                      {fixSummary.filesModified && (
                        <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Files Modified</span>
                          <code className="text-[10.5px] text-foreground font-mono block whitespace-pre-wrap">{fixSummary.filesModified}</code>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        {fixSummary.databaseChanges && (
                          <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Database Changes</span>
                            <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap font-medium">{fixSummary.databaseChanges}</p>
                          </div>
                        )}
                        {fixSummary.apiChanges && (
                          <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">API Changes</span>
                            <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap font-medium">{fixSummary.apiChanges}</p>
                          </div>
                        )}
                      </div>
                      {fixSummary.additionalNotes && (
                        <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Additional Notes</span>
                          <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap font-medium">{fixSummary.additionalNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-left">
                    <span className="text-emerald-500 block font-black uppercase tracking-wider text-[10px]">
                      Developer Fix Summary &amp; RCA
                    </span>
                    <div className="p-4 rounded-xl border border-dashed border-border text-center text-muted-foreground text-[11px] italic bg-muted/20">
                      No developer fix summary was submitted for this bug.
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ────────── STANDARD SINGLE COLUMN LAYOUT ────────── */
            <div className="p-6 space-y-5">
              {/* Title + Status */}
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-base font-black text-foreground leading-tight">{bug.title}</h2>
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border shrink-0 ${sc.color}`}>
                  {sc.icon}{bug.status}
                </span>
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Severity",    value: <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${severityColor[bug.severity] || ""}`}>{bug.severity}</span> },
                  { label: "Priority",    value: bug.priority },
                  { label: "Raised By",   value: bug.raisedBy?.fullName || "—" },
                  { label: "Raised On",   value: fmt(bug.createdDate) },
                  { label: "Resolved On", value: bug.resolvedOn ? fmt(bug.resolvedOn) : <span className="text-muted-foreground italic">Not yet resolved</span> },
                  { label: "Linked CR",   value: bug.crTaskId ? <span className="font-mono text-violet-500">CR #{bug.crTaskId}</span> : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 rounded-xl border border-border bg-muted/40 space-y-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
                    <div className="text-[11px] font-semibold text-foreground">{value}</div>
                  </div>
                ))}
              </div>

              {/* Reason for Raising */}
              {bug.reason && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Reason for Raising</span>
                  <p className="p-3.5 rounded-xl border border-border bg-muted/30 text-[11px] text-foreground leading-relaxed">{bug.reason}</p>
                </div>
              )}

              {/* Steps to Reproduce */}
              {bug.stepsToReproduce && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Steps to Reproduce</span>
                  <pre className="p-3.5 rounded-xl border border-border bg-muted/30 text-[11px] text-foreground whitespace-pre-wrap font-mono leading-relaxed">{bug.stepsToReproduce}</pre>
                </div>
              )}

              {/* Expected / Actual */}
              {(bug.expectedResult || bug.actualResult) && (
                <div className="grid grid-cols-2 gap-4">
                  {bug.expectedResult && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Expected Result</span>
                      <p className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-[11px] text-foreground leading-relaxed">{bug.expectedResult}</p>
                    </div>
                  )}
                  {bug.actualResult && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Actual Result</span>
                      <p className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-[11px] text-foreground leading-relaxed">{bug.actualResult}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Attachments */}
              {bug.artifacts && bug.artifacts.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Attachments ({bug.artifacts.length})</span>
                  <div className="space-y-2">
                    {bug.artifacts.map(art => (
                      <div
                        key={art.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        {getFileIcon(art.fileType)}
                        <div className="flex-1 min-w-0">
                          <span className="block truncate font-mono text-foreground text-[11px]">{art.fileName}</span>
                          <span className="text-[9px] text-muted-foreground">{art.fileSize} · Uploaded {fmt(art.uploadedOn)}</span>
                        </div>
                        <button
                          onClick={() => handleDownloadArtifact(art.id, art.fileName)}
                          disabled={artLoading === art.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 text-[10px] font-bold transition-colors disabled:opacity-50"
                        >
                          <Download className="h-3 w-3" />
                          {artLoading === art.id ? "Loading..." : "Download"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-dashed border-border text-center text-muted-foreground text-[11px] italic">
                  No attachments uploaded for this bug.
                </div>
              )}

              {/* Developer Fix Summary (read-only, when already resolved) */}
              {fixSummary && (
                <div className="space-y-3 border-t border-border pt-4 text-xs">
                  <span className="text-emerald-600 block font-bold uppercase tracking-wider text-[10px]">
                    Developer Fix Summary &amp; RCA
                  </span>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Root Cause Analysis</span>
                      <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">{fixSummary.rootCauseAnalysis}</p>
                    </div>
                    <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Fix Summary</span>
                      <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">{fixSummary.fixSummary}</p>
                    </div>
                    {fixSummary.filesModified && (
                      <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1 col-span-2">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Files Modified</span>
                        <code className="text-[11px] text-foreground font-mono block whitespace-pre-wrap">{fixSummary.filesModified}</code>
                      </div>
                    )}
                    {fixSummary.databaseChanges && (
                      <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Database Changes</span>
                        <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">{fixSummary.databaseChanges}</p>
                      </div>
                    )}
                    {fixSummary.apiChanges && (
                      <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">API Changes</span>
                        <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">{fixSummary.apiChanges}</p>
                      </div>
                    )}
                    {fixSummary.additionalNotes && (
                      <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1 col-span-2">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Additional Notes</span>
                        <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">{fixSummary.additionalNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Developer Actions Section (for non-IN_PROGRESS e.g. OPEN or RESOLVED) */}
              {showDeveloperActions && (
                <div className="border-t border-border pt-4 space-y-4">
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider block">Developer Actions</span>

                  {/* Remarks input — always shown */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Bug Resolution Remarks</label>
                    <input
                      placeholder="Mandatory description of code fix / action taken"
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      className="h-10 w-full bg-background border border-border focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none transition-all placeholder:text-muted-foreground font-semibold"
                    />
                  </div>

                  {/* Start Investigation button */}
                  {currentStatus === "OPEN" && (
                    <Button
                      className="w-full text-xs h-10 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold"
                      onClick={handleStartInvestigation}
                      disabled={submitting}
                    >
                      <Play className="mr-1.5 h-4 w-4" />
                      {submitting ? "Starting..." : "Start Investigation (IN_PROGRESS)"}
                    </Button>
                  )}

                  {(currentStatus === "RESOLVED" || currentStatus === "VERIFIED") && (
                    <div className="p-3.5 bg-muted rounded-xl border border-border text-center text-muted-foreground font-bold">
                      {currentStatus === "RESOLVED" ? "⏳ Waiting for Tester validation..." : "✅ Bug Verified by Tester"}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-border bg-muted/10">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
