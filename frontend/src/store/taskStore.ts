import { create } from "zustand"
import type { Task, Bug, Comment, AuditLog, AppConfig, TestCase, User, Notification } from "@/services/mockData"
import { apiClient } from "@/utils/apiClient"

const mapBugReviews = (reviews: any[]) => {
  return (reviews || []).map(r => {
    let payload: any = {}
    try {
      payload = JSON.parse(r.proposedBugPayload || "{}")
    } catch (e) {
      console.error("Failed to parse proposed bug payload", e)
    }

    const latestRejection = r.rejections && r.rejections.length > 0
      ? r.rejections[r.rejections.length - 1]
      : null;

    return {
      ...r,
      status: r.reviewStatus,
      crTaskId: r.crId,
      raisedBy: r.raisedByTester,
      title: payload.title || "",
      description: payload.description || payload.reason || "",
      reason: payload.reason || "",
      stepsToReproduce: payload.stepsToReproduce || "",
      expectedResult: payload.expectedResult || "",
      actualResult: payload.actualResult || "",
      severity: payload.severity || "Medium",
      priority: payload.priority || "Medium",
      crJtrackId: payload.crJtrackId || "",
      justification: latestRejection?.justification || "",
      rejectionReason: latestRejection?.reason || "",
      evidenceNote: latestRejection?.evidenceNote || "",
    }
  })
}


export interface ToastMessage {
  id: string
  message: string
  type: "success" | "error" | "info"
}

export interface SprintTask {
  id: number
  taskCode: string
  title: string
  description: string
  sprintId: number | null
  storyPoints: number
  estimatedHours: number
  priority: string
  assignedDeveloperId: number | null
  assignedDeveloperName: string | null
  dueDate: string | null
  status: string
  completionRule: string
  linkedCrIds: number[]
  linkedCrs: { id: number; jtrackId: string; title: string; status: string; priority: string }[]
  createdBy: string
  createdDate: string
  modifiedBy: string
  modifiedDate: string
}

interface TaskState {
  tasks: Task[]
  bugs: Bug[]
  auditLogs: AuditLog[]
  comments: Comment[]
  configs: AppConfig[]
  testCases: TestCase[]
  users: User[]
  loading: boolean
  isFetching: boolean
  error: string | null
  searchQuery: string
  notifications: Notification[]
  toasts: ToastMessage[]
  downloadTarget: { base64Data: string; defaultFileName: string } | null
  bugReviews: any[]
  sprintTasks: SprintTask[]
  lastFetched?: number
  setDownloadTarget: (target: { base64Data: string; defaultFileName: string } | null) => void

  // Fetching
  fetchData: (force?: boolean) => Promise<void>
  fetchUsers: () => Promise<void>
  fetchSprintTasks: (sprintId?: number) => Promise<void>
  createSprintTask: (sprintTaskData: any) => Promise<SprintTask>
  updateSprintTask: (id: number, sprintTaskData: any) => Promise<SprintTask>
  completeSprintTask: (id: number) => Promise<SprintTask>
  linkSprintTasksToCR: (crId: number, sprintTaskIds: number[]) => Promise<void>
  getSprintDependencyGraph: (sprintId: number) => Promise<{ nodes: any[]; edges: any[] }>
  addDependency: (taskId: number, dependsOnTaskId: number, dependencyType: string) => Promise<void>
  deleteDependency: (taskId: number, dependsOnTaskId: number) => Promise<void>

  // Tasks (CR Management)
  createTask: (taskData: Omit<Task, "id" | "jtrackId" | "createdDate" | "updatedDate" | "isInPool">) => Promise<Task>
  updateTask: (taskId: number, taskData: Partial<Task>, remarks: string, changedBy: User) => Promise<Task>
  deleteTask: (taskId: number, remarks: string) => Promise<void>
  assignTester: (taskId: number) => Promise<Task>
  reassignTester: (taskId: number, newTesterUsername: string, reason: string) => Promise<Task>
  completeTesting: (taskId: number, comments: string, remarks: string) => Promise<Task>

  // Workflows (Approve / Reject transitions)
  approveTaskStep: (taskId: number, remarks: string, approver: User) => Promise<void>
  rejectTaskStep: (taskId: number, remarks: string, rejecter: User) => Promise<void>

  // Bugs
  createBug: (bugData: Omit<Bug, "id" | "jtrackId" | "createdDate" | "updatedDate" | "isInPool" | "artifacts"> & { artifacts?: { fileName: string; fileSize?: string; fileType?: string; fileData: string }[] }) => Promise<Bug>
  updateBug: (bugId: number, bugData: Partial<Bug>, remarks: string, changedBy: User) => Promise<Bug>
  resolveBug: (bugId: number, remarks: string, developer: User) => Promise<void>
  verifyBug: (bugId: number, remarks: string, tester: User) => Promise<void>
  closeBug: (bugId: number, remarks: string, tester: User) => Promise<void>
  fetchBugDetail: (bugId: number) => Promise<Bug>

  // Test Cases
  createTestCase: (testData: Omit<TestCase, "id" | "createdDate">) => Promise<TestCase>
  updateTestCaseStatus: (testId: number, status: "PASS" | "FAIL") => Promise<void>

  // Comments
  addComment: (entityType: "TASK" | "BUG", entityId: number, text: string, user: User) => Promise<Comment>


  fetchComments: (entityType: "TASK" | "BUG", entityId: number ) => Promise<Comment[]>

  // Configurations
  updateConfig: (key: string, value: string) => Promise<void>

  // Search query
  setSearchQuery: (query: string) => void

  // Users
  createUser: (userData: { fullName: string; email: string; role?: string; roles?: string[] }) => Promise<void>
  updateUserRoles: (userId: number, roles: string[]) => Promise<void>

  // Notifications
  addNotification: (userId: number, title: string, desc: string) => Promise<void>
  markNotificationRead: (id: number) => Promise<void>
  clearNotifications: (userId: number) => Promise<void>

  // Toasts
  addToast: (message: string, type?: "success" | "error" | "info") => void
  removeToast: (id: string) => void

  // Bug Reviews
  fetchBugReviews: (crId?: number) => Promise<void>
  proposeBugReview: (reviewData: any) => Promise<any>
  acceptBugReview: (reviewId: number) => Promise<any>
  rejectBugReview: (reviewId: number, dto: { justification: string, rootCause?: string, reason?: string, evidenceNote?: string }) => Promise<any>
  testerAcceptExplanation: (reviewId: number) => Promise<any>
  testerRaiseAgain: (reviewId: number) => Promise<any>
  testerChallenge: (reviewId: number) => Promise<any>
  adminAcceptRejection: (reviewId: number) => Promise<any>
  adminForceAccept: (reviewId: number) => Promise<any>
  submitFixSummary: (bugId: number, fixData: { rootCauseAnalysis: string, fixSummary: string, filesModified?: string, databaseChanges?: string, apiChanges?: string, additionalNotes?: string }) => Promise<any>
  fetchFixSummary: (bugId: number) => Promise<any>
  fetchTestedCrs: (params: any) => Promise<any>
  requestTestedCrsExport: (params: any) => Promise<any>
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  bugs: [],
  auditLogs: [],
  comments: [],
  configs: [],
  testCases: [],
  users: [],
  bugReviews: [],
  sprintTasks: [],
  loading: false,
  isFetching: false,
  error: null,
  searchQuery: "",
  notifications: [],
  toasts: [],
  downloadTarget: null,
  setDownloadTarget: (target) => set({ downloadTarget: target }),

  lastFetched: 0,
  fetchData: async (force = false) => {
    // Guard: skip if a fetch is already in-flight or fetched within last 10s unless forced
    const now = Date.now()
    const lastFetched = get().lastFetched || 0
    if (get().isFetching) return
    if (!force && lastFetched > 0 && now - lastFetched < 10000) return

    // ── Instant cold-start: load sessionStorage cache immediately ──────────
    // This eliminates the 8-10 second blank state on first login.
    const CACHE_KEY = "devtrack_core_cache"
    const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
    if (get().tasks.length === 0) {
      try {
        const cached = sessionStorage.getItem(CACHE_KEY)
        if (cached) {
          const { tasks, bugs, configs, users, timestamp } = JSON.parse(cached)
          const age = now - (timestamp || 0)
          if (tasks?.length > 0 && age < CACHE_TTL) {
            set({ tasks, bugs: bugs || [], configs: configs || [], users: users || [], loading: false })
          }
        }
      } catch { /* ignore cache read errors */ }
    }

    if (get().tasks.length === 0) {
      set({ loading: true })
    }
    set({ error: null, isFetching: true, lastFetched: now })

    const safeFetch = async (endpoint: string) => {
      try {
        return await apiClient(endpoint);
      } catch (e1) {
        // Retry once after 300ms if initial connection queue was busy
        try {
          await new Promise(r => setTimeout(r, 300));
          return await apiClient(endpoint);
        } catch (e2) {
          console.error(`Failed to fetch ${endpoint}:`, e2);
          return [];
        }
      }
    };

    try {
      // 1. Core Batch: Fetch critical data first so UI renders immediately
      // /api/tasks now returns paginated (page=0, size=100) by default — ~5x smaller payload
      const [tasksRes, bugsRes, configsRes, usersRes] = await Promise.all([
        safeFetch("/api/tasks?page=0&size=100"),
        safeFetch("/api/bugs"),
        safeFetch("/api/configs"),
        safeFetch("/api/users"),
      ]);

      // Unwrap paginated tasks response (Page<Task> has a 'content' field)
      const rawTasks = tasksRes && tasksRes.content ? tasksRes.content : (Array.isArray(tasksRes) ? tasksRes : []);

      const normalizedUsers = (usersRes || []).map((u: any) => ({
        ...u,
        roles: Array.isArray(u.roles) ? u.roles.map((r: string) => r.replace(/^ROLE_/, "")) : []
      }));

      // Immediately display core UI
      set({
        tasks: rawTasks,
        bugs: bugsRes || [],
        configs: configsRes || [],
        users: normalizedUsers,
        loading: false,
      });

      // ── Persist to sessionStorage cache (single write, no duplicate) ────────
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
          tasks: rawTasks,
          bugs: bugsRes || [],
          configs: configsRes || [],
          users: normalizedUsers,
          timestamp: Date.now()
        }))
      } catch { /* ignore quota errors */ }

      // 2. Secondary Batch: Supplementary metadata — notifications excluded
      //    (notifications handled exclusively by notificationStore via WebSocket + REST)
      const [auditRes, testCasesRes, bugReviewsRes, sprintTasksRes] = await Promise.all([
        safeFetch("/api/audit"),
        safeFetch("/api/test-cases"),
        safeFetch("/api/bug-reviews"),
        safeFetch("/api/sprint-tasks")
      ]);

      set({
        auditLogs: auditRes || [],
        testCases: testCasesRes || [],
        bugReviews: mapBugReviews(bugReviewsRes),
        sprintTasks: sprintTasksRes || [],
        isFetching: false
      });
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch database records", loading: false, isFetching: false })
    }
  },

  fetchUsers: async () => {
    // Lightweight fetch: only loads /api/users — for components that only need the users list
    // Skip if users are already loaded
    if (get().users.length > 0) return
    try {
      const usersRes = await apiClient("/api/users").catch(err => { console.error(err); return []; })
      const normalizedUsers = (usersRes || []).map((u: any) => ({
        ...u,
        roles: Array.isArray(u.roles) ? u.roles.map((r: string) => r.replace(/^ROLE_/, "")) : []
      }))
      set({ users: normalizedUsers })
    } catch (err: any) {
      console.error("Failed to fetch users:", err)
    }
  },

  createTask: async (taskData) => {
    const newTask: Task = await apiClient("/api/tasks", {
      method: "POST",
      body: JSON.stringify(taskData)
    })
    set(state => ({ tasks: [...state.tasks, newTask] }))

    if (newTask.assignedDeveloper) {
      await get().addNotification(
        newTask.assignedDeveloper.id,
        "New CR Assigned",
        `You have been assigned to CR ${newTask.jtrackId}: ${newTask.title}`
      ).catch(err => console.error("Notification failed:", err))
    }

    return newTask
  },

  updateTask: async (taskId, taskData, remarks, changedBy) => {
    const currentTask = get().tasks.find(t => t.id === taskId)
    const oldStatus = currentTask?.status
    const statusChanged = taskData.status !== undefined && oldStatus !== taskData.status

    // ── Optimistic UI: apply status change immediately ─────────────────────
    if (taskData.status && statusChanged) {
      set(state => ({
        tasks: state.tasks.map(t => t.id === taskId ? { ...t, ...taskData } : t)
      }))
    }

    let updatedTask: Task
    try {
      updatedTask = await apiClient(`/api/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify({ ...taskData, remarks, changedBy })
      })
    } catch (err: any) {
      // ── Rollback optimistic update on failure ──────────────────────────────
      if (taskData.status && statusChanged && currentTask) {
        set(state => ({
          tasks: state.tasks.map(t => t.id === taskId ? currentTask : t)
        }))
      }

      // Smart error toast based on HTTP status
      const status = err?.status || err?.response?.status || 0
      if (status === 409) {
        // Conflict: stale data — re-fetch to reconcile
        get().addToast(
          `⚠️ CR was updated by someone else. Refreshing to latest state...`,
          "info"
        )
        // Re-fetch this task to reconcile conflict
        apiClient(`/api/tasks/${taskId}`)
          .then(freshTask => {
            if (freshTask?.id) {
              set(state => ({ tasks: state.tasks.map(t => t.id === taskId ? freshTask : t) }))
            }
          })
          .catch(() => get().fetchData(true))
      } else if (status >= 500) {
        // Server error: show retry toast
        get().addToast(
          `❌ Server error while updating CR. Please retry the action.`,
          "error"
        )
      } else if (status === 403) {
        get().addToast(`🚫 You don't have permission to perform this action.`, "error")
      } else {
        get().addToast(
          `❌ Failed to update CR: ${err?.message || "Unexpected error"}`,
          "error"
        )
      }
      throw err
    }

    // Re-fetch the full task entity to preserve developers[] and all relations
    // The PUT response may omit nested collections; a fresh GET guarantees complete data
    let freshTask: Task = updatedTask
    try {
      const reFetched = await apiClient(`/api/tasks/${taskId}`)
      if (reFetched && reFetched.id) {
        freshTask = reFetched
      }
    } catch (err) {
      console.warn("Could not re-fetch task after update, using PUT response:", err)
    }

    // Safely preserve developers collection if empty in the update response
    const currentDevs = currentTask?.developers || []
    const updatedDevs = (freshTask.developers && freshTask.developers.length > 0)
      ? freshTask.developers
      : currentDevs

    const mergedTask: Task = {
      ...freshTask,
      developers: updatedDevs
    }

    set(state => ({
      tasks: state.tasks.map(t => t.id === taskId ? mergedTask : t)
    }))

    try {
      sessionStorage.removeItem("devtrack_core_cache")
    } catch {}

    // ── Fire-and-forget audit log refresh (non-blocking) ─────────────────────
    apiClient("/api/audit")
      .then(auditRes => set({ auditLogs: auditRes }))
      .catch(err => console.warn("Audit log refresh failed (non-critical):", err))

    if (statusChanged && updatedTask.status === "CODE_REVIEW") {
      const admins = get().users.filter(u => u.roles?.includes("DEVADMIN") || u.roles?.includes("CODEREVIEWER"))
      for (const admin of admins) {
        await get().addNotification(
          admin.id,
          "New Code Review Pending",
          `CR ${updatedTask.jtrackId} has been submitted for Code Review by ${changedBy.fullName}.`
        ).catch(err => console.error("Code review admin notification failed:", err))
      }
    }

    if (statusChanged && updatedTask.status === "CODE_REVIEW_DONE" && updatedTask.assignedDeveloper) {
      await get().addNotification(
        updatedTask.assignedDeveloper.id,
        "Code Review Approved",
        `Your Code Review for CR ${updatedTask.jtrackId} has been approved.`
      ).catch(err => console.error("Code review approved developer notification failed:", err))
    }

    const platformStatuses = ["MOVE_TO_UAT", "UAT_TESTING", "PROD_DEPLOYED"]
    if (statusChanged && updatedTask.status && platformStatuses.includes(updatedTask.status)) {
      const testers = get().users.filter(u => u.roles?.includes("TESTER") || u.roles?.includes("TESTADMIN"))
      for (const tester of testers) {
        await get().addNotification(
          tester.id,
          `CR Deployed to ${updatedTask.status}`,
          `CR ${updatedTask.jtrackId} has been moved/deployed to status: ${updatedTask.status}.`
        ).catch(err => console.error("Notification trigger failed for tester:", tester.id, err))
      }
    }

    return updatedTask
  },

  deleteTask: async (taskId, remarks) => {
    await apiClient(`/api/tasks/${taskId}?remarks=${encodeURIComponent(remarks)}`, {
      method: "DELETE"
    })
    set(state => ({ tasks: state.tasks.filter(t => t.id !== taskId) }))
  },

  assignTester: async (taskId) => {
    const updatedTask: Task = await apiClient(`/api/tasks/${taskId}/assign-tester`, {
      method: "POST"
    })
    set(state => ({
      tasks: state.tasks.map(t => t.id === taskId ? updatedTask : t)
    }))
    apiClient("/api/audit")
      .then(auditRes => set({ auditLogs: auditRes }))
      .catch(err => console.warn("Audit refresh after assignTester failed:", err))
    return updatedTask
  },

  reassignTester: async (taskId, newTesterUsername, reason) => {
    const updatedTask: Task = await apiClient(`/api/tasks/${taskId}/reassign-tester`, {
      method: "POST",
      body: JSON.stringify({ newTesterUsername, reason })
    })
    set(state => ({
      tasks: state.tasks.map(t => t.id === taskId ? updatedTask : t)
    }))
    apiClient("/api/audit")
      .then(auditRes => set({ auditLogs: auditRes }))
      .catch(err => console.warn("Audit refresh after reassignTester failed:", err))
    return updatedTask
  },

  completeTesting: async (taskId, comments, remarks) => {
    const updatedTask: Task = await apiClient(`/api/tasks/${taskId}/complete-testing`, {
      method: "POST",
      body: JSON.stringify({ comments, remarks })
    })
    set(state => ({
      tasks: state.tasks.map(t => t.id === taskId ? updatedTask : t)
    }))
    try {
      const auditRes = await apiClient("/api/audit")
      set({ auditLogs: auditRes })
    } catch (err) {
      console.error("Failed to update audit logs:", err)
    }
    return updatedTask
  },

  approveTaskStep: async (taskId, remarks, _approver) => {
    // Call dedicated backend approve endpoint which creates workflow_approve audit log
    const res = await apiClient(`/api/tasks/${taskId}/approve`, {
      method: "POST",
      body: JSON.stringify({ remarks })
    })

    // Refresh tasks and audit logs after approval in the background
    Promise.all([
      apiClient("/api/tasks?page=0&size=100"),
      apiClient("/api/audit")
    ]).then(([tasksRes, auditRes]) => {
      const rawTasks = tasksRes && tasksRes.content ? tasksRes.content : (Array.isArray(tasksRes) ? tasksRes : []);
      set({ tasks: rawTasks, auditLogs: auditRes })
    }).catch(err => {
      console.error("Failed to refresh data after approve:", err)
    })

    return res
  },

  rejectTaskStep: async (taskId, remarks, _rejecter) => {
    // Call dedicated backend reject endpoint which creates workflow_reject audit log
    const res = await apiClient(`/api/tasks/${taskId}/reject`, {
      method: "POST",
      body: JSON.stringify({ remarks })
    })

    // Refresh tasks and audit logs after rejection so "Sent Back By Admin" tag appears
    Promise.all([
      apiClient("/api/tasks?page=0&size=100"),
      apiClient("/api/audit")
    ]).then(([tasksRes, auditRes]) => {
      const rawTasks = tasksRes && tasksRes.content ? tasksRes.content : (Array.isArray(tasksRes) ? tasksRes : []);
      set({ tasks: rawTasks, auditLogs: auditRes })
    }).catch(err => {
      console.error("Failed to refresh data after reject:", err)
    })

    return res
  },

  createBug: async (bugData) => {
    const newBug: Bug = await apiClient("/api/bugs", {
      method: "POST",
      body: JSON.stringify(bugData)
    })
    // Refresh full bug list to ensure crTaskId and all DB fields are reflected
    try {
      const bugsRes = await apiClient("/api/bugs")
      set({ bugs: bugsRes })
    } catch {
      set(state => ({ bugs: [...state.bugs, newBug] }))
    }
    return newBug
  },

  fetchBugDetail: async (bugId) => {
    const bug: Bug = await apiClient(`/api/bugs/${bugId}`)
    return bug
  },

  updateBug: async (bugId, bugData, remarks, changedBy) => {
    const updatedBug: Bug = await apiClient(`/api/bugs/${bugId}`, {
      method: "PUT",
      body: JSON.stringify({ ...bugData, remarks, changedBy })
    })
    set(state => ({
      bugs: state.bugs.map(b => b.id === bugId ? updatedBug : b)
    }))

    // Fire-and-forget audit refresh (non-blocking)
    apiClient("/api/audit")
      .then(auditRes => set({ auditLogs: auditRes }))
      .catch(err => console.warn("Audit refresh after bug update failed:", err))

    return updatedBug
  },

  resolveBug: async (bugId, remarks, developer) => {
    await get().updateBug(bugId, { status: "RESOLVED" }, remarks || "Bug marked as resolved by developer.", developer)
  },

  verifyBug: async (bugId, remarks, tester) => {
    await get().updateBug(bugId, { status: "VERIFIED" }, remarks || "Bug verified by tester.", tester)
  },

  closeBug: async (bugId, remarks, tester) => {
    await get().updateBug(bugId, { status: "CLOSED" }, remarks || "Bug closed.", tester)
  },

  createTestCase: async (testData) => {
    const newCase: TestCase = await apiClient("/api/test-cases", {
      method: "POST",
      body: JSON.stringify(testData)
    })
    set(state => ({ testCases: [...state.testCases, newCase] }))
    return newCase
  },

  updateTestCaseStatus: async (testId, status) => {
    const updatedCase = await apiClient(`/api/test-cases/${testId}`, {
      method: "PUT",
      body: JSON.stringify({ status })
    })
    set(state => ({
      testCases: state.testCases.map(c => c.id === testId ? { ...c, status: updatedCase.status } : c)
    }))
  },

  addComment: async (entityType, entityId, text, user) => {
    const newComment: Comment = await apiClient("/api/comments", {
      method: "POST",
      body: JSON.stringify({ entityType, entityId, text, user })
    })
    set(state => ({ comments: [...state.comments, newComment] }))
    return newComment
  },


  fetchComments: async (entityType, entityId) => {
    const comments = await apiClient( `/api/comments/${entityType}/${entityId}`)
    set({ comments })
     return comments
  },


  updateConfig: async (key, value) => {
    const updatedConfig = await apiClient(`/api/configs/${key}`, {
      method: "PUT",
      body: JSON.stringify({ configValue: value })
    })
    set(state => ({
      configs: state.configs.map(c => c.configKey === key ? { ...c, configValue: updatedConfig.config_value } : c)
    }))
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  createUser: async (userData) => {
    await apiClient("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(userData)
    })
    const usersRes = await apiClient("/api/users").catch(err => { console.error(err); return []; })
    const normalizedUsers = (usersRes || []).map((u: any) => ({
      ...u,
      roles: Array.isArray(u.roles) ? u.roles.map((r: string) => r.replace(/^ROLE_/, "")) : []
    }))
    set({ users: normalizedUsers })
  },

  updateUserRoles: async (userId, roles) => {
    await apiClient(`/api/users/${userId}/roles`, {
      method: "PUT",
      body: JSON.stringify({ roles })
    })
    const usersRes = await apiClient("/api/users").catch(err => { console.error(err); return []; })
    const normalizedUsers = (usersRes || []).map((u: any) => ({
      ...u,
      roles: Array.isArray(u.roles) ? u.roles.map((r: string) => r.replace(/^ROLE_/, "")) : []
    }))
    set({ users: normalizedUsers })
  },

  addNotification: async (userId, title, desc) => {
    const newNotif: Notification = await apiClient("/api/notifications", {
      method: "POST",
      body: JSON.stringify({ userId, title, desc })
    })
    set(state => ({ notifications: [...state.notifications, newNotif] }))
  },

  markNotificationRead: async (id) => {
    await apiClient(`/api/notifications/read/${id}`, {
      method: "PUT"
    })
    set(state => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, unread: false } : n)
    }))
  },

  clearNotifications: async (userId) => {
    await apiClient(`/api/notifications/clear/${userId}`, {
      method: "DELETE"
    })
    set(state => ({
      notifications: state.notifications.filter(n => n.userId !== userId)
    }))
  },

  // Toast System
  addToast: (message, type = "success") => {
    const id = Math.random().toString(36).substring(2, 9)
    set(state => ({ toasts: [...state.toasts, { id, message, type }] }))
    setTimeout(() => {
      get().removeToast(id)
    }, 4000)
  },

  removeToast: (id) => {
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }))
  },

  // Bug Reviews & Developer Fix Summary Actions
  fetchBugReviews: async (crId) => {
    try {
      const url = crId ? `/api/bug-reviews/cr/${crId}` : "/api/bug-reviews"
      const res = await apiClient(url)
      set({ bugReviews: mapBugReviews(res) })
    } catch (err) {
      console.error("Failed to fetch bug reviews:", err)
    }
  },

  proposeBugReview: async (reviewData) => {
    const res = await apiClient("/api/bug-reviews", {
      method: "POST",
      body: JSON.stringify(reviewData)
    })
    
    // Background refresh
    apiClient("/api/tasks")
      .then(tasksRes => {
        set({ tasks: tasksRes })
        if (reviewData.crTaskId) {
          return apiClient(`/api/bug-reviews/cr/${reviewData.crTaskId}`)
        }
      })
      .then(revs => {
        if (revs) set({ bugReviews: mapBugReviews(revs) })
      })
      .catch(err => {
        console.error("Failed to refresh tasks after proposing bug review:", err)
      })

    return res;
  },

  acceptBugReview: async (reviewId) => {
    const res = await apiClient(`/api/bug-reviews/${reviewId}/accept`, {
      method: "POST"
    })
    
    // Background refresh
    Promise.all([
      apiClient("/api/tasks"),
      apiClient("/api/bugs")
    ]).then(([tasksRes, bugsRes]) => {
      set({ tasks: tasksRes, bugs: bugsRes })
      if (res.bugTask && res.bugTask.id) {
        return apiClient(`/api/bug-reviews/cr/${res.bugTask.id}`)
      }
    }).then(revs => {
      if (revs) set({ bugReviews: mapBugReviews(revs) })
    }).catch(err => {
      console.error("Failed to refresh tasks after accepting bug review:", err)
    })

    return res;
  },

  rejectBugReview: async (reviewId, dto) => {
    const res = await apiClient(`/api/bug-reviews/${reviewId}/reject`, {
      method: "POST",
      body: JSON.stringify(dto)
    })
    
    // Background refresh
    apiClient("/api/tasks")
      .then(tasksRes => {
        set({ tasks: tasksRes })
        if (res.crId) {
          return apiClient(`/api/bug-reviews/cr/${res.crId}`)
        }
      })
      .then(revs => {
        if (revs) set({ bugReviews: mapBugReviews(revs) })
      })
      .catch(err => {
        console.error("Failed to refresh after rejecting bug review:", err)
      })

    return res;
  },

  testerAcceptExplanation: async (reviewId) => {
    const res = await apiClient(`/api/bug-reviews/${reviewId}/tester-accept`, {
      method: "POST"
    })
    
    // Background refresh
    apiClient("/api/tasks")
      .then(tasksRes => {
        set({ tasks: tasksRes })
        if (res.crId) {
          return apiClient(`/api/bug-reviews/cr/${res.crId}`)
        }
      })
      .then(revs => {
        if (revs) set({ bugReviews: mapBugReviews(revs) })
      })
      .catch(err => {
        console.error("Failed to refresh after tester accepting explanation:", err)
      })

    return res;
  },

  testerRaiseAgain: async (reviewId) => {
    const res = await apiClient(`/api/bug-reviews/${reviewId}/raise-again`, {
      method: "POST"
    })
    
    // Background refresh
    apiClient("/api/tasks")
      .then(tasksRes => {
        set({ tasks: tasksRes })
        if (res.crId) {
          return apiClient(`/api/bug-reviews/cr/${res.crId}`)
        }
      })
      .then(revs => {
        if (revs) set({ bugReviews: mapBugReviews(revs) })
      })
      .catch(err => {
        console.error("Failed to refresh after raising bug review again:", err)
      })

    return res;
  },

  testerChallenge: async (reviewId) => {
    const res = await apiClient(`/api/bug-reviews/${reviewId}/challenge`, {
      method: "POST"
    })
    
    // Background refresh
    apiClient("/api/tasks")
      .then(tasksRes => {
        set({ tasks: tasksRes })
        if (res.crId) {
          return apiClient(`/api/bug-reviews/cr/${res.crId}`)
        }
      })
      .then(revs => {
        if (revs) set({ bugReviews: mapBugReviews(revs) })
      })
      .catch(err => {
        console.error("Failed to refresh after challenging bug review rejection:", err)
      })

    return res;
  },

  adminAcceptRejection: async (reviewId) => {
    const res = await apiClient(`/api/bug-reviews/${reviewId}/admin-accept`, {
      method: "POST"
    })
    
    // Background refresh
    apiClient("/api/tasks")
      .then(tasksRes => {
        set({ tasks: tasksRes })
        if (res.crId) {
          return apiClient(`/api/bug-reviews/cr/${res.crId}`)
        }
      })
      .then(revs => {
        if (revs) set({ bugReviews: mapBugReviews(revs) })
      })
      .catch(err => {
        console.error("Failed to refresh after admin accepting rejection:", err)
      })

    return res;
  },

  adminForceAccept: async (reviewId) => {
    const res = await apiClient(`/api/bug-reviews/${reviewId}/admin-force`, {
      method: "POST"
    })
    
    // Background refresh
    Promise.all([
      apiClient("/api/tasks"),
      apiClient("/api/bugs")
    ]).then(([tasksRes, bugsRes]) => {
      set({ tasks: tasksRes, bugs: bugsRes })
      if (res.bugTask && res.bugTask.id) {
        return apiClient(`/api/bug-reviews/cr/${res.bugTask.id}`)
      }
    }).then(revs => {
      if (revs) set({ bugReviews: mapBugReviews(revs) })
    }).catch(err => {
      console.error("Failed to refresh after admin forcing bug accept:", err)
    })

    return res;
  },

  submitFixSummary: async (bugId, fixData) => {
    const res = await apiClient(`/api/bugs/${bugId}/fix-summary`, {
      method: "POST",
      body: JSON.stringify(fixData)
    })
    return res;
  },

  fetchFixSummary: async (bugId) => {
    const res = await apiClient(`/api/bugs/${bugId}/fix-summary`)
    return res;
  },

  fetchSprintTasks: async (sprintId) => {
    let url = "/api/sprint-tasks"
    if (sprintId !== undefined && sprintId !== null) {
      url += `?sprintId=${sprintId}`
    }
    const res = await apiClient(url)
    set({ sprintTasks: res || [] })
  },

  createSprintTask: async (sprintTaskData) => {
    const res = await apiClient("/api/sprint-tasks", {
      method: "POST",
      body: JSON.stringify(sprintTaskData)
    })
    set(state => ({ sprintTasks: [...state.sprintTasks, res] }))
    return res
  },

  updateSprintTask: async (id, sprintTaskData) => {
    const res = await apiClient(`/api/sprint-tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(sprintTaskData)
    })
    set(state => ({ sprintTasks: state.sprintTasks.map(t => t.id === id ? res : t) }))
    return res
  },

  completeSprintTask: async (id) => {
    const res = await apiClient(`/api/sprint-tasks/${id}/complete`, {
      method: "POST"
    })
    set(state => ({ sprintTasks: state.sprintTasks.map(t => t.id === id ? res : t) }))
    return res
  },

  linkSprintTasksToCR: async (crId, sprintTaskIds) => {
    await apiClient(`/api/crs/${crId}/link-sprint-tasks`, {
      method: "POST",
      body: JSON.stringify(sprintTaskIds)
    })
    const tasksRes = await apiClient("/api/tasks")
    set({ tasks: tasksRes })
  },

  getSprintDependencyGraph: async (sprintId) => {
    const res = await apiClient(`/api/sprints/${sprintId}/task-dependency-graph`)
    return res
  },

  addDependency: async (taskId, dependsOnTaskId, dependencyType) => {
    await apiClient(`/api/sprint-tasks/${taskId}/dependencies`, {
      method: "POST",
      body: JSON.stringify({ dependsOnTaskId, dependencyType })
    })
  },

  deleteDependency: async (taskId, dependsOnTaskId) => {
    await apiClient(`/api/sprint-tasks/${taskId}/dependencies?dependsOnTaskId=${dependsOnTaskId}`, {
      method: "DELETE"
    })
  },

  fetchTestedCrs: async (params) => {
    const q = new URLSearchParams()
    if (params.page !== undefined) q.set("page", params.page.toString())
    if (params.size !== undefined) q.set("size", params.size.toString())
    if (params.sort !== undefined) q.set("sort", params.sort)
    if (params.search !== undefined && params.search) q.set("search", params.search)
    if (params.project !== undefined && params.project) q.set("project", params.project)
    if (params.sprintId !== undefined && params.sprintId) q.set("sprintId", params.sprintId.toString())
    if (params.priority !== undefined && params.priority) q.set("priority", params.priority)
    if (params.status !== undefined && params.status) q.set("status", params.status)
    if (params.startDate !== undefined && params.startDate) q.set("startDate", params.startDate)
    if (params.endDate !== undefined && params.endDate) q.set("endDate", params.endDate)

    const res = await apiClient(`/api/tester-workspace/tested-crs?${q.toString()}`)
    return res
  },

  requestTestedCrsExport: async (params) => {
    const q = new URLSearchParams()
    if (params.search !== undefined && params.search) q.set("search", params.search)
    if (params.project !== undefined && params.project) q.set("project", params.project)
    if (params.sprintId !== undefined && params.sprintId) q.set("sprintId", params.sprintId.toString())
    if (params.priority !== undefined && params.priority) q.set("priority", params.priority)
    if (params.status !== undefined && params.status) q.set("status", params.status)
    if (params.startDate !== undefined && params.startDate) q.set("startDate", params.startDate)
    if (params.endDate !== undefined && params.endDate) q.set("endDate", params.endDate)

    const res = await apiClient(`/api/tester-workspace/tested-crs/export?${q.toString()}`, {
      method: "POST"
    })
    return res
  }
}))
