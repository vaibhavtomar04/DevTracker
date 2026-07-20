import React, { useEffect, useState } from "react"
import { useTaskStore } from "@/store/taskStore"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/button"
import {
  FileCheck,
  Bug as BugIcon,
  Image as ImageIcon,
  X,
  Trash2,
  Download,
  GitBranch
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { Task } from "@/services/mockData"
import RaiseBugModal from "@/components/shared/RaiseBugModal"
import BugDetailModal from "@/components/shared/BugDetailModal"
import { CRTimelinePopup } from "@/components/shared/CRTimelinePopup"
import { listDocuments, downloadDocument, uploadDocument, deleteDocument } from "@/services/document.service"
const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return "🗜️"
  if (ext === 'pdf') return "📄"
  if (['doc', 'docx'].includes(ext || '')) return "📝"
  if (['xls', 'xlsx'].includes(ext || '')) return "📊"
  if (['ppt', 'pptx'].includes(ext || '')) return "📉"
  return "📎"
}


export default function TesterDashboard() {
  const {
    tasks,
    bugs,
    fetchData,
    updateBug,
    createBug,
    searchQuery,
    addToast,
    updateTask,
    setDownloadTarget,
    assignTester,
    completeTesting,
    bugReviews,
    testerAcceptExplanation,
    testerRaiseAgain,
    testerChallenge,
    completeSprintTask,
    updateSprintTask
  } = useTaskStore()

  const { user } = useAuthStore()

  const normalizedUserRoles = (user?.roles || []).map((role) => role.replace(/^ROLE_/, ""))
  const isAdmin = normalizedUserRoles.some((role) => ["ADMIN", "DEVADMIN", "TESTADMIN"].includes(role))

  const [activeQueue, setActiveQueue] = useState<"pool" | "my-assigned" | "bugs" | "rejections" | "completed">("pool")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedReview, setSelectedReview] = useState<any | null>(null)
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, number>>({}) // filename -> percentage
  const [isRaiseBugOpen, setIsRaiseBugOpen] = useState(false)
  const [selectedBugDetailId, setSelectedBugDetailId] = useState<number | null>(null)
  const [timelineTask, setTimelineTask] = useState<Task | null>(null)

  const [remarks, setRemarks] = useState("")
  const [taskDocs, setTaskDocs] = useState<any[]>([])

  const [showCompletionPopup, setShowCompletionPopup] = useState(false)
  const [taskToPass, setTaskToPass] = useState<Task | null>(null)
  const [selectedChoices, setSelectedChoices] = useState<Record<number, string>>({})
  const [isConfirmingChoices, setIsConfirmingChoices] = useState(false)

  // Removed selectedBug fix summary loading effect

  useEffect(() => {
    if (selectedTask?.id) {
      listDocuments(selectedTask.id)
        .then(docs => setTaskDocs(docs))
        .catch(err => {
          console.error("Failed to list task documents:", err)
          setTaskDocs([])
        })
    } else {
      setTaskDocs([])
    }
  }, [selectedTask])


  // Bug logging form
  const [isBugOpen, setIsBugOpen] = useState(false)
  const [bugTitle, setBugTitle] = useState("")
  const [bugDesc, setBugDesc] = useState("")
  const [bugSeverity, setBugSeverity] = useState<"Critical" | "High" | "Medium" | "Low">("High")
  const [bugPriority, setBugPriority] = useState<"High" | "Medium" | "Low">("Medium")



  useEffect(() => {
    fetchData()
  }, [])

  const filterBySearch = (item: { title: string; jtrackId: string; description: string }) => {
    if (!searchQuery) return true
    const s = searchQuery.toLowerCase()
    return item.title.toLowerCase().includes(s) || item.jtrackId.toLowerCase().includes(s) || item.description.toLowerCase().includes(s)
  }

  const testingPool = tasks.filter(t => (t.status === "TESTING_POOL" || t.status === "MOVE_TO_UAT" || (t.status === "SIT_DEPLOYED" && !t.tester) || (t.status === "SIT_TESTING" && !t.tester)) && !t.tester && filterBySearch(t))
  const myAssignedTesting = tasks.filter(t => {
    if (!t.tester) return false
    if (!filterBySearch(t)) return false
    if (!isAdmin && t.tester.id !== user?.id) return false
    return ["TESTING_IN_PROGRESS", "SIT_TESTING", "UAT_TESTING", "MOVE_TO_UAT", "TESTING_POOL", "BUG_FOUND"].includes(t.status)
  })
  const bugQueue = bugs.filter(b => {
    if (!filterBySearch(b)) return false
    if (!isAdmin && b.raisedBy?.id !== user?.id) return false
    return b.status === "RESOLVED" || b.status === "OPEN" || b.status === "IN_PROGRESS"
  })
  const defectiveCRs = tasks.filter(t => {
    if (t.status !== "BUG_FOUND") return false
    if (!filterBySearch(t)) return false
    if (!isAdmin && t.tester?.id !== user?.id) return false
    return true
  })
  const completedCRs = tasks.filter(t => {
    const isComp = ["TESTING_COMPLETED", "UAT_COMPLETED", "SIT_COMPLETED", "PROD_DEPLOYED", "CLOSED"].includes(t.status)
    if (!isComp || !filterBySearch(t)) return false
    if (!isAdmin && t.tester?.id !== user?.id) return false
    return true
  })
  const myRejectedReviews = (bugReviews || []).filter(r => {
    const isRejected = r.status === "REJECTED" || r.status === "CHALLENGED" || r.status === "BUG_REVIEW_PENDING"
    if (!isRejected) return false
    if (!isAdmin && r.raisedBy?.id !== user?.id) return false
    if (!searchQuery) return true
    const s = searchQuery.toLowerCase()
    return (r.title?.toLowerCase().includes(s) || false) || 
           (r.description?.toLowerCase().includes(s) || false) ||
           (r.crJtrackId?.toLowerCase().includes(s) || false)
  })

  const handleAssignToMe = (task: Task) => {
    assignTester(task.id)
      .then(() => {
        addToast("CR assigned to you successfully!", "success")
        setSelectedTask(null)
        fetchData()
      })
      .catch((err: any) => {
        addToast(err?.message || "Failed to assign task", "error")
      })
  }

  const handlePass = (task: Task) => {
    if (!remarks) {
      addToast("Remarks detailing the test verification are mandatory.", "error")
      return
    }

    const openSprintTasks = ((task as any).sprintTasks || []).filter((st: any) => st.status !== "COMPLETED")
    if (openSprintTasks.length > 0) {
      setTaskToPass(task)
      const initialChoices: Record<number, string> = {}
      openSprintTasks.forEach((st: any) => {
        initialChoices[st.id] = "COMPLETE_AFTER_TESTING"
      })
      setSelectedChoices(initialChoices)
      setShowCompletionPopup(true)
    } else {
      // Mark all resolved bugs for this task as VERIFIED
      const taskBugs = bugs.filter(b => b.crTaskId === task.id)
      const resolvedBugs = taskBugs.filter(b => b.status === "RESOLVED")
      Promise.all(
        resolvedBugs.map(b => updateBug(b.id, { status: "VERIFIED" }, remarks || "Fix verified via UAT Testing Done", user!))
      ).then(() => {
        completeTesting(task.id, remarks, remarks)
          .then(() => {
            setSelectedTask(null)
            setRemarks("")
            addToast("Task verification marked as PASSED and linked bugs verified!", "success")
            fetchData()
          })
          .catch((err: any) => {
            addToast(err?.message || "Failed to complete testing", "error")
          })
      }).catch(err => {
        addToast(err?.message || "Failed to verify linked bugs", "error")
      })
    }
  }

  const handleConfirmChoices = async () => {
    if (!taskToPass) return
    setIsConfirmingChoices(true)
    try {
      const openSprintTasks = ((taskToPass as any).sprintTasks || []).filter((st: any) => st.status !== "COMPLETED")
      
      await Promise.all(
        openSprintTasks.map(async (st: any) => {
          const choice = selectedChoices[st.id] || "COMPLETE_AFTER_TESTING"
          if (choice === "COMPLETE_AFTER_TESTING") {
            await completeSprintTask(st.id)
          } else if (choice === "COMPLETE_AFTER_PROD") {
            await updateSprintTask(st.id, { ...st, completionRule: "COMPLETE_AFTER_PROD" })
          } else {
            await updateSprintTask(st.id, { ...st, completionRule: "KEEP_OPEN" })
          }
        })
      )

      // Also verify any resolved bugs
      const taskBugs = bugs.filter(b => b.crTaskId === taskToPass.id)
      const resolvedBugs = taskBugs.filter(b => b.status === "RESOLVED")
      await Promise.all(
        resolvedBugs.map(b => updateBug(b.id, { status: "VERIFIED" }, remarks || "Fix verified via UAT Testing Done", user!))
      )

      await completeTesting(taskToPass.id, remarks, remarks)
      addToast("Task verification marked as PASSED, linked bugs verified, and linked Sprint Tasks processed!", "success")
      setSelectedTask(null)
      setTaskToPass(null)
      setRemarks("")
      setShowCompletionPopup(false)
      fetchData()
    } catch (err: any) {
      console.error(err)
      addToast(err?.message || "Failed to process linked tasks or complete testing", "error")
    } finally {
      setIsConfirmingChoices(false)
    }
  }

  const handleSaveBug = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask || !user) return

    createBug({
      title: bugTitle,
      description: bugDesc,
      severity: bugSeverity,
      priority: bugPriority,
      status: "OPEN",
      raisedBy: user,
      assignedDeveloper: selectedTask.assignedDeveloper || selectedTask.developers?.[0]?.developer || undefined,
      workflow: { id: 2, name: "Bug Resolution Workflow", type: "BUG", steps: [] },
      crTaskId: selectedTask.id
    })

    updateTask(selectedTask.id, { status: "BUG_FOUND" }, `Verification Failed. Bug raised: ${bugTitle}. Remarks: ${remarks}`, user)

    setIsBugOpen(false)
    setSelectedTask(null)
    setRemarks("")
    setBugTitle("")
    setBugDesc("")
    addToast("Bug logged successfully. Task moved to Bugs & Defective CRs queue.", "success")
    fetchData()
  }

  // Legacy verify bug method removed


  const handleMultipleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !selectedTask) return

    const filesArray = Array.from(files)
    
    for (const file of filesArray) {
      const fileName = file.name
      setUploadingFiles(prev => ({ ...prev, [fileName]: 0 }))
      try {
        await uploadDocument(selectedTask.id, "SUPPORT", file, (pct) => {
          setUploadingFiles(prev => ({ ...prev, [fileName]: pct }))
        })
        addToast(`Uploaded ${fileName} successfully!`, "success")
      } catch (err: any) {
        addToast(`Failed to upload ${fileName}: ${err.message || err}`, "error")
      } finally {
        setUploadingFiles(prev => {
          const next = { ...prev }
          delete next[fileName]
          return next
        })
      }
    }
    // Refresh documents list
    listDocuments(selectedTask.id).then(setTaskDocs).catch(() => {})
  }

  const handleDeleteDoc = async (docId: number, docName: string) => {
    if (!confirm(`Are you sure you want to delete ${docName}?`)) return
    try {
      await deleteDocument(docId)
      addToast(`Deleted ${docName} successfully!`, "info")
      if (selectedTask) {
        listDocuments(selectedTask.id).then(setTaskDocs).catch(() => {})
      }
    } catch (err: any) {
      addToast(err.message || "Failed to delete document", "error")
    }
  }



  // Animation variants
  const listVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 120, damping: 15 } }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-slate-100">
      {/* Left side: testing hubs */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-violet-400 via-indigo-200 to-cyan-400 bg-clip-text text-transparent">
              QA Verification Portal
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Run regression checklists, execute test scenarios, signoff SIT/UAT gates, and file bugs.
            </p>
          </div>
          
          <div className="flex border border-white/[0.06] bg-white/[0.03] p-1 rounded-xl text-xs backdrop-blur-md shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
            <button
              onClick={() => { setActiveQueue("pool"); setSelectedTask(null); setSelectedReview(null); }}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeQueue === "pool"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md border border-violet-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Testing Pool ({testingPool.length})
            </button>
            <button
              onClick={() => { setActiveQueue("my-assigned"); setSelectedTask(null); setSelectedReview(null); }}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeQueue === "my-assigned"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md border border-violet-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {isAdmin ? "Assigned CRs" : "My Assigned Testing"} ({myAssignedTesting.length})
            </button>
            <button
              onClick={() => { setActiveQueue("bugs"); setSelectedTask(null); setSelectedReview(null); }}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeQueue === "bugs"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md border border-violet-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Bugs & Defective CRs ({bugQueue.length + defectiveCRs.length})
            </button>
            <button
              onClick={() => { setActiveQueue("rejections"); setSelectedTask(null); setSelectedReview(null); }}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeQueue === "rejections"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md border border-violet-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {isAdmin ? "Rejected Bugs" : "My Rejected Bugs"} ({myRejectedReviews.length})
            </button>
            <button
              onClick={() => { setActiveQueue("completed"); setSelectedTask(null); setSelectedReview(null); }}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeQueue === "completed"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md border border-violet-500/20"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Completed CRs ({completedCRs.length})
            </button>
          </div>
        </div>

        {/* Task Cards Grid */}
        <AnimatePresence mode="wait">
          {activeQueue === "pool" ? (
            <motion.div
              key="pool-list"
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {testingPool.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-xs text-slate-400 bg-white/[0.02] rounded-2xl border border-white/[0.06] font-medium backdrop-blur-md">
                  Testing Pool is empty. No CRs waiting for assignment.
                </div>
              ) : (
                testingPool.map(task => {
                  const isSelected = selectedTask?.id === task.id
                  return (
                    <motion.div
                      key={task.id}
                      variants={cardVariants}
                      onClick={() => setSelectedTask(task)}
                      className={`p-5 rounded-2xl border backdrop-blur-md transition-all duration-300 cursor-pointer shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:shadow-[0_0_20px_rgba(139,92,246,0.12)] hover:border-violet-500/30 ${
                        isSelected
                          ? "bg-violet-500/10 border-violet-500/40 shadow-[0_0_25px_rgba(139,92,246,0.15)]"
                          : "bg-[#161619] border-white/[0.06]"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-mono text-xs font-bold text-indigo-400 tracking-wider">{task.jtrackId}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg uppercase tracking-wider text-[9px]">
                          UAT Pool
                        </span>
                      </div>
                      <h3 className="font-bold text-sm mb-2 text-slate-100">{task.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                        {task.description}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 border-t border-white/[0.06] pt-3 mb-4">
                        <div>
                          <span className="text-slate-500">Developer:</span>{" "}
                          <span className="text-slate-300 font-semibold">{task.assignedDeveloper?.fullName || "Unassigned"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Priority:</span>{" "}
                          <span className="text-slate-300 font-semibold">{task.priority}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Effort:</span>{" "}
                          <span className="text-slate-300 font-semibold">{task.efforts} PDs</span>
                        </div>
                        <div>
                          <span className="text-slate-500">BRD Available:</span>{" "}
                          <span className="text-slate-300 font-semibold">{task.brdDocumentId ? "Yes" : "No"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Sprint ID:</span>{" "}
                          <span className="text-slate-300 font-semibold">{task.sprintId || "None"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Sent Date:</span>{" "}
                          <span className="text-slate-300 font-semibold">
                            {task.inPoolDate ? new Date(task.inPoolDate).toLocaleDateString() : new Date(task.createdDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Module:</span>{" "}
                          <span className="text-slate-300 font-semibold">{task.module || "Core"}</span>
                        </div>
                      </div>

                      <Button
                        className="w-full text-[10px] h-8 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border border-violet-500/20 text-white font-bold"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAssignToMe(task);
                        }}
                      >
                        Assign to Me
                      </Button>
                    </motion.div>
                  )
                })
              )}
            </motion.div>
          ) : activeQueue === "my-assigned" ? (
            <motion.div
              key="my-assigned-list"
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {myAssignedTesting.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-xs text-slate-400 bg-white/[0.02] rounded-2xl border border-white/[0.06] font-medium backdrop-blur-md">
                  {isAdmin ? "No CRs currently assigned for testing." : "No CRs currently assigned to you for testing."}
                </div>
              ) : (
                myAssignedTesting.map(task => {
                  const isSelected = selectedTask?.id === task.id
                  return (
                    <motion.div
                      key={task.id}
                      variants={cardVariants}
                      onClick={() => setSelectedTask(task)}
                      className={`p-5 rounded-2xl border backdrop-blur-md transition-all duration-300 cursor-pointer shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:shadow-[0_0_20px_rgba(139,92,246,0.12)] hover:border-violet-500/30 ${
                        isSelected
                          ? "bg-violet-500/10 border-violet-500/40 shadow-[0_0_25px_rgba(139,92,246,0.15)]"
                          : "bg-[#161619] border-white/[0.06]"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-mono text-xs font-bold text-indigo-400 tracking-wider">{task.jtrackId}</span>
                        {(() => {
                          if (task.status === "BUG_FOUND") {
                            const taskBugs = bugs.filter(b => b.crTaskId === task.id)
                            const hasActiveUnresolvedBug = taskBugs.some(b => b.status === "OPEN" || b.status === "IN_PROGRESS")
                            const isResolved = taskBugs.length > 0 && !hasActiveUnresolvedBug
                            if (isResolved) {
                              return (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Bug Resolved
                                </span>
                              )
                            }
                            return (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Bug Found
                              </span>
                            )
                          }
                          return (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              Testing In Progress
                            </span>
                          )
                        })()}
                      </div>
                      <h3 className="font-bold text-sm mb-2 text-slate-100">{task.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                        {task.description}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 border-t border-white/[0.06] pt-3">
                        <div>
                          <span className="text-slate-500">Tester:</span>{" "}
                          <span className="text-cyan-300 font-semibold">{task.tester?.fullName || "Unassigned"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Developer:</span>{" "}
                          <span className="text-slate-300 font-semibold">{task.assignedDeveloper?.fullName || "Unassigned"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Priority:</span>{" "}
                          <span className="text-slate-300 font-semibold">{task.priority}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Module:</span>{" "}
                          <span className="text-slate-300 font-semibold">{task.module || "Core"}</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </motion.div>
          ) : activeQueue === "bugs" ? (
            <motion.div
              key="bugs-list"
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="space-y-6 w-full col-span-2"
            >
              {/* Defective CRs Section */}
              {defectiveCRs.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Defective CRs ({defectiveCRs.length})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {defectiveCRs.map(task => {
                      const isSelected = selectedTask?.id === task.id
                      return (
                        <motion.div
                          key={`def-cr-${task.id}`}
                          variants={cardVariants}
                          onClick={() => setSelectedTask(task)}
                          className={`p-5 rounded-2xl border backdrop-blur-md transition-all duration-300 cursor-pointer shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:shadow-[0_0_20px_rgba(244,63,94,0.10)] hover:border-rose-500/30 ${
                            isSelected
                              ? "bg-rose-500/10 border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.12)]"
                              : "bg-[#161619] border-white/[0.06]"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <span className="font-mono text-xs font-bold text-rose-400 tracking-wider">{task.jtrackId}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg uppercase tracking-wider">
                              OPEN
                            </span>
                          </div>
                          <h3 className="font-bold text-sm mb-2 text-slate-100">{task.title}</h3>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Resolved Bugs Section */}
              <div className="space-y-3">
                {defectiveCRs.length > 0 && <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Resolved Bugs ({bugQueue.length})</h4>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bugQueue.length === 0 ? (
                    defectiveCRs.length === 0 && (
                      <div className="col-span-2 text-center py-12 text-xs text-slate-400 bg-white/[0.02] rounded-2xl border border-white/[0.06] font-medium backdrop-blur-md">
                        No bugs or defective CRs waiting for action.
                      </div>
                    )
                  ) : (
                    bugQueue.map(bug => {
                      const isSelected = selectedBugDetailId === bug.id
                      return (
                        <motion.div
                          key={bug.id}
                          variants={cardVariants}
                          onClick={() => setSelectedBugDetailId(bug.id)}
                          className={`p-5 rounded-2xl border backdrop-blur-md transition-all duration-300 cursor-pointer shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:shadow-[0_0_20px_rgba(245,158,11,0.10)] hover:border-amber-500/30 ${
                            isSelected
                              ? "bg-amber-500/10 border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.12)]"
                              : "bg-[#161619] border-white/[0.06]"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <span className="font-mono text-xs font-bold text-rose-400 tracking-wider">{bug.jtrackId}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg uppercase tracking-wider">
                              FIX RESOLVED
                            </span>
                          </div>
                          <h3 className="font-bold text-sm mb-2 text-slate-100">{bug.title}</h3>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {bug.description}
                          </p>
                        </motion.div>
                      )
                    })
                  )}
                </div>
              </div>
            </motion.div>
          ) : activeQueue === "rejections" ? (
            <motion.div
              key="rejections-list"
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full"
            >
              {myRejectedReviews.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-xs text-slate-400 bg-white/[0.02] rounded-2xl border border-white/[0.06] font-medium backdrop-blur-md">
                  {isAdmin ? "No rejected bug reviews found." : "No rejected bug reviews raised by you."}
                </div>
              ) : (
                myRejectedReviews.map(review => {
                  const isSelected = selectedReview?.id === review.id
                  return (
                    <motion.div
                      key={`review-${review.id}`}
                      variants={cardVariants}
                      onClick={() => setSelectedReview(review)}
                      className={`p-5 rounded-2xl border backdrop-blur-md transition-all duration-300 cursor-pointer shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:shadow-[0_0_20px_rgba(244,63,94,0.10)] hover:border-rose-500/30 ${
                        isSelected
                          ? "bg-rose-500/10 border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.12)]"
                          : "bg-[#161619] border-white/[0.06]"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-mono text-xs font-bold text-rose-400 tracking-wider">
                          {review.crJtrackId || "CR"}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg uppercase tracking-wider">
                          {review.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm mb-2 text-slate-100">{review.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {review.description}
                      </p>
                    </motion.div>
                  )
                })
              )}
            </motion.div>
          ) : (
            <motion.div
              key="completed-list"
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full"
            >
              {completedCRs.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-xs text-slate-400 bg-white/[0.02] rounded-2xl border border-white/[0.06] font-medium backdrop-blur-md">
                  No completed CRs found.
                </div>
              ) : (
                completedCRs.map(task => {
                  const isSelected = selectedTask?.id === task.id
                  return (
                    <motion.div
                      key={task.id}
                      variants={cardVariants}
                      onClick={() => setSelectedTask(task)}
                      className={`p-5 rounded-2xl border backdrop-blur-md transition-all duration-300 cursor-pointer shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:shadow-[0_0_20px_rgba(139,92,246,0.12)] hover:border-violet-500/30 ${
                        isSelected
                          ? "bg-violet-500/10 border-violet-500/40 shadow-[0_0_25px_rgba(139,92,246,0.15)]"
                          : "bg-[#161619] border-white/[0.06]"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-mono text-xs font-bold text-indigo-400 tracking-wider">{task.jtrackId}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg uppercase tracking-wider">
                          Testing Completed
                        </span>
                      </div>
                      <h3 className="font-bold text-sm mb-2 text-slate-100">{task.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                        {task.description}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 border-t border-white/[0.06] pt-3">
                        <div>
                          <span className="text-slate-500">Developer:</span>{" "}
                          <span className="text-slate-300 font-semibold">{task.assignedDeveloper?.fullName || "Unassigned"}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Priority:</span>{" "}
                          <span className="text-slate-300 font-semibold">{task.priority}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Module:</span>{" "}
                          <span className="text-slate-300 font-semibold">{task.module || "Core"}</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dynamic CR Details Modal Popup */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              key={`task-verif-${selectedTask.id}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#161619] border border-white/[0.08] w-full max-w-lg rounded-3xl p-6 space-y-5 text-xs text-zinc-300 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-violet-400 tracking-wider">{selectedTask.jtrackId}</span>
                  <button
                    onClick={() => setTimelineTask(selectedTask)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
                  >
                    <GitBranch className="h-2.5 w-2.5" />
                    View Timeline
                  </button>
                </div>
                <h3 className="font-black text-slate-100 text-sm tracking-tight truncate max-w-[260px] mt-0.5">{selectedTask.title}</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
                onClick={() => setSelectedTask(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* General scope */}
            <div className="space-y-2 text-xs">
              <span className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">Scope</span>
              <p className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.01] leading-relaxed text-[11px] text-slate-300">
                {selectedTask.description}
              </p>
            </div>

            {selectedTask.status === "TESTING_POOL" ? (
              <div className="space-y-4 border-t border-white/[0.08] pt-4 text-center">
                <p className="text-slate-400 text-xs leading-relaxed">
                  This Change Request is currently in the Testing Pool and is not assigned to any tester.
                  Assign it to yourself to begin testing.
                </p>
                <Button
                  className="w-full text-xs h-10 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border border-violet-500/30 text-white font-bold"
                  onClick={() => handleAssignToMe(selectedTask)}
                >
                  Assign to Me
                </Button>
              </div>
            ) : (
              <>
                {/* BRD & Unit Testing Documents Panel */}
                <div className="space-y-4 border-t border-white/[0.08] pt-4 text-left">
                  {/* BRD Document Field */}
                  <div className="space-y-2 text-xs">
                    <span className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">
                      BRD Document
                    </span>
                    {(() => {
                      const brdDoc = taskDocs.find(d => d.docType === 'BRD');
                      return brdDoc ? (
                        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.01] flex justify-between items-center text-[11px] hover:border-cyan-500/30 transition-colors">
                          <div className="flex flex-col min-w-0 flex-1 mr-3">
                            <span className="text-slate-200 truncate font-mono text-[10px] font-bold">{brdDoc.filename}</span>
                            <span className="text-[9px] text-slate-500 mt-0.5">
                              {brdDoc.uploadedByName ? `Uploaded by ${brdDoc.uploadedByName}` : 'Attached'}
                            </span>
                          </div>
                          <Button
                            variant="link"
                            size="sm"
                            className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline shrink-0 p-0 h-auto"
                            onClick={() => downloadDocument(brdDoc.id, brdDoc.filename)}
                          >
                            Download
                          </Button>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.005] text-slate-500 text-[10.5px] italic text-center">
                          No BRD document attached.
                        </div>
                      );
                    })()}
                  </div>

                  {/* Unit Testing Document Field */}
                  <div className="space-y-2 text-xs">
                    <span className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">
                      Unit Testing Document
                    </span>
                    {selectedTask.unitTestDocUrl ? (
                      <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.01] flex justify-between items-center text-[11px] hover:border-cyan-500/30 transition-colors">
                        <div className="flex flex-col min-w-0 flex-1 mr-3">
                          <span className="text-slate-200 truncate font-mono text-[10px] font-bold">{selectedTask.unitTestDocName || 'unit_testing_results.pdf'}</span>
                          <span className="text-[9px] text-slate-500 mt-0.5">Developer verified</span>
                        </div>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline shrink-0 p-0 h-auto"
                          onClick={() => setDownloadTarget({ base64Data: selectedTask.unitTestDocUrl!, defaultFileName: selectedTask.unitTestDocName || 'unit_testing_results.pdf' })}
                        >
                          Download
                        </Button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.005] text-slate-500 text-[10.5px] italic text-center">
                        No Unit Testing document attached.
                      </div>
                    )}
                  </div>
                </div>


                {/* Attachments Section */}
                {(selectedTask.status !== "TESTING_COMPLETED" || taskDocs.filter(d => d.docType === 'SUPPORT').length > 0 || selectedTask.screenshotUrl) && (
                  <div className="space-y-3 border-t border-white/[0.08] pt-4">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                      Proof of testing
                    </span>
                    
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.zip,.rar,.7z,.xls,.xlsx,.ppt,.pptx,.txt"
                      onChange={handleMultipleFilesChange}
                      id="screenshot-file-input"
                      multiple
                      className="hidden"
                    />

                    {selectedTask.status !== "TESTING_COMPLETED" && (
                      <button
                        onClick={() => document.getElementById("screenshot-file-input")?.click()}
                        className="w-full p-2.5 border border-dashed border-white/[0.10] rounded-xl bg-white/[0.01] hover:bg-white/[0.04] hover:border-violet-500/40 flex flex-col items-center justify-center text-center transition-colors cursor-pointer"
                      >
                        <ImageIcon className="h-4.5 w-4.5 text-violet-400 mb-1" />
                        <span className="text-[9px] font-bold text-slate-300">Upload Proof of Testing</span>
                      </button>
                    )}

                    {/* Uploading Files Progress */}
                    {Object.entries(uploadingFiles).map(([fileName, pct]) => (
                      <div key={fileName} className="p-2.5 rounded-xl border border-violet-500/20 bg-violet-500/5 space-y-1.5 text-left">
                        <div className="flex justify-between items-center text-[10px] font-semibold text-violet-300">
                          <span className="truncate max-w-[180px]">{fileName}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                          <div className="bg-violet-500 h-full transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}

                    {/* Uploaded Supporting Documents (Proof of Testing) */}
                    {taskDocs.filter(d => d.docType === 'SUPPORT').length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {taskDocs.filter(d => d.docType === 'SUPPORT').map(doc => (
                          <div key={doc.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 bg-black/40 text-sm shrink-0">
                              {getFileIcon(doc.filename)}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <span className="block truncate font-mono text-slate-200 text-[10px] font-bold">{doc.filename}</span>
                              <span className="text-[8px] text-slate-500 font-semibold block mt-0.5">
                                {doc.uploadedByName ? `By ${doc.uploadedByName}` : 'Attached'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => downloadDocument(doc.id, doc.filename)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-sky-400 transition-colors"
                                title="Download"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                              {selectedTask.status !== "TESTING_COMPLETED" && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDoc(doc.id, doc.filename)}
                                  className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Legacy screenshot preview */}
                    {selectedTask.screenshotUrl && (
                      <div className="mt-2 flex items-center gap-2.5 p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                        {(() => {
                          const isImg = selectedTask.screenshotUrl?.startsWith("data:image/") || /\.(png|jpe?g|gif|webp)$/i.test(selectedTask.screenshotName || "")
                          return isImg ? (
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/40">
                              <img src={selectedTask.screenshotUrl} alt={selectedTask.screenshotName} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center border border-white/10 bg-black/40 text-lg shrink-0">
                              {getFileIcon(selectedTask.screenshotName || "")}
                            </div>
                          )
                        })()}
                        <div className="flex-1 min-w-0 text-left">
                          <span className="block truncate font-mono text-slate-200 text-[11px]">{selectedTask.screenshotName}</span>
                          <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider block mt-0.5">Proof of Testing (Legacy)</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setDownloadTarget({ base64Data: selectedTask.screenshotUrl!, defaultFileName: selectedTask.screenshotName || "proof_of_testing.png" })}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-sky-400 transition-colors"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {selectedTask.status !== "TESTING_COMPLETED" && (
                            <button
                              type="button"
                              onClick={() => {
                                updateTask(selectedTask.id, { screenshotUrl: undefined, screenshotName: undefined }, "Removed proof of testing attachment", user!)
                                  .then((updated: any) => {
                                    setSelectedTask(updated)
                                    addToast("Attachment removed successfully!", "info")
                                  })
                              }}
                              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* Approval Controls */}
                <div className="space-y-4 border-t border-white/[0.08] pt-4 text-xs">
                  <span className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">
                    Verification Verdict
                  </span>

                  {(() => {
                    const taskBugs = bugs.filter(b => b.crTaskId === selectedTask.id);
                    const hasActiveUnresolvedBug = taskBugs.some(b => b.status === "OPEN" || b.status === "IN_PROGRESS");
                    
                    if (hasActiveUnresolvedBug) {
                      return (
                        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 space-y-1.5 shadow-sm text-left">
                          <span className="font-bold uppercase tracking-wider text-[10px] block text-rose-800 dark:text-rose-400">Testing Blocked</span>
                          <p className="text-[11px] leading-relaxed text-rose-600 dark:text-rose-200/80">
                            This CR is currently blocked because a bug has been raised. Verification cannot proceed until the linked bug(s) are resolved by the developer.
                          </p>
                        </div>
                      )
                    }

                    if (selectedTask.status === "TESTING_COMPLETED") {
                      return (
                        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 space-y-1.5 shadow-sm text-left">
                          <span className="font-bold uppercase tracking-wider text-[10px] block text-emerald-800 dark:text-emerald-400">
                            {taskBugs.length > 0 ? "Bug Resolved" : "Testing Completed"}
                          </span>
                          <p className="text-[11px] leading-relaxed text-emerald-600 dark:text-emerald-200/80">
                            This CR has successfully passed testing.
                          </p>
                          {selectedTask.testingComments && (
                            <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-500/10">
                              <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block font-bold">Verification Comments</span>
                              <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-[10.5px] mt-0.5 whitespace-pre-wrap">{selectedTask.testingComments}</p>
                            </div>
                          )}
                        </div>
                      )
                    }

                    return (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Auditor remarks</label>
                          <input
                            placeholder="Detail verification results..."
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="h-10 w-full bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-all placeholder:text-slate-500"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            className="w-full text-xs h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-500/20 text-white shadow-lg cursor-pointer font-bold"
                            variant="glow"
                            onClick={() => handlePass(selectedTask)}
                          >
                            <FileCheck className="mr-1 h-4 w-4" />
                            UAT Testing Done
                          </Button>
                        </div>
                      </>
                    )
                  })()}
                </div>

                {/* Raise Bug Button — Tester only, disabled once an open/in-progress bug exists or CR is completed */}
                {selectedTask.status !== "TESTING_COMPLETED" && selectedTask.status !== "COMPLETED" && (
                  <div className="border-t border-white/[0.08] pt-4">
                    {(() => {
                      const hasActiveBug = bugs.some(b => b.crTaskId === selectedTask.id && (b.status === "OPEN" || b.status === "IN_PROGRESS"))
                      const hasPendingReview = (bugReviews || []).some(r => r.crTaskId === selectedTask.id && ["PENDING_DEV_REVIEW", "CHALLENGED", "BUG_REVIEW_PENDING"].includes(r.status))
                      const isBugRaised = hasActiveBug || hasPendingReview

                      return isBugRaised ? (
                        <div className="w-full text-xs text-slate-500 border border-white/[0.06] rounded-xl flex items-center gap-2 justify-center py-2 px-3 bg-white/[0.01] cursor-not-allowed select-none">
                          <BugIcon className="h-3.5 w-3.5" />
                          Bug Already Raised
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          className="w-full text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 justify-center"
                          onClick={() => setIsRaiseBugOpen(true)}
                        >
                          <BugIcon className="h-3.5 w-3.5" />
                          Raise Bug Against This CR
                        </Button>
                      )
                    })()}
                  </div>
                )}
              </>
            )}

            {/* Related Bugs Section */}
            {(() => {
              const relatedBugs = bugs.filter(b => b.crTaskId === selectedTask.id)
              return (
                <div className="space-y-3 border-t border-white/[0.08] pt-4">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <BugIcon className="h-3 w-3 text-rose-400" />
                    Related Bugs ({relatedBugs.length})
                  </span>
                  {relatedBugs.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic text-center py-2">No bugs raised against this CR.</p>
                  ) : (
                    <div className="space-y-2">
                      {relatedBugs.map(bug => (
                        <div key={bug.id} className="p-3 rounded-xl border border-white/[0.06] bg-[#0f0f12] space-y-1.5 text-left">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedBugDetailId(bug.id)}
                              className="font-mono text-[10px] font-bold text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 transition-all cursor-pointer"
                              title="Click to view bug details"
                            >
                              {bug.jtrackId}
                            </button>
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ${
                                bug.status === 'OPEN' ? 'text-sky-400 bg-sky-500/10 border-sky-500/20' :
                                bug.status === 'RESOLVED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                                bug.status === 'CLOSED' ? 'text-slate-400 bg-slate-500/10 border-slate-500/20' :
                                'text-amber-400 bg-amber-500/10 border-amber-500/20'
                              }`}>{bug.status}</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-300 font-semibold truncate">{bug.title}</p>
                          <div className="flex justify-between text-[9px] text-slate-500">
                            <span>By {bug.raisedBy?.fullName || "—"}</span>
                            <span>{bug.createdDate ? new Date(bug.createdDate).toLocaleDateString() : "—"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review verify drawer */}
      <AnimatePresence>
        {selectedReview && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              key={`review-verif-${selectedReview.id}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#161619] border border-white/[0.08] w-full max-w-lg rounded-3xl p-6 space-y-5 text-xs text-zinc-300 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div>
                <span className="font-mono text-xs font-bold text-rose-400 tracking-wider">
                  {selectedReview.crJtrackId || "CR"}
                </span>
                <h3 className="font-black text-slate-100 text-sm tracking-tight truncate max-w-[200px] mt-0.5">
                  {selectedReview.title}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
                onClick={() => setSelectedReview(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2 text-xs">
              <span className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">
                Proposed Bug Description
              </span>
              <p className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.01] leading-relaxed text-[11px] text-slate-300">
                {selectedReview.description}
              </p>
            </div>

            {/* Developer Rejection Details */}
            <div className="space-y-3 border-t border-white/[0.08] pt-4 text-xs">
              <span className="text-rose-400 block font-bold uppercase tracking-wider text-[10px]">
                Developer Rejection Details
              </span>
              
              <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Reason</span>
                  <span className="text-rose-300 font-semibold">{selectedReview.rejectionReason || "Not specified"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Justification / Explanation</span>
                  <p className="text-slate-200 leading-relaxed text-[11px] mt-0.5">
                    {selectedReview.justification || "No explanation provided."}
                  </p>
                </div>
                {selectedReview.evidenceNote && (
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Evidence Note</span>
                    <p className="text-slate-200 leading-relaxed text-[11px] mt-0.5">
                      {selectedReview.evidenceNote}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Rejection Actions */}
            <div className="space-y-3 border-t border-white/[0.08] pt-4 text-xs">
              <span className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">
                Rejection Action Verdict
              </span>
              
              <div className="flex flex-col gap-2.5">
                <Button
                  className="w-full text-xs h-9 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-500/20 text-white font-bold"
                  onClick={() => {
                    testerAcceptExplanation(selectedReview.id)
                      .then(() => {
                        addToast("Developer explanation accepted. Review closed.", "success");
                        setSelectedReview(null);
                        fetchData();
                      })
                      .catch(err => addToast(err?.message || "Failed to accept explanation", "error"));
                  }}
                >
                  Accept Explanation
                </Button>

                <Button
                  className="w-full text-xs h-9 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 border border-amber-500/20 text-white font-bold"
                  onClick={() => {
                    testerRaiseAgain(selectedReview.id)
                      .then(() => {
                        addToast("Bug raised again for Developer Review.", "success");
                        setSelectedReview(null);
                        fetchData();
                      })
                      .catch(err => addToast(err?.message || "Failed to raise bug again", "error"));
                  }}
                >
                  Raise Again
                </Button>

                <Button
                  className="w-full text-xs h-9 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 border border-rose-500/20 text-white font-bold animate-pulse"
                  onClick={() => {
                    testerChallenge(selectedReview.id)
                      .then(() => {
                        addToast("Rejection challenged. Sent to Admin Review.", "info");
                        setSelectedReview(null);
                        fetchData();
                      })
                      .catch(err => addToast(err?.message || "Failed to challenge rejection", "error"));
                  }}
                >
                  Challenge Rejection
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      {/* Bug Logger Dialog Form */}
      <AnimatePresence>
        {isBugOpen && selectedTask && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="bg-[#0b0e1a] border border-white/[0.08] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-xs text-slate-200 p-6 space-y-4 shadow-rose-500/5"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <BugIcon className="h-5 w-5 text-rose-500 animate-pulse" />
                  <h3 className="text-sm font-black text-slate-100 tracking-tight">Raise Defect Ticket</h3>
                </div>
                <button
                  className="p-1 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
                  onClick={() => setIsBugOpen(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveBug} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Defect Title
                  </label>
                  <input
                    value={bugTitle}
                    onChange={(e) => setBugTitle(e.target.value)}
                    required
                    className="h-10 w-full bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-all placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Failure description / Steps to reproduce
                  </label>
                  <textarea
                    className="w-full min-h-[100px] rounded-xl border border-white/[0.10] bg-white/[0.04] p-3 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 text-xs text-slate-200 transition-all placeholder:text-slate-500"
                    value={bugDesc}
                    onChange={(e) => setBugDesc(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Severity
                    </label>
                    <select
                      value={bugSeverity}
                      onChange={(e) => setBugSeverity(e.target.value as any)}
                      className="h-10 bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 rounded-xl px-2 w-full text-xs text-slate-200 outline-none"
                    >
                      <option value="Critical" className="bg-[#0b0e1a] text-slate-200">Critical</option>
                      <option value="High" className="bg-[#0b0e1a] text-slate-200">High</option>
                      <option value="Medium" className="bg-[#0b0e1a] text-slate-200">Medium</option>
                      <option value="Low" className="bg-[#0b0e1a] text-slate-200">Low</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Priority
                    </label>
                    <select
                      value={bugPriority}
                      onChange={(e) => setBugPriority(e.target.value as any)}
                      className="h-10 bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 rounded-xl px-2 w-full text-xs text-slate-200 outline-none"
                    >
                      <option value="High" className="bg-[#0b0e1a] text-slate-200">High</option>
                      <option value="Medium" className="bg-[#0b0e1a] text-slate-200">Medium</option>
                      <option value="Low" className="bg-[#0b0e1a] text-slate-200">Low</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-white/[0.08]">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setIsBugOpen(false)}
                    className="h-9 px-4 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="glow"
                    type="submit"
                    className="h-9 px-4 rounded-xl shadow-lg bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 border border-rose-500/30 text-white shadow-rose-500/10 font-bold"
                  >
                    File Defect & Rollback Task
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
            onSuccess={() => { fetchData(); setIsRaiseBugOpen(false) }}
          />
        )}
      </AnimatePresence>

      {/* Bug Detail Modal */}
      <AnimatePresence>
        {selectedBugDetailId !== null && (
          <BugDetailModal
            bugId={selectedBugDetailId}
            onClose={() => setSelectedBugDetailId(null)}
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

      {/* Sprint Task Completion Choice Popup Modal */}
      <AnimatePresence>
        {showCompletionPopup && taskToPass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-400 text-sm">
                  Complete Linked Sprint Tasks?
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCompletionPopup(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300">
                Testing completed successfully for <span className="font-mono text-sky-400">{taskToPass.jtrackId}</span>. Please choose the completion rules for its linked open Sprint Tasks:
              </p>
              
              <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                {((taskToPass as any).sprintTasks || []).filter((st: any) => st.status !== "COMPLETED").map((st: any) => (
                  <div key={st.id} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-sky-400">{st.taskCode}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-bold">{st.status}</span>
                    </div>
                    <p className="text-xs text-foreground font-semibold truncate">{st.title}</p>
                    <div className="space-y-1.5 pt-1.5 border-t border-white/[0.04]">
                      {[
                        { val: "COMPLETE_AFTER_TESTING", label: "Complete After Testing" },
                        { val: "COMPLETE_AFTER_PROD", label: "Complete After Production Deployment" },
                        { val: "KEEP_OPEN", label: "Keep Task Open" }
                      ].map(opt => (
                        <label key={opt.val} className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer">
                          <input
                            type="radio"
                            name={`choice-${st.id}`}
                            value={opt.val}
                            checked={(selectedChoices[st.id] || "COMPLETE_AFTER_TESTING") === opt.val}
                            onChange={() => {
                              setSelectedChoices(prev => ({ ...prev, [st.id]: opt.val }))
                            }}
                            className="text-sky-500 bg-slate-900 border-white/10"
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <Button
                  variant="outline"
                  onClick={() => setShowCompletionPopup(false)}
                  className="h-9 px-4 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  variant="glow"
                  disabled={isConfirmingChoices}
                  onClick={handleConfirmChoices}
                  className="h-9 px-5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 text-white font-bold"
                >
                  {isConfirmingChoices ? "Processing..." : "Confirm & Pass CR"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
