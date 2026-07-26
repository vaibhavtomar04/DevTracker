import React, { Component, lazy, Suspense, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
import { useThemeStore } from "@/store/themeStore"
import DownloadPromptModal from "@/components/shared/DownloadPromptModal"
import { APP_CONFIG } from "@/config/appConfig"

// Lazy load page components for production code splitting
const LoginPage = lazy(() => import("@/pages/login"))
const SetNewPasswordPage = lazy(() => import("@/pages/setNewPassword"))
const ResetPasswordPage = lazy(() => import("@/pages/resetPassword"))
const AdminDashboard = lazy(() => import("@/pages/adminDashboard"))
const DeveloperDashboard = lazy(() => import("@/pages/developerDashboard"))
const TesterDashboard = lazy(() => import("@/pages/testerDashboard"))
const CrManagement = lazy(() => import("@/pages/crManagement"))
const CodeReviewPage = lazy(() => import("@/pages/codeReview"))
const Deployments = lazy(() => import("@/pages/deployments"))
const Reports = lazy(() => import("@/pages/reports"))
const Users = lazy(() => import("@/pages/users"))
const Audits = lazy(() => import("@/pages/audits"))
const Settings = lazy(() => import("@/pages/settings"))
const SprintsPage = lazy(() => import("@/pages/sprints"))
const DevelopersPage = lazy(() => import("@/pages/developers"))
const ApprovalCenter = lazy(() => import("@/pages/approvalCenter"))
const SprintTasksPage = lazy(() => import("@/pages/sprintTasks"))
const TestedCrsPage = lazy(() => import("@/pages/testedCrs"))
const MissedDeadlinesPage = lazy(() => import("@/pages/missedDeadlines"))
const RecognitionPage = lazy(() => import("@/pages/recognition"))
const LeaderboardPage = lazy(() => import("@/pages/leaderboard"))
const DashboardLayout = lazy(() => import("@/layouts/DashboardLayout"))


// Dynamic main workspace redirect depending on user roles
function RoleBasedWorkspace() {
  const { user } = useAuthStore()

  if (!user) return <Navigate to="/login" replace />

  // DEVADMIN / CODEREVIEWER landing
  if (user.roles.includes("DEVADMIN") || user.roles.includes("CODEREVIEWER")) {
    return <AdminDashboard />
  }

  // DEVELOPER landing
  if (user.roles.includes("DEVELOPER")) {
    return <DeveloperDashboard />
  }

  // TESTER / TESTADMIN landing
  if (user.roles.includes("TESTER") || user.roles.includes("TESTADMIN")) {
    return <TesterDashboard />
  }

  // Fallback
  return <DeveloperDashboard />
}

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, initialized, mustChangePassword } = useAuthStore()

  if (!initialized) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (mustChangePassword || user.mustChangePassword) {
    return <Navigate to="/set-new-password" replace />
  }

  if (allowedRoles && !allowedRoles.some(role => user.roles.includes(role))) {
    return <Navigate to="/dashboard" replace />
  }

  return <DashboardLayout>{children}</DashboardLayout>
}

import { Terminal, AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react"
import { motion } from "framer-motion"

// Premium Animated Loading Spinner
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground overflow-hidden relative">
      {/* Background ambient orbs */}
      <div className="absolute w-72 h-72 bg-primary/10 rounded-full blur-[100px]" />

      <div className="relative flex flex-col items-center z-10">
        {/* Pulsing rings and icon */}
        <div className="relative h-16 w-16 mb-6 flex items-center justify-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-primary/40"
              style={{ width: "100%", height: "100%" }}
              initial={{ scale: 0.6, opacity: 0.8 }}
              animate={{
                scale: [0.6, 1.8, 2.2],
                opacity: [0.8, 0.4, 0]
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                delay: i * 0.7,
                ease: "easeOut"
              }}
            />
          ))}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="relative h-12 w-12 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-[0_0_24px_rgba(var(--primary-rgb),0.4)]"
          >
            <Terminal className="h-5 w-5 text-white" />
          </motion.div>
        </div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-1.5"
        >
          <span className="text-sm font-black tracking-[0.2em] text-foreground uppercase font-mono">
            DEVTRACK
          </span>
          <span className="text-[10px] font-bold text-primary/80 tracking-widest uppercase animate-pulse">
            Loading Workspace...
          </span>
        </motion.div>
      </div>
    </div>
  )
}

// Error Boundary definition
interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background relative flex items-center justify-center p-6 overflow-hidden">
          {/* Ambient orbs */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-rose-500/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-violet-600/10 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-8 shadow-[0_24px_80px_rgba(0,0,0,0.5)] text-center">
            {/* Icon badge */}
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/20 to-fuchsia-500/10 border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.15)]">
              <AlertTriangle className="h-7 w-7 text-rose-400" strokeWidth={1.75} />
            </div>

            <h2 className="text-xl font-black tracking-tight text-foreground">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              This section hit an unexpected error. Your data is safe — try reloading, or head back to your dashboard.
            </p>

            {/* Actions */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 transition-opacity cursor-pointer shadow-lg shadow-violet-900/30"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reload Application
              </button>
              <button
                onClick={() => { window.location.href = (APP_CONFIG.contextPath || "") + "/dashboard" }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl border border-white/[0.1] bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <LayoutDashboard className="h-3.5 w-3.5" /> Back to Dashboard
              </button>
            </div>

            {/* Collapsible technical details */}
            {this.state.error && (
              <details className="mt-6 text-left group">
                <summary className="cursor-pointer select-none text-[11px] font-semibold text-muted-foreground/70 hover:text-muted-foreground transition-colors list-none flex items-center gap-1.5">
                  <span className="inline-block transition-transform group-open:rotate-90">▸</span>
                  Technical details
                </summary>
                <pre className="mt-3 text-[10px] text-rose-300/80 bg-black/40 border border-white/[0.06] p-3 rounded-xl overflow-auto max-h-40 font-mono select-all whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {"\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function App() {
  const { checkAuth, user, initialized } = useAuthStore()
  const { initTheme } = useThemeStore()

  useEffect(() => {
    initTheme()
    checkAuth()
  }, [])

  return (
    <ErrorBoundary>
      <Router basename={APP_CONFIG.contextPath || undefined}>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route
              path="/login"
              element={
                !initialized ? (
                  <LoadingSpinner />
                ) : user ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <LoginPage />
                )
              }
            />

            {/* Set New Password — forced first-login password reset */}
            <Route path="/set-new-password" element={<SetNewPasswordPage />} />

            {/* Reset Password — from email link */}
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected Dashboard Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <RoleBasedWorkspace />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/crs"
              element={
                <ProtectedRoute allowedRoles={["DEVELOPER", "DEVADMIN", "CODEREVIEWER"]}>
                  <CrManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/code-review"
              element={
                <ProtectedRoute allowedRoles={["DEVADMIN", "CODEREVIEWER"]}>
                  <CodeReviewPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/developers"
              element={
                <ProtectedRoute allowedRoles={["DEVADMIN", "CODEREVIEWER"]}>
                  <DevelopersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/testing"
              element={
                <ProtectedRoute allowedRoles={["TESTER", "TESTADMIN", "DEVADMIN"]}>
                  <TesterDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/deployments"
              element={
                <ProtectedRoute allowedRoles={["DEVADMIN", "TESTADMIN", "DEVELOPER", "TESTER"]}>
                  <Deployments />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/reports"
              element={
                <ProtectedRoute allowedRoles={["DEVADMIN", "TESTADMIN"]}>
                  <Reports />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/users"
              element={
                <ProtectedRoute allowedRoles={["DEVADMIN", "TESTADMIN"]}>
                  <Users />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/audits"
              element={
                <ProtectedRoute allowedRoles={["DEVADMIN", "TESTADMIN"]}>
                  <Audits />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/settings"
              element={
                <ProtectedRoute allowedRoles={["DEVADMIN", "TESTADMIN", "DEVELOPER", "TESTER"]}>
                  <Settings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/sprints"
              element={
                <ProtectedRoute allowedRoles={["DEVADMIN", "TESTADMIN", "DEVELOPER", "TESTER", "CODEREVIEWER"]}>
                  <SprintsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/sprint-tasks"
              element={
                <ProtectedRoute allowedRoles={["DEVADMIN", "TESTADMIN", "DEVELOPER", "TESTER", "CODEREVIEWER"]}>
                  <SprintTasksPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/tested-crs"
              element={
                <ProtectedRoute allowedRoles={["DEVADMIN", "TESTADMIN", "TESTER"]}>
                  <TestedCrsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/missed-deadlines"
              element={
                <ProtectedRoute allowedRoles={["DEVADMIN", "CODEREVIEWER"]}>
                  <MissedDeadlinesPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/approvals"
              element={
                <ProtectedRoute allowedRoles={["DEVADMIN", "TESTADMIN", "DEVELOPER", "TESTER", "CODEREVIEWER"]}>
                  <ApprovalCenter />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/recognition"
              element={
                <ProtectedRoute allowedRoles={["DEVADMIN", "TESTADMIN", "DEVELOPER", "TESTER", "CODEREVIEWER"]}>
                  <RecognitionPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/leaderboard"
              element={
                <ProtectedRoute allowedRoles={["DEVADMIN", "TESTADMIN", "DEVELOPER", "TESTER", "CODEREVIEWER"]}>
                  <LeaderboardPage />
                </ProtectedRoute>
              }
            />

            {/* Global Fallback */}
            <Route
              path="*"
              element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
            />
          </Routes>
          <DownloadPromptModal />
        </Suspense>
      </Router>
    </ErrorBoundary>
  )
}

export default App
