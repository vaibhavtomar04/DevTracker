import React, { useCallback, useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useThemeStore } from "@/store/themeStore"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/button"
import {
  Sun,
  Moon,
  Bell,
  ChevronRight,
  Layers,
  Search,
  Command,
  ShieldCheck,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { CommandPalette } from "./CommandPalette"
import { NotificationPanel } from "./NotificationPanel"
import { MfaWizard } from "./MfaWizard"
import { MfaDeactivateModal } from "./MfaDeactivateModal"
import { useNotificationStore } from "@/store/notificationStore"

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeStore()
  const { user } = useAuthStore()
  const [mfaWizardOpen, setMfaWizardOpen] = useState(false)
  const [mfaDeactivateOpen, setMfaDeactivateOpen] = useState(false)

  // ── Notification store (WebSocket + polling) ──────────────────────
  const { unreadCount, connect, disconnect, wsStatus } = useNotificationStore()
  const [notifPanelOpen, setNotifPanelOpen] = useState(false)

  // Connect WS when user is available, disconnect on unmount
  useEffect(() => {
    if (user?.id) {
      connect(user.id)
    }
    return () => {
      disconnect()
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Command Palette ───────────────────────────────────────────────
  const [cmdOpen, setCmdOpen] = useState(false)

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setCmdOpen((v) => !v)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  const handleSelectCR = useCallback((id: number) => {
    // Navigate or open CR detail — parent can handle via CRDetailSlideOver
    console.info("Open CR", id)
    // TODO: emit event or use global state to trigger slide-over
  }, [])

  // ── Breadcrumbs ───────────────────────────────────────────────────
  const pathnames = location.pathname.split("/").filter((x) => x)

  const getBreadcrumbs = () => {
    return pathnames.map((value, index) => {
      const isLast = index === pathnames.length - 1
      const label = value
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())

      if (value.toLowerCase() === "dashboard" && pathnames.length > 1) {
        return null
      }

      return (
        <React.Fragment key={value}>
          {index > 0 && index < pathnames.length && (
            <ChevronRight className="h-3 w-3 mx-1.5 text-muted-foreground/40 shrink-0" />
          )}
          <motion.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className={`truncate text-xs font-semibold uppercase tracking-wider ${
              isLast
                ? "text-foreground font-bold"
                : "text-muted-foreground/70 hover:text-muted-foreground transition-colors"
            }`}
          >
            {label === "Crs" ? "CR Management" : label}
          </motion.span>
        </React.Fragment>
      )
    })
  }

  const userInitial = user?.username?.charAt(0)?.toUpperCase() ?? "?"
  const userRole = user?.roles?.[0]?.replace("ROLE_", "") ?? ""

  // WS status color
  const wsColors: Record<string, string> = {
    connected: "bg-emerald-500",
    connecting: "bg-amber-400",
    disconnected: "bg-zinc-500",
    error: "bg-rose-500",
  }

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-white/[0.06] bg-background/60 backdrop-blur-xl px-6 shadow-[0_1px_0_rgba(255,255,255,0.04)]">

        {/* ── Left: Breadcrumbs ──────────────────────────────── */}
        <div className="flex items-center space-x-1 overflow-hidden">
          <div className="flex items-center space-x-1.5">
            <Layers className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 hidden sm:block">
              Workspace
            </span>
          </div>
          <ChevronRight className="h-3 w-3 text-muted-foreground/40 mx-1 shrink-0" />
          {getBreadcrumbs()}
        </div>

        {/* ── Right: Actions ────────────────────────────────── */}
        <div className="flex items-center space-x-2">

          {/* Command Palette Trigger */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:flex items-center gap-2 rounded-xl h-9 px-3 bg-white/[0.04] border border-white/[0.08] hover:bg-primary/[0.08] hover:border-primary/30 transition-all text-xs text-muted-foreground"
            onClick={() => setCmdOpen(true)}
            title="Search (⌘K)"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden lg:block">Search...</span>
            <div className="hidden lg:flex items-center gap-0.5">
              <kbd className="flex h-5 items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1 font-mono text-[10px]">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </div>
          </Button>

          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-full h-9 w-9 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all"
            onClick={() => setCmdOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Notification Bell */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full h-9 w-9 bg-white/[0.04] border border-white/[0.08] hover:bg-primary/[0.08] hover:border-primary/30 transition-all"
              onClick={() => setNotifPanelOpen(true)}
              title="Notifications"
            >
              <motion.div
                animate={
                  unreadCount > 0
                    ? { rotate: [0, -15, 15, -12, 12, -8, 8, -4, 4, 0] }
                    : { rotate: 0 }
                }
                transition={{
                  duration: 0.9,
                  repeat: unreadCount > 0 ? Infinity : 0,
                  repeatDelay: 3.5,
                }}
              >
                <Bell className="h-4 w-4" />
              </motion.div>

              {/* Unread badge */}
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.span
                    key="badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white ring-1 ring-background"
                    style={{ background: 'var(--linearPrimarySecondary)', boxShadow: '0 0 8px rgba(var(--primary-rgb),0.7)' }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* WS status dot */}
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background ${wsColors[wsStatus] ?? "bg-zinc-500"}`}
                title={`WebSocket: ${wsStatus}`}
              />
            </Button>
          </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-primary/[0.08] dark:hover:border-primary/30 overflow-hidden transition-all text-slate-800 dark:text-white"
            onClick={toggleTheme}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={theme}
                initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="flex items-center justify-center"
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                )}
              </motion.div>
            </AnimatePresence>
          </Button>

          {/* Divider */}
          <div className="h-5 w-px bg-white/[0.08]" />

          {/* User Profile Chip */}
          <div
            onClick={() => navigate("/dashboard/settings")}
            className="flex items-center space-x-2.5 cursor-pointer hover:opacity-85 transition-opacity"
            title="View Settings Profile"
          >
            <div className="relative">
              {user?.avatar ? (
                <img src={user.avatar} className="h-8 w-8 rounded-lg object-cover" style={{ boxShadow: '0 0 12px rgba(var(--primary-rgb),0.4)' }} alt="Avatar" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-bold text-xs uppercase select-none" style={{ background: 'var(--linearPrimarySecondary)', boxShadow: '0 0 12px rgba(var(--primary-rgb),0.4)' }}>
                  {userInitial}
                </div>
              )}
            </div>

            <div className="hidden lg:block text-left select-none">
              <span className="block text-xs font-bold leading-none mb-1 text-foreground">
                {user?.username}
              </span>
              <span className="block text-[9px] font-bold uppercase leading-none tracking-widest px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 w-fit">
                {userRole}
              </span>
            </div>
          </div>

          {/* MFA Security Button */}
          {user?.mfaEnabled ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMfaDeactivateOpen(true)}
              className="h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 hover:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 text-xs font-bold gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-450" />
              <span>MFA Enabled</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMfaWizardOpen(true)}
              className="h-8 rounded-xl bg-violet-600/10 dark:bg-violet-600/15 hover:bg-violet-600/20 border border-violet-500/20 dark:border-violet-500/30 text-violet-700 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-200 text-xs font-bold gap-1.5 transition-all cursor-pointer"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>MFA Setup</span>
            </Button>
          )}
        </div>
      </header>

      {/* Command Palette (renders at z-50) */}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onSelectCR={handleSelectCR}
      />

      {/* Notification Panel (full slide-over) */}
      {user?.id && (
        <NotificationPanel
          userId={user.id}
          open={notifPanelOpen}
          onClose={() => setNotifPanelOpen(false)}
        />
      )}

      {/* MFA Setup Wizard Modal */}
      <MfaWizard
        isOpen={mfaWizardOpen}
        onClose={() => setMfaWizardOpen(false)}
        onSuccess={() => {
          if (user) useAuthStore.setState({ user: { ...user, mfaEnabled: true } });
        }}
      />

      {/* MFA Deactivate Modal */}
      <MfaDeactivateModal
        isOpen={mfaDeactivateOpen}
        onClose={() => setMfaDeactivateOpen(false)}
        onSuccess={() => {
          if (user) useAuthStore.setState({ user: { ...user, mfaEnabled: false } });
        }}
      />
    </>
  )
}
