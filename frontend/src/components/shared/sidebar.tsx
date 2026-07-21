import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useAuthStore } from "@/store/authStore"
import { useSprintStore } from "@/store/sprintStore"
import { cn } from "@/utils/cn"
import {
  Terminal,
  LayoutDashboard,
  GitBranch,
  Users2,
  ListTodo,
  Rocket,
  BarChart3,
  Users,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Code,
  Zap,
  Cpu,
  ClipboardCheck,
  AlertCircle,
  Award,
  Trophy,
} from "lucide-react"

interface SidebarProps {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { sprints, fetchSprints } = useSprintStore()

  useEffect(() => {
    fetchSprints()
  }, [fetchSprints])

  const navItems = [
    { name: "Dashboard",      path: "/dashboard",              icon: LayoutDashboard, roles: ["DEVELOPER", "TESTER", "DEVADMIN", "TESTADMIN", "CODEREVIEWER"] },
    { name: "Sprint Board",   path: "/dashboard/sprints",      icon: Zap,             roles: ["DEVELOPER", "TESTER", "DEVADMIN", "TESTADMIN", "CODEREVIEWER"] },
    { name: "Sprint Tasks",   path: "/dashboard/sprint-tasks", icon: Cpu,             roles: ["DEVELOPER", "TESTER", "DEVADMIN", "TESTADMIN", "CODEREVIEWER"] },
    { name: "Tester Workspace", path: "/dashboard/tested-crs", icon: ClipboardCheck,  roles: ["TESTER", "DEVADMIN", "TESTADMIN"] },
    { name: "CR Management",  path: "/dashboard/crs",          icon: GitBranch,       roles: ["DEVELOPER", "DEVADMIN", "CODEREVIEWER"] },
    { name: "Code Review",    path: "/dashboard/code-review",  icon: Code,            roles: ["DEVADMIN", "CODEREVIEWER"] },
    { name: "Developers",     path: "/dashboard/developers",   icon: Users2,          roles: ["DEVADMIN", "CODEREVIEWER"] },
    { name: "Testing Queue",  path: "/dashboard/testing",      icon: ListTodo,        roles: ["TESTER", "TESTADMIN", "DEVADMIN"] },
    { name: "Deployments",    path: "/dashboard/deployments",  icon: Rocket,          roles: ["DEVADMIN", "TESTADMIN", "DEVELOPER", "TESTER"] },
    { name: "Missed Deadlines", path: "/dashboard/missed-deadlines", icon: AlertCircle, roles: ["DEVADMIN", "CODEREVIEWER"] },
    { name: "Achievements",   path: "/dashboard/recognition",  icon: Award,           roles: ["DEVELOPER", "TESTER", "DEVADMIN", "TESTADMIN", "CODEREVIEWER"] },
    { name: "Leaderboard",    path: "/dashboard/leaderboard",  icon: Trophy,          roles: ["DEVELOPER", "TESTER", "DEVADMIN", "TESTADMIN", "CODEREVIEWER"] },
    { name: "Reports",        path: "/dashboard/reports",      icon: BarChart3,       roles: ["DEVADMIN", "TESTADMIN"] },
    { name: "Users",          path: "/dashboard/users",        icon: Users,           roles: ["DEVADMIN", "TESTADMIN"] },
    { name: "Audit Logs",     path: "/dashboard/audits",       icon: History,         roles: ["DEVADMIN", "TESTADMIN"] },
    { name: "Settings",       path: "/dashboard/settings",     icon: Settings,        roles: ["DEVADMIN", "TESTADMIN", "DEVELOPER", "TESTER"] },
  ]

  // Normalize user roles by stripping 'ROLE_' prefix if present from backend
  const normalizedUserRoles = (user?.roles || []).map((role) => role.replace(/^ROLE_/, ""))

  const isAdmin = normalizedUserRoles.some((r) =>
    ["DEVADMIN", "TESTADMIN", "CODEREVIEWER"].includes(r)
  )
  const hasActiveSprint = Boolean(
    sprints && sprints.some((s) => s.status === "ACTIVE")
  )

  // Filter items by user role and active sprint state
  const filteredItems = navItems.filter((item) => {
    const roleAllowed = item.roles.some((role) => normalizedUserRoles.includes(role))
    if (!roleAllowed) return false

    // Sprint Board & Sprint Tasks are visible to DEVELOPER and TESTER ONLY IF an ACTIVE sprint exists
    const isSprintItem = item.name === "Sprint Board" || item.name === "Sprint Tasks"
    if (isSprintItem && !isAdmin && !hasActiveSprint) {
      return false
    }

    return true
  })

  const activePath = location.pathname

  const userInitial = user?.fullName?.charAt(0).toUpperCase() ?? "?"
  const roleLabel = user?.roles?.join(", ") ?? ""

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "relative flex flex-col justify-between h-screen z-30",
        "border-r border-white/[0.06]",
        "bg-card/60 backdrop-blur-xl",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Subtle inner glow at top */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/[0.08] to-transparent pointer-events-none" />

      {/* ── Logo / Brand ───────────────────────────────────────── */}
      <div className={cn(
        "relative flex h-16 items-center border-b border-white/[0.06] shrink-0",
        collapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        <div className="flex items-center space-x-2.5 overflow-hidden min-w-0">
          {/* Gradient icon */}
          <div className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0" style={{ background: 'var(--linearPrimaryAccent)', boxShadow: '0 0 18px rgba(var(--primary-rgb),0.5)' }}>
            <Terminal className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="font-extrabold tracking-tight text-gradient truncate text-sm"
              >
                DevTrack
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse toggle — sits at the right edge of sidebar, always visible */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "absolute -right-3 top-5 flex h-6 w-6 items-center justify-center rounded-full",
            "border border-border bg-card shadow-md",
            "hover:bg-primary/10 hover:border-primary/40 text-muted-foreground hover:text-primary",
            "z-40 transition-all duration-200"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* ── Navigation ────────────────────────────────────────── */}
      <nav className="relative flex-1 space-y-0.5 px-2 py-4 overflow-y-auto scrollbar-none">
        {filteredItems.map((item) => {
          const isActive =
            activePath === item.path ||
            (item.path !== "/dashboard" && activePath.startsWith(item.path))

          const isTesterWorkspace = item.name === "Tester Workspace"
          const isDevOnly = normalizedUserRoles.includes("DEVELOPER") &&
                            !normalizedUserRoles.includes("DEVADMIN") &&
                            !normalizedUserRoles.includes("TESTADMIN") &&
                            !normalizedUserRoles.includes("TESTER")
          const isDisabled = isTesterWorkspace && isDevOnly

          return (
            <button
              key={item.name}
              disabled={isDisabled}
              onClick={() => !isDisabled && navigate(item.path)}
              title={isDisabled ? "Accessible only to Testers and Admins" : (collapsed ? item.name : undefined)}
              className={cn(
                "group relative flex w-full items-center rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 outline-none",
                isActive
                  ? "text-white"
                  : isDisabled
                    ? "opacity-40 cursor-not-allowed text-muted-foreground/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-primary/[0.06]"
              )}
            >
              {/* Active pill — spring animated with layoutId */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg -z-10"
                  style={{
                    background: 'var(--linearPrimarySecondary)',
                    boxShadow: "0 4px 14px rgba(var(--primary-rgb),0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              {/* Icon */}
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-all duration-200",
                  isActive ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" : "group-hover:scale-110 group-hover:text-primary",
                  !collapsed && "mr-3"
                )}
              />

              {/* Label */}
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.18 }}
                    className="truncate overflow-hidden"
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Active dot indicator when collapsed */}
              {isActive && collapsed && (
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-primary shadow-[0_0_6px_rgba(var(--primary-rgb),0.9)]" />
              )}
            </button>
          )
        })}
      </nav>

      {/* ── Bottom: User Profile & Logout ─────────────────────── */}
      <div className="relative border-t border-white/[0.06] p-2.5 space-y-1.5 shrink-0">
        {/* User chip */}
        <div
          onClick={() => navigate("/dashboard/settings")}
          className={cn(
            "flex items-center rounded-xl p-2 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] cursor-pointer transition-all",
            collapsed ? "justify-center px-1" : "space-x-2.5"
          )}
        >
          {/* Avatar with gradient ring */}
          <div className="relative shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} className="h-8 w-8 rounded-lg object-cover" style={{ boxShadow: '0 0 12px rgba(var(--primary-rgb),0.4)' }} alt="Avatar" />
            ) : (
              <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ background: 'var(--linearPrimarySecondary)', boxShadow: '0 0 12px rgba(var(--primary-rgb),0.4)' }}>
                {userInitial}
              </div>
            )}
            {/* Online indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
          </div>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.16 }}
                className="overflow-hidden min-w-0"
              >
                <span className="block text-xs font-bold truncate leading-none mb-1 text-foreground">
                  {user?.fullName}
                </span>
                <span className="block text-[9px] font-semibold tracking-widest text-muted-foreground/80 uppercase leading-none truncate">
                  {roleLabel}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          title={collapsed ? "Logout Session" : undefined}
          className={cn(
            "flex w-full items-center rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200",
            "text-muted-foreground hover:text-red-400 hover:bg-red-500/[0.08] hover:border-red-500/20",
            "border border-transparent",
            collapsed ? "justify-center" : ""
          )}
        >
          <LogOut
            className={cn(
              "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
              !collapsed && "mr-3"
            )}
          />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.16 }}
                className="overflow-hidden whitespace-nowrap"
              >
                Logout Session
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  )
}
