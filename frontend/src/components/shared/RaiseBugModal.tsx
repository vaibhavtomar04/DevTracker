import React, { useState, useRef } from "react"
import { useTaskStore } from "@/store/taskStore"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/button"
import { Bug, X, Upload, FileText, Image, Film, File, Trash2, AlertTriangle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface ArtifactFile {
  id: string
  fileName: string
  fileSize: string
  fileType: string
  fileData: string
}

interface RaiseBugModalProps {
  crTaskId: number
  crJtrackId: string
  onClose: () => void
  onSuccess?: () => void
}

const ACCEPTED_TYPES: string[] = [] // empty = accept all
const ACCEPTED_EXT = "*"
const MAX_FILE_SIZE_MB = 5

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return <Image className="h-3.5 w-3.5 text-sky-400" />
  if (type.startsWith("video/")) return <Film className="h-3.5 w-3.5 text-violet-400" />
  if (type === "application/pdf") return <FileText className="h-3.5 w-3.5 text-rose-400" />
  return <File className="h-3.5 w-3.5 text-slate-400" />
}

const severityOptions: Array<"Critical" | "High" | "Medium" | "Low"> = ["Critical", "High", "Medium", "Low"]
const priorityOptions: Array<"High" | "Medium" | "Low"> = ["High", "Medium", "Low"]

const severityColor = {
  Critical: "text-rose-400 bg-rose-500/10 border-rose-500/30",
  High: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  Medium: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  Low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
}

export default function RaiseBugModal({ crTaskId, crJtrackId, onClose, onSuccess }: RaiseBugModalProps) {
  const { proposeBugReview, addToast } = useTaskStore()
  const { user } = useAuthStore()

  const [title, setTitle] = useState("")
  const [reason, setReason] = useState("")
  const [steps, setSteps] = useState("")
  const [expected, setExpected] = useState("")
  const [actual, setActual] = useState("")
  const [severity, setSeverity] = useState<"Critical" | "High" | "Medium" | "Low">("High")
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium")
  const [artifacts, setArtifacts] = useState<ArtifactFile[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = "Bug title is required"
    if (!reason.trim()) e.reason = "Reason for raising is required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleFileAdd = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(file => {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        addToast(`${file.name} exceeds ${MAX_FILE_SIZE_MB}MB limit`, "error")
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        setArtifacts(prev => [...prev, {
          id: Math.random().toString(36).slice(2),
          fileName: file.name,
          fileSize: formatBytes(file.size),
          fileType: file.type || "text/plain",
          fileData: reader.result as string
        }])
      }
      reader.readAsDataURL(file)
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !user) return
    setLoading(true)
    try {
      await proposeBugReview({
        crTaskId,
        title: title.trim(),
        description: reason.trim(),
        reason: reason.trim(),
        stepsToReproduce: steps.trim() || undefined,
        expectedResult: expected.trim() || undefined,
        actualResult: actual.trim() || undefined,
        severity,
        priority,
        artifacts: artifacts.map(a => ({
          fileName: a.fileName,
          fileSize: a.fileSize,
          fileType: a.fileType,
          fileData: a.fileData
        }))
      })
      addToast(`Proposed Bug Review submitted successfully and linked to ${crJtrackId}`, "success")
      onSuccess?.()
      onClose()
    } catch (err: any) {
      addToast(err.message || "Failed to submit proposed bug review", "error")
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/50 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none transition-all placeholder:text-slate-500"
  const labelCls = "text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5"
  const errCls = "text-[10px] text-rose-400 mt-1 flex items-center gap-1"

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="bg-[#0b0e1a] border border-white/[0.08] w-full max-w-2xl rounded-2xl shadow-2xl shadow-rose-500/5 overflow-hidden text-xs text-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4 bg-gradient-to-r from-rose-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
              <Bug className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-slate-100">Raise Bug</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Linked to <span className="text-rose-400 font-bold font-mono">{crJtrackId}</span></p>
            </div>
          </div>
          <button
            className="p-1.5 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
            onClick={onClose}
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

            {/* Bug Title */}
            <div>
              <label className={labelCls}>Bug Title / Summary <span className="text-rose-400">*</span></label>
              <input
                placeholder="e.g. Login button unresponsive after session timeout"
                value={title}
                onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: "" })) }}
                className={`${inputCls} ${errors.title ? "border-rose-500/50" : ""}`}
              />
              {errors.title && <p className={errCls}><AlertTriangle className="h-3 w-3" />{errors.title}</p>}
            </div>

            {/* Reason */}
            <div>
              <label className={labelCls}>Reason for Raising Bug <span className="text-rose-400">*</span></label>
              <textarea
                rows={3}
                placeholder="Describe what defect was observed and why it's being raised..."
                value={reason}
                onChange={e => { setReason(e.target.value); setErrors(p => ({ ...p, reason: "" })) }}
                className={`${inputCls} resize-none ${errors.reason ? "border-rose-500/50" : ""}`}
              />
              {errors.reason && <p className={errCls}><AlertTriangle className="h-3 w-3" />{errors.reason}</p>}
            </div>

            {/* Steps to Reproduce */}
            <div>
              <label className={labelCls}>Steps to Reproduce <span className="text-slate-500 normal-case font-normal tracking-normal">(optional)</span></label>
              <textarea
                rows={3}
                placeholder={"1. Navigate to login page\n2. Enter valid credentials\n3. Click Login button\n4. Observe error"}
                value={steps}
                onChange={e => setSteps(e.target.value)}
                className={`${inputCls} resize-none font-mono`}
              />
            </div>

            {/* Expected / Actual side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Expected Result <span className="text-slate-500 normal-case font-normal tracking-normal">(optional)</span></label>
                <textarea
                  rows={2}
                  placeholder="What should have happened..."
                  value={expected}
                  onChange={e => setExpected(e.target.value)}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className={labelCls}>Actual Result <span className="text-slate-500 normal-case font-normal tracking-normal">(optional)</span></label>
                <textarea
                  rows={2}
                  placeholder="What actually happened..."
                  value={actual}
                  onChange={e => setActual(e.target.value)}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>

            {/* Severity / Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Severity</label>
                <div className="flex flex-wrap gap-1.5">
                  {severityOptions.map(s => (
                    <button
                      key={s} type="button"
                      onClick={() => setSeverity(s)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${severity === s ? severityColor[s] : "text-slate-500 border-white/[0.08] hover:text-slate-300"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Priority</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                  className="h-9 w-full bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-rose-500/30 rounded-xl px-2.5 text-xs text-slate-200 outline-none"
                >
                  {priorityOptions.map(p => <option key={p} value={p} className="bg-[#0b0e1a]">{p}</option>)}
                </select>
              </div>
            </div>

            {/* Artifact Upload */}
            <div>
              <label className={labelCls}>Attachments <span className="text-slate-500 normal-case font-normal tracking-normal">(Any file — max {MAX_FILE_SIZE_MB}MB each)</span></label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="*"
                className="hidden"
                onChange={e => handleFileAdd(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border border-dashed border-white/[0.12] rounded-xl p-4 flex flex-col items-center gap-2 hover:border-rose-500/40 hover:bg-rose-500/[0.03] transition-all text-slate-500 hover:text-slate-300"
              >
                <Upload className="h-5 w-5" />
                <span className="text-[11px]">Click to attach files</span>
              </button>

              {/* File list */}
              <AnimatePresence>
                {artifacts.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {artifacts.map(art => (
                      <motion.div
                        key={art.id}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02]"
                      >
                        {art.fileType.startsWith("image/") ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/40">
                            <img src={art.fileData} alt={art.fileName} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-white/10 bg-black/40 text-lg shrink-0">
                            {getFileIcon(art.fileType)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left">
                          <span className="block truncate font-mono text-slate-200 text-[11px]">{art.fileName}</span>
                          <span className="text-[9px] text-slate-500">{art.fileSize}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setArtifacts(prev => prev.filter(a => a.id !== art.id))}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>

          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/[0.08] bg-white/[0.01]">
            <Button
              variant="secondary"
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-9 px-5 rounded-xl border border-white/[0.08] text-slate-300 hover:bg-white/[0.06]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-9 px-5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 border border-rose-500/30 text-white font-bold flex items-center gap-2 shadow-lg shadow-rose-500/20"
            >
              <Bug className="h-3.5 w-3.5" />
              {loading ? "Submitting..." : "Submit Bug"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
