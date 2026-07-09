import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useAuthStore } from "@/store/authStore"
import { useThemeStore } from "@/store/themeStore"
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Terminal,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from "lucide-react"

/* ── Password strength helper ── */
function getStrength(pwd: string): { score: number; label: string; color: string } {
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return { score, label: "Weak", color: "#ef4444" }
  if (score <= 2) return { score, label: "Fair", color: "#f97316" }
  if (score <= 3) return { score, label: "Good", color: "#eab308" }
  if (score <= 4) return { score, label: "Strong", color: "#22c55e" }
  return { score, label: "Very Strong", color: "#10b981" }
}

/* ── Policy check item ── */
function PolicyItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-[10px] transition-colors ${ok ? "text-emerald-500 dark:text-emerald-400" : "text-slate-400 dark:text-slate-600"}`}>
      <CheckCircle2 className={`h-3 w-3 flex-shrink-0 transition-colors ${ok ? "text-emerald-500 dark:text-emerald-400" : "text-slate-350 dark:text-slate-700"}`} />
      {text}
    </div>
  )
}

/* ── Background dot grid ── */
function DotGrid({ theme }: { theme: "light" | "dark" }) {
  const dotColor = theme === "dark" ? "rgba(255, 255, 255, 0.09)" : "rgba(15, 23, 42, 0.08)"
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(circle, ${dotColor} 1.5px, transparent 1.5px)`,
        backgroundSize: "32px 32px",
      }}
    />
  )
}

export default function SetNewPasswordPage() {
  const { setNewPassword, loading, error, mustChangePassword, token, clearError } = useAuthStore()
  const { theme } = useThemeStore()
  const navigate = useNavigate()

  const [newPassword, setNewPasswordVal] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [localError, setLocalError] = useState("")
  const [success, setSuccess] = useState(false)

  // Guard: if not in forced-reset mode and not authenticated, redirect to login
  useEffect(() => {
    if (success) return
    if (!mustChangePassword && !token) {
      navigate("/login")
    }
    if (!mustChangePassword && !loading && token) {
      navigate("/dashboard")
    }
  }, [mustChangePassword, token, loading, success, navigate])

  const strength = getStrength(newPassword)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError("")
    clearError()

    if (newPassword !== confirmPassword) {
      setLocalError("Passwords do not match.")
      return
    }
    const pwdRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/
    if (!pwdRegex.test(newPassword)) {
      setLocalError("Password must be at least 8 characters and include both letters and numbers.")
      return
    }

    try {
      await setNewPassword(newPassword, confirmPassword)
      setSuccess(true)
      setTimeout(() => {
        navigate("/login")
      }, 2800)
    } catch {
      // error is in store
    }
  }

  const displayError = localError || error

  return (
    <div
      className="relative min-h-screen w-screen flex items-center justify-center overflow-hidden text-foreground bg-slate-50 dark:bg-[#060814] transition-colors duration-300"
    >
      <DotGrid theme={theme} />

      {/* Ambient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-violet-600/5 dark:bg-violet-600/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/5 dark:bg-indigo-600/8 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-[0_4px_20px_rgba(139,92,246,0.3)]">
            <Terminal className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-800 dark:text-zinc-100">
            DevTrack
          </span>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0b0f19] p-8 space-y-6 shadow-xl dark:shadow-[0_0_60px_rgba(139,92,246,0.08)]">

          <AnimatePresence mode="wait">
            {success ? (
              /* ── Success state ── */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-4 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                  className="relative"
                >
                  {[1, 2].map((ring) => (
                    <motion.div
                      key={ring}
                      className="absolute rounded-full border border-emerald-500/30"
                      style={{ width: 60 + ring * 30, height: 60 + ring * 30, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
                      animate={{ scale: [0.8, 1.1, 1], opacity: [0, 0.6, 0] }}
                      transition={{ duration: 2, delay: ring * 0.2, repeat: Infinity, ease: "easeOut" }}
                    />
                  ))}
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                    <ShieldCheck className="h-8 w-8 text-white" />
                  </div>
                </motion.div>
                <div className="space-y-1.5">
                  <h2 className="text-lg font-black text-slate-800 dark:text-white">Password Updated!</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed">
                    Your new password has been saved securely.<br />
                    Redirecting you to login…
                  </p>
                </div>
                <div className="w-48 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2.8, ease: "linear" }}
                  />
                </div>
              </motion.div>
            ) : (
              /* ── Form state ── */
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                {/* Heading */}
                <div className="space-y-3 text-left">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400">
                      <KeyRound className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h1 className="text-base font-black text-slate-800 dark:text-white">Set Your Password</h1>
                      <p className="text-[10px] font-bold text-amber-650 dark:text-amber-400/80">First-login security requirement</p>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-500/[0.06] border border-amber-200/60 dark:border-amber-500/20">
                    <p className="text-xs text-amber-800 dark:text-amber-350 leading-relaxed font-medium">
                      Your account was created with a temporary password. You must set a personal password before accessing DevTrack.
                    </p>
                  </div>
                </div>

                {/* Error banner */}
                <AnimatePresence>
                  {displayError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300 text-xs text-left"
                    >
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      {displayError}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                      <input
                        type={showNew ? "text" : "password"}
                        placeholder="Min. 8 chars, 1 letter + 1 number"
                        value={newPassword}
                        onChange={(e) => { setNewPasswordVal(e.target.value); setLocalError(""); }}
                        required
                        className="w-full h-11 bg-slate-50 dark:bg-[#121622] border border-slate-200 dark:border-white/[0.08] rounded-xl pl-9 pr-10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10 dark:focus:ring-violet-500/20 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
                      >
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Strength bar */}
                    {newPassword && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1 flex-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <div
                                key={s}
                                className="h-1 flex-1 rounded-full transition-all duration-300"
                                style={{ background: s <= strength.score ? strength.color : (theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)") }}
                              />
                            ))}
                          </div>
                          <span className="text-[9px] font-bold ml-2.5 font-mono" style={{ color: strength.color }}>
                            {strength.label}
                          </span>
                        </div>
                        {/* Policy checks */}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                          <PolicyItem ok={newPassword.length >= 8} text="8+ characters" />
                          <PolicyItem ok={/[A-Z]/.test(newPassword)} text="Uppercase letter" />
                          <PolicyItem ok={/[0-9]/.test(newPassword)} text="Number" />
                          <PolicyItem ok={/[^A-Za-z0-9]/.test(newPassword)} text="Special character" />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                      <input
                        type={showConfirm ? "text" : "password"}
                        placeholder="Repeat your new password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setLocalError(""); }}
                        required
                        className={`w-full h-11 bg-slate-50 dark:bg-[#121622] border rounded-xl pl-9 pr-10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 transition-all font-mono ${
                          confirmPassword && confirmPassword !== newPassword
                            ? "border-rose-500/40 focus:border-rose-500/60 focus:ring-rose-500/10 dark:focus:ring-rose-500/20"
                            : confirmPassword && confirmPassword === newPassword
                            ? "border-emerald-500/40 focus:border-emerald-500/60 focus:ring-emerald-500/10 dark:focus:ring-emerald-500/20"
                            : "border-slate-200 dark:border-white/[0.08] focus:border-violet-500/60 dark:focus:border-violet-500/20"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword === newPassword && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Passwords match
                      </motion.p>
                    )}
                  </div>

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.01, y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    className="relative w-full h-11 mt-1 rounded-xl text-sm font-bold text-white overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 shadow-[0_4px_20px_rgba(124,58,237,0.25)] hover:shadow-[0_6px_28px_rgba(124,58,237,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                    {loading ? (
                      <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        Confirm & Save Password
                      </>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-500 mt-5 leading-normal">
          DevTrack — Enterprise Security Policy · Passwords are encrypted with bcrypt
        </p>
      </motion.div>
    </div>
  )
}
