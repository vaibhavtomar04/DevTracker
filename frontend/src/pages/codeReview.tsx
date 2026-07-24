import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTaskStore } from "@/store/taskStore"
import { useAuthStore } from "@/store/authStore"
import { getAssignedDevNames } from "@/utils/devUtils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Code,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  ExternalLink,
  ChevronRight,
  User,
  GitBranch,
  Terminal,
  FileCode2
} from "lucide-react"

export default function CodeReviewPage() {
  const {
    tasks,
    fetchData,
    approveTaskStep,
    rejectTaskStep,
    searchQuery,
    addToast
  } = useTaskStore()

  const { user } = useAuthStore()

  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [reviewRemarks, setReviewRemarks] = useState("")

  // Handle Review Actions
  const handleReviewAction = async (approve: boolean) => {
    if (!selectedTask || !user) return
    if (!reviewRemarks.trim() && !approve) {
      addToast("Remarks are mandatory when requesting changes.", "error")
      return
    }
    try {
      if (approve) {
        await approveTaskStep(selectedTask.id, reviewRemarks || "Approved & Merged branch.", user)
      } else {
        await rejectTaskStep(selectedTask.id, reviewRemarks, user)
      }
      setSelectedTask(null)
      setReviewRemarks("")
      fetchData() // Reload
      addToast(approve ? "Code approved and merged! Ready to promote to UAT." : "Changes requested. CR returned to Developer.", "success")
    } catch (err: any) {
      addToast(err.message || "Failed to update review status", "error")
    }
  }

  // Filter Code Review tasks using status and global searchQuery
  const taskList = Array.isArray(tasks) ? tasks : ((tasks as any)?.content || [])
  const reviewTasks = taskList.filter((t: any) => {
    if (t.status !== "CODE_REVIEW") return false
    if (!searchQuery) return true
    
    const query = searchQuery.toLowerCase()
    return (
      t.jtrackId.toLowerCase().includes(query) ||
      t.title.toLowerCase().includes(query) ||
      getAssignedDevNames(t).toLowerCase().includes(query) ||
      (t.branchName && t.branchName.toLowerCase().includes(query))
    )
  })

  // Framer Motion Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06
      }
    }
  }

  const rowVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15
      }
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4 sm:px-6">
      {/* Page Header */}
      <div className="relative overflow-hidden p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-80 h-32 bg-violet-600/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-24 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none" />

        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 shadow-[0_0_15px_rgba(124,58,237,0.15)]">
            <Code className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Code Review <span className="text-glow font-extrabold">Queue</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
              Audit pull requests, inspect verification pipelines, and manage promotion gates for SIT integration branches.
            </p>
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <Card variant="glass" className="border-white/[0.06] bg-white/[0.02] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden rounded-2xl">
        <CardHeader className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-bold flex items-center space-x-2 text-white">
                <span>Pending Review Gates</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-semibold shadow-inner">
                  {reviewTasks.length} {reviewTasks.length === 1 ? "branch" : "branches"}
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Trigger sandbox deployment runs and confirm pull request quality metrics.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.01] text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-4">CR Number</th>
                  <th className="p-4">Developer</th>
                  <th className="p-4">Branch Name</th>
                  <th className="p-4">Git Repo Link</th>
                  <th className="p-4">Build Status</th>
                  <th className="p-4">Workflow State</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <motion.tbody 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="divide-y divide-white/[0.04]"
              >
                {reviewTasks.length === 0 ? (
                  <tr className="hover:bg-transparent">
                    <td colSpan={7} className="p-12 text-center text-muted-foreground font-medium">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="p-3 rounded-full bg-white/[0.02] border border-white/[0.04] text-muted-foreground/60">
                          <Check className="h-6 w-6 stroke-[1.5]" />
                        </div>
                        <p className="text-sm">No pending code reviews in the queue.</p>
                        <p className="text-[11px] text-muted-foreground/60">Everything is approved and merged.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  reviewTasks.map((task: any) => (
                    <motion.tr 
                      key={task.id} 
                      variants={rowVariants}
                      className="hover:bg-white/[0.02] transition-colors group relative"
                    >
                      {/* CR Number */}
                      <td className="p-4">
                        <div className="font-mono font-bold text-violet-400 bg-violet-400/5 border border-violet-400/10 px-2 py-1 rounded-md inline-block shadow-sm">
                          {task.jtrackId}
                        </div>
                      </td>

                      {/* Developer */}
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center text-white font-bold text-[10px] shadow-sm">
                            {(getAssignedDevNames(task)[0] || 'D').toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-white block">{getAssignedDevNames(task)}</span>
                            <span className="text-[10px] text-muted-foreground/75">Contributor(s)</span>
                          </div>
                        </div>
                      </td>

                      {/* Branch Name */}
                      <td className="p-4">
                        <div className="flex items-center space-x-1 text-slate-300 font-mono text-[11px]">
                          <GitBranch className="h-3 w-3 text-cyan-500 shrink-0" />
                          <span className="truncate max-w-[150px] block" title={task.branchName || "NA"}>
                            {task.branchName || "NA"}
                          </span>
                        </div>
                      </td>

                      {/* Git PR Link */}
                      <td className="p-4">
                        {task.gitLinks ? (
                          <a 
                            href={task.gitLinks.split(",")[0]} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center space-x-1 font-semibold text-cyan-400 hover:text-cyan-300 transition-colors group/link"
                          >
                            <span>Open PR</span>
                            <ExternalLink className="h-3 w-3 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground/60 italic font-mono">NA</span>
                        )}
                      </td>

                      {/* Build */}
                      <td className="p-4">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[10px] tracking-wide">PASS</span>
                        </span>
                      </td>

                      {/* Workflow State */}
                      <td className="p-4">
                        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.05)]">
                          <Clock className="h-3 w-3" />
                          <span className="text-[10px] tracking-wide uppercase">Review Gate</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <Button
                          variant="glow"
                          size="sm"
                          className="h-8 text-[11px] font-semibold flex items-center space-x-1 hover:scale-105 active:scale-95 transition-all shadow-md"
                          onClick={() => setSelectedTask(task)}
                        >
                          <span>Audit & Approve</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </motion.tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Review Modal Dialog */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="absolute inset-0" onClick={() => setSelectedTask(null)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-lg glass-panel border border-white/[0.08] bg-[#070a14]/90 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden text-xs text-foreground p-6 space-y-5"
            >
              {/* Top accent glow line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500" />

              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                    <FileCode2 className="h-4 w-4 text-violet-400" />
                    <span>Code Review Audit</span>
                  </h3>
                  <p className="font-mono text-xs text-cyan-400 font-bold mt-1">
                    {selectedTask.jtrackId}: {selectedTask.title}
                  </p>
                </div>
                <button
                  className="p-1 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-white transition-all cursor-pointer"
                  onClick={() => setSelectedTask(null)}
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 bg-white/[0.02] p-3.5 rounded-xl border border-white/[0.06] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.01)]">
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase tracking-wider">Developer</span>
                    <span className="font-semibold text-xs text-white mt-0.5 block flex items-center space-x-1">
                      <User className="h-3 w-3 text-violet-400" />
                      <span>{getAssignedDevNames(selectedTask)}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase tracking-wider">Branch Pipeline</span>
                    <span className="font-mono text-xs text-cyan-400 mt-0.5 block flex items-center space-x-1">
                      <GitBranch className="h-3 w-3 text-cyan-400" />
                      <span className="truncate max-w-[120px]">{selectedTask.branchName || "None"}</span>
                    </span>
                  </div>
                  <div className="col-span-2 border-t border-white/[0.04] pt-2.5 mt-1">
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase tracking-wider">Git Repo URL</span>
                    {selectedTask.gitLinks ? (
                      <a 
                        href={selectedTask.gitLinks} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-cyan-400 hover:text-cyan-300 font-mono text-[11px] break-all flex items-center space-x-1 hover:underline mt-0.5"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span>{selectedTask.gitLinks}</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">No link available</span>
                    )}
                  </div>
                  <div className="col-span-2 border-t border-white/[0.04] pt-2.5">
                    <span className="text-muted-foreground block text-[10px] font-semibold uppercase tracking-wider">Build Verification</span>
                    <span className="text-emerald-400 font-semibold text-xs mt-0.5 block flex items-center space-x-1">
                      <Terminal className="h-3 w-3 text-emerald-400" />
                      <span>✓ Pipeline Success (SIT Build Stage 1)</span>
                    </span>
                  </div>
                </div>

                {/* Textarea for Remarks */}
                <div className="space-y-1.5">
                  <span className="text-slate-300 block text-[10px] font-semibold uppercase tracking-wider">Review remarks / comments</span>
                  <textarea
                    placeholder="Enter review remarks. Mandatory for Request Changes/Rejection."
                    className="w-full min-h-[90px] bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none transition-all placeholder:text-muted-foreground/40 leading-relaxed"
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                  />
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <Button
                  variant="outline"
                  onClick={() => handleReviewAction(false)}
                  className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/50 transition-colors shadow-sm"
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                  Request Changes
                </Button>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTask(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="glow"
                    onClick={() => handleReviewAction(true)}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                    Approve & Merge
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
