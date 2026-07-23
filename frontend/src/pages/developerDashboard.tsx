import React, { useEffect, useState, useMemo, useCallback } from "react"
import { useTaskStore } from "@/store/taskStore"
import { useAuthStore } from "@/store/authStore"
import { useSprintStore } from "@/store/sprintStore"
import { useThemeStore } from "@/store/themeStore"
import { Button } from "@/components/ui/button"
import { listDocuments, downloadDocument, uploadDocument } from "@/services/document.service"
import BugDetailModal from "@/components/shared/BugDetailModal"
import DevOpsDeploymentModal from "@/components/shared/DevOpsDeploymentModal"
import type { DevOpsDeploymentFields } from "@/components/shared/DevOpsDeploymentModal"
import {
  GitPullRequest,
  CheckCircle,
  Play,
  Bug as BugIcon,
  Search,
  Settings,
  Pin,
  FileText,
  AlertTriangle,
  Send,
  Trash2,
  Download
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { Task, Bug, AuditLog } from "@/services/mockData"

export function getDeploymentSlaDetails(task: Task) {
  const todayStr = new Date().toISOString().split('T')[0];
  
  let sitStatus = 'Not Set';
  let sitDelay = 0;
  let sitRemaining = 0;
  if (task.expectedSitDeploymentDate) {
    if (task.sitDate) {
      if (task.sitDate <= task.expectedSitDeploymentDate) {
        sitStatus = 'Met SLA';
      } else {
        sitStatus = 'Delayed';
        sitDelay = Math.ceil((new Date(task.sitDate).getTime() - new Date(task.expectedSitDeploymentDate).getTime()) / (1000 * 60 * 60 * 24));
      }
    } else {
      if (todayStr <= task.expectedSitDeploymentDate) {
        sitStatus = 'On Track';
        sitRemaining = Math.max(0, Math.ceil((new Date(task.expectedSitDeploymentDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
      } else {
        sitStatus = 'Missed';
        sitDelay = Math.ceil((new Date().getTime() - new Date(task.expectedSitDeploymentDate).getTime()) / (1000 * 60 * 60 * 24));
      }
    }
  }

  let uatStatus = 'Not Set';
  let uatDelay = 0;
  let uatRemaining = 0;
  if (task.expectedUatDeploymentDate) {
    if (task.uatDate) {
      if (task.uatDate <= task.expectedUatDeploymentDate) {
        uatStatus = 'Met SLA';
      } else {
        uatStatus = 'Delayed';
        uatDelay = Math.ceil((new Date(task.uatDate).getTime() - new Date(task.expectedUatDeploymentDate).getTime()) / (1000 * 60 * 60 * 24));
      }
    } else {
      if (todayStr <= task.expectedUatDeploymentDate) {
        uatStatus = 'On Track';
        uatRemaining = Math.max(0, Math.ceil((new Date(task.expectedUatDeploymentDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
      } else {
        uatStatus = 'Missed';
        uatDelay = Math.ceil((new Date().getTime() - new Date(task.expectedUatDeploymentDate).getTime()) / (1000 * 60 * 60 * 24));
      }
    }
  }

  const isMissed = sitStatus === 'Missed' || uatStatus === 'Missed';
  const isDelayed = sitStatus === 'Delayed' || uatStatus === 'Delayed';
  
  return {
    sitStatus,
    sitDelay,
    sitRemaining,
    uatStatus,
    uatDelay,
    uatRemaining,
    isMissed,
    isDelayed
  };
}

export default function DeveloperDashboard() {
  const { theme } = useThemeStore()
  const {
    tasks,
    bugs,
    auditLogs,
    fetchData,
    updateTask,
    searchQuery,
    addToast,
    setDownloadTarget,
    bugReviews,
    fetchBugReviews,
    acceptBugReview,
    rejectBugReview,
    configs
  } = useTaskStore()
  
  const { sprints, fetchSprints } = useSprintStore()
  const { user } = useAuthStore()

  // --- Core Page States ---
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null)
  const [remarks, setRemarks] = useState("")

  // --- Redesign Feature States ---
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState("")
  const [filterCard, setFilterCard] = useState<string | null>(null)
  const [pinnedCRs, setPinnedCRs] = useState<number[]>([])
  const [layoutDensity, setLayoutDensity] = useState<"comfortable" | "compact" | "spacious">("comfortable")
  const [layoutOrder, setLayoutOrder] = useState<string[]>([
    "hero", "summary", "deadlines", "activeWork", "approvals", "bugs", "sprint", "activity"
  ])
  const [visibleLayouts, setVisibleLayouts] = useState<string[]>([
    "hero", "summary", "deadlines", "activeWork", "approvals", "bugs", "sprint", "activity"
  ])
  const [personalizeOpen, setPersonalizeOpen] = useState(false)
  const [taskDocs, setTaskDocs] = useState<any[]>([])

  // Code Review Submission State
  const [isSubmitOpen, setIsSubmitOpen] = useState(false)
  const [gitRepo, setGitRepo] = useState("")
  const [branchName, setBranchName] = useState("")
  const [buildStatus, setBuildStatus] = useState("SUCCESS")
  const [deployNotes, setDeployNotes] = useState("")
  const [selectedDocFiles, setSelectedDocFiles] = useState<{ name: string; url: string; fileObject?: File }[]>([])



  // Bug Review Rejection States
  const [rejectingReviewId, setRejectingReviewId] = useState<number | null>(null)
  const [rejectionJustification, setRejectionJustification] = useState("")
  const [rejectionRootCause, setRejectionRootCause] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [rejectionEvidence, setRejectionEvidence] = useState("")
  const [rejectionFormError, setRejectionFormError] = useState("")

  // Bug detail popup opened from within CR card popup
  const [selectedCrBugId, setSelectedCrBugId] = useState<number | null>(null)

  // DevOps Deployment Modal state
  const [devOpsModalOpen, setDevOpsModalOpen] = useState(false)
  const [pendingSubmitReviewTask, setPendingSubmitReviewTask] = useState<Task | null>(null)

  const activeSprint = useMemo(() => {
    return sprints.find(s => s.status === "ACTIVE") || sprints[0]
  }, [sprints])

  const sprintVelocity = useMemo(() => {
    if (!activeSprint) return { completed: 0, total: 0, percent: 0 }
    const sprintTasks = tasks.filter(t => t.sprintId === activeSprint.id)
    let total = 0
    let completed = 0
    sprintTasks.forEach(t => {
      const sp = t.efforts && t.efforts > 0 ? Math.round(t.efforts) : 3
      total += sp
      if (["CLOSED", "PROD_COMPLETED", "PROD_DEPLOYED"].includes(t.status)) {
        completed += sp
      }
    })
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
    return { completed, total, percent }
  }, [activeSprint, tasks])

  const burndownPoints = useMemo(() => {
    if (!activeSprint || !activeSprint.startDate || !activeSprint.endDate) return []
    
    const start = new Date(activeSprint.startDate)
    const end = new Date(activeSprint.endDate)
    const diffTime = end.getTime() - start.getTime()
    const sprintDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
    
    const sprintTasks = tasks.filter(t => t.sprintId === activeSprint.id)
    const totalStoryPoints = sprintTasks.reduce((sum, t) => sum + (t.efforts && t.efforts > 0 ? Math.round(t.efforts) : 3), 0)
    
    const points: { day: string; remaining: number; ideal: number }[] = []
    
    for (let d = 0; d <= sprintDays; d++) {
      const currentDayDate = new Date(start)
      currentDayDate.setDate(start.getDate() + d)
      
      const ideal = Math.max(0, totalStoryPoints - (d * totalStoryPoints / sprintDays))
      
      let remaining = 0
      sprintTasks.forEach(t => {
        const pts = t.efforts && t.efforts > 0 ? Math.round(t.efforts) : 3
        const isCompleted = ["CLOSED", "PROD_COMPLETED", "PROD_DEPLOYED"].includes(t.status)
        if (isCompleted) {
          const compDateStr = t.productionDate || t.updatedDate?.split("T")[0]
          const compDate = compDateStr ? new Date(compDateStr) : new Date(activeSprint.startDate)
          const compDateZero = new Date(compDate.getFullYear(), compDate.getMonth(), compDate.getDate())
          const currentZero = new Date(currentDayDate.getFullYear(), currentDayDate.getMonth(), currentDayDate.getDate())
          if (compDateZero.getTime() > currentZero.getTime()) {
            remaining += pts
          }
        } else {
          remaining += pts
        }
      })
      
      points.push({
        day: `Day ${d + 1}`,
        remaining: Math.round(remaining * 10) / 10,
        ideal: Math.round(ideal * 10) / 10
      })
    }
    
    return points
  }, [activeSprint, tasks])

  const burndownLabels = useMemo(() => {
    if (burndownPoints.length === 0) return []
    const len = burndownPoints.length
    if (len <= 4) {
      return burndownPoints.map(p => p.day)
    }
    return [
      burndownPoints[0].day,
      burndownPoints[Math.floor(len * 0.33)].day,
      burndownPoints[Math.floor(len * 0.66)].day,
      burndownPoints[len - 1].day
    ]
  }, [burndownPoints])

  const elapsedDays = useMemo(() => {
    if (!activeSprint || !activeSprint.startDate) return 0
    const start = new Date(activeSprint.startDate)
    const today = new Date()
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const startZero = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    return Math.max(0, Math.ceil((todayZero.getTime() - startZero.getTime()) / (1000 * 60 * 60 * 24)))
  }, [activeSprint])

  // Fetch document list for selected task
  useEffect(() => {
    if (selectedTask) {
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

  // Get transition dates from audit log
  const getAuditDate = (taskId: number, status: string) => {
    const log = (auditLogs || [])
      .filter(l => l.entityType === "TASK" && l.entityId === taskId && l.fieldName === "status" && l.newValue === status)
      .sort((a, b) => new Date(a.changedDate || 0).getTime() - new Date(b.changedDate || 0).getTime())[0]
    return log?.changedDate ? new Date(log.changedDate).toISOString().split('T')[0] : "—"
  }

  // Fetch initial data
  useEffect(() => {
    fetchData()
    fetchSprints()
    fetchBugReviews()
  }, [])

  // Ctrl + K Global Search shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen(o => !o)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])



  // Sync selected task details
  useEffect(() => {
    setSelectedDocFiles([])
  }, [selectedTask])

  // Auto-sync selectedTask from live store so WebSocket-driven task refreshes
  // update the modal content in real-time (fixes stale status buttons).
  useEffect(() => {
    if (selectedTask) {
      const freshTask = tasks.find(t => t.id === selectedTask.id)
      if (freshTask && freshTask.status !== selectedTask.status) {
        setSelectedTask(freshTask)
      }
    }
  }, [tasks])

  // --- Dynamic calculations: Smart Deadline Engine ---
  const calculateDeadlineDetails = (task: Task) => {
    // Helper to get config values
    const getConfigValue = (key: string, defaultValue: string) => {
      const configObj = configs?.find(c => c.configKey === key)
      return configObj ? configObj.configValue : defaultValue
    }

    // 1. Effort fallback
    const configDefaultEffort = getConfigValue("deadline.default_effort_days", "5")
    const defaultEffortVal = parseInt(configDefaultEffort, 10) || 5
    const effortDays = task.efforts && task.efforts > 0 ? Math.ceil(task.efforts) : defaultEffortVal

    // 2. Company Holidays
    const holidaysConfig = getConfigValue(
      "deadline.company_holidays",
      "2026-01-01,2026-01-26,2026-08-15,2026-10-02,2026-12-25"
    )
    const holidaysList = holidaysConfig.split(",").map(h => h.trim())

    // Development starts on devStartDate or task createdDate
    const devStartStr = task.devStartDate ? task.devStartDate.toString() : task.createdDate?.split("T")[0]
    const devStart = devStartStr ? new Date(devStartStr) : new Date()

    // Add working days (skip weekends and holidays)
    let addedDays = 0
    let currDate = new Date(devStart)
    while (addedDays < effortDays) {
      currDate.setDate(currDate.getDate() + 1)
      const dayOfWeek = currDate.getDay()
      const formatted = currDate.toISOString().split("T")[0]
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const isHoliday = holidaysList.includes(formatted)
      if (!isWeekend && !isHoliday) {
        addedDays++
      }
    }
    const targetCompletionDate = new Date(currDate)

    // Predicted completion date: include delays from bugs, retests, and approval cycles
    let predictedDate = new Date(targetCompletionDate)
    
    // 3. Count bugs in real-time from store
    const realTimeBugs = bugs?.filter(b => b.crTaskId === task.id) || []
    const totalBugsRaisedCount = realTimeBugs.length

    // 4. Configurable delays
    const bugDelayFactor = parseInt(getConfigValue("deadline.bug_delay_days", "2"), 10) || 2
    const approvalDelayFactor = parseInt(getConfigValue("deadline.approval_delay_days", "2"), 10) || 2
    const blockedDelayFactor = parseInt(getConfigValue("deadline.blocked_delay_days", "4"), 10) || 4

    let bugDelayDays = totalBugsRaisedCount * bugDelayFactor
    let approvalDelayDays = task.status === "CODE_REVIEW" ? approvalDelayFactor : 0
    let blockedDelayDays = task.status === "BUG_FOUND" ? blockedDelayFactor : 0

    if (bugDelayDays > 0) predictedDate.setDate(predictedDate.getDate() + bugDelayDays)
    if (approvalDelayDays > 0) predictedDate.setDate(predictedDate.getDate() + approvalDelayDays)
    if (blockedDelayDays > 0) predictedDate.setDate(predictedDate.getDate() + blockedDelayDays)

    // Sprint deadline matching active sprint
    const activeSprint = sprints?.find(s => s.status === "ACTIVE")
    const fallbackDeadlineStr = getConfigValue("deadline.sprint_deadline_fallback", "2026-07-31")
    const sprintDeadlineStr = activeSprint?.endDate || fallbackDeadlineStr
    const sprintDeadline = new Date(sprintDeadlineStr)

    // Determine status
    let deadlineStatus: "On Track" | "At Risk" | "Delayed" | "Bug Found" = "On Track"
    let statusExplanation = "Work is progressing on schedule."

    if (task.status === "BUG_FOUND") {
      deadlineStatus = "Bug Found"
      statusExplanation = "Bug Found: Retest is pending on raised UAT bug."
    } else if (predictedDate.getTime() > sprintDeadline.getTime()) {
      deadlineStatus = "Delayed"
      statusExplanation = `Delayed: Predicted completion date (${predictedDate.toISOString().split("T")[0]}) exceeds the Active Sprint deadline (${sprintDeadlineStr}).`
    } else if (sprintDeadline.getTime() - predictedDate.getTime() < 2 * 24 * 60 * 60 * 1000) {
      deadlineStatus = "At Risk"
      statusExplanation = "At Risk: Buffer margin to sprint deadline is less than 48 hours."
    }

    if (bugDelayDays > 0 && deadlineStatus !== "On Track") {
      statusExplanation += ` (Added ${bugDelayDays} days for bug rework.)`
    }
    if (approvalDelayDays > 0 && deadlineStatus !== "On Track") {
      statusExplanation += ` (Added ${approvalDelayDays} days for approval process.)`
    }

    return {
      devStartDate: devStart.toISOString().split("T")[0],
      targetCompletionDate: targetCompletionDate.toISOString().split("T")[0],
      sprintDeadline: sprintDeadlineStr,
      predictedCompletionDate: predictedDate.toISOString().split("T")[0],
      status: deadlineStatus,
      explanation: statusExplanation
    }
  }



  const pendingReviews = useMemo(() => {
    return (bugReviews || []).filter(br => 
      br.developer?.id === user?.id && 
      br.reviewStatus === "PENDING_DEV_REVIEW"
    )
  }, [bugReviews, user])

  const isAssignedToMe = useCallback((t: Task) => {
    if (!user?.id) return false;
    if (t.assignedDeveloper?.id === user.id) return true;
    if (t.developers && Array.isArray(t.developers)) {
      return t.developers.some((d: any) => d.developer?.id === user.id);
    }
    return false;
  }, [user]);

  // Filter Tasks & Bugs Assigned to Developer
  const myTasks = useMemo(() => {
    const filtered = tasks.filter(t => {
      const assigned = isAssignedToMe(t)
      if (!assigned) return false
      
      // Search filter
      if (searchQuery) {
        const s = searchQuery.toLowerCase()
        const matchesSearch = t.title.toLowerCase().includes(s) || t.jtrackId.toLowerCase().includes(s)
        if (!matchesSearch) return false
      }

      // Summary Card click filtering
      if (filterCard === "active_crs") {
        return t.status !== "CLOSED" && t.status !== "PROD_DEPLOYED"
      }
      if (filterCard === "pending_deployments") {
        return t.status === "MOVE_TO_UAT" || t.status === "SIT_DEPLOYED"
      }
      if (filterCard === "closed_crs") {
        return t.status === "CLOSED" || t.status === "PROD_DEPLOYED"
      }
      if (filterCard === "pending_approvals") {
        return t.status === "CODE_REVIEW"
      }
      if (filterCard === "proposed_bug_reviews") {
        const crIds = new Set(pendingReviews.map(r => r.crId))
        return crIds.has(t.id)
      }
      if (filterCard === "assigned_bugs") {
        return t.status === "BUG_FOUND"
      }

      // Default (no filter card clicked): return active tasks only
      return t.status !== "CLOSED" && t.status !== "PROD_DEPLOYED"
    })
    return [...filtered].sort((a, b) => b.id - a.id)
  }, [tasks, user, searchQuery, filterCard, pendingReviews, isAssignedToMe])

  const bugFoundCrs = useMemo(() => {
    return tasks.filter(t => isAssignedToMe(t) && t.status === "BUG_FOUND")
  }, [tasks, isAssignedToMe])

  // Dynamic Focus Points Calculation
  const focusPoints = useMemo(() => {
    const dueTodayCount = tasks.filter(t => {
      if (!isAssignedToMe(t)) return false
      if (t.status === "CLOSED" || t.status === "PROD_DEPLOYED") return false
      const details = calculateDeadlineDetails(t)
      const todayStr = new Date().toISOString().split("T")[0]
      return details.targetCompletionDate === todayStr || details.status === "Delayed" || details.status === "At Risk"
    }).length

    const pendingApprovalsCount = tasks.filter(t => t.status === "CODE_REVIEW").length
    const bugQueueCount = bugs.filter(b => b.assignedDeveloper?.id === user?.id && (b.status === "OPEN" || b.status === "IN_PROGRESS")).length
    const activeTasksCount = tasks.filter(t => isAssignedToMe(t) && (t.status === "IN_PROGRESS" || t.status === "CHANGES_REQUESTED")).length

    return [
      { id: "due_today", label: `${dueTodayCount} Change Requests Due / At Risk`, icon: "📅", color: "text-amber-400" },
      { id: "pending_approvals", label: `${pendingApprovalsCount} Pending Code Reviews`, icon: "🔍", color: "text-cyan-400" },
      { id: "bug_queue", label: `${bugQueueCount} Bugs Queue Waiting for Fix`, icon: "🐛", color: "text-rose-400" },
      { id: "active_tasks", label: `${activeTasksCount} Active Coding Tasks`, icon: "⚡", color: "text-emerald-400" },
    ]
  }, [tasks, bugs, user, isAssignedToMe])

  // --- Real-time Activity Logs Mapping & Formatting ---
  const taskMap = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks])
  const bugMap = useMemo(() => new Map(bugs.map(b => [b.id, b])), [bugs])

  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return "Unknown time"
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) {
      if (date.getDate() === now.getDate()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      return "Yesterday"
    }
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const formatLogText = (log: AuditLog) => {
    const task = log.entityType === "TASK" ? taskMap.get(log.entityId) : null
    const bug = log.entityType === "BUG" ? bugMap.get(log.entityId) : null
    
    const entityName = task 
      ? `CR ${task.jtrackId}` 
      : bug 
        ? `Bug ${bug.jtrackId}` 
        : `${log.entityType} #${log.entityId}`
        
    if (log.fieldName === "status") {
      return `changed status of ${entityName} to ${log.newValue.replace(/_/g, " ")}`
    }
    if (log.fieldName === "workflow_reject") {
      return `requested changes on ${entityName}`
    }
    if (log.fieldName === "screenshotUrl" || log.fieldName === "unitTestDocUrl") {
      return `uploaded document proof for ${entityName}`
    }
    if (log.remarks) {
      return `${log.remarks} on ${entityName}`
    }
    return `updated ${log.fieldName} on ${entityName}`
  }

  const activityLogsList = useMemo(() => {
    const devTaskIds = new Set(tasks.filter(t => t.assignedDeveloper?.id === user?.id).map(t => t.id))
    const devBugIds = new Set(bugs.filter(b => b.assignedDeveloper?.id === user?.id).map(b => b.id))
    
    const filtered = (auditLogs || []).filter(log => log.entityType === "TASK" || log.entityType === "BUG")
    
    const specificLogs = filtered.filter(log => {
      if (log.entityType === "TASK" && devTaskIds.has(log.entityId)) return true
      if (log.entityType === "BUG" && devBugIds.has(log.entityId)) return true
      return false
    })
    
    const displayLogs = specificLogs.length > 0 ? specificLogs : filtered
    return displayLogs
      .sort((a, b) => new Date(b.changedDate).getTime() - new Date(a.changedDate).getTime())
      .slice(0, 8)
  }, [auditLogs, tasks, bugs, user])


  // --- Handlers ---
  const handleUpdateStatus = (task: Task, nextStatus: string) => {
    if (!remarks) {
      addToast("Remarks are mandatory for all status transitions!", "error")
      return
    }
    
    const payload: Partial<Task> = { status: nextStatus }
    const todayStr = new Date().toISOString().split('T')[0]
    if (nextStatus === "IN_PROGRESS") {
      payload.devStartDate = todayStr
    } else if (nextStatus === "SIT_DEPLOYED") {
      payload.sitDate = todayStr
    } else if (nextStatus === "MOVE_TO_UAT") {
      payload.uatDate = todayStr
    } else if (nextStatus === "PROD_DEPLOYED" || nextStatus === "CLOSED") {
      payload.productionDate = todayStr
    }

    // Close modal immediately (optimistic) — do NOT wait for API/notifications.
    // This prevents the race where the top WebSocket toast appears but the form
    // stays open because setSelectedTask(null) was only inside .then().
    const savedRemarks = remarks
    setSelectedTask(null)
    setRemarks("")
    
    updateTask(task.id, payload, savedRemarks, user!)
      .then(() => {
        addToast(`CR status updated to ${nextStatus.replace(/_/g, " ")}`, "success")
        fetchData()
      })
      .catch(err => {
        addToast(err.message || "Failed to update status", "error")
      })
  }



  const handlePushToUATTesting = (task: Task) => {
    if (!remarks) {
      addToast("Remarks are mandatory for promoting to UAT testing pool!", "error")
      return
    }
    const hasDoc = selectedDocFiles.length > 0 || !!task.unitTestDocUrl
    if (!hasDoc) {
      addToast("Please select at least one unit testing document first.", "error")
      return
    }

    const payload: Partial<Task> = { status: "TESTING_POOL" }
    if (selectedDocFiles.length > 0) {
      payload.unitTestDocUrl = selectedDocFiles[0].url
      payload.unitTestDocName = selectedDocFiles.map(f => f.name).join(", ")

      // Async upload documents if fileObject present
      selectedDocFiles.forEach(async (f) => {
        if (f.fileObject) {
          try { await uploadDocument(task.id, "SUPPORT", f.fileObject); } catch (e) { console.error("Upload error:", e); }
        }
      })
    }

    // Close modal immediately (optimistic) — independent of API/WebSocket notifications.
    const savedRemarks = remarks
    setSelectedTask(null)
    setRemarks("")
    setSelectedDocFiles([])

    updateTask(task.id, payload, savedRemarks, user!)
      .then(() => {
        addToast("CR successfully moved to UAT testing pool", "success")
        fetchData()
      })
      .catch(err => {
        addToast(err.message || "Failed to move to UAT testing pool", "error")
      })
  }

  const handleOpenSubmitReview = (task: Task) => {
    setBranchName(task.branchName || "")
    setGitRepo("https://github.com/enterprise/devtracker")
    setIsSubmitOpen(true)
  }

  const handleSubmitForReview = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask || !user) return
    if (!remarks) {
      addToast("Submission Remarks are required.", "error")
      return
    }
    // Store task and show DevOps deployment modal before submitting
    setPendingSubmitReviewTask(selectedTask)
    setDevOpsModalOpen(true)
  }

  const handleDevOpsConfirm = (fields: DevOpsDeploymentFields) => {
    setDevOpsModalOpen(false)
    const task = pendingSubmitReviewTask
    if (!task || !user) return
    setPendingSubmitReviewTask(null)

    // Close modals immediately — independent of API/WebSocket notifications.
    const taskId = task.id
    const savedRemarks = `Submitted for approval. Git Branch: ${branchName}`
    setIsSubmitOpen(false)
    setRemarks("")
    setSelectedTask(null)

    updateTask(taskId, {
      status: "CODE_REVIEW",
      branchName: branchName,
      gitLinks: gitRepo,
      codeReviewComments: `Build: ${buildStatus}\nNotes: ${deployNotes}`,
      // @ts-ignore — transient fields not in Task type but accepted by API
      deploymentNote: fields.deploymentNote,
      serverPath: fields.serverPath,
      itemsToDeploy: fields.itemsToDeploy,
    }, savedRemarks, user)
      .then(() => {
        addToast("Submitted for Code Review approval. DevOps team notified.", "success")
        fetchData()
      })
      .catch(err => {
        addToast(err.message || "Failed to submit code review", "error")
      })
  }

  const handleUnitDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newFiles = Array.from(files)
    newFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setSelectedDocFiles(prev => [...prev, { name: file.name, url: base64String, fileObject: file }])
      }
      reader.readAsDataURL(file)
    })
    addToast(`Attached ${newFiles.length} unit testing document(s).`, "info")
    if (e.target) e.target.value = ''
  }

  const removeUnitDocFile = (index: number) => {
    setSelectedDocFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleRejectReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectionJustification.trim()) {
      setRejectionFormError("Justification is required to reject a bug review.")
      return
    }
    if (rejectingReviewId === null) return

    rejectBugReview(rejectingReviewId, {
      justification: rejectionJustification.trim(),
      rootCause: rejectionRootCause.trim() || undefined,
      reason: rejectionReason.trim() || undefined,
      evidenceNote: rejectionEvidence.trim() || undefined
    })
      .then(() => {
        addToast("Bug review rejected successfully", "success")
        setRejectingReviewId(null)
        setRejectionJustification("")
        setRejectionRootCause("")
        setRejectionReason("")
        setRejectionEvidence("")
        setRejectionFormError("")
        fetchBugReviews()
        fetchData()
      })
      .catch(err => {
        addToast(err.message || "Failed to reject bug review", "error")
      })
  }

  // Pin/Unpin CRs
  const togglePinTask = (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setPinnedCRs(pins => 
      pins.includes(taskId) ? pins.filter(id => id !== taskId) : [...pins, taskId]
    )
    addToast(pinnedCRs.includes(taskId) ? "CR Unpinned" : "CR Pinned to Quick Access", "info")
  }


  // --- Global Search Result ---
  const searchResults = useMemo(() => {
    if (!searchVal.trim()) return []
    const val = searchVal.toLowerCase()
    
    const resultsList: { id: string; type: string; title: string; category: string; item: any }[] = []
    
    // Search Tasks
    tasks.forEach(t => {
      if (t.title.toLowerCase().includes(val) || t.jtrackId.toLowerCase().includes(val) || (t.branchName && t.branchName.toLowerCase().includes(val))) {
        resultsList.push({
          id: `task-${t.id}`,
          type: "Task",
          title: `${t.jtrackId}: ${t.title}`,
          category: "Change Requests",
          item: t
        })
      }
    })

    // Search Bugs
    bugs.forEach(b => {
      if (b.title.toLowerCase().includes(val) || b.jtrackId.toLowerCase().includes(val)) {
        resultsList.push({
          id: `bug-${b.id}`,
          type: "Bug",
          title: `${b.jtrackId}: ${b.title}`,
          category: "Bugs & Issues",
          item: b
        })
      }
    })

    // Search Sprints
    sprints.forEach(s => {
      if (s.name.toLowerCase().includes(val) || (s.goal && s.goal.toLowerCase().includes(val))) {
        resultsList.push({
          id: `sprint-${s.id}`,
          type: "Sprint",
          title: s.name,
          category: "Sprints",
          item: s
        })
      }
    })

    return resultsList.slice(0, 8)
  }, [searchVal, tasks, bugs, sprints])

  // Custom Greeting
  const greetingText = useMemo(() => {
    const hours = new Date().getHours()
    if (hours < 12) return "Good Morning"
    if (hours < 18) return "Good Afternoon"
    return "Good Evening"
  }, [])

  // Density padding mapper
  const densityPaddingClass = layoutDensity === "compact" ? "p-3" : layoutDensity === "spacious" ? "p-6" : "p-4.5"
  const densityGapClass = layoutDensity === "compact" ? "space-y-3" : layoutDensity === "spacious" ? "space-y-6" : "space-y-4.5"

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans select-none overflow-x-hidden antialiased relative">
      
      {/* Premium Ambient Background Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/4 blur-[120px] animate-pulse" style={{ animationDuration: "12s" }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/4 blur-[120px] animate-pulse" style={{ animationDuration: "16s" }} />
        <div className="absolute top-[35%] left-[25%] w-[350px] h-[350px] rounded-full bg-amber-500/3 blur-[100px] animate-pulse" style={{ animationDuration: "20s" }} />
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* standard workspace layout */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex overflow-hidden"
        >
              {/* Workspace Left Area: Scrollable Widgets */}
              <div className={`flex-1 overflow-y-auto px-6 py-6 ${densityGapClass}`}>
                
                {layoutOrder.filter(sectionId => visibleLayouts.includes(sectionId)).map((sectionId) => {
                  if (sectionId === "hero") {
                    return (
                      /* 1. Animated Hero Widget */
                      <div key="hero" className={`rounded-3xl bg-[#161619] border border-white/[0.06] relative overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center ${densityPaddingClass}`}>
                        {/* Animated background decoration orbs */}
                        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
                        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-teal-500/5 rounded-full blur-[80px] pointer-events-none" />

                        {/* Left Column: Greeting Info */}
                        <div className="lg:col-span-5 flex items-center space-x-3.5 z-10 text-left">
                          {/* Initials profile avatar */}
                          {user?.avatar ? (
                            <img src={user.avatar} className="h-14 w-14 rounded-2xl object-cover shadow-[0_4px_16px_rgba(6,182,212,0.25)] shrink-0" alt="Avatar" />
                          ) : (
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center font-black text-black text-xl shadow-[0_4px_16px_rgba(6,182,212,0.25)] shrink-0">
                              {user?.fullName?.split(" ").map(w => w.charAt(0)).join("") || "DT"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h2 className="text-xl font-black tracking-tight text-zinc-100 flex flex-wrap items-center gap-1.5 leading-tight">
                              <span>{greetingText},</span>
                              <span className="text-cyan-400">{user?.fullName || "Developer"}</span>
                            </h2>
                            <p className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1.5 mt-1">
                              <span className="inline-block w-2 h-2 rounded-full bg-[#10b981] shrink-0" />
                              <span className="truncate">
                                Active Sprint: <b>{activeSprint ? activeSprint.name : "No Active Sprint"}</b>
                                {activeSprint?.goal ? ` (${activeSprint.goal})` : ""}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Right Column: Focus Points Grid */}
                        <div className="lg:col-span-7 z-10 w-full text-left">
                          <span className="font-extrabold text-[10px] text-zinc-500 uppercase tracking-widest block mb-2">Today's Focus points</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {focusPoints.map((pt, idx) => (
                              <motion.div
                                key={pt.id}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.08, type: "spring", stiffness: 140 }}
                                whileHover={{ scale: 1.015, x: 1.5 }}
                                className="flex items-center gap-3 p-3 px-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-cyan-500/20 transition-all duration-200"
                              >
                                <span className="text-sm select-none">{pt.icon}</span>
                                <span className="text-[11px] font-bold text-zinc-350 tracking-wide truncate">{pt.label}</span>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  }

                  if (sectionId === "summary") {
                    return (
                      /* 2. Today's Summary Metrics Widget */
                      <div key="summary" className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest">Today's Workspace Summary</h3>
                          {filterCard && (
                            <button 
                              onClick={() => setFilterCard(null)} 
                              className="text-[10px] text-cyan-400 hover:underline font-bold"
                            >
                              Clear Filter
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                          {[
                            { id: "active_crs", label: "Active CRs", value: tasks.filter(t => isAssignedToMe(t) && t.status !== "CLOSED" && t.status !== "PROD_DEPLOYED").length, type: "cyan", icon: "⚡" },
                            { id: "pending_approvals", label: "Approvals", value: tasks.filter(t => t.status === "CODE_REVIEW").length, type: "emerald", icon: "✓" },
                            { id: "proposed_bug_reviews", label: "Proposed Bug Reviews", value: pendingReviews.length, type: "rose", icon: "🔎" },
                            { id: "assigned_bugs", label: "Assigned Bugs", value: bugFoundCrs.length, type: "rose", icon: "🐛" },
                            { id: "pending_deployments", label: "Deployments", value: tasks.filter(t => isAssignedToMe(t) && (t.status === "MOVE_TO_UAT" || t.status === "SIT_DEPLOYED")).length, type: "cyan", icon: "🚀" },
                            { id: "closed_crs", label: "Closed CRs", value: tasks.filter(t => isAssignedToMe(t) && (t.status === "CLOSED" || t.status === "PROD_DEPLOYED")).length, type: "emerald", icon: "✅" },
                          ].map((card, i) => {
                            const isSelected = filterCard === card.id
                            const isDark = theme === "dark"

                            const colorMap: Record<string, { 
                              glow: string, 
                              border: string, 
                              bg: string, 
                              dot: string, 
                              text: string, 
                              labelText: string,
                              shimmer: string 
                            }> = {
                              cyan: { 
                                glow: isDark ? "rgba(14, 165, 233, 0.25)" : "rgba(2, 132, 199, 0.15)",   
                                border: isDark ? "rgba(14, 165, 233, 0.4)" : "rgba(14, 165, 233, 0.5)",    
                                bg: isDark ? "rgba(15, 23, 42, 0.4)" : "rgba(224, 242, 254, 0.5)",    
                                dot: "rgb(14, 165, 233)", 
                                text: isDark ? "#38bdf8" : "#0284c7",
                                labelText: isDark ? "rgba(14, 165, 233, 0.7)" : "#0369a1",
                                shimmer: isDark 
                                  ? "linear-gradient(90deg, transparent, rgba(14, 165, 233, 0.08), transparent)" 
                                  : "linear-gradient(90deg, transparent, rgba(14, 165, 233, 0.2), transparent)"
                              },
                              emerald: { 
                                glow: isDark ? "rgba(16, 185, 129, 0.25)" : "rgba(5, 150, 105, 0.15)",  
                                border: isDark ? "rgba(16, 185, 129, 0.4)" : "rgba(16, 185, 129, 0.5)",   
                                bg: isDark ? "rgba(6, 78, 59, 0.2)" : "rgba(220, 252, 231, 0.5)",   
                                dot: "rgb(16, 185, 129)", 
                                text: isDark ? "#34d399" : "#059669",
                                labelText: isDark ? "rgba(16, 185, 129, 0.7)" : "#047857",
                                shimmer: isDark 
                                  ? "linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.08), transparent)" 
                                  : "linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.2), transparent)"
                              },
                              rose: { 
                                glow: isDark ? "rgba(239, 68, 68, 0.25)" : "rgba(220, 38, 38, 0.15)",   
                                border: isDark ? "rgba(239, 68, 68, 0.4)" : "rgba(239, 68, 68, 0.5)",    
                                bg: isDark ? "rgba(127, 29, 29, 0.2)" : "rgba(254, 226, 226, 0.5)",    
                                dot: "rgb(239, 68, 68)", 
                                text: isDark ? "#f87171" : "#dc2626",
                                labelText: isDark ? "rgba(239, 68, 68, 0.7)" : "#b91c1c",
                                shimmer: isDark 
                                  ? "linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.08), transparent)" 
                                  : "linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.2), transparent)"
                              },
                            }

                            const c = colorMap[card.type]
                            const normalBg = isDark ? "rgba(30, 30, 35, 0.65)" : "rgba(255, 255, 255, 0.85)"
                            const normalBorder = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"
                            const normalText = isDark ? "#f4f4f5" : "#18181b"
                            const normalLabel = isDark ? "rgba(161, 161, 170, 0.7)" : "rgba(82, 82, 91, 0.8)"

                            const currentBg = isSelected ? c.bg : normalBg
                            const currentBorder = isSelected ? c.border : normalBorder
                            const currentTextColor = isSelected ? c.text : normalText
                            const currentLabelColor = isSelected ? c.labelText : normalLabel

                            const normalShadow = isDark 
                              ? "0 4px 12px rgba(0, 0, 0, 0.4)" 
                              : "0 4px 12px rgba(0, 0, 0, 0.05)"
                            const selectedShadow = isDark 
                              ? `0 0 20px ${c.glow}, 0 4px 16px rgba(0, 0, 0, 0.4)` 
                              : `0 0 20px ${c.glow}, 0 4px 12px rgba(0, 0, 0, 0.08)`

                            return (
                              <motion.div
                                key={card.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.07, type: "spring", damping: 20, stiffness: 200 }}
                                whileHover={{ 
                                  y: -6, 
                                  scale: 1.03, 
                                  borderColor: c.border, 
                                  boxShadow: isDark 
                                    ? `0 8px 24px ${c.glow}, 0 6px 20px rgba(0, 0, 0, 0.45)` 
                                    : `0 8px 20px ${c.glow}, 0 6px 16px rgba(0, 0, 0, 0.08)` 
                                }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => setFilterCard(isSelected ? null : card.id)}
                                className="relative overflow-hidden rounded-2xl cursor-pointer select-none text-left transition-colors duration-300"
                                style={{
                                  background: currentBg,
                                  border: `1px solid ${currentBorder}`,
                                  boxShadow: isSelected ? selectedShadow : normalShadow
                                }}
                              >
                                {/* Animated shimmer overlay */}
                                <motion.div
                                  animate={{ x: ["-100%", "200%"] }}
                                  transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 2.5 + i * 0.5, ease: "easeInOut" }}
                                  className="absolute inset-0 pointer-events-none"
                                  style={{ background: c.shimmer, opacity: 0.7 }}
                                />

                                {/* Animated background glow orb */}
                                <motion.div
                                  animate={{ scale: [1, 1.25, 1], opacity: isSelected ? [0.35, 0.65, 0.35] : [0.15, 0.3, 0.15] }}
                                  transition={{ duration: 4.5, repeat: Infinity, delay: i * 0.6, ease: "easeInOut" }}
                                  className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full pointer-events-none blur-xl"
                                  style={{ background: c.dot }}
                                />

                                {/* Premium Icon circular container in top-right */}
                                <div 
                                  className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 shadow-sm"
                                  style={{ 
                                    background: isSelected ? c.dot : (isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)"),
                                    color: isSelected ? "#ffffff" : c.text,
                                    border: `1px solid ${isSelected ? "transparent" : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)")}`
                                  }}
                                >
                                  {card.icon}
                                </div>

                                <div className="relative z-10 p-4 pr-8">
                                  <span className="block text-[10px] font-bold uppercase tracking-wider transition-colors duration-300" style={{ color: currentLabelColor }}>{card.label}</span>
                                  <motion.span
                                    key={card.value}
                                    initial={{ opacity: 0, scale: 0.6 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                    className="block text-2xl font-black mt-1.5 tracking-tight transition-colors duration-300"
                                    style={{ color: currentTextColor }}
                                  >
                                    {card.value}
                                  </motion.span>
                                </div>

                                {/* Bottom accent bar */}
                                <motion.div
                                  animate={{ scaleX: isSelected ? 1 : 0.35, opacity: isSelected ? 1 : 0.4 }}
                                  className="absolute bottom-0 left-0 right-0 h-0.5 origin-left"
                                  style={{ background: `linear-gradient(90deg, ${c.dot}, transparent)` }}
                                />
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  }

                  if (sectionId === "deadlines") {
                    return (
                      <div key="deadlines" className="p-5 rounded-3xl bg-[#161619] border border-white/[0.06] space-y-4 text-left">
                        <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
                          <div className="flex items-center space-x-2">
                            <GitPullRequest className="h-4.5 w-4.5 text-cyan-400" />
                            <div>
                              <h4 className="font-bold text-xs uppercase text-zinc-300 tracking-widest">Deployment Deadlines (SLA)</h4>
                              <p className="text-[10px] text-zinc-500 mt-0.5">Tracking expected vs actual deployment dates, delays, and risk levels.</p>
                            </div>
                          </div>
                        </div>

                        {/* Deadlines list */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {(() => {
                            const myCrs = tasks.filter(t => t.assignedDeveloper?.id === user?.id && t.status !== "CLOSED");
                            const crsWithCommitments = myCrs.filter(t => t.expectedSitDeploymentDate || t.expectedUatDeploymentDate);
                            
                            if (crsWithCommitments.length === 0) {
                              return <div className="col-span-full py-6 text-center text-xs text-zinc-500 italic">No active CRs with deployment deadline commitments.</div>;
                            }

                            return crsWithCommitments.map(t => {
                              const sla = getDeploymentSlaDetails(t);
                              
                              // Risk levels
                              let riskLevel = 'None';
                              let riskColor = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10';
                              if (sla.isMissed) {
                                riskLevel = 'High (Overdue)';
                                riskColor = 'text-rose-400 border-rose-500/20 bg-rose-500/10';
                              } else {
                                const minRemaining = Math.min(
                                  t.expectedSitDeploymentDate && !t.sitDate ? sla.sitRemaining : Infinity,
                                  t.expectedUatDeploymentDate && !t.uatDate ? sla.uatRemaining : Infinity
                                );
                                if (minRemaining !== Infinity) {
                                  if (minRemaining <= 2) {
                                    riskLevel = 'Medium (At Risk)';
                                    riskColor = 'text-amber-400 border-amber-500/20 bg-amber-500/10';
                                  } else {
                                    riskLevel = 'Low (On Track)';
                                    riskColor = 'text-sky-400 border-sky-500/20 bg-sky-500/10';
                                  }
                                }
                              }

                              return (
                                <div 
                                  key={t.id} 
                                  onClick={() => { setSelectedTask(t); setSelectedBug(null); }}
                                  className="p-4 bg-[#0f0f11] border border-white/[0.04] rounded-2xl hover:border-cyan-500/30 cursor-pointer space-y-3.5 transition-all text-left"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="font-mono text-xs font-bold text-cyan-400">{t.jtrackId}</span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${riskColor}`}>
                                      {riskLevel}
                                    </span>
                                  </div>
                                  
                                  <h5 className="font-bold text-xs text-zinc-200 line-clamp-1">{t.title}</h5>

                                  <div className="space-y-1.5 text-[10px] text-zinc-400 pt-2 border-t border-white/[0.04]">
                                    {t.expectedSitDeploymentDate && (
                                      <div className="flex justify-between">
                                        <span>SIT Expected:</span>
                                        <span className="font-semibold text-zinc-300">
                                          {new Date(t.expectedSitDeploymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                          {t.sitDate ? (
                                            <span className="text-emerald-400 ml-1"> (Met)</span>
                                          ) : sla.sitStatus === 'Missed' ? (
                                            <span className="text-rose-400 ml-1"> (Overdue {sla.sitDelay}d)</span>
                                          ) : (
                                            <span className="text-sky-400 ml-1"> ({sla.sitRemaining}d left)</span>
                                          )}
                                        </span>
                                      </div>
                                    )}

                                    {t.expectedUatDeploymentDate && (
                                      <div className="flex justify-between">
                                        <span>UAT Expected:</span>
                                        <span className="font-semibold text-zinc-300">
                                          {new Date(t.expectedUatDeploymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                          {t.uatDate ? (
                                            <span className="text-emerald-400 ml-1"> (Met)</span>
                                          ) : sla.uatStatus === 'Missed' ? (
                                            <span className="text-rose-400 ml-1"> (Overdue {sla.uatDelay}d)</span>
                                          ) : (
                                            <span className="text-sky-400 ml-1"> ({sla.uatRemaining}d left)</span>
                                          )}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    );
                  }

                  if (sectionId === "activeWork") {
                    return (
                      /* 3. My Active Work Widget */
                      <div key="activeWork" className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="text-left">
                            <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest">My Active Change Requests</h3>
                            <p className="text-[10px] text-zinc-500 mt-0.5">Assigned CR workflow pipelines and estimates.</p>
                          </div>

                          <div className="flex items-center space-x-2">


                            {/* Settings / Personalization */}
                            <button 
                              onClick={() => setPersonalizeOpen(true)}
                              className="p-2 rounded-xl bg-[#161619] hover:bg-[#242427] border border-white/[0.06] text-zinc-400 hover:text-zinc-200 transition-colors"
                              title="Personalize Layout"
                            >
                              <Settings className="h-4 w-4" />
                            </button>

                            {/* Layout switcher */}
                            <div className="flex bg-[#161619] p-1 rounded-xl border border-white/[0.06] text-xs">
                              {["grid", "table"].map((mode) => (
                                <button
                                  key={mode}
                                  onClick={() => setViewMode(mode as any)}
                                  className={`px-3 py-1.5 rounded-lg capitalize font-bold transition-all ${
                                    viewMode === mode 
                                      ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20"
                                      : "text-zinc-400 hover:text-zinc-200"
                                  }`}
                                >
                                  {mode}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* View Content Rendering */}
                        <AnimatePresence mode="wait">
                          {viewMode === "grid" && (
                            <motion.div 
                              key="grid" 
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className="grid grid-cols-1 md:grid-cols-2 gap-4"
                            >
                              {myTasks.length === 0 ? (
                                <div className="col-span-2 py-12 text-center text-xs text-zinc-500 bg-[#161619] border border-white/[0.06] rounded-2xl">
                                  No Active Change Requests assigned to you.
                                </div>
                              ) : (
                                myTasks.map(task => {
                                  const details = calculateDeadlineDetails(task)
                                  const isPinned = pinnedCRs.includes(task.id)
                                  
                                  return (
                                    <div
                                      key={task.id}
                                      onClick={() => { setSelectedTask(task); setSelectedBug(null); }}
                                      className={`p-5 rounded-2xl border transition-all cursor-pointer select-none relative overflow-hidden bg-[#161619] hover:bg-[#1e1e21] hover:border-cyan-500/40 text-left ${
                                        selectedTask?.id === task.id ? "border-cyan-500 shadow-[0_0_16px_rgba(6,182,212,0.15)]" : "border-white/[0.06]"
                                      }`}
                                    >
                                      <div className="flex justify-between items-start">
                                        <div className="flex items-center space-x-2">
                                          <span className="font-mono text-xs font-bold text-cyan-400">{task.jtrackId}</span>
                                          <button 
                                            onClick={(e) => togglePinTask(task.id, e)}
                                            className={`p-1 rounded-lg hover:bg-white/5 transition-colors ${isPinned ? "text-cyan-400" : "text-zinc-500"}`}
                                          >
                                            <Pin className="h-3 w-3" />
                                          </button>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          {/* Smart Deadline Badge */}
                                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                                            details.status === "On Track" ? "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/20" :
                                            details.status === "Bug Found" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                            "bg-cyan-500/15 text-cyan-400 border-cyan-500/20"
                                          }`}>
                                            {details.status}
                                          </span>
                                          {(() => {
                                            const sla = getDeploymentSlaDetails(task);
                                            if (!sla.isMissed) return null;
                                            return (
                                              <span 
                                                className="text-[9px] font-bold px-2 py-0.5 rounded border bg-rose-500/15 text-rose-400 border-rose-500/20 animate-pulse"
                                                title={`SIT: ${sla.sitStatus === 'Missed' ? 'Missed by ' + sla.sitDelay + 'd' : 'OK'}, UAT: ${sla.uatStatus === 'Missed' ? 'Missed by ' + sla.uatDelay + 'd' : 'OK'}`}
                                              >
                                                🚨 Deadline Missed
                                              </span>
                                            );
                                          })()}
                                          {(() => {
                                            const latestReject = auditLogs
                                              .filter(l => l.entityType === "TASK" && l.entityId === task.id && l.fieldName === "workflow_reject")
                                              .sort((a: any, b: any) => new Date(b.changedDate || 0).getTime() - new Date(a.changedDate || 0).getTime())[0]
                                            const showRejectBadge = latestReject && (task.status === "IN_PROGRESS" || task.status === "CHANGES_REQUESTED")
                                            const hideStatusBadge = task.status === "CHANGES_REQUESTED" && latestReject
                                            return (
                                              <>
                                                {!hideStatusBadge && (
                                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                                                    task.status === "OPEN" ? "bg-slate-500/10 text-slate-400 border-slate-500/20" :
                                                    task.status === "IN_PROGRESS" ? "bg-sky-500/10 text-sky-400 border-sky-500/20" :
                                                    task.status === "CHANGES_REQUESTED" ? "bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]" :
                                                    task.status === "SIT_DEPLOYED" ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]" :
                                                    task.status === "SIT_TESTING" ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" :
                                                    task.status === "SIT_COMPLETED" ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" :
                                                    task.status === "CODE_REVIEW" ? "bg-purple-500/25 text-purple-300 border border-purple-500/50" :
                                                    task.status === "CODE_REVIEW_DONE" ? "bg-pink-500/25 text-pink-300 border border-pink-500/50" :
                                                    task.status === "MOVE_TO_UAT" ? "bg-teal-500/15 text-teal-300 border border-teal-500/30" :
                                                    task.status === "TESTING_POOL" ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" :
                                                    task.status === "TESTING_IN_PROGRESS" ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30" :
                                                    task.status === "TESTING_COMPLETED" ? "bg-emerald-600/15 text-emerald-300 border border-emerald-600/30" :
                                                    task.status === "UAT_TESTING" ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30" :
                                                    task.status === "UAT_COMPLETED" ? "bg-emerald-600/15 text-emerald-300 border border-emerald-600/30" :
                                                    task.status === "PROD_DEPLOYED" ? "bg-rose-500/15 text-rose-300 border border-rose-500/30" :
                                                    task.status === "BUG_FOUND" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                                                    "bg-zinc-850 text-zinc-300 border border-zinc-700"
                                                  }`}>
                                                    {task.status === "BUG_FOUND" ? "OPEN" : task.status.replace(/_/g, " ")}
                                                  </span>
                                                )}
                                                {showRejectBadge && (
                                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-bold tracking-wider animate-pulse">
                                                    <AlertTriangle className="h-2.5 w-2.5" />
                                                    Change Requested
                                                  </span>
                                                )}
                                              </>
                                            )
                                          })()}
                                        </div>
                                      </div>

                                      <h4 className="font-bold text-xs mt-3 text-zinc-200 line-clamp-1">{task.title}</h4>
                                      <p className="text-[11px] text-zinc-500 line-clamp-2 mt-1 leading-relaxed">{task.description}</p>

                                      {/* Extra CR metadata */}
                                      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/[0.04] text-[10px] text-zinc-500">
                                        <div>
                                          <span>Est. Efforts:</span>
                                          <span className="block font-bold text-zinc-300">{task.efforts || 0} SP</span>
                                        </div>
                                        <div>
                                          <span>Predicted Finish:</span>
                                          <span className="block font-bold text-zinc-300">{details.predictedCompletionDate}</span>
                                        </div>
                                        <div>
                                          <span>Module:</span>
                                          <span className="block font-bold text-zinc-300 truncate">{task.module || "Core"}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })
                              )}
                            </motion.div>
                          )}

                          {viewMode === "table" && (
                            <motion.div 
                              key="table" 
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className="bg-[#161619] border border-white/[0.06] rounded-2xl overflow-hidden text-xs"
                            >
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-[#0f0f11] text-zinc-500 border-b border-white/[0.06] text-[10px] uppercase font-bold tracking-wider">
                                    <th className="p-3">Jtrack ID</th>
                                    <th className="p-3">Title</th>
                                    <th className="p-3">BRD Doc</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Effort</th>
                                    <th className="p-3">Deadline Status</th>
                                    <th className="p-3">Predicted Finish</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {myTasks.map(task => {
                                    const details = calculateDeadlineDetails(task)
                                    return (
                                      <tr 
                                        key={task.id} 
                                        onClick={() => { setSelectedTask(task); setSelectedBug(null); }}
                                        className="border-b border-white/[0.04] hover:bg-white/[0.02] cursor-pointer"
                                      >
                                        <td className="p-3 font-mono font-bold text-cyan-400">{task.jtrackId}</td>
                                        <td className="p-3 font-semibold text-zinc-200">{task.title}</td>
                                        <td className="p-3">
                                          {task.brdDocumentId ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                              <FileText className="h-3 w-3" /> Attached
                                            </span>
                                          ) : (
                                            <span className="text-[10px] text-zinc-500 italic">None</span>
                                          )}
                                        </td>
                                        <td className="p-3">
                                          <div className="flex flex-wrap gap-1.5 items-center">
                                            {(() => {
                                              const latestReject = auditLogs
                                                .filter(l => l.entityType === "TASK" && l.entityId === task.id && l.fieldName === "workflow_reject")
                                                .sort((a: any, b: any) => new Date(b.changedDate || 0).getTime() - new Date(a.changedDate || 0).getTime())[0]
                                              const showRejectBadge = latestReject && (task.status === "IN_PROGRESS" || task.status === "CHANGES_REQUESTED")
                                              const hideStatusBadge = task.status === "CHANGES_REQUESTED" && latestReject
                                              return (
                                                <>
                                                  {!hideStatusBadge && (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                                                      task.status === "OPEN" ? "bg-slate-500/10 text-slate-400 border-slate-500/20" :
                                                      task.status === "IN_PROGRESS" ? "bg-sky-500/10 text-sky-400 border-sky-500/20" :
                                                      task.status === "CHANGES_REQUESTED" ? "bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]" :
                                                      task.status === "SIT_DEPLOYED" ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]" :
                                                      task.status === "SIT_TESTING" ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" :
                                                      task.status === "SIT_COMPLETED" ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" :
                                                      task.status === "CODE_REVIEW" ? "bg-purple-500/25 text-purple-300 border border-purple-500/50" :
                                                      task.status === "CODE_REVIEW_DONE" ? "bg-pink-500/25 text-pink-300 border border-pink-500/50" :
                                                      task.status === "MOVE_TO_UAT" ? "bg-teal-500/15 text-teal-300 border border-teal-500/30" :
                                                      task.status === "TESTING_POOL" ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" :
                                                      task.status === "TESTING_IN_PROGRESS" ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30" :
                                                      task.status === "TESTING_COMPLETED" ? "bg-emerald-600/15 text-emerald-300 border border-emerald-600/30" :
                                                      task.status === "UAT_TESTING" ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30" :
                                                      task.status === "UAT_COMPLETED" ? "bg-emerald-600/15 text-emerald-300 border border-emerald-600/30" :
                                                      task.status === "PROD_DEPLOYED" ? "bg-rose-500/15 text-rose-300 border border-rose-500/30" :
                                                      task.status === "BUG_FOUND" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                                                      "bg-zinc-850 text-zinc-400 border border-zinc-700"
                                                    }`}>
                                                      {task.status === "BUG_FOUND" ? "OPEN" : task.status.replace(/_/g, " ")}
                                                    </span>
                                                  )}
                                                  {showRejectBadge && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-bold tracking-wider animate-pulse">
                                                      <AlertTriangle className="h-2.5 w-2.5" />
                                                      Change Requested
                                                    </span>
                                                  )}
                                                </>
                                              )
                                            })()}
                                          </div>
                                        </td>
                                        <td className="p-3 text-zinc-300 font-bold">{task.efforts || 0} SP</td>
                                        <td className="p-3">
                                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                            details.status === "On Track" ? "text-[#10b981] bg-[#10b981]/10" : "text-cyan-400 bg-cyan-500/10"
                                          }`}>
                                            {details.status}
                                          </span>
                                        </td>
                                        <td className="p-3 text-zinc-400 font-medium">{details.predictedCompletionDate}</td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </motion.div>
                          )}

                        </AnimatePresence>
                      </div>
                    )
                  }

                  if (sectionId === "approvals") {
                    return (
                      /* 4. Pending Approvals Widget */
                      <div key="approvals" className="p-5 rounded-3xl bg-[#161619] border border-white/[0.06] space-y-4 text-left">
                        <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
                          <div className="flex items-center space-x-2">
                            <GitPullRequest className="h-4.5 w-4.5 text-[#10b981]" />
                            <div>
                              <h4 className="font-bold text-xs uppercase text-zinc-300 tracking-widest">Pending PR Approvals</h4>
                              <p className="text-[10px] text-zinc-500 mt-0.5">Submit reviews or monitor approval queues.</p>
                            </div>
                          </div>
                        </div>

                        {/* Approvals Table */}
                        <div className="overflow-x-auto text-xs">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider border-b border-white/[0.04] pb-2">
                                <th className="py-2">CR Number</th>
                                <th className="py-2">Title</th>
                                <th className="py-2">Submitted By</th>
                                <th className="py-2">Waiting Since</th>
                                <th className="py-2">State</th>
                              </tr>
                            </thead>
                            <tbody>
                               {(() => {
                                 const crTasks = tasks.filter(t => t.status === "CODE_REVIEW")
                                 if (crTasks.length === 0) {
                                   return (
                                     <tr>
                                       <td colSpan={5} className="py-4 text-center text-zinc-500 italic">No pending code review approvals found.</td>
                                     </tr>
                                   )
                                 }
                                 return crTasks.map(t => (
                                   <tr 
                                     key={t.id} 
                                     onClick={() => { setSelectedTask(t); setSelectedBug(null); }}
                                     className="border-b border-white/[0.02] hover:bg-white/[0.02] cursor-pointer"
                                   >
                                     <td className="py-2.5 font-mono font-bold text-cyan-400">{t.jtrackId}</td>
                                     <td className="py-2.5 font-semibold text-zinc-200">{t.title}</td>
                                     <td className="py-2.5 text-zinc-400">{t.assignedDeveloper?.fullName || t.createdBy?.fullName || "Developer"}</td>
                                     <td className="py-2.5 text-zinc-400">
                                       {t.createdDate ? new Date(t.createdDate).toLocaleDateString() : "Just now"}
                                     </td>
                                     <td className="py-2.5">
                                       <span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                                         {t.status}
                                       </span>
                                     </td>
                                   </tr>
                                 ))
                               })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  }

                  if (sectionId === "bugs") {
                    return (
                      <div key="bugs" className="space-y-6">
                        {/* A. Proposed Bug Reviews Widget */}
                        <div className="p-5 rounded-3xl bg-[#161619] border border-white/[0.06] space-y-4 text-left">
                          <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
                            <div className="flex items-center space-x-2">
                              <BugIcon className="h-4.5 w-4.5 text-cyan-400" />
                              <div>
                                <h4 className="font-bold text-xs uppercase text-zinc-300 tracking-widest">Proposed Bug Reviews</h4>
                                <p className="text-[10px] text-zinc-500 mt-0.5">QA bug filings pending developer acceptance review.</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md">
                              {pendingReviews.length} Pending
                            </span>
                          </div>

                          <div className="space-y-3">
                            {pendingReviews.length === 0 ? (
                              <p className="text-xs text-zinc-500 italic py-2 text-center">No proposed bug reviews pending your action.</p>
                            ) : (
                              pendingReviews.map((review: any) => {
                                let payload: any = {}
                                try {
                                  payload = JSON.parse(review.proposedBugPayload || "{}")
                                } catch (e) {
                                  console.error("Failed to parse proposed bug payload", e)
                                }
                                return (
                                  <div
                                    key={review.id}
                                    className="p-4 bg-[#0f0f11] border border-white/[0.05] rounded-2xl space-y-3 text-left relative"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h5 className="font-bold text-xs text-zinc-200">{payload.title || "Proposed Bug"}</h5>
                                        <p className="text-[10px] text-zinc-500 mt-0.5">
                                          Raised on CR: <span className="font-mono text-cyan-400 font-bold">{payload.crJtrackId || `CR #${review.crId}`}</span>
                                        </p>
                                      </div>
                                      <div className="flex space-x-1.5">
                                        <span className="text-[9px] font-black text-rose-400 px-1.5 py-0.2 bg-rose-500/10 border border-rose-500/20 rounded">
                                          {payload.severity || "Medium"}
                                        </span>
                                        <span className="text-[9px] font-black text-amber-400 px-1.5 py-0.2 bg-amber-500/10 border border-amber-500/20 rounded">
                                          {payload.priority || "Medium"}
                                        </span>
                                      </div>
                                    </div>

                                    <p className="text-[11px] text-zinc-400 leading-relaxed bg-black/20 p-2.5 rounded-xl border border-white/[0.03]">
                                      <span className="text-[10px] block font-bold text-zinc-500 uppercase tracking-wider mb-1">Reason:</span>
                                      {payload.reason || review.reason}
                                    </p>

                                    {payload.stepsToReproduce && (
                                      <div className="text-[10px] text-zinc-500 bg-black/40 p-2.5 rounded-xl border border-white/[0.03] space-y-1">
                                        <span className="font-bold block text-zinc-400 uppercase text-[9px]">Steps to Reproduce:</span>
                                        <p className="font-mono whitespace-pre-wrap leading-relaxed">{payload.stepsToReproduce}</p>
                                      </div>
                                    )}

                                    <div className="flex justify-between items-center pt-1.5 border-t border-white/[0.04]">
                                      <div className="text-[9px] text-zinc-500">
                                        <span>Tester: {review.raisedByTester?.fullName || "QA Tester"}</span>
                                      </div>
                                      <div className="flex space-x-2">
                                        <Button
                                          onClick={() => {
                                            setRejectingReviewId(review.id)
                                            setRejectionFormError("")
                                          }}
                                          className="text-[10px] h-7 px-3 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg border border-rose-500/20 font-bold"
                                        >
                                          Reject
                                        </Button>
                                        <Button
                                          onClick={() => {
                                            acceptBugReview(review.id)
                                              .then(() => {
                                                addToast("Bug review accepted and real bug created!", "success")
                                                fetchBugReviews()
                                              })
                                              .catch(err => addToast(err.message || "Failed to accept", "error"))
                                          }}
                                          className="text-[10px] h-7 px-3 bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/20 rounded-lg border border-[#10b981]/20 font-bold"
                                        >
                                          Accept & Create Bug
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  }

                  if (sectionId === "sprint") {
                    if (!activeSprint) return null
                    return (
                      /* 6. Current Sprint Details Widget */
                      <div key="sprint" className="p-5 rounded-3xl bg-[#161619] border border-white/[0.06] space-y-4 text-left relative overflow-hidden">
                        <div className="flex justify-between items-start border-b border-[#242427] pb-3 text-left">
                          <div className="space-y-1">
                            <span className="text-[10px] text-[#10b981] font-bold uppercase tracking-wider">Scrum Board Summary</span>
                            <h4 className="font-bold text-sm text-zinc-200">
                              {activeSprint ? activeSprint.name : "No Active Sprint"}
                            </h4>
                            <p className="text-[11px] text-zinc-400 leading-normal mt-1">
                              Goal: {activeSprint ? (activeSprint.goal || "No goals defined for this sprint.") : "No active sprint goals."}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-zinc-500 font-bold block uppercase">Remaining Time</span>
                            <span className="text-lg font-black text-zinc-200 block">
                              {(() => {
                                if (!activeSprint || !activeSprint.endDate) return "—";
                                const end = new Date(activeSprint.endDate);
                                const now = new Date();
                                const diffTime = end.getTime() - now.getTime();
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                return diffDays > 0 ? `${diffDays} Days` : "Ended";
                              })()}
                            </span>
                          </div>
                        </div>

                        {/* Progress and Chart Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                          {/* Mini Burndown Chart */}
                          <div className="space-y-2 col-span-2 text-left">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Sprint Burndown</span>
                            <div className="h-28 bg-[#0f0f11] border border-white/[0.04] rounded-2xl p-3 flex flex-col justify-between">
                              {burndownPoints.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-zinc-600 italic text-[10px]">
                                  No active sprint data
                                </div>
                              ) : (() => {
                                const maxVal = Math.max(...burndownPoints.map(p => Math.max(p.remaining, p.ideal)), 1)
                                const svgWidth = 300
                                const svgHeight = 80

                                const idealPointsStr = burndownPoints.map((p, index) => {
                                  const x = (index / (burndownPoints.length - 1)) * svgWidth
                                  const y = svgHeight - (p.ideal / maxVal) * svgHeight
                                  return `${x},${y}`
                                }).join(" ")

                                const actualPointsStr = burndownPoints
                                  .slice(0, Math.min(elapsedDays + 1, burndownPoints.length))
                                  .map((p, index) => {
                                    const x = (index / (burndownPoints.length - 1)) * svgWidth
                                    const y = svgHeight - (p.remaining / maxVal) * svgHeight
                                    return `${x},${y}`
                                  }).join(" ")

                                return (
                                  <>
                                    <div className="flex-1 flex items-end justify-between relative px-2">
                                      <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none">
                                        {/* Ideal line */}
                                        <polyline
                                          points={idealPointsStr}
                                          fill="none"
                                          stroke="rgba(255, 255, 255, 0.1)"
                                          strokeDasharray="3,3"
                                          strokeWidth="1.5"
                                        />
                                        {/* Actual line */}
                                        {actualPointsStr && (
                                          <polyline
                                            points={actualPointsStr}
                                            fill="none"
                                            stroke="#06b6d4"
                                            strokeWidth="2"
                                          />
                                        )}
                                        {/* Data points */}
                                        {burndownPoints.slice(0, Math.min(elapsedDays + 1, burndownPoints.length)).map((p, index) => {
                                          const x = (index / (burndownPoints.length - 1)) * svgWidth
                                          const y = svgHeight - (p.remaining / maxVal) * svgHeight
                                          return (
                                            <circle
                                              key={index}
                                              cx={x}
                                              cy={y}
                                              r="2.5"
                                              fill="#06b6d4"
                                            />
                                          )
                                        })}
                                      </svg>
                                    </div>
                                    <div className="flex justify-between text-[8px] text-zinc-500 font-bold uppercase pt-2">
                                      {burndownLabels.map((lbl, idx) => (
                                        <span key={idx}>{lbl}</span>
                                      ))}
                                    </div>
                                  </>
                                )
                              })()}
                            </div>
                          </div>

                          {/* Velocity stats */}
                          <div className="space-y-3.5 p-4 bg-[#0f0f11] rounded-2xl border border-white/[0.04] flex flex-col justify-between text-left">
                            <div>
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Sprint Velocity</span>
                              <span className="text-lg font-black text-[#10b981] mt-1 block">
                                {sprintVelocity.completed} / {sprintVelocity.total} SP
                              </span>
                              <span className="text-[9px] text-zinc-500 block">Planned Story Points: {sprintVelocity.total} SP</span>
                            </div>
                            <div className="w-full">
                              <div className="flex justify-between text-[9px] text-zinc-500 mb-1">
                                <span>Completion</span>
                                <span>{sprintVelocity.percent}%</span>
                              </div>
                              <div className="h-1.5 bg-[#161619] rounded-full overflow-hidden">
                                <div className="h-full bg-[#10b981]" style={{ width: `${sprintVelocity.percent}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  if (sectionId === "activity") {
                    return (
                      /* 9. Recent Activity Timeline Widget */
                      <div key="activity" className="p-5 rounded-3xl bg-[#161619] border border-white/[0.06] space-y-4 text-left">
                        <h4 className="font-bold text-xs uppercase text-zinc-300 tracking-widest border-b border-[#242427] pb-3">
                          Chronological Activity Logs
                        </h4>

                        <div className="relative pl-6 space-y-4 text-xs text-left">
                          {/* Timeline bar */}
                          <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-[#242427]" />

                          {activityLogsList.length === 0 ? (
                            <div className="text-zinc-500 italic py-4">No recent activity logs.</div>
                          ) : (
                            activityLogsList.map((log) => {
                              const relativeTime = formatRelativeTime(log.changedDate)
                              const userLabel = log.changedBy?.id === user?.id 
                                ? "You" 
                                : (log.changedBy?.fullName || log.changedBy?.username || "System")
                              const logText = formatLogText(log)

                              return (
                                <div key={log.id} className="relative flex flex-col items-start text-left">
                                  <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-500 border-2 border-[#161619]" />
                                  <div className="flex items-center space-x-1.5 text-[9px] text-zinc-500 font-semibold uppercase">
                                    <span>{relativeTime}</span>
                                    <span>•</span>
                                    <span>{userLabel}</span>
                                  </div>
                                  <p className="text-zinc-300 mt-1 leading-normal font-medium text-left">{logText}</p>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )
                  }

                  return null
              })}

              </div>

              {/* Dynamic CR Details Modal Popup */}
              <AnimatePresence>
                {selectedTask && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-[#161619] border border-white/[0.08] w-full max-w-lg rounded-3xl p-6 space-y-5 text-xs text-zinc-300 shadow-2xl relative max-h-[90vh] overflow-y-auto"
                    >
                      <div className="flex justify-between items-center border-b border-white/[0.08] pb-3 text-left">
                        <div>
                          <span className="font-mono text-xs font-bold text-cyan-400">{selectedTask.jtrackId}</span>
                          <h3 className="font-black text-zinc-200 text-sm truncate max-w-[320px] mt-0.5">{selectedTask.title}</h3>
                        </div>
                        <button
                          onClick={() => setSelectedTask(null)}
                          className="text-zinc-500 hover:text-zinc-300 text-sm p-1 font-bold"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Scrollable Modal Content */}
                      <div className="space-y-4">
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
                            <div className="rounded-2xl border border-pink-400/25 bg-pink-950/25 backdrop-blur-md p-4 shadow-[0_4px_20px_rgba(244,114,182,0.08)] space-y-3 text-left">
                              {/* Header */}
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-500/20 border border-pink-400/30 text-pink-300 shadow-sm">
                                  <AlertTriangle className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-black text-pink-100 uppercase tracking-wide leading-none">Change Requested</p>
                                  <p className="text-[10px] text-pink-300/80 mt-0.5">Sent back by <strong className="text-pink-100">{reviewerName}</strong></p>
                                </div>
                                <span className="ml-auto text-[9px] font-bold bg-pink-500/20 text-pink-200 border border-pink-400/30 px-2.5 py-0.5 rounded-full uppercase tracking-widest animate-pulse">Action Required</span>
                              </div>
                              {/* Remarks */}
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-pink-300/90 uppercase tracking-widest block">Admin Remarks:</span>
                                <div className="bg-pink-950/20 border border-pink-400/20 p-3.5 rounded-xl">
                                  <p className="text-xs font-semibold text-pink-100 leading-relaxed whitespace-pre-wrap">
                                    {displayRemarks || "Changes requested. Please review and resubmit."}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : null
                        })()}

                        {/* Smart Deadline Status Panel */}
                        {(() => {
                          const details = calculateDeadlineDetails(selectedTask)
                          return (
                            <div className="p-3.5 rounded-xl border border-white/[0.06] bg-black/40 space-y-2 text-[11px] text-left">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Smart Deadline Engine</span>
                              <div className="flex justify-between">
                                <span className="text-zinc-400">Status:</span>
                                <span className={`font-bold uppercase ${
                                  details.status === "On Track" ? "text-[#10b981]" : 
                                  details.status === "Bug Found" ? "text-red-400" : "text-cyan-400"
                                }`}>
                                  {details.status}
                                </span>
                              </div>
                              <p className="text-zinc-400 text-[10px] leading-relaxed font-semibold">
                                {details.explanation}
                              </p>
                              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.04] text-[9.5px]">
                                <div>
                                  <span className="text-zinc-500 block">Target Finish:</span>
                                  <span className="font-bold text-zinc-300">{details.targetCompletionDate}</span>
                                </div>
                                <div>
                                  <span className="text-zinc-500 block">Predicted:</span>
                                  <span className="font-bold text-zinc-300">{details.predictedCompletionDate}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })()}

                        {/* Deployment SLA Commitments Panel */}
                        {(() => {
                          const sla = getDeploymentSlaDetails(selectedTask);
                          if (sla.sitStatus === 'Not Set' && sla.uatStatus === 'Not Set') return null;
                          return (
                            <div className="p-3.5 rounded-xl border border-white/[0.06] bg-black/40 space-y-2 text-[11px] text-left">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Deployment Commitments (SLA)</span>
                              
                              <div className="grid grid-cols-2 gap-3">
                                {/* SIT Milestone */}
                                {selectedTask.expectedSitDeploymentDate && (
                                  <div className="space-y-1">
                                    <span className="text-zinc-500 block">SIT Deployment:</span>
                                    <span className={`font-bold block ${
                                      sla.sitStatus === 'Met SLA' || sla.sitStatus === 'On Track' ? 'text-emerald-400' : 'text-rose-400'
                                    }`}>
                                      {sla.sitStatus}
                                    </span>
                                    <span className="text-[9.5px] text-zinc-400 block">
                                      Expected: {new Date(selectedTask.expectedSitDeploymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                    </span>
                                    {selectedTask.sitDate ? (
                                      <span className="text-[9.5px] text-zinc-400 block">
                                        Actual: {new Date(selectedTask.sitDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                      </span>
                                    ) : (
                                      <span className="text-[9.5px] text-zinc-400 block">
                                        {sla.sitStatus === 'On Track' ? `${sla.sitRemaining}d remaining` : `${sla.sitDelay}d overdue`}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* UAT Milestone */}
                                {selectedTask.expectedUatDeploymentDate && (
                                  <div className="space-y-1">
                                    <span className="text-zinc-500 block">UAT Deployment:</span>
                                    <span className={`font-bold block ${
                                      sla.uatStatus === 'Met SLA' || sla.uatStatus === 'On Track' ? 'text-emerald-400' : 'text-rose-400'
                                    }`}>
                                      {sla.uatStatus}
                                    </span>
                                    <span className="text-[9.5px] text-zinc-400 block">
                                      Expected: {new Date(selectedTask.expectedUatDeploymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                    </span>
                                    {selectedTask.uatDate ? (
                                      <span className="text-[9.5px] text-zinc-400 block">
                                        Actual: {new Date(selectedTask.uatDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                      </span>
                                    ) : (
                                      <span className="text-[9.5px] text-zinc-400 block">
                                        {sla.uatStatus === 'On Track' ? `${sla.uatRemaining}d remaining` : `${sla.uatDelay}d overdue`}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Core Fields */}
                        <div className="grid grid-cols-3 gap-3 text-[11px] text-left">
                          <div className="space-y-1 p-3 rounded-xl border border-white/[0.06] bg-black/30">
                            <span className="text-zinc-500 block font-bold uppercase tracking-wider text-[9px]">Priority</span>
                            <span className="font-bold text-zinc-350">{selectedTask.priority}</span>
                          </div>
                          <div className="space-y-1 p-3 rounded-xl border border-white/[0.06] bg-black/30">
                            <span className="text-zinc-500 block font-bold uppercase tracking-wider text-[9px]">Est efforts</span>
                            <span className="font-bold text-zinc-350">{selectedTask.efforts} days</span>
                          </div>
                          <div className="space-y-1 p-3 rounded-xl border border-white/[0.06] bg-black/30">
                            <span className="text-zinc-500 block font-bold uppercase tracking-wider text-[9px]">Module</span>
                            <span className="font-bold text-zinc-350">{selectedTask.module || "Core"}</span>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5 text-left text-xs">
                          <span className="text-zinc-500 block font-bold uppercase tracking-wider text-[10px]">Scope Summary</span>
                          <p className="p-3.5 rounded-xl border border-white/[0.06] bg-black/30 leading-relaxed text-[11px] text-zinc-300 whitespace-pre-wrap">
                            {selectedTask.description}
                          </p>
                        </div>

                        {/* Comprehensive CR History & Metadata */}
                        {(() => {
                          const brdDoc = taskDocs.find(d => d.docType === "BRD")
                          const screenshotUrl = selectedTask.screenshotUrl
                          const unitTestDocUrl = selectedTask.unitTestDocUrl
                          const showBranch = selectedTask.branchName && selectedTask.branchName !== "—"
                          const showBrd = !!brdDoc
                          const showScreenshot = !!screenshotUrl
                          const showUnitTest = !!unitTestDocUrl

                          const hasAnyMetadata = showBranch || showBrd || showScreenshot || showUnitTest

                          if (!hasAnyMetadata) return null

                          return (
                            <div className="space-y-3.5 border-t border-white/[0.08] pt-4 text-xs">
                              <span className="text-zinc-500 block font-bold uppercase tracking-wider text-[10px]">Pipeline History & Metadata</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Branch Name */}
                                {showBranch && (
                                  <div className="p-3 rounded-xl border border-white/[0.06] bg-black/40 space-y-1 text-left">
                                    <span className="text-zinc-500 text-[9px] uppercase tracking-wider block font-bold">Git Branch Name</span>
                                    <span className="font-mono text-zinc-300 select-all block truncate">{selectedTask.branchName}</span>
                                  </div>
                                )}

                                {/* BRD Document */}
                                {showBrd && brdDoc && (
                                  <div className="p-3 rounded-xl border border-white/[0.06] bg-black/40 flex justify-between items-center text-[11px] text-zinc-300">
                                    <div className="space-y-0.5 text-left truncate">
                                      <span className="text-zinc-500 text-[9px] uppercase tracking-wider block font-bold">BRD Document</span>
                                      <span className="truncate block font-semibold">{brdDoc.filename}</span>
                                    </div>
                                    <button
                                      onClick={() => downloadDocument(brdDoc.id, brdDoc.filename)}
                                      className="text-cyan-400 hover:text-cyan-300 hover:underline font-bold text-xs"
                                    >
                                      Get
                                    </button>
                                  </div>
                                )}

                                {/* Testing Document (Screenshot) */}
                                {showScreenshot && screenshotUrl && (
                                  <div className="p-3 rounded-xl border border-white/[0.06] bg-black/40 space-y-2 text-[11px] text-zinc-300 sm:col-span-2">
                                    <div className="text-left">
                                      <span className="text-zinc-500 text-[9px] uppercase tracking-wider block font-bold mb-1">Testing Document (Screenshot)</span>
                                      <span className="truncate block font-semibold mb-2">{selectedTask.screenshotName || "proof_of_testing.png"}</span>
                                      {(screenshotUrl.startsWith("data:image/") || screenshotUrl.startsWith("http")) ? (
                                        <div className="w-full max-h-32 rounded-lg overflow-hidden border border-white/10 bg-black/20 mb-2">
                                          <img src={screenshotUrl} alt="Screenshot Preview" className="w-full h-full object-contain" />
                                        </div>
                                      ) : null}
                                    </div>
                                    <div className="flex justify-end gap-2 text-xs">
                                      <button
                                        onClick={() => setDownloadTarget({ base64Data: screenshotUrl, defaultFileName: selectedTask.screenshotName || "proof_of_testing.png" })}
                                        className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline"
                                      >
                                        Download
                                      </button>
                                      <span className="text-white/20">|</span>
                                      <button
                                        onClick={() => {
                                          updateTask(selectedTask.id, { screenshotUrl: undefined, screenshotName: undefined }, "Removed proof of testing screenshot", user!)
                                            .then(updated => {
                                              setSelectedTask(updated)
                                              addToast("Screenshot removed successfully!", "info")
                                            })
                                        }}
                                        className="text-rose-400 hover:text-rose-300 font-bold hover:underline"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Unit Testing Document */}
                                {showUnitTest && unitTestDocUrl && (
                                  <div className="mt-2 flex items-center gap-2.5 p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] sm:col-span-2">
                                    {unitTestDocUrl.startsWith("data:image/") ? (
                                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/40">
                                        <img src={unitTestDocUrl} alt={selectedTask.unitTestDocName} className="w-full h-full object-cover" />
                                      </div>
                                    ) : (
                                      <div className="w-12 h-12 rounded-lg flex items-center justify-center border border-white/10 bg-black/40 text-lg shrink-0">
                                        📄
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0 text-left">
                                      <span className="block truncate font-mono text-slate-200 text-[11px]">{selectedTask.unitTestDocName}</span>
                                      <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider block mt-0.5">Unit Testing Document</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => setDownloadTarget({ base64Data: unitTestDocUrl, defaultFileName: selectedTask.unitTestDocName! })}
                                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-sky-400 transition-colors"
                                        title="Download"
                                      >
                                        <Download className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          updateTask(selectedTask.id, { unitTestDocUrl: undefined, unitTestDocName: undefined }, "Removed unit testing document", user!)
                                            .then(updated => {
                                              setSelectedTask(updated)
                                              addToast("Unit testing document removed successfully!", "info")
                                            })
                                        }}
                                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                                        title="Delete"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })()}

                        {/* Key Workflow Dates Grid */}
                        {(() => {
                          const devStart = selectedTask.devStartDate || getAuditDate(selectedTask.id, "IN_PROGRESS")
                          const sitComplete = selectedTask.sitDate || getAuditDate(selectedTask.id, "SIT_COMPLETED")
                          const uatComplete = selectedTask.testingCompletedDate || getAuditDate(selectedTask.id, "TESTING_COMPLETED")
                          const prodDeploy = selectedTask.productionDate || getAuditDate(selectedTask.id, "PROD_DEPLOYED")
                          const uatDeploy = selectedTask.uatDate || getAuditDate(selectedTask.id, "MOVE_TO_UAT")

                          const hasDevStart = devStart && devStart !== "—"
                          const hasSitComplete = sitComplete && sitComplete !== "—"
                          const hasUatComplete = uatComplete && uatComplete !== "—"
                          const hasProdDeploy = prodDeploy && prodDeploy !== "—"
                          const hasUatDeploy = uatDeploy && uatDeploy !== "—"

                          const hasAnyDate = hasDevStart || hasSitComplete || hasUatComplete || hasProdDeploy || hasUatDeploy

                          return hasAnyDate ? (
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-300">
                              {hasDevStart && (
                                <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04] text-left">
                                  <span className="text-zinc-500 block font-bold text-[9px] uppercase">Dev Start Date</span>
                                  <span className="font-semibold text-zinc-200">{devStart}</span>
                                </div>
                              )}
                              {hasSitComplete && (
                                <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04] text-left">
                                  <span className="text-zinc-500 block font-bold text-[9px] uppercase">SIT Completed</span>
                                  <span className="font-semibold text-zinc-200">{sitComplete}</span>
                                </div>
                              )}
                              {hasUatComplete && (
                                <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04] text-left">
                                  <span className="text-zinc-500 block font-bold text-[9px] uppercase">UAT Completed</span>
                                  <span className="font-semibold text-zinc-200">{uatComplete}</span>
                                </div>
                              )}
                              {hasProdDeploy && (
                                <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04] text-left">
                                  <span className="text-zinc-500 block font-bold text-[9px] uppercase">Prod Deployed</span>
                                  <span className="font-semibold text-zinc-200">{prodDeploy}</span>
                                </div>
                              )}
                              {hasUatDeploy && (
                                <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04] text-left col-span-2">
                                  <span className="text-zinc-500 block font-bold text-[9px] uppercase">UAT Deployed</span>
                                  <span className="font-semibold text-zinc-200">{uatDeploy}</span>
                                </div>
                              )}
                            </div>
                          ) : null
                        })()}

                        {(() => {
                          const uatDeploy = selectedTask.uatDate || getAuditDate(selectedTask.id, "MOVE_TO_UAT")
                          const hasUatDeploy = uatDeploy && uatDeploy !== "—"
                          const isUatOrLater = hasUatDeploy || ["MOVE_TO_UAT", "UAT_TESTING", "BUG_FOUND", "UAT_COMPLETED", "PROD_DEPLOYED", "CLOSED"].includes(selectedTask.status)

                          if (!isUatOrLater) return null

                          return (
                            <>
                              {/* Tester Details */}
                              {selectedTask.tester && selectedTask.tester.fullName && selectedTask.tester.fullName !== "Unassigned" && (
                                <div className="p-3 rounded-xl border border-white/[0.06] bg-black/40 space-y-1 text-[11px] text-zinc-300 text-left">
                                  <span className="text-zinc-500 text-[9px] uppercase tracking-wider block font-bold">Assigned Tester</span>
                                  <div className="flex justify-between items-center font-semibold">
                                    <span>{selectedTask.tester.fullName}</span>
                                    <span className="text-zinc-500 text-[10px]">{selectedTask.testingStartedDate ? `Started: ${new Date(selectedTask.testingStartedDate).toLocaleDateString()}` : ""}</span>
                                  </div>
                                </div>
                              )}

                              {/* Bugs Summary */}
                              {(() => {
                                const taskBugs = bugs.filter(b => b.crTaskId === selectedTask.id)
                                if (taskBugs.length === 0) return null
                                return (
                                  <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-1 text-left">
                                    <span className="text-muted-foreground text-[9px] uppercase tracking-wider block font-bold">Defect Audit Summary</span>
                                    <div className="space-y-1.5 mt-2">
                                      {taskBugs.map(b => (
                                        <div key={b.id} className="text-[10px] border-b border-border pb-1.5 last:border-0 last:pb-0">
                                          <div className="flex justify-between font-bold items-center">
                                            <button
                                              onClick={() => setSelectedCrBugId(b.id)}
                                              className="text-rose-500 font-mono hover:underline hover:text-rose-400 cursor-pointer transition-colors text-left"
                                              title="Click to view full bug details"
                                            >
                                              {b.jtrackId}
                                            </button>
                                            <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${b.status === "CLOSED" || b.status === "RESOLVED" ? "text-emerald-600 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"}`}>{b.status}</span>
                                          </div>
                                          <p className="text-muted-foreground mt-0.5 leading-relaxed font-semibold">{b.title}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )
                              })()}
                            </>
                          )
                        })()}

                        {/* Actions Form */}
                        <div className="space-y-3 pt-2 text-left">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Remarks for pipeline step</label>
                          <input
                            placeholder="e.g. Unit tests passing, pushing for review"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="h-10 w-full bg-[#0f0f11] border border-white/[0.10] focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none transition-all placeholder:text-zinc-655 font-semibold"
                          />
                        </div>
                      </div>

                      {/* Transition Actions footer */}
                      <div className="pt-4 border-t border-white/[0.08] space-y-2">
                        {selectedTask.status === "OPEN" && (
                          <Button
                            className="w-full text-xs h-10 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 border border-cyan-500/30 text-white font-bold"
                            onClick={() => handleUpdateStatus(selectedTask, "IN_PROGRESS")}
                          >
                            <Play className="mr-1.5 h-4 w-4" />
                            Start Development
                          </Button>
                        )}
                        {(selectedTask.status === "IN_PROGRESS" || selectedTask.status === "CHANGES_REQUESTED") && (
                          <Button
                            className="w-full text-xs h-10 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 border border-cyan-500/30 text-white font-bold"
                            onClick={() => handleUpdateStatus(selectedTask, "SIT_DEPLOYED")}
                          >
                            <CheckCircle className="mr-1.5 h-4 w-4 text-[#10b981]" />
                            Deploy to SIT
                          </Button>
                        )}
                        {selectedTask.status === "SIT_DEPLOYED" && (
                          <Button
                            className="w-full text-xs h-10 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 border border-cyan-500/30 text-white font-bold"
                            onClick={() => handleUpdateStatus(selectedTask, "SIT_COMPLETED")}
                          >
                            <CheckCircle className="mr-1.5 h-4 w-4 text-[#10b981]" />
                            Complete SIT
                          </Button>
                        )}
                        {selectedTask.status === "SIT_COMPLETED" && (
                          <Button
                            className="w-full text-xs h-10 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 border border-cyan-500/30 text-white font-bold"
                            onClick={() => handleOpenSubmitReview(selectedTask)}
                          >
                            <GitPullRequest className="mr-1.5 h-4 w-4 text-[#10b981]" />
                            Submit For Code Review
                          </Button>
                        )}
                        {selectedTask.status === "CODE_REVIEW" && (
                          <div className="p-3.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-center text-cyan-400 font-bold animate-pulse tracking-wide">
                            Code Review In Progress...
                          </div>
                        )}
                        {selectedTask.status === "CODE_REVIEW_DONE" && (
                          <Button
                            className="w-full text-xs h-10 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold"
                            onClick={() => handleUpdateStatus(selectedTask, "MOVE_TO_UAT")}
                          >
                            Push to UAT Pipeline
                          </Button>
                        )}
                        {selectedTask.status === "MOVE_TO_UAT" && (() => {
                          const hasDoc = selectedDocFiles.length > 0 || !!selectedTask.unitTestDocName
                          return (
                          <div className={`space-y-3 p-3.5 rounded-xl text-left border ${hasDoc ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${hasDoc ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                                Unit Test Documents
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30 uppercase tracking-wide">
                                Required
                              </span>
                            </div>

                            {/* Warning note when no doc */}
                            {!hasDoc && (
                              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <span className="text-amber-500 text-sm shrink-0">⚠️</span>
                                <p className="text-[10px] text-amber-600 dark:text-amber-300 leading-relaxed font-medium">
                                  You must upload unit testing document(s) before moving this CR to the UAT Testing Pool.
                                </p>
                              </div>
                            )}

                            <input
                              type="file"
                              accept="*"
                              multiple
                              onChange={handleUnitDocChange}
                              id="unit-test-input-drawer"
                              className="hidden"
                            />

                            {/* Uploaded files list */}
                            {selectedDocFiles.length > 0 ? (
                              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                  Attached Unit Test Files ({selectedDocFiles.length}):
                                </div>
                                {selectedDocFiles.map((docFile, idx) => (
                                  <div key={`${docFile.name}-${idx}`} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                                    {docFile.url.startsWith("data:image/") ? (
                                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-border shrink-0 bg-muted">
                                        <img src={docFile.url} alt={docFile.name} className="w-full h-full object-cover" />
                                      </div>
                                    ) : (
                                      <div className="w-12 h-12 rounded-lg flex items-center justify-center border border-border bg-muted text-lg shrink-0">
                                        📄
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0 text-left">
                                      <span className="block truncate font-mono text-foreground text-[11px]">{docFile.name}</span>
                                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider block mt-0.5">✓ Unit Testing Document</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeUnitDocFile(idx)}
                                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors shrink-0"
                                      title="Remove file"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => document.getElementById("unit-test-input-drawer")?.click()}
                                  className="w-full text-xs py-2 rounded-xl border border-dashed border-border bg-muted/40 hover:bg-muted text-foreground font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                                >
                                  📎 Attach More Files
                                </button>
                              </div>
                            ) : selectedTask.unitTestDocName ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-muted/50">
                                  <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-border bg-muted text-base shrink-0">📄</div>
                                  <div className="flex-1 min-w-0">
                                    <span className="block truncate font-mono text-foreground text-[11px]">{selectedTask.unitTestDocName}</span>
                                    <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider block mt-0.5">Previously uploaded document</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => document.getElementById("unit-test-input-drawer")?.click()}
                                  className="w-full flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl border border-dashed border-amber-400/50 bg-amber-500/[0.04] text-amber-600 dark:text-amber-400 font-semibold transition-all cursor-pointer"
                                >
                                  📎 Attach Additional Files
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => document.getElementById("unit-test-input-drawer")?.click()}
                                className="w-full flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border-2 border-dashed border-amber-400/50 bg-amber-500/[0.04] hover:bg-amber-500/10 hover:border-amber-400 text-amber-600 dark:text-amber-400 font-semibold transition-all cursor-pointer"
                              >
                                <span className="text-xl">📎</span>
                                <span className="text-xs">Click or drag to upload Unit Testing Document(s)</span>
                                <span className="text-[10px] text-amber-500/70">Select single or multiple files</span>
                              </button>
                            )}

                            <Button
                              className="w-full text-xs h-10 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                              disabled={selectedDocFiles.length === 0 && !selectedTask.unitTestDocName}
                              onClick={() => handlePushToUATTesting(selectedTask)}
                            >
                              <Send className="mr-1.5 h-4 w-4" />
                              {hasDoc ? "Move to UAT Testing Pool" : "Upload Document to Continue"}
                            </Button>
                          </div>
                          )
                        })()}
                        {selectedTask.status === "TESTING_POOL" && (
                          <div className="p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-center text-amber-400 font-bold tracking-wide">
                            In QA Testing Pool (Awaiting Tester Assignment)
                          </div>
                        )}
                        {(selectedTask.status === "TESTING_IN_PROGRESS" || selectedTask.status === "UAT_TESTING" || selectedTask.status === "SIT_TESTING" || selectedTask.status === "BUG_FOUND") && (
                          <div className="p-3.5 bg-violet-500/10 rounded-xl border border-violet-500/20 text-center text-violet-400 font-bold animate-pulse tracking-wide">
                            QA Verification / Testing In Progress {selectedTask.tester ? `(Tester: ${selectedTask.tester.fullName})` : ""}
                          </div>
                        )}
                        {(selectedTask.status === "TESTING_COMPLETED" || selectedTask.status === "UAT_COMPLETED" || selectedTask.status === "TESTING_DONE" || selectedTask.status === "UAT_TESTING_COMPLETED") && (
                          <Button
                            className="w-full text-xs h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold"
                            onClick={() => handleUpdateStatus(selectedTask, "PROD_DEPLOYED")}
                          >
                            <Send className="mr-1.5 h-4 w-4" />
                            Deploy to Production
                          </Button>
                        )}
                        {selectedTask.status === "PROD_DEPLOYED" && (
                          <Button
                            className="w-full text-xs h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold"
                            onClick={() => handleUpdateStatus(selectedTask, "CLOSED")}
                          >
                            <CheckCircle className="mr-1.5 h-4 w-4 text-emerald-400" />
                            Mark as Closed / Completed
                          </Button>
                        )}
                        {selectedTask.status === "CLOSED" && (
                          <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center text-emerald-400 font-bold tracking-wide flex items-center justify-center gap-1.5">
                            <CheckCircle className="h-4 w-4 text-emerald-400" /> CR Completed & Closed
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Dynamic Bug Details Modal Popup */}
              {selectedBug && (
                <BugDetailModal
                  bugId={selectedBug.id}
                  onClose={() => setSelectedBug(null)}
                  showDeveloperActions={true}
                />
              )}

              {/* Bug Detail Modal — opened by clicking bug ID in CR card popup */}
              {selectedCrBugId !== null && (
                <BugDetailModal
                  bugId={selectedCrBugId}
                  onClose={() => setSelectedCrBugId(null)}
                  showDeveloperActions
                />
              )}

              {/* Rejection Justification Modal Popup */}
              <AnimatePresence>
                {rejectingReviewId !== null && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      className="bg-[#161619] border border-white/[0.08] w-full max-w-md rounded-3xl p-6 space-y-4 text-xs text-zinc-300 shadow-2xl text-left"
                    >
                      <div className="flex justify-between items-center border-b border-[#242427] pb-3">
                        <h3 className="text-sm font-black text-zinc-200">Reject Bug Review Proposal</h3>
                        <button onClick={() => setRejectingReviewId(null)} className="text-zinc-500 hover:text-zinc-300 text-sm">✕</button>
                      </div>

                      <form onSubmit={handleRejectReviewSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Justification / Reason *</label>
                          <textarea
                            rows={3}
                            placeholder="Provide clear technical justification of why this is not a bug..."
                            value={rejectionJustification}
                            onChange={e => {
                              setRejectionJustification(e.target.value)
                              setRejectionFormError("")
                            }}
                            required
                            className="w-full bg-[#0f0f11] border border-white/[0.08] focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none"
                          />
                          {rejectionFormError && <p className="text-rose-400 text-[10px] mt-1">{rejectionFormError}</p>}
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Root Cause Details (optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. Configuration mismatch, user error, expected behavior"
                            value={rejectionRootCause}
                            onChange={e => setRejectionRootCause(e.target.value)}
                            className="h-9 w-full bg-[#0f0f11] border border-white/[0.08] focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Evidence Note (optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. Verified working in SIT environment, logs checked"
                            value={rejectionEvidence}
                            onChange={e => setRejectionEvidence(e.target.value)}
                            className="h-9 w-full bg-[#0f0f11] border border-white/[0.08] focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none"
                          />
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-[#242427]">
                          <Button
                            variant="secondary"
                            type="button"
                            onClick={() => setRejectingReviewId(null)}
                            className="h-9 px-4 rounded-xl border border-white/[0.08] text-slate-300 hover:bg-white/[0.06]"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
                          >
                            Confirm Rejection
                          </Button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.main>
      </div>

      {/* Code Review Submission Form Dialog */}
      <AnimatePresence>
        {isSubmitOpen && selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#161619] border border-white/[0.08] w-full max-w-md rounded-3xl p-6 space-y-4 text-xs text-zinc-300 shadow-2xl text-left"
            >
              <div className="flex justify-between items-center border-b border-[#242427] pb-3">
                <h3 className="text-sm font-black text-zinc-200">Submit Code Review (SIT Passed)</h3>
                <button onClick={() => setIsSubmitOpen(false)} className="text-zinc-500 hover:text-zinc-300 text-sm">✕</button>
              </div>

              <form onSubmit={handleSubmitForReview} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Git Repo URL</label>
                  <input
                    placeholder="https://github.com/enterprise/project"
                    value={gitRepo}
                    onChange={e => setGitRepo(e.target.value)}
                    required
                    className="h-10 w-full bg-[#0f0f11] border border-white/[0.08] focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Branch</label>
                    <input
                      placeholder="feature/stripe"
                      value={branchName}
                      onChange={e => setBranchName(e.target.value)}
                      required
                      className="h-10 w-full bg-[#0f0f11] border border-white/[0.08] focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Build Status</label>
                    <select
                      value={buildStatus}
                      onChange={e => setBuildStatus(e.target.value)}
                      className="h-10 bg-[#0f0f11] border border-white/[0.08] focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl px-3 w-full text-xs text-zinc-200 outline-none"
                    >
                      <option value="SUCCESS" className="bg-[#161619]">SUCCESS</option>
                      <option value="FAILED" className="bg-[#161619]">FAILED</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Deployment Notes</label>
                  <input
                    placeholder="Database schema change required..."
                    value={deployNotes}
                    onChange={e => setDeployNotes(e.target.value)}
                    className="h-10 w-full bg-[#0f0f11] border border-white/[0.08] focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Transition Remarks</label>
                  <input
                    placeholder="Provide developer submission remarks..."
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    required
                    className="h-10 w-full bg-[#0f0f11] border border-white/[0.12] focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-400 focus:outline-none font-medium"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-[#242427]">
                  <Button 
                    type="button" 
                    onClick={() => setIsSubmitOpen(false)}
                    className="h-9 rounded-xl px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 font-bold transition-colors"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="h-9 rounded-xl px-4 bg-emerald-500 text-zinc-950 font-black hover:bg-emerald-400 shadow-md transition-colors"
                  >
                    Submit Review Request
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Search command palette Modal */}
      <AnimatePresence>
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -20 }}
              className="bg-[#161619] border border-white/[0.08] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl text-left"
            >
              <div className="p-4 flex items-center space-x-3 border-b border-[#242427] bg-black/40">
                <Search className="h-4.5 w-4.5 text-sky-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Type to search CRs, bugs, sprints, docs, branches..."
                  value={searchVal}
                  onChange={e => setSearchVal(e.target.value)}
                  autoFocus
                  className="flex-1 bg-transparent text-sm font-semibold text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-400 focus:outline-none"
                />
                <button 
                  onClick={() => setSearchOpen(false)} 
                  className="text-slate-100 hover:text-white text-xs bg-slate-800 px-2 py-0.5 rounded border border-slate-600 font-mono font-bold transition-colors"
                >
                  ESC
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto p-4 space-y-4">
                {searchResults.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic text-center py-6">
                    {searchVal.trim() ? "No results matched your search term." : "Type a query (e.g. 'stripe', 'DT-101') to begin searching..."}
                  </p>
                ) : (
                  // Group search results
                  Object.entries(
                    searchResults.reduce((acc, curr) => {
                      acc[curr.category] = acc[curr.category] || []
                      acc[curr.category].push(curr)
                      return acc
                    }, {} as Record<string, typeof searchResults>)
                  ).map(([cat, items]) => (
                    <div key={cat} className="space-y-2 font-bold">
                      <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-wider text-left">{cat}</h4>
                      <div className="space-y-1">
                        {items.map(res => (
                          <div
                            key={res.id}
                            onClick={() => {
                              if (res.type === "Task") {
                                setSelectedTask(res.item)
                                setSelectedBug(null)
                              } else if (res.type === "Bug") {
                                setSelectedBug(res.item)
                                setSelectedTask(null)
                              }
                              setSearchOpen(false)
                              setSearchVal("")
                            }}
                            className="p-2.5 rounded-xl hover:bg-white/[0.04] flex items-center justify-between text-xs cursor-pointer text-left transition-colors"
                          >
                            <span className="font-semibold text-zinc-200 truncate">{res.title}</span>
                            <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-bold uppercase shrink-0">{res.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Personalization Options Modal */}
      <AnimatePresence>
        {personalizeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#161619] border border-white/[0.08] w-full max-w-sm rounded-3xl p-6 space-y-4 text-xs text-zinc-300 shadow-2xl text-left"
            >
              <div className="flex justify-between items-center border-b border-[#242427] pb-3">
                <h3 className="text-sm font-black text-zinc-200">Personalize Workspace</h3>
                <button onClick={() => setPersonalizeOpen(false)} className="text-zinc-500 hover:text-zinc-300">✕</button>
              </div>

              <div className="space-y-4">
                {/* Density Setting */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Layout Density</label>
                  <div className="flex bg-[#0f0f11] p-1 rounded-xl border border-white/[0.04] text-xs">
                    {["compact", "comfortable", "spacious"].map((d) => (
                      <button
                        key={d}
                        onClick={() => setLayoutDensity(d as any)}
                        className={`flex-1 py-1.5 rounded-lg font-bold transition-all capitalize ${
                          layoutDensity === d 
                            ? "bg-cyan-500/15 text-cyan-400"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle Widgets / Order */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Widget Visibility & Order</label>
                  <p className="text-[9px] text-zinc-500 mb-1 leading-normal">Toggle checkbox to show/hide, or click arrows to reorder.</p>
                  <div className="space-y-1 bg-[#0f0f11] p-2 rounded-2xl border border-white/[0.04] max-h-40 overflow-y-auto">
                    {layoutOrder.map((section, idx) => (
                      <div key={section} className="flex justify-between items-center p-2 hover:bg-white/[0.02] rounded-lg">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="checkbox"
                            checked={visibleLayouts.includes(section)}
                            onChange={() => {
                              setVisibleLayouts(prev => 
                                prev.includes(section)
                                  ? prev.filter(s => s !== section)
                                  : [...prev, section]
                              )
                            }}
                            className="rounded border-white/10 bg-[#0f0f11] text-cyan-500 focus:ring-cyan-500/30"
                          />
                          <span className="font-semibold text-zinc-300 capitalize">{section.replace(/([A-Z])/g, " $1")}</span>
                        </div>
                        <div className="flex space-x-1.5">
                          {idx > 0 && (
                            <button 
                              type="button"
                              onClick={() => {
                                const newOrder = [...layoutOrder]
                                const temp = newOrder[idx]
                                newOrder[idx] = newOrder[idx - 1]
                                newOrder[idx - 1] = temp
                                setLayoutOrder(newOrder)
                              }}
                              className="px-1.5 py-0.5 bg-zinc-800 rounded hover:bg-zinc-700 text-[9px] text-zinc-400 font-bold"
                            >
                              ▲
                            </button>
                          )}
                          {idx < layoutOrder.length - 1 && (
                            <button 
                              type="button"
                              onClick={() => {
                                const newOrder = [...layoutOrder]
                                const temp = newOrder[idx]
                                newOrder[idx] = newOrder[idx + 1]
                                newOrder[idx + 1] = temp
                                setLayoutOrder(newOrder)
                              }}
                              className="px-1.5 py-0.5 bg-zinc-800 rounded hover:bg-zinc-700 text-[9px] text-zinc-400 font-bold"
                            >
                              ▼
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-[#242427]">
                <Button 
                  onClick={() => setPersonalizeOpen(false)}
                  className="bg-cyan-500 text-black font-black hover:bg-cyan-400 h-8.5 rounded-xl text-xs px-4"
                >
                  Save Workspace Layout
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DevOps Deployment Modal — shown when developer submits CR for Code Review */}
      <DevOpsDeploymentModal
        open={devOpsModalOpen}
        crName={pendingSubmitReviewTask?.title?.replace(/^\[.*?\]\s*/, '') ?? ''}
        jtrackId={pendingSubmitReviewTask?.jtrackId ?? ''}
        developerName={user?.fullName ?? 'Developer'}
        onConfirm={handleDevOpsConfirm}
        onCancel={() => {
          setDevOpsModalOpen(false)
          setPendingSubmitReviewTask(null)
        }}
      />

    </div>
  )
}
