import React, { useEffect, useState } from "react"
import { useTaskStore } from "@/store/taskStore"
import { useAuthStore } from "@/store/authStore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, Key, Camera, Smile, ShieldCheck, ShieldAlert } from "lucide-react"
import { motion } from "framer-motion"
import { MfaWizard } from "@/components/shared/MfaWizard"
import { MfaDeactivateModal } from "@/components/shared/MfaDeactivateModal"

const PRESET_AVATARS = [
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjIwIiBmaWxsPSIjMTBiOTgxIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSIzOCIgcj0iMTgiIGZpbGw9IiNmZmZmZmYiLz48cGF0aCBkPSJNMjAsODAgUTUwLDUwIDgwLDgwIiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+",
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjIwIiBmaWxsPSIjZjU5ZTBiIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSIzOCIgcj0iMTgiIGZpbGw9IiNmZmZmZmYiLz48cGF0aCBkPSJNMjUsNzggQzI1LDYyIDM1LDU1IDUwLDU1IEM2NSw1NSA3NSw2MiA3NSw3OCIgZmlsbD0iI2ZmZmZmZiIvPjwvc3ZnPg==",
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjIwIiBmaWxsPSIjMDZiNmQ0Ii8+PGNpcmNsZSBjeD0iNTAiIGN5PSIzOCIgcj0iMTYiIGZpbGw9IiNmZmZmZmYiLz48cGF0aCBkPSJNMjAsODAgUTUwLDQ1IDgwLDgwIiBmaWxsPSIjZmZmZmZmIi8+PC9zdmc+",
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjIwIiBmaWxsPSIjOGI1Y2Y2Ii8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iMjIiIGZpbGw9IiNmZmZmZmYiIG9wYWNpdHk9IjAuMyIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjEyIiBmaWxsPSIjZmZmZmZmIi8+PC9zdmc+",
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjIwIiBmaWxsPSIjMTRiOGE2Ii8+PHRleHQgeD0iNTAiIHk9IjYyIiBmb250LXNpemU9IjM0IiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXdlaWdodD0iOTAwIiBmaWxsPSIjZmZmZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj4mbHQ7LyZndDs8L3RleHQ+PC9zdmc+",
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjIwIiBmaWxsPSIjZjk3MzE2Ii8+PHRleHQgeD0iNTAiIHk9IjY0IiBmb250LXNpemU9IjM2IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjkwMCIgZmlsbD0iI2ZmZmZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RFQ8L3RleHQ+PC9zdmc+"
]

export default function Settings() {
  const { changePassword, user, token, setSession } = useAuthStore()
  const { fetchData, addToast } = useTaskStore()

  const [currentPassword, setCurrentPassword] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Profile update states
  const [username, setUsername] = useState(user?.username || "")
  const [newAvatar, setNewAvatar] = useState(user?.avatar || "")
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // MFA modal states
  const [showMfaWizard, setShowMfaWizard] = useState(false)
  const [showMfaDeactivate, setShowMfaDeactivate] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword) {
      addToast("Current password is required!", "error")
      return
    }
    if (!password || password !== confirmPassword) {
      addToast("New passwords do not match!", "error")
      return
    }

    changePassword(currentPassword, password)
      .then(() => {
        addToast("Password updated successfully!", "success")
        setCurrentPassword("")
        setPassword("")
        setConfirmPassword("")
      })
      .catch((err: any) => {
        addToast(err.message || "Failed to update password.", "error")
      })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1024 * 1024) { // 1MB limit
      addToast("Avatar image size must be less than 1MB", "error")
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setNewAvatar(reader.result as string)
      addToast("Custom avatar loaded. Save profile to apply.", "success")
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      addToast("Username cannot be empty", "error")
      return
    }

    setIsSavingProfile(true)
    try {
      const API_BASE = import.meta.env.VITE_API_URL || ""
      const res = await window.fetch(`${API_BASE}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ username, avatar: newAvatar }),
        credentials: "include"
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }

      const data = await res.json()
      const backendUser = data.user
      const newToken = data.token || token

      // Map the backend User entity to the frontend User type
      const updatedUser = {
        id: backendUser.id,
        username: backendUser.username,
        fullName: backendUser.fullName || user?.fullName || "",
        email: backendUser.email,
        avatar: backendUser.avatar || undefined,
        roles: Array.isArray(backendUser.roles)
          ? backendUser.roles.map((r: any) => {
              const s = typeof r === "string" ? r : String(r)
              return s.replace(/^ROLE_/, "")
            })
          : (user?.roles ?? []),
        mfaEnabled: backendUser.mfaEnabled ?? user?.mfaEnabled,
      }

      // Persist new token if username changed
      if (newToken && newToken !== token) {
        localStorage.setItem("token", newToken)
      }

      setSession(updatedUser, newToken)
      addToast("Profile updated successfully!", "success")
    } catch (err: any) {
      addToast(err.message || "Failed to update profile", "error")
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Animation configurations
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 120, damping: 15 } }
  }

  return (
    <>
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-3xl mx-auto pb-12 text-slate-100"
    >
      <div>
        <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-amber-400 via-emerald-200 to-teal-400 bg-clip-text text-transparent">
          System Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Adjust security profiles, update username handles, change avatars, and configure credentials.
        </p>
      </div>

      <div className="space-y-6">
        
        {/* ── Profile & Avatar Update Card ───────────────── */}
        <motion.div variants={cardVariants}>
          <Card className="border border-white/[0.06] bg-white/[0.03] backdrop-blur-md rounded-2xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:shadow-[0_0_20px_rgba(16,185,129,0.08)] hover:border-emerald-500/20 transition-all duration-300">
            <CardHeader className="p-5">
              <CardTitle className="text-sm font-black flex items-center space-x-2 text-slate-200">
                <Smile className="h-4.5 w-4.5 text-emerald-400" />
                <span>Customize Profile</span>
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-400">Update your username handle and upload or choose a profile avatar.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <form onSubmit={handleSaveProfile} className="space-y-6 text-xs">
                
                {/* Avatar upload / presets */}
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="relative shrink-0 group">
                    <div className="h-20 w-20 rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.03] flex items-center justify-center relative">
                      {newAvatar ? (
                        <img src={newAvatar} className="h-full w-full object-cover" alt="Profile Preview" />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-black text-black text-2xl">
                          {user?.fullName?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 cursor-pointer transition-opacity text-[9px] font-bold text-white">
                        <Camera className="h-4 w-4" />
                        <span>Upload File</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                      </label>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Choose Preset Avatar</label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_AVATARS.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setNewAvatar(url)}
                          className={`h-10 w-10 rounded-xl overflow-hidden border transition-all hover:scale-105 bg-white/[0.02] p-0.5 ${
                            newAvatar === url ? "border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] bg-emerald-500/5" : "border-white/[0.08] hover:border-white/[0.2]"
                          }`}
                        >
                          <img src={url} className="h-full w-full object-cover" alt="Preset" />
                        </button>
                      ))}
                      {newAvatar && (
                        <button
                          type="button"
                          onClick={() => setNewAvatar("")}
                          className="px-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 font-bold text-[9px] transition-colors"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Username edit input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Username Handle</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">@</span>
                    <input
                      type="text"
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="h-10 w-full bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 rounded-xl pl-8 pr-3 py-2 text-sm text-slate-200 focus:outline-none transition-all placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSavingProfile}
                  className="h-10 px-5 rounded-xl shadow-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-500/30 text-white font-bold cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSavingProfile ? "Saving Profile..." : "Save Profile Settings"}
                </Button>

              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security Profile Details (Read Only) */}
        <motion.div variants={cardVariants}>
          <Card className="border border-white/[0.06] bg-white/[0.03] backdrop-blur-md rounded-2xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:shadow-[0_0_20px_rgba(16,185,129,0.08)] hover:border-emerald-500/20 transition-all duration-300">
            <CardHeader className="p-5">
              <CardTitle className="text-sm font-black flex items-center space-x-2 text-slate-200">
                <Shield className="h-4.5 w-4.5 text-emerald-400" />
                <span>Security Profile</span>
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-400">Your current authenticated user profile context</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0 text-xs">
              <div className="grid grid-cols-2 gap-5">
                <div className="p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                  <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-1">Full Name</span>
                  <span className="font-semibold text-slate-200 text-sm">{user?.fullName}</span>
                </div>
                <div className="p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                  <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-1">Roles</span>
                  <span className="font-bold text-emerald-400 text-sm tracking-wide">{user?.roles?.join(", ")}</span>
                </div>
                <div className="p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                  <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-1">Username</span>
                  <span className="font-semibold text-slate-200 text-sm">@{user?.username}</span>
                </div>
                <div className="p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                  <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-wider mb-1">Email Address</span>
                  <span className="font-semibold text-slate-200 text-sm">{user?.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── MFA Security Card ───────────────── */}
        <motion.div variants={cardVariants}>
          <Card className="border border-white/[0.06] bg-white/[0.03] backdrop-blur-md rounded-2xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:shadow-[0_0_20px_rgba(99,102,241,0.08)] hover:border-violet-500/20 transition-all duration-300">
            <CardHeader className="p-5">
              <CardTitle className="text-sm font-black flex items-center space-x-2 text-slate-200">
                <Shield className="h-4.5 w-4.5 text-violet-400" />
                <span>Two-Factor Authentication (MFA)</span>
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-400">Protect your account with Microsoft Authenticator (RFC 6238 TOTP).</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Status Badge */}
                <div className="flex items-center gap-3">
                  {user?.mfaEnabled ? (
                    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                      <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-emerald-400">MFA Enabled</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Your account is protected with 2FA</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                      <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-amber-400">MFA Not Enabled</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Enable 2FA to secure your account</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                {user?.mfaEnabled ? (
                  <Button
                    type="button"
                    onClick={() => setShowMfaDeactivate(true)}
                    className="h-9 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600/80 to-red-600/80 hover:from-rose-500 hover:to-red-500 border border-rose-500/30 text-white shadow-sm cursor-pointer transition-all shrink-0"
                  >
                    Deactivate MFA
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setShowMfaWizard(true)}
                    className="h-9 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border border-violet-500/30 text-white shadow-sm cursor-pointer transition-all shrink-0"
                  >
                    Enable MFA
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Password Reset */}
        <motion.div variants={cardVariants}>
          <Card className="border border-white/[0.06] bg-white/[0.03] backdrop-blur-md rounded-2xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:shadow-[0_0_20px_rgba(16,185,129,0.08)] hover:border-emerald-500/20 transition-all duration-300">
            <CardHeader className="p-5">
              <CardTitle className="text-sm font-black flex items-center space-x-2 text-slate-200">
                <Key className="h-4.5 w-4.5 text-emerald-400" />
                <span>Update Password</span>
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-400">Reset your authenticated user session password.</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <form onSubmit={handlePasswordReset} className="space-y-5 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="h-10 w-full bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none transition-all placeholder:text-slate-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-10 w-full bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none transition-all placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirm New Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="h-10 w-full bg-white/[0.04] border border-white/[0.10] focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none transition-all placeholder:text-slate-500"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="h-10 px-5 rounded-xl shadow-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-500/30 text-white font-bold cursor-pointer transition-all"
                >
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>

    {/* MFA Setup Wizard */}
    <MfaWizard
      isOpen={showMfaWizard}
      onClose={() => setShowMfaWizard(false)}
      onSuccess={() => {
        // Update the local user state to reflect MFA is now enabled
        const currentUser = useAuthStore.getState().user
        if (currentUser) {
          useAuthStore.setState({ user: { ...currentUser, mfaEnabled: true } })
        }
        addToast("MFA successfully enabled! Your account is now protected.", "success")
      }}
    />

    {/* MFA Deactivate Modal */}
    <MfaDeactivateModal
      isOpen={showMfaDeactivate}
      onClose={() => setShowMfaDeactivate(false)}
      onSuccess={() => {
        addToast("MFA has been deactivated. You can re-enable it anytime.", "success")
      }}
    />
    </>
  )
}

