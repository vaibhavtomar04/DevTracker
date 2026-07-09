import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useAuthStore } from "@/store/authStore"
import { useThemeStore } from "@/store/themeStore"
import { Button } from "@/components/ui/button"
import {
  ShieldAlert,
  Sun,
  Moon,
  Terminal,
  Code2,
  Bug,
  Activity,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Mail,
  ChevronLeft,
  CheckCircle2,
  KeyRound,
} from "lucide-react"

/* ──────────────────────────────────────────────────────────
   Full-screen cinematic success overlay (unchanged logic)
────────────────────────────────────────────────────────── */
function AccessGrantedOverlay({ username }: { username: string }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 600)
    const t2 = setTimeout(() => setPhase(2), 2200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  const letters = "ACCESS GRANTED".split("")
  const dots = Array.from({ length: 40 })

  return (
    <motion.div
      key="access-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 50%, #0d1117 0%, #020408 100%)" }}
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(rgba(0,255,150,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,150,0.08) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Scanning line */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] z-10"
        style={{ background: "linear-gradient(90deg, transparent, #00ff96, rgba(0,255,150,0.4), #00ff96, transparent)" }}
        initial={{ top: "-2px", opacity: 0 }}
        animate={{ top: ["0%", "100%", "100%"], opacity: [0, 1, 0] }}
        transition={{ duration: 1.2, ease: "easeInOut", times: [0, 0.8, 1] }}
      />

      {/* Floating particles */}
      {dots.map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: i % 3 === 0 ? 3 : 2,
            height: i % 3 === 0 ? 3 : 2,
            background: i % 3 === 0 ? "#00ff96" : i % 3 === 1 ? "#6366f1" : "#22d3ee",
            left: `${5 + (i * 2.4) % 90}%`,
            bottom: "-10px",
          }}
          animate={{
            y: [0, -(300 + (i * 7) % 400)],
            opacity: [0, 0.8, 0],
            scale: [0.5, 1.2, 0.3],
          }}
          transition={{
            duration: 2 + (i % 5) * 0.4,
            delay: (i % 10) * 0.15,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Shield icon with pulsing rings */}
      <motion.div
        className="relative mb-8"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
      >
        {[1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            className="absolute rounded-full border border-emerald-500/30"
            style={{
              width: 64 + ring * 40,
              height: 64 + ring * 40,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.8, 1.1, 1], opacity: [0, 0.6, 0] }}
            transition={{ duration: 2, delay: 0.3 + ring * 0.2, repeat: Infinity, ease: "easeOut" }}
          />
        ))}
        <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center shadow-[0_0_40px_rgba(0,255,150,0.5)]">
          <ShieldCheck className="h-8 w-8 text-white" />
        </div>
      </motion.div>

      {/* ACCESS GRANTED text */}
      <div className="flex items-center gap-[3px] mb-3">
        {letters.map((char, i) => (
          <motion.span
            key={i}
            className={`text-2xl md:text-4xl font-black tracking-[0.15em] ${char === " " ? "w-4" : ""}`}
            style={{ fontFamily: "monospace", color: "#00ff96", textShadow: "0 0 20px rgba(0,255,150,0.8)" }}
            initial={{ opacity: 0, y: 20, scale: 0.7 }}
            animate={phase >= 1 ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ delay: i * 0.045, type: "spring", stiffness: 400, damping: 20 }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </div>

      {/* Username */}
      <motion.p
        className="text-emerald-400/70 text-sm font-mono tracking-widest mb-8"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : {}}
        transition={{ delay: 0.9, duration: 0.5 }}
      >
        AUTHENTICATED AS: <span className="text-emerald-300 font-bold">{username.toUpperCase()}</span>
      </motion.p>

      {/* Progress bar */}
      <motion.div
        className="w-64 md:w-80"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : {}}
        transition={{ delay: 1.1 }}
      >
        <div className="flex justify-between text-[10px] text-emerald-500/50 font-mono mb-1.5">
          <span>INITIALIZING WORKSPACE</span>
          <motion.span initial={{ opacity: 0 }} animate={phase >= 1 ? { opacity: 1 } : {}}>
            100%
          </motion.span>
        </div>
        <div className="h-1 bg-emerald-950/60 rounded-full overflow-hidden border border-emerald-500/20">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #00ff96, #22d3ee, #6366f1)" }}
            initial={{ width: "0%" }}
            animate={phase >= 1 ? { width: "100%" } : {}}
            transition={{ duration: 1.0, delay: 1.15, ease: "easeInOut" }}
          />
        </div>
      </motion.div>

      {/* Corner decorations */}
      {["top-4 left-4", "top-4 right-4", "bottom-4 left-4", "bottom-4 right-4"].map((pos, i) => (
        <motion.div
          key={i}
          className={`absolute ${pos} w-8 h-8 border-emerald-500/40`}
          style={{
            borderTopWidth: pos.includes("top") ? 2 : 0,
            borderBottomWidth: pos.includes("bottom") ? 2 : 0,
            borderLeftWidth: pos.includes("left") ? 2 : 0,
            borderRightWidth: pos.includes("right") ? 2 : 0,
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
        />
      ))}

      {/* Final wipe */}
      <AnimatePresence>
        {phase >= 2 && (
          <motion.div
            className="absolute inset-0 z-50"
            style={{ background: "linear-gradient(135deg, #0a0a1a, #020408)" }}
            initial={{ clipPath: "polygon(0 0, 0 0, 0 100%, 0 100%)" }}
            animate={{ clipPath: "polygon(0 0, 110% 0, 110% 100%, 0 100%)" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ──────────────────────────────────────────────────────────
   Dot-grid background pattern
────────────────────────────────────────────────────────── */
function DotGrid() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(circle, rgba(var(--primary-rgb),0.1) 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
      }}
    />
  )
}

/* ──────────────────────────────────────────────────────────
   Floating background particles (upward drift)
────────────────────────────────────────────────────────── */
function BackgroundParticles() {
  const items = Array.from({ length: 20 })
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {items.map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: i % 4 === 0 ? 4 : 2,
            height: i % 4 === 0 ? 4 : 2,
            background:
              i % 3 === 0
                ? "rgba(var(--primary-rgb),0.55)"
                : i % 3 === 1
                  ? "rgba(var(--secondary-rgb),0.45)"
                  : "rgba(var(--accent-rgb),0.45)",
            left: `${(i * 5.3) % 100}%`,
            bottom: "-6px",
          }}
          animate={{
            y: [0, -(200 + (i * 13) % 300)],
            opacity: [0, 0.7, 0],
          }}
          transition={{
            duration: 8 + (i % 5) * 2,
            delay: (i % 8) * 1.2,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  )
}

import { OtpVerificationModal } from "@/components/shared/OtpVerificationModal"

/* ──────────────────────────────────────────────────────────
   Main Login Page
────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const { login, loading, error, setSession, forgotPassword, clearError } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [loggedInUser, setLoggedInUser] = useState("")
  // MFA Step-up state
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [stepUpToken, setStepUpToken] = useState("")
  // Forgot password panel state
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState("")
  const pendingSession = useRef<{
    user: Parameters<typeof setSession>[0]
    token: string
    mustChangePassword: boolean
  } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return
    try {
      const savedToken = localStorage.getItem("trusted_device_token") || undefined
      const response: any = await login(username, password, savedToken)
      if (response && response.mfaRequired) {
        setStepUpToken(response.stepUpToken)
        setShowOtpModal(true)
        return
      }

      pendingSession.current = {
        user: {
          id: response.id,
          username: response.username,
          fullName: response.fullName || response.username,
          email: response.email,
          roles: response.roles,
          avatar: response.avatar || undefined,
          theme: response.theme || undefined,
        },
        token: response.accessToken || response.token,
        mustChangePassword: !!response.mustChangePassword,
      }

      if (response.mustChangePassword) {
        setSession(
          pendingSession.current.user,
          pendingSession.current.token,
          true
        )
        navigate("/set-new-password")
      } else {
        setLoggedInUser(response.username)
        setShowOverlay(true)
        setTimeout(() => {
          if (pendingSession.current) {
            setSession(
              pendingSession.current.user,
              pendingSession.current.token,
              false
            )
          }
          navigate("/dashboard")
        }, 2700)
      }
    } catch {
      // handled by store error state
    }
  }

  const handleOtpSuccess = (res: any) => {
    setShowOtpModal(false)
    if (res.trustedDeviceToken) {
      localStorage.setItem("trusted_device_token", res.trustedDeviceToken)
    }
    const mappedRoles = Array.isArray(res.roles)
      ? res.roles.map((r: string) => r.replace(/^ROLE_/, ""))
      : []

    pendingSession.current = {
      user: {
        id: res.id,
        username: res.username,
        fullName: res.fullName || res.username,
        email: res.email,
        roles: mappedRoles,
        mfaEnabled: true,
        avatar: res.avatar || undefined,
        theme: res.theme || undefined,
      },
      token: res.accessToken || res.token,
      mustChangePassword: !!res.mustChangePassword,
    }

    if (res.mustChangePassword) {
      setSession(
        pendingSession.current.user,
        pendingSession.current.token,
        true
      )
      navigate("/set-new-password")
    } else {
      setLoggedInUser(res.username)
      setShowOverlay(true)
      setTimeout(() => {
        if (pendingSession.current) {
          setSession(
            pendingSession.current.user,
            pendingSession.current.token,
            false
          )
        }
        navigate("/dashboard")
      }, 2700)
    }
  }

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail) return
    setForgotLoading(true)
    setForgotError("")
    try {
      await forgotPassword(forgotEmail)
      setForgotSent(true)
    } catch (err: any) {
      setForgotError(err.message || "Something went wrong. Please try again.")
    } finally {
      setForgotLoading(false)
    }
  }

  const heroFeatures = [
    { icon: Code2, title: "Multi-Dev Code Reviews", desc: "Collaborate on branches, PRs & merge efforts." },
    { icon: Bug, title: "Tester Bug Queue", desc: "Raise bugs, log failures & track SIT / UAT." },
    { icon: Activity, title: "Full Audit Trail", desc: "Every state change is logged automatically." },
  ]

  const particles = Array.from({ length: 25 })

  return (
    <div
      className="relative min-h-screen w-screen flex flex-col md:flex-row overflow-hidden text-foreground transition-colors duration-300"
      style={{ backgroundColor: "hsl(var(--background))" }}
    >
      <DotGrid />

      {/* ambient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none" style={{ background: 'rgba(var(--primary-rgb),0.1)' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none" style={{ background: 'rgba(var(--secondary-rgb),0.08)' }} />

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full w-10 h-10 border border-slate-200 dark:border-white/10 backdrop-blur-md bg-white/80 dark:bg-white/[0.04] text-slate-800 dark:text-white shadow-sm hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
          onClick={toggleTheme}
        >
          {theme === "light" ? <Moon className="h-4 w-4 text-indigo-600" /> : <Sun className="h-4 w-4 text-amber-400" />}
        </Button>
      </div>

      {/* ── Left hero panel (60%) ── */}
      <div className="relative hidden md:flex flex-col justify-between p-12 overflow-hidden border-r border-slate-200 dark:border-border" style={{ flex: "0 0 60%", backgroundColor: "hsl(var(--card))" }}>
        {/* Animated particles */}
        <div className="absolute inset-0 z-0 opacity-40">
          {particles.map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                left: `${(i * 3.9) % 100}%`,
                top: `${(i * 7.1) % 100}%`,
                background: i % 2 === 0 ? 'var(--brand-primary)' : 'var(--brand-secondary)',
              }}
              animate={{
                y: [0, -100 - (i % 5) * 40],
                x: [0, ((i % 3) - 1) * 25],
                opacity: [0, 0.8, 0],
                scale: [0.5, 1.5, 0.5],
              }}
              transition={{
                duration: 10 + (i % 6) * 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
          <div
            className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)]"
            style={{ backgroundSize: "40px 40px" }}
          />
        </div>

        {/* Ambient glowing orb inside left panel */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-80 h-80 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="z-10 flex items-center space-x-2.5"
        >
          <motion.div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: 'var(--linearPrimarySecondary)', boxShadow: '0 0 24px rgba(var(--primary-rgb),0.35)' }}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Terminal className="h-6 w-6 text-white" />
          </motion.div>
          <span className="text-2xl font-black tracking-tight text-white">
            DevTrack
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary font-bold">
            v2.0
          </span>
        </motion.div>

        {/* Hero content */}
        <div className="z-10 my-auto max-w-lg space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white">
              Enterprise{" "}
              <span className="text-gradient">
                Developer Collaboration
              </span>{" "}
              Platform
            </h1>
            <p className="mt-4 text-slate-400 text-sm leading-relaxed">
              Track tasks, code reviews, and deployments in a singular, premium
              software suite. Engineered to scale with your engineering team.
            </p>
          </motion.div>

          {/* Feature bullets */}
          <div className="space-y-3">
            {heroFeatures.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.12, duration: 0.5 }}
                whileHover={{ x: 6, scale: 1.01 }}
                className="flex items-center gap-3.5 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm transition-all cursor-default hover:shadow-sm"
              >
                <div className="h-9 w-9 rounded-xl border border-primary/20 flex items-center justify-center text-primary flex-shrink-0" style={{ background: 'rgba(var(--primary-rgb),0.1)' }}>
                  <f.icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{f.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="z-10 text-xs text-slate-500 flex justify-between"
        >
          <span>© 2026 DevTracker Inc.</span>
          <span>Security Certified (AES-256)</span>
        </motion.div>
      </div>

      {/* ── Right login panel (40%) ── */}
      <div className="relative flex-1 flex flex-col justify-center items-center p-6 md:p-12 lg:p-16" style={{ backgroundColor: "hsl(var(--background))" }}>
        <BackgroundParticles />

        <div className="w-full max-w-md space-y-6 relative z-10">
          {/* Mobile logo */}
          <div className="flex md:hidden items-center justify-center space-x-2.5 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg shadow-md" style={{ background: 'var(--linearPrimarySecondary)' }}>
              <Terminal className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">DevTrack</span>
          </div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center space-y-1"
          >
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
              Welcome Back
            </h2>
            <p className="text-sm text-muted-foreground">Sign in to manage your engineering cycle</p>
          </motion.div>

          {/* Error banner */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 text-sm"
              >
                <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Glass login card */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45 }}
            className="rounded-2xl border border-border bg-card backdrop-blur-xl shadow-[0_0_40px_rgba(var(--primary-rgb),0.12)] p-6 space-y-5"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Username or Email
                </label>
                <input
                  placeholder="name@devtracker.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading || showOverlay}
                  required
                  className="w-full h-10 bg-background border border-input rounded-xl px-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                />
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { setShowForgot(true); clearError(); }}
                    className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors cursor-pointer"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading || showOverlay}
                    required
                    className="w-full h-10 bg-background border border-input rounded-xl px-3.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <motion.button
                type="submit"
                disabled={loading || showOverlay}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="relative w-full h-10 mt-2 rounded-xl text-sm font-bold text-white overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: 'var(--linearPrimarySecondary)', boxShadow: '0 0 20px rgba(var(--primary-rgb),0.4)' }}
              >
                {/* shimmer sweep on hover */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                {loading ? (
                  <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : showOverlay ? (
                  "Access Granted"
                ) : (
                  <>
                    Authenticate Session
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>

            </form>
          </motion.div>

          <p className="text-center text-xs text-slate-500 leading-normal">
            By signing in, you agree to comply with your organization&apos;s security policy.
          </p>
        </div>
      </div>

      {/* ── Forgot Password Modal ── */}
      <AnimatePresence>
        {showForgot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); setForgotError(""); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="w-full max-w-sm rounded-2xl border border-border bg-card backdrop-blur-2xl shadow-[0_0_60px_rgba(var(--primary-rgb),0.15)] p-7 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl border border-primary/25 flex items-center justify-center text-primary flex-shrink-0 bg-primary/10">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Forgot Password</h3>
                  <p className="text-[10px] text-muted-foreground">Enter your email to receive a temporary password</p>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {forgotSent ? (
                  <motion.div
                    key="sent"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex flex-col items-center gap-3 py-4">
                      <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 text-center">Email Sent!</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 text-center leading-relaxed">
                        If <span className="text-slate-800 dark:text-slate-350 font-semibold">{forgotEmail}</span> is registered, a temporary password has been emailed. Check your inbox and log in with it.
                      </p>
                    </div>
                    <button
                      onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); setForgotError(""); }}
                      className="w-full h-9 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-1.5"
                      style={{ background: 'var(--linearPrimaryAccent)' }}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Back to Login
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={handleForgotSubmit}
                    className="space-y-4"
                  >
                    {forgotError && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs">
                        <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" />
                        {forgotError}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Registered Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                        <input
                          type="email"
                          placeholder="name@devtracker.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                          className="w-full h-10 bg-background border border-input rounded-xl pl-9 pr-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => { setShowForgot(false); setForgotEmail(""); setForgotError(""); }}
                        className="flex-1 h-9 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="flex-1 h-9 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                        style={{ background: 'var(--linearPrimarySecondary)' }}
                      >
                        {forgotLoading ? (
                          <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <>
                            <Mail className="h-3.5 w-3.5" />
                            Send Reset Email
                          </>
                        )}
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cinematic success overlay */}
      <AnimatePresence>
        {showOverlay && <AccessGrantedOverlay username={loggedInUser} />}
      </AnimatePresence>

      {/* OTP Step-Up Verification Modal */}
      <OtpVerificationModal
        isOpen={showOtpModal}
        stepUpToken={stepUpToken}
        onSuccess={handleOtpSuccess}
        onCancel={() => setShowOtpModal(false)}
      />
    </div>
  )
}
