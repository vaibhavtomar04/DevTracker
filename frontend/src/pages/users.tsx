import { useEffect, useState } from "react"
import { useTaskStore } from "@/store/taskStore"
import { useAuthStore } from "@/store/authStore"
import { Input } from "@/components/ui/input"
import {
  Mail,
  Plus,
  X,
  UserPlus,
  Users,
  Search,
  Ban,
  Unlock,
  UserCheck,
  UserX,
  History,
  Loader2,
  Shield,
  Check,
} from "lucide-react"
import type { User } from "@/services/mockData"
import { motion, AnimatePresence } from "framer-motion"
import { apiClient } from "@/utils/apiClient"

const ALL_AVAILABLE_ROLES = [
  { id: "DEVELOPER", label: "Developer", desc: "Code implementation & SIT deployment" },
  { id: "TESTER", label: "Tester", desc: "QA testing & defect reporting" },
  { id: "DEVADMIN", label: "Dev Admin", desc: "Full administrative access & approvals" },
  { id: "TESTADMIN", label: "Test Admin", desc: "Testing lead & quality oversight" },
  { id: "CODEREVIEWER", label: "Code Reviewer", desc: "Reviewing & approving code reviews" },
]

/* ─── design tokens ─── */
const glass =
  "rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md"

/* ─── Role badge color mapping ─── */
function rolePill(role: string) {
  const map: Record<string, string> = {
    DEVADMIN: "bg-violet-500/15 text-violet-300 border-violet-500/20",
    TESTADMIN: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
    DEVELOPER: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
    TESTER: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
    CODEREVIEWER: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  }
  return map[role] ?? "bg-slate-500/15 text-slate-300 border-slate-500/20"
}

/* ─── Status badge color mapping ─── */
function statusPill(status: string) {
  const map: Record<string, string> = {
    ACTIVE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
    BLOCKED: "bg-rose-500/15 text-rose-300 border-rose-500/20",
    DEACTIVATED: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  }
  return map[status] ?? "bg-slate-500/15 text-slate-300 border-slate-500/20"
}

/* ─── Avatar gradient by first letter ─── */
const avatarGrads = [
  "from-violet-600 to-indigo-600",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
]
function avatarGrad(name: string) {
  return avatarGrads[name.charCodeAt(0) % avatarGrads.length]
}

interface StatusAudit {
  id: number
  userId: number
  action: string
  performedBy: string
  performedOn: string
  reason: string
}

export default function UsersPage() {
  const { fetchData, users, createUser, updateUserRoles, addToast } = useTaskStore()
  const { user: currentUser } = useAuthStore()

  const [usersList, setUsersList] = useState<User[]>([])
  const [search, setSearch] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  /* status changes modals state */
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [statusAction, setStatusAction] = useState<"BLOCKED" | "ACTIVE" | "DEACTIVATED" | null>(null)
  const [statusReason, setStatusReason] = useState("")
  
  /* audit history modal state */
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyUser, setHistoryUser] = useState<User | null>(null)
  const [auditList, setAuditList] = useState<StatusAudit[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  /* edit roles modal state */
  const [editRolesUser, setEditRolesUser] = useState<User | null>(null)
  const [editUserSelectedRoles, setEditUserSelectedRoles] = useState<string[]>([])

  /* form state */
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["DEVELOPER"])

  /* auto-generate username preview from full name */
  const autoUsername = fullName.trim()
    ? fullName.trim().toLowerCase().split(/\s+/).join('.')
    : ""

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    setUsersList(users)
  }, [users])

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !email) {
      addToast("Full name and email are mandatory.", "error")
      return
    }
    if (selectedRoles.length === 0) {
      addToast("At least one role must be selected.", "error")
      return
    }
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      addToast("Email is already registered.", "error")
      return
    }

    createUser({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      roles: selectedRoles,
      role: selectedRoles[0],
    })
      .then(() => {
        setFullName("")
        setEmail("")
        setSelectedRoles(["DEVELOPER"])
        setIsCreateOpen(false)
        addToast(`User created! Credentials emailed to ${email}.`, "success")
      })
      .catch((err: Error) => {
        addToast(err.message || "Failed to create user.", "error")
      })
  }

  const handleUpdateRolesSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editRolesUser) return
    if (editUserSelectedRoles.length === 0) {
      addToast("At least one role must be selected.", "error")
      return
    }

    updateUserRoles(editRolesUser.id, editUserSelectedRoles)
      .then(() => {
        addToast(`Roles successfully updated for @${editRolesUser.username}!`, "success")
        setEditRolesUser(null)
        setEditUserSelectedRoles([])
      })
      .catch((err: Error) => {
        addToast(err.message || "Failed to update user roles.", "error")
      })
  }

  const handleStatusChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !statusAction || !statusReason.trim()) {
      addToast("A reason must be provided.", "error")
      return
    }

    apiClient(`/api/users/${selectedUser.id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: statusAction, reason: statusReason.trim() })
    })
      .then(() => {
        addToast(`User status successfully updated to ${statusAction}!`, "success")
        setSelectedUser(null)
        setStatusAction(null)
        setStatusReason("")
        fetchData() // Refetch user directory
      })
      .catch((err: Error) => {
        addToast(err.message || "Failed to update user status.", "error")
      })
  }

  const fetchAuditHistory = (user: User) => {
    setHistoryUser(user)
    setLoadingHistory(true)
    setIsHistoryOpen(true)
    apiClient(`/api/users/${user.id}/status-audit`)
      .then((data) => {
        setAuditList(data)
        setLoadingHistory(false)
      })
      .catch((err) => {
        addToast(err.message || "Failed to fetch status logs.", "error")
        setLoadingHistory(false)
      })
  }

  const isAdmin = currentUser?.roles?.includes("DEVADMIN")

  const filtered = usersList.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-400">
            <Users className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-800 dark:text-transparent dark:bg-gradient-to-r dark:from-white dark:via-slate-200 dark:to-slate-400 dark:bg-clip-text flex items-center gap-2">
              User Directory
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-violet-500/20 bg-violet-500/[0.08] text-violet-300 font-bold ml-1 normal-case tracking-normal">
                {usersList.length} members
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage organization members, verify roles, restrict account status, and audit security permissions.
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_16px_rgba(139,92,246,0.35)] hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create User
          </button>
        )}
      </motion.div>

      {/* ── Search bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="relative"
      >
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          placeholder="Search by name, username, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-4 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-foreground placeholder:text-slate-500 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
        />
      </motion.div>

      {/* ── User Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.45 }}
        className={`${glass} overflow-hidden`}
      >
        {/* Table header row */}
        <div className="border-b border-white/[0.06] bg-white/[0.02]">
          <div className="grid grid-cols-12 gap-4 px-5 py-3">
            <span className="col-span-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Member
            </span>
            <span className="col-span-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Email
            </span>
            <span className="col-span-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Roles
            </span>
            <span className="col-span-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Status
            </span>
            <span className="col-span-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">
              Actions
            </span>
          </div>
        </div>

        {/* Table rows */}
        <div>
          <AnimatePresence>
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-muted-foreground/40 gap-2"
              >
                <Users className="h-8 w-8" />
                <p className="text-sm">No users found</p>
              </motion.div>
            ) : (
              filtered.map((u, idx) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="grid grid-cols-12 gap-4 px-5 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors items-center"
                >
                  {/* Member */}
                  <div className="col-span-3 flex items-center gap-3 min-w-0">
                    <div
                      className={`h-9 w-9 rounded-xl bg-gradient-to-br ${avatarGrad(u.fullName)} flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-sm`}
                    >
                      {u.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="block font-semibold text-sm text-foreground truncate">
                        {u.fullName}
                      </span>
                      <span className="block text-[10px] text-muted-foreground font-mono">
                        @{u.username}
                      </span>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                    <span className="truncate">{u.email}</span>
                  </div>

                  {/* Roles */}
                  <div className="col-span-2 flex flex-wrap gap-1.5 items-center">
                    {(u.roles || []).map((r) => (
                      <span
                        key={r}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold border tracking-wide uppercase ${rolePill(r)}`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold border tracking-wide uppercase ${statusPill((u.status || "ACTIVE").toUpperCase())}`}
                    >
                      {(u.status || "ACTIVE").toUpperCase()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-3 flex justify-end gap-2 items-center">
                    {/* View history log always accessible to admins */}
                    <button
                      onClick={() => fetchAuditHistory(u)}
                      title="View Audit Trail"
                      className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                    >
                      <History className="h-4 w-4" />
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setEditRolesUser(u);
                          setEditUserSelectedRoles(u.roles || []);
                        }}
                        title="Edit User Roles"
                        className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-violet-400 transition-colors cursor-pointer"
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                    )}

                    {isAdmin && String(u.id) !== String(currentUser?.id) && (
                      <>
                        {(u.status || "ACTIVE").toUpperCase() === "BLOCKED" ? (
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setStatusAction("ACTIVE");
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer"
                          >
                            <Unlock className="h-3 w-3" />
                            Unblock
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setStatusAction("BLOCKED");
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-all cursor-pointer"
                          >
                            <Ban className="h-3 w-3" />
                            Block
                          </button>
                        )}

                        {(u.status || "ACTIVE").toUpperCase() === "DEACTIVATED" ? (
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setStatusAction("ACTIVE");
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer"
                          >
                            <UserCheck className="h-3 w-3" />
                            Activate
                          </button>
                        ) : (
                          (u.status || "ACTIVE").toUpperCase() !== "BLOCKED" && (
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setStatusAction("DEACTIVATED");
                              }}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer"
                            >
                              <UserX className="h-3 w-3" />
                              Deactivate
                            </button>
                          )
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Create User Modal ── */}
      <AnimatePresence>
        {isCreateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className={`${glass} w-full max-w-md shadow-2xl p-6 space-y-5`}
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-[0_0_14px_rgba(139,92,246,0.4)]">
                    <UserPlus className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Create New Workspace User</h3>
                    <p className="text-[10px] text-muted-foreground">Fill in the user details below</p>
                  </div>
                </div>
                <button
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground transition-colors cursor-pointer"
                  onClick={() => setIsCreateOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Full Name
                  </label>
                  <Input
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                {/* Auto-generated username preview */}
                {autoUsername && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Auto-Generated Username
                    </label>
                    <div className="h-9 flex items-center px-3 rounded-xl bg-violet-500/[0.06] border border-violet-500/20 text-sm text-violet-300 font-mono">
                      @{autoUsername}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="jane@devtracker.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Assigned Roles (Select One or Multiple)
                  </label>
                  <div className="grid grid-cols-1 gap-2 bg-[#0b0e1a] border border-white/[0.12] rounded-xl p-3 max-h-48 overflow-y-auto">
                    {ALL_AVAILABLE_ROLES.map((r) => {
                      const isChecked = selectedRoles.includes(r.id)
                      return (
                        <label
                          key={r.id}
                          className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${
                            isChecked ? "bg-violet-500/15 border border-violet-500/30 text-violet-200" : "hover:bg-white/5 text-slate-400"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRoles([...selectedRoles, r.id])
                              } else {
                                setSelectedRoles(selectedRoles.filter((id) => id !== r.id))
                              }
                            }}
                            className="mt-0.5 rounded border-white/20 text-violet-600 focus:ring-violet-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-200 block">{r.label} ({r.id})</span>
                            <span className="text-[10px] text-slate-400 block leading-tight">{r.desc}</span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Info note */}
                <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20">
                  <Mail className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-emerald-300/80 leading-relaxed">
                    A <strong>secure temporary password</strong> will be auto-generated and emailed directly to the user. They will be required to set a new password on first login.
                  </p>
                </div>

                <div className="flex gap-3 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-white/[0.08] text-muted-foreground hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 transition-opacity shadow-[0_0_16px_rgba(139,92,246,0.3)] cursor-pointer"
                  >
                    Create Member
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Status Change Reason Modal ── */}
      <AnimatePresence>
        {selectedUser && statusAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className={`${glass} w-full max-w-md shadow-2xl p-6 space-y-4`}
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-white ${
                    statusAction === "BLOCKED" ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]" :
                    statusAction === "DEACTIVATED" ? "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]" :
                    "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                  }`}>
                    {statusAction === "BLOCKED" ? <Ban className="h-4 w-4" /> :
                     statusAction === "DEACTIVATED" ? <UserX className="h-4 w-4" /> :
                     <UserCheck className="h-4 w-4" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Confirm Account Update</h3>
                    <p className="text-[10px] text-muted-foreground">Updating @{selectedUser.username} to {statusAction}</p>
                  </div>
                </div>
                <button
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedUser(null);
                    setStatusAction(null);
                    setStatusReason("");
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleStatusChangeSubmit} className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  You are about to change the status of <strong>{selectedUser.fullName}</strong> to <span className="font-bold text-violet-400">{statusAction}</span>.
                  {statusAction === "BLOCKED" && " The user will be logged out of all active sessions and blocked from signing in."}
                  {statusAction === "DEACTIVATED" && " The user will be logged out and disabled from accessing workspace tools."}
                </p>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Reason for Status Change
                  </label>
                  <textarea
                    placeholder="Provide a detailed reason for security audit trails..."
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    required
                    rows={3}
                    className="w-full bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 rounded-xl p-3 text-xs text-slate-200 focus:outline-none transition-all placeholder:text-slate-500 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setStatusAction(null);
                      setStatusReason("");
                    }}
                    className="flex-1 py-2 text-xs font-semibold rounded-xl border border-white/[0.08] text-muted-foreground hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 py-2 text-xs font-bold rounded-xl text-white hover:opacity-90 transition-opacity cursor-pointer ${
                      statusAction === "BLOCKED" ? "bg-red-500 hover:bg-red-600" :
                      statusAction === "DEACTIVATED" ? "bg-amber-500 hover:bg-amber-600" :
                      "bg-emerald-500 hover:bg-emerald-600"
                    }`}
                  >
                    Update Account
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Status Audit Trail / History Modal ── */}
      <AnimatePresence>
        {isHistoryOpen && historyUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className={`${glass} w-full max-w-2xl shadow-2xl p-6 space-y-4`}
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                    <History className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Status Audit Trail</h3>
                    <p className="text-[10px] text-muted-foreground">Historical security actions for @{historyUser.username}</p>
                  </div>
                </div>
                <button
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground transition-colors cursor-pointer"
                  onClick={() => {
                    setIsHistoryOpen(false);
                    setHistoryUser(null);
                    setAuditList([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[350px] overflow-y-auto pr-1">
                {loadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                    <p className="text-xs">Loading historical audit records...</p>
                  </div>
                ) : auditList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/45 gap-2">
                    <History className="h-7 w-7" />
                    <p className="text-xs">No status updates logged for this user.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auditList.map((log) => (
                      <div
                        key={log.id}
                        className="p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.02] transition-colors text-xs flex flex-col sm:flex-row justify-between items-start gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold border uppercase ${
                              log.action === "BLOCKED" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                              log.action === "DEACTIVATED" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            }`}>
                              {log.action}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              by @{log.performedBy}
                            </span>
                          </div>
                          <p className="text-slate-200 mt-1 italic leading-relaxed">
                            "{log.reason}"
                          </p>
                        </div>
                        <div className="text-[10px] text-slate-500 whitespace-nowrap align-self-end sm:align-self-start font-mono">
                          {new Date(log.performedOn).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/[0.06] text-right">
                <button
                  onClick={() => {
                    setIsHistoryOpen(false);
                    setHistoryUser(null);
                    setAuditList([]);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-white/[0.08] text-muted-foreground hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  Close Audit logs
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      {/* ── Edit User Roles Modal ── */}
      <AnimatePresence>
        {editRolesUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className={`${glass} w-full max-w-md shadow-2xl p-6 space-y-4`}
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Manage User Roles</h3>
                    <p className="text-[10px] text-muted-foreground">Updating roles for @{editRolesUser.username}</p>
                  </div>
                </div>
                <button
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-muted-foreground transition-colors cursor-pointer"
                  onClick={() => {
                    setEditRolesUser(null);
                    setEditUserSelectedRoles([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateRolesSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Assign Workspace Roles
                  </label>
                  <div className="grid grid-cols-1 gap-2 bg-[#0b0e1a] border border-white/[0.12] rounded-xl p-3 max-h-60 overflow-y-auto">
                    {ALL_AVAILABLE_ROLES.map((r) => {
                      const isChecked = editUserSelectedRoles.includes(r.id)
                      return (
                        <label
                          key={r.id}
                          className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-all ${
                            isChecked ? "bg-violet-500/15 border border-violet-500/30 text-violet-200" : "hover:bg-white/5 text-slate-400"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditUserSelectedRoles([...editUserSelectedRoles, r.id])
                              } else {
                                setEditUserSelectedRoles(editUserSelectedRoles.filter((id) => id !== r.id))
                              }
                            }}
                            className="mt-0.5 rounded border-white/20 text-violet-600 focus:ring-violet-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-200 block">{r.label} ({r.id})</span>
                            <span className="text-[10px] text-slate-400 block leading-tight">{r.desc}</span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      setEditRolesUser(null);
                      setEditUserSelectedRoles([]);
                    }}
                    className="flex-1 py-2 text-xs font-semibold rounded-xl border border-white/[0.08] text-muted-foreground hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 transition-opacity cursor-pointer shadow-[0_0_14px_rgba(139,92,246,0.3)]"
                  >
                    Save Roles
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
