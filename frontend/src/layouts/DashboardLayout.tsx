import React, { useState, useEffect, useCallback } from "react"
import { useLocation } from "react-router-dom"
import Sidebar from "@/components/shared/sidebar"
import Navbar from "@/components/shared/navbar"
import ToastContainer from "@/components/shared/ToastContainer"
import { NotificationPopupToast } from "@/components/shared/NotificationPopupToast"
import { AchievementUnlockModal } from "@/components/shared/AchievementUnlockModal"
import { recognitionService, type AchievementNotification } from "@/services/recognition.service"
import { useNotificationStore } from "@/store/notificationStore"
import { useTaskStore } from "@/store/taskStore"
import { useSprintStore } from "@/store/sprintStore"
import { useAuthStore } from "@/store/authStore"
import { usePrefetchModules } from "@/hooks/useApiQueries"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldOff } from "lucide-react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

function LogoutOverlay({ username }: { username: string }) {
  const [phase, setPhase] = useState(0)
  const dots = Array.from({ length: 40 })
  const letters = "SESSION TERMINATED".split("")

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 500)
    return () => clearTimeout(t1)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 50%, #130a0a 0%, #020101 100%)" }}
    >
      {/* Animated grid background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(rgba(239,68,68,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.08) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Scanning line (red) */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] z-10"
        style={{ background: "linear-gradient(90deg, transparent, #ef4444, rgba(239,68,68,0.4), #ef4444, transparent)" }}
        initial={{ top: "100%", opacity: 0 }}
        animate={{ top: ["-2px", "100%"], opacity: [0, 1, 0] }}
        transition={{ duration: 1.0, ease: "easeInOut", times: [0, 1] }}
      />

      {/* Floating particles (red/orange) */}
      {dots.map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() > 0.7 ? 3 : 2,
            height: Math.random() > 0.7 ? 3 : 2,
            background: i % 3 === 0 ? "#ef4444" : i % 3 === 1 ? "#f97316" : "#fbbf24",
            left: `${5 + (i * 2.4) % 90}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, 200 + Math.random() * 300],
            opacity: [0, 0.7, 0],
            scale: [0.5, 1.2, 0.3],
          }}
          transition={{
            duration: 1.5 + Math.random() * 1.5,
            delay: Math.random() * 1.0,
            repeat: Infinity,
            ease: "easeIn",
          }}
        />
      ))}

      {/* Shield-Off icon with pulsing rings */}
      <motion.div
        className="relative mb-8"
        initial={{ scale: 0, rotate: 20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
      >
        {[1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            className="absolute rounded-full border border-red-500/30"
            style={{
              width: 64 + ring * 40,
              height: 64 + ring * 40,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.8, 1.1, 1], opacity: [0, 0.6, 0] }}
            transition={{ duration: 2, delay: 0.2 + ring * 0.2, repeat: Infinity, ease: "easeOut" }}
          />
        ))}
        <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.5)]">
          <ShieldOff className="h-8 w-8 text-white" />
        </div>
      </motion.div>

      {/* SESSION TERMINATED — letter by letter */}
      <div className="flex items-center gap-[3px] mb-3 flex-wrap justify-center px-4">
        {letters.map((char, i) => (
          <motion.span
            key={i}
            className={`text-xl md:text-3xl font-black tracking-[0.12em] ${char === " " ? "w-3" : ""}`}
            style={{ fontFamily: "monospace", color: "#ef4444", textShadow: "0 0 20px rgba(239,68,68,0.8)" }}
            initial={{ opacity: 0, y: -20, scale: 0.7 }}
            animate={phase >= 1 ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ delay: i * 0.04, type: "spring", stiffness: 400, damping: 20 }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </div>

      {/* Username line */}
      <motion.p
        className="text-red-400/70 text-sm font-mono tracking-widest mb-8"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : {}}
        transition={{ delay: 0.85, duration: 0.5 }}
      >
        CLEARING SESSION FOR:{" "}
        <span className="text-red-300 font-bold">{username.toUpperCase()}</span>
      </motion.p>

      {/* Draining progress bar */}
      <motion.div
        className="w-64 md:w-80"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : {}}
        transition={{ delay: 1.0 }}
      >
        <div className="flex justify-between text-[10px] text-red-500/50 font-mono mb-1.5">
          <span>REVOKING ACCESS TOKENS</span>
          <motion.span initial={{ opacity: 0 }} animate={phase >= 1 ? { opacity: 1 } : {}}>0%</motion.span>
        </div>
        <div className="h-1 bg-red-950/60 rounded-full overflow-hidden border border-red-500/20">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #ef4444, #f97316, #fbbf24)" }}
            initial={{ width: "100%" }}
            animate={phase >= 1 ? { width: "0%" } : {}}
            transition={{ duration: 0.8, delay: 1.05, ease: "easeInOut" }}
          />
        </div>
      </motion.div>

      {/* Corner decorators */}
      {["top-4 left-4", "top-4 right-4", "bottom-4 left-4", "bottom-4 right-4"].map((pos, i) => (
        <motion.div
          key={i}
          className={`absolute ${pos} w-8 h-8 border-red-500/40`}
          style={{
            borderTopWidth: pos.includes("top") ? 2 : 0,
            borderBottomWidth: pos.includes("bottom") ? 2 : 0,
            borderLeftWidth: pos.includes("left") ? 2 : 0,
            borderRightWidth: pos.includes("right") ? 2 : 0,
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 + i * 0.1, duration: 0.3 }}
        />
      ))}
    </motion.div>
  )
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { loggingOut, user } = useAuthStore()
  const { fetchData } = useTaskStore()
  const { fetchSprints } = useSprintStore()
  const { popupQueue, dismissPopup } = useNotificationStore()
  const location = useLocation()
  const [activeAchievementUnlock, setActiveAchievementUnlock] = useState<AchievementNotification | null>(null)

  const checkAchievementUnlocks = useCallback(async () => {
    try {
      const res = await recognitionService.getMyNotifications()
      const unread = (res.content || []).filter((n) => n.isRead === 0)
      if (unread.length > 0 && !activeAchievementUnlock) {
        setActiveAchievementUnlock(unread[0])
      }
    } catch (e) {
      console.error("Failed to fetch achievement notifications", e)
    }
  }, [activeAchievementUnlock])

  const { prefetchNextModules } = usePrefetchModules()

  useEffect(() => {
    // Perform initial fetch on mount (once)
    fetchData()
    fetchSprints()
    checkAchievementUnlocks()

    // Intelligently prefetch next likely modules in background after dashboard load
    const prefetchTimer = setTimeout(() => {
      prefetchNextModules()
    }, 1500)

    return () => clearTimeout(prefetchTimer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDismissAchievementModal = async () => {
    setActiveAchievementUnlock(null)
    try {
      await recognitionService.markNotificationsRead()
    } catch (e) {
      console.error("Failed to mark notifications as read", e)
    }
  }

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-background text-foreground transition-colors duration-300">

      {/* ── Ambient Glow Orbs ─────────────────────────────────── */}
      {/* brand-primary — top-left */}
      <div className="absolute -top-[15%] -left-[10%] w-[55%] h-[55%] rounded-full blur-[130px] animate-pulse-slow pointer-events-none" style={{ background: 'rgba(var(--primary-rgb),0.08)' }} />
      {/* brand-secondary — bottom-right */}
      <div className="absolute -bottom-[15%] -right-[10%] w-[50%] h-[50%] rounded-full blur-[120px] animate-pulse-slow pointer-events-none" style={{ background: 'rgba(var(--secondary-rgb),0.07)', animationDelay: '1.2s' }} />
      {/* brand-accent — center-right */}
      <div className="absolute top-[20%] right-[5%] w-[30%] h-[40%] rounded-full blur-[100px] animate-pulse-slow pointer-events-none" style={{ background: 'rgba(var(--accent-rgb),0.06)', animationDelay: '2.4s' }} />
      {/* brand-primary — top-right accent */}
      <div className="absolute top-[5%] right-[25%] w-[20%] h-[25%] rounded-full blur-[90px] animate-float pointer-events-none" style={{ background: 'rgba(var(--primary-rgb),0.05)', animationDelay: '0.8s' }} />

      {/* ── Subtle Dot-Grid Overlay ───────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.018] dark:opacity-[0.025]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Collapsible Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* Main Panel */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <Navbar />

        {/* Page transition wrapper */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      {/* Global Animated Toasts */}
      <ToastContainer />

      {/* Real-time Notification Popups */}
      <NotificationPopupToast
        notifications={popupQueue}
        onDismiss={dismissPopup}
      />

      {/* Achievement Unlock Celebratory Modal */}
      <AchievementUnlockModal
        notification={activeAchievementUnlock}
        onClose={handleDismissAchievementModal}
      />

      {/* Cinematic Logout Overlay */}
      <AnimatePresence>
        {loggingOut && (
          <LogoutOverlay username={user?.username || user?.fullName || "user"} />
        )}
      </AnimatePresence>
    </div>
  )
}
