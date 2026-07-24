import { useEffect, useState } from "react"
import { useTaskStore } from "@/store/taskStore"
import { useAuthStore } from "@/store/authStore"
import { apiClient } from "@/utils/apiClient"
import { getAssignedDevNames } from "@/utils/devUtils"
import APP_CONFIG from "@/config/appConfig"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  FileDown,
  Download,
  Users,
  Bug,
  Activity,
  FileText,
  FileCheck,
  TrendingUp
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts"
import { motion } from "framer-motion"

export default function Reports() {
  const { tasks, bugs, fetchData, setDownloadTarget } = useTaskStore()
  const [exporting, setExporting] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [deadlineAnalytics, setDeadlineAnalytics] = useState<any>(null)

  const getSlabadge = (rate: number | null) => {
    if (rate === null) return null;
    if (rate >= 80) {
      return <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/5">Optimal</span>;
    } else if (rate >= 60) {
      return <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm shadow-cyan-500/5">Acceptable</span>;
    } else {
      return <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-sm shadow-rose-500/5">At Risk</span>;
    }
  }

  useEffect(() => {
    fetchData()
    apiClient("/api/analytics/dashboard")
      .then(data => setAnalytics(data))
      .catch(() => {})
    apiClient("/api/analytics/deadlines")
      .then(data => setDeadlineAnalytics(data))
      .catch(() => {})
  }, [])

  // 1. Developer Productivity Chart Data
  // Group efforts by developer
  const devProductivity: Record<string, { name: string; efforts: number; tasks: number }> = {}
  tasks.forEach(t => {
    const devName = getAssignedDevNames(t)
    if (devName && devName !== "Unassigned") {
      if (!devProductivity[devName]) {
        devProductivity[devName] = { name: devName, efforts: 0, tasks: 0 }
      }
      devProductivity[devName].efforts += (t.efforts || 0)
      devProductivity[devName].tasks += 1
    }
  })
  const devProductivityData = Object.values(devProductivity)

  // 2. Testing report: Bugs against Developer vs Solved
  const devBugs: Record<string, { name: string; raised: number; solved: number }> = {}
  bugs.forEach(b => {
    const devName = getAssignedDevNames(b.bugTask || b)
    if (devName && devName !== "Unassigned") {
      if (!devBugs[devName]) {
        devBugs[devName] = { name: devName, raised: 0, solved: 0 }
      }
      devBugs[devName].raised += 1
      if (b.status === "RESOLVED" || b.status === "VERIFIED" || b.status === "CLOSED") {
        devBugs[devName].solved += 1
      }
    }
  })
  const devBugsData = Object.values(devBugs)

  const handleExport = async (format: "pdf" | "xlsx" | "csv") => {
    setExporting(format)
    try {
      if (format === "csv") {
        const res = await fetch(`${APP_CONFIG.apiUrl}/api/analytics/dashboard`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        const analytics = res.ok ? await res.json() : null;
        let content = "Developer Productivity,Efforts (Days),Completed Tasks\n" + 
                      devProductivityData.map(d => `"${d.name}",${d.efforts},${d.tasks}`).join("\n")
        
        if (analytics) {
          content += "\n\nSLA & Operational Analytics,Value\n" +
                     `"Total CRs",${analytics.totalCRs}\n` +
                     `"Total Bugs",${analytics.totalBugs}\n` +
                     `"Quality Risks Flagged",${analytics.qualityRiskCrCount}\n` +
                     `"Bug Acceptance %",${analytics.bugAcceptanceRate}%\n` +
                     `"Bug Rejection %",${analytics.bugRejectionRate}%\n` +
                     `"Bug Challenge %",${analytics.bugChallengeRate}%\n` +
                     `"Avg Bug Resolution (Hours)",${analytics.averageBugResolutionHours}\n` +
                     `"Avg Testing Duration (Hours)",${analytics.averageTestingDurationHours}\n` +
                     `"Sprint Task Completion %",${analytics.sprintTaskCompletionRate}%\n` +
                     `"Testing SLA (48h) Compliance %",${analytics.testingSlaComplianceRate}%\n` +
                     `"Approval SLA (24h) Compliance %",${analytics.approvalSlaComplianceRate}%\n`;
        }
        const base64Data = "data:text/csv;base64," + btoa(unescape(encodeURIComponent(content)))
        setDownloadTarget({
          base64Data,
          defaultFileName: `DevTracker_Report_${Date.now()}.csv`
        })
        setExporting(null)
      } else if (format === "pdf") {
        // PDF Visual Graph Capture via html2canvas & jsPDF
        const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
          import("jspdf"),
          import("html2canvas")
        ])
        const el = document.getElementById("reports-dashboard-root")
        if (el) {
          const canvas = await html2canvas(el, { backgroundColor: "#080b18", scale: 1.5 })
          const imgData = canvas.toDataURL("image/png")
          const pdf = new jsPDF({ 
            orientation: "landscape", 
            unit: "px", 
            format: [canvas.width / 1.5, canvas.height / 1.5] 
          })
          pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 1.5, canvas.height / 1.5)
          const base64Data = pdf.output("datauristring")
          setDownloadTarget({ 
            base64Data, 
            defaultFileName: `DevTracker_Report_${Date.now()}.pdf` 
          })
        }
        setExporting(null)
      } else if (format === "xlsx") {
        // Backend Asynchronous Excel Report
        const body = await apiClient("/api/reports/export?type=ANALYTICS", {
          method: "POST"
        });
        const jobId = body.jobId;

        // Poll status
        const interval = setInterval(async () => {
          try {
            const job = await apiClient(`/api/reports/jobs/${jobId}`);

            if (job.status === "READY") {
              clearInterval(interval)
              setExporting(null)

              // Fetch the file as blob using raw fetch (needs Bearer token from authStore)
              const fileRes = await fetch(`${APP_CONFIG.apiUrl}/api/reports/download/${job.downloadToken}`, {
                headers: { Authorization: `Bearer ${useAuthStore.getState().token || localStorage.getItem("token")}` }
              });
              if (!fileRes.ok) throw new Error("Failed to download file");
              const blob = await fileRes.blob();

              // Convert to base64 Data URL to prompt modal download
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64Data = reader.result as string;
                setDownloadTarget({
                  base64Data,
                  defaultFileName: `DevTracker_Report_${Date.now()}.xlsx`
                });
              };
              reader.readAsDataURL(blob);

            } else if (job.status === "FAILED") {
              clearInterval(interval)
              setExporting(null)
              alert(`Excel export failed: ${job.errorReason || "Unknown reason"}`)
            }
          } catch (pollErr: any) {
            clearInterval(interval)
            setExporting(null)
            alert("Error polling report status: " + pollErr.message)
          }
        }, 2000);
      } else if (format === "deadline_xlsx") {
        const body = await apiClient("/api/reports/export?type=DEADLINE", {
          method: "POST"
        });
        const jobId = body.jobId;

        const interval = setInterval(async () => {
          try {
            const job = await apiClient(`/api/reports/jobs/${jobId}`);

            if (job.status === "READY") {
              clearInterval(interval)
              setExporting(null)

              const fileRes = await fetch(`${APP_CONFIG.apiUrl}/api/reports/download/${job.downloadToken}`, {
                headers: { Authorization: `Bearer ${useAuthStore.getState().token || localStorage.getItem("token")}` }
              });
              if (!fileRes.ok) throw new Error("Failed to download file");
              const blob = await fileRes.blob();

              const reader = new FileReader();
              reader.onloadend = () => {
                const base64Data = reader.result as string;
                setDownloadTarget({
                  base64Data,
                  defaultFileName: `Deployment_Deadline_Report_${Date.now()}.xlsx`
                });
              };
              reader.readAsDataURL(blob);

            } else if (job.status === "FAILED") {
              clearInterval(interval)
              setExporting(null)
              alert(`Deadline report export failed: ${job.errorReason || "Unknown reason"}`)
            }
          } catch (pollErr: any) {
            clearInterval(interval)
            setExporting(null)
            alert("Error polling report status: " + pollErr.message)
          }
        }, 2000);
      }
    } catch (err: any) {
      setExporting(null)
      alert("Export failed: " + err.message)
    }
  }

  // 3. Category distribution (Pie Chart)
  const categories: Record<string, number> = {}
  tasks.forEach(t => {
    const typeName = t.type?.name || "CR"
    categories[typeName] = (categories[typeName] || 0) + 1
  })
  const pieData = Object.entries(categories).map(([name, value]) => ({ name, value }))
  
  const COLORS = ["#8b5cf6", "#6366f1", "#06b6d4", "#10b981"]

  // Framer Motion configuration
  const gridVariants = {
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
    show: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring" as const, stiffness: 100, damping: 15 }
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4 sm:px-6" id="reports-dashboard-root">
      {/* Top Header & Exporters */}
      <div className="relative overflow-hidden p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute top-0 right-0 w-80 h-32 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-60 h-24 bg-violet-600/5 blur-[80px] rounded-full pointer-events-none" />

        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 shadow-[0_0_15px_rgba(124,58,237,0.15)]">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              System <span className="text-glow font-extrabold">Throughput Reports</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
              Analyze developer velocities, regression defect scopes, and operation SLA benchmarks.
            </p>
          </div>
        </div>

        {/* Exporters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="text-[11px] h-8 border-white/10 hover:border-white/20 bg-white/5 text-slate-200 transition-colors w-full sm:w-auto"
            disabled={!!exporting}
            onClick={() => handleExport("csv")}
          >
            {exporting === "csv" ? (
              <span className="flex items-center gap-1">Exporting...</span>
            ) : (
              <>
                <Download className="mr-1 h-3.5 w-3.5 text-cyan-400" />
                <span>Export CSV</span>
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-[11px] h-8 border-white/10 hover:border-white/20 bg-white/5 text-slate-200 transition-colors w-full sm:w-auto"
            disabled={!!exporting}
            onClick={() => handleExport("xlsx")}
          >
            {exporting === "xlsx" ? (
              <span className="flex items-center gap-1">Exporting...</span>
            ) : (
              <>
                <FileDown className="mr-1 h-3.5 w-3.5 text-emerald-400" />
                <span>Export Excel</span>
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-[11px] h-8 border-rose-500/20 hover:border-rose-500/40 bg-rose-500/10 text-rose-300 transition-colors w-full sm:w-auto"
            disabled={!!exporting}
            onClick={() => handleExport("deadline_xlsx" as any)}
          >
            {exporting === "deadline_xlsx" ? (
              <span className="flex items-center gap-1">Exporting...</span>
            ) : (
              <>
                <FileDown className="mr-1 h-3.5 w-3.5 text-rose-400" />
                <span>Export Deadline Report</span>
              </>
            )}
          </Button>
          <Button
            variant="glow"
            size="sm"
            className="text-[11px] h-8 w-full sm:w-auto shadow-md"
            disabled={!!exporting}
            onClick={() => handleExport("pdf")}
          >
            {exporting === "pdf" ? (
              <span>Exporting PDF...</span>
            ) : (
              <>
                <FileText className="mr-1.5 h-3.5 w-3.5 text-white" />
                <span>Export PDF Summary</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <motion.div 
        variants={gridVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        
        {/* Developer Productivity Card */}
        <motion.div variants={cardVariants}>
          <Card variant="glass" className="border-white/[0.06] bg-white/[0.02] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden rounded-2xl h-full flex flex-col">
            <CardHeader className="p-5 border-b border-white/[0.06] shrink-0">
              <CardTitle className="text-sm font-bold flex items-center space-x-2 text-white">
                <Users className="h-4 w-4 text-violet-400" />
                <span>Developer Productivity Analysis</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Compare total development efforts (days) and completed tasks delivered per engineer.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 flex-1 min-h-[380px] flex flex-col justify-between">
              {devProductivityData.length === 0 ? (
                <div className="text-xs text-muted-foreground/60 font-semibold py-12 text-center w-full">
                  No developer efforts logged yet.
                </div>
              ) : (
                <>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={devProductivityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="effortsGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.25}/>
                          </linearGradient>
                          <linearGradient id="tasksGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.25}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ 
                            background: "rgba(7, 10, 20, 0.85)", 
                            border: "1px solid rgba(255,255,255,0.08)", 
                            borderRadius: "12px", 
                            fontSize: "11px", 
                            color: "white",
                            backdropFilter: "blur(12px)",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "10px", color: "#94a3b8", paddingTop: "5px" }} />
                        <Bar dataKey="efforts" name="Logged Efforts (days)" fill="url(#effortsGrad)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="tasks" name="Completed Tasks" fill="url(#tasksGrad)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Precision Data Table */}
                  <div className="mt-4 border-t border-white/[0.06] pt-3 overflow-y-auto max-h-[120px] custom-scrollbar">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="text-muted-foreground border-b border-white/[0.04]">
                          <th className="pb-1.5 font-bold uppercase tracking-wider">Developer</th>
                          <th className="pb-1.5 font-bold uppercase tracking-wider text-right">Efforts (Days)</th>
                          <th className="pb-1.5 font-bold uppercase tracking-wider text-right">Completed Tasks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02]">
                        {devProductivityData.map((d) => (
                          <tr key={d.name} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-1 font-semibold text-slate-200">{d.name}</td>
                            <td className="py-1 text-right font-mono text-violet-400">{d.efforts.toFixed(1)}</td>
                            <td className="py-1 text-right font-mono text-cyan-400">{d.tasks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Defect resolution report */}
        <motion.div variants={cardVariants}>
          <Card variant="glass" className="border-white/[0.06] bg-white/[0.02] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden rounded-2xl h-full flex flex-col">
            <CardHeader className="p-5 border-b border-white/[0.06] shrink-0">
              <CardTitle className="text-sm font-bold flex items-center space-x-2 text-white">
                <Bug className="h-4 w-4 text-rose-400" />
                <span>Defect Resolution Metrics</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Bugs raised vs. solved ratio mapped per developer.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 flex-1 min-h-[380px] flex flex-col justify-between">
              {devBugsData.length === 0 ? (
                <div className="text-xs text-muted-foreground/60 font-semibold py-12 text-center w-full">
                  No active bug tickets logged in system.
                </div>
              ) : (
                <>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={devBugsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ 
                            background: "rgba(7, 10, 20, 0.85)", 
                            border: "1px solid rgba(255,255,255,0.08)", 
                            borderRadius: "12px", 
                            fontSize: "11px", 
                            color: "white",
                            backdropFilter: "blur(12px)",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "10px", color: "#94a3b8", paddingTop: "5px" }} />
                        <Line type="monotone" dataKey="raised" name="Defects Raised" stroke="#f43f5e" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 3, strokeWidth: 1 }} />
                        <Line type="monotone" dataKey="solved" name="Defects Resolved" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 1 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Precision Data Table */}
                  <div className="mt-4 border-t border-white/[0.06] pt-3 overflow-y-auto max-h-[120px] custom-scrollbar">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="text-muted-foreground border-b border-white/[0.04]">
                          <th className="pb-1.5 font-bold uppercase tracking-wider">Developer</th>
                          <th className="pb-1.5 font-bold uppercase tracking-wider text-right">Raised</th>
                          <th className="pb-1.5 font-bold uppercase tracking-wider text-right">Resolved</th>
                          <th className="pb-1.5 font-bold uppercase tracking-wider text-right">Resolution Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02]">
                        {devBugsData.map((d) => {
                          const rate = d.raised > 0 ? (d.solved / d.raised) * 100 : 0;
                          return (
                            <tr key={d.name} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-1 font-semibold text-slate-200">{d.name}</td>
                              <td className="py-1 text-right font-mono text-rose-400">{d.raised}</td>
                              <td className="py-1 text-right font-mono text-emerald-400">{d.solved}</td>
                              <td className="py-1 text-right font-mono">
                                <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold ${
                                  rate >= 80 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                  rate >= 50 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                  "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                }`}>
                                  {rate.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Category distribution (Pie Chart) */}
        <motion.div variants={cardVariants}>
          <Card variant="glass" className="border-white/[0.06] bg-white/[0.02] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden rounded-2xl h-full flex flex-col">
            <CardHeader className="p-5 border-b border-white/[0.06] shrink-0">
              <CardTitle className="text-sm font-bold flex items-center space-x-2 text-white">
                <Activity className="h-4 w-4 text-indigo-400" />
                <span>CR Category Allocation</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Task category distribution ratios (Change Requests, Bug Fixes, New Requirements, Service Requests).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-1 min-h-[250px] flex items-center justify-center">
              {pieData.length === 0 ? (
                <span className="text-xs text-muted-foreground/60 font-semibold py-12">No tasks available to plot.</span>
              ) : (
                <div className="w-full h-full flex flex-col sm:flex-row items-center justify-around gap-4">
                  <div className="w-44 h-44 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ 
                            background: "rgba(7, 10, 20, 0.85)", 
                            border: "1px solid rgba(255,255,255,0.08)", 
                            borderRadius: "12px", 
                            fontSize: "11px", 
                            color: "white",
                            backdropFilter: "blur(12px)"
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Labels legend */}
                  <div className="space-y-2 text-[10px] font-semibold text-slate-300 text-left border border-white/[0.04] bg-white/[0.01] p-4 rounded-xl shadow-inner w-full sm:w-auto">
                    {pieData.map((d, i) => (
                      <div key={d.name} className="flex items-center space-x-2.5">
                        <div className="h-2.5 w-2.5 rounded-full shadow" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-white text-xs">{d.name}:</span>
                        <span className="text-muted-foreground font-mono">{d.value} Tasks</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Audit metrics / SLA benchmarks */}
        <motion.div variants={cardVariants}>
          <Card variant="glass" className="border-white/[0.06] bg-white/[0.02] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden rounded-2xl h-full flex flex-col">
            <CardHeader className="p-5 border-b border-white/[0.06] shrink-0">
              <CardTitle className="text-sm font-bold flex items-center space-x-2 text-white">
                <FileCheck className="h-4 w-4 text-emerald-400" />
                <span>SLA Performance Benchmarks</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Overall operational benchmarks for release SLA approvals and pipeline compliance.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 flex-1 flex flex-col justify-center space-y-5">
              {/* SLA Benchmark 1 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-200">
                  <span>Testing SLA (48h) Compliance Rate</span>
                  <div className="flex items-center space-x-2">
                    {getSlabadge(analytics ? analytics.testingSlaComplianceRate : null)}
                    <span className="text-emerald-400 font-mono">
                      {analytics !== null ? `${analytics.testingSlaComplianceRate}%` : "Loading..."}
                    </span>
                  </div>
                </div>
                <div className="h-2.5 w-full bg-white/[0.04] border border-white/[0.06] rounded-full overflow-hidden p-[1px]">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: analytics !== null ? `${analytics.testingSlaComplianceRate}%` : "0%" }} 
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full" 
                  />
                </div>
              </div>

              {/* SLA Benchmark 2 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-200">
                  <span>Approval SLA (24h) Compliance Rate</span>
                  <div className="flex items-center space-x-2">
                    {getSlabadge(analytics ? analytics.approvalSlaComplianceRate : null)}
                    <span className="text-cyan-400 font-mono">
                      {analytics !== null ? `${analytics.approvalSlaComplianceRate}%` : "Loading..."}
                    </span>
                  </div>
                </div>
                <div className="h-2.5 w-full bg-white/[0.04] border border-white/[0.06] rounded-full overflow-hidden p-[1px]">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: analytics !== null ? `${analytics.approvalSlaComplianceRate}%` : "0%" }} 
                    transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full" 
                  />
                </div>
              </div>

              {/* SLA Benchmark 3 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-200">
                  <span>Sprint Task Completion Rate</span>
                  <div className="flex items-center space-x-2">
                    {getSlabadge(analytics ? analytics.sprintTaskCompletionRate : null)}
                    <span className="text-amber-400 font-mono">
                      {analytics !== null ? `${analytics.sprintTaskCompletionRate}%` : "Loading..."}
                    </span>
                  </div>
                </div>
                <div className="h-2.5 w-full bg-white/[0.04] border border-white/[0.06] rounded-full overflow-hidden p-[1px]">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: analytics !== null ? `${analytics.sprintTaskCompletionRate}%` : "0%" }} 
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-amber-500 to-violet-500 rounded-full" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Deployment Delay & SLA Analytics Card */}
        <motion.div variants={cardVariants} className="col-span-full">
          <Card variant="glass" className="border-white/[0.06] bg-white/[0.02] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden rounded-2xl">
            <CardHeader className="p-5 border-b border-white/[0.06]">
              <CardTitle className="text-sm font-bold flex items-center space-x-2 text-white">
                <FileCheck className="h-4 w-4 text-rose-400" />
                <span>Deployment Deadline Delay & SLA Analytics</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Comprehensive tracking of average delays, longest delays, and project/developer ranking for SIT and UAT deployment commitments.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl border border-white/[0.04] bg-black/30 text-left">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Avg SIT Delay</span>
                  <span className="text-xl font-black text-rose-400 mt-1 block">{deadlineAnalytics?.averageSitDelay ?? 0} Days</span>
                </div>
                <div className="p-3.5 rounded-xl border border-white/[0.04] bg-black/30 text-left">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Avg UAT Delay</span>
                  <span className="text-xl font-black text-rose-400 mt-1 block">{deadlineAnalytics?.averageUatDelay ?? 0} Days</span>
                </div>
                <div className="p-3.5 rounded-xl border border-white/[0.04] bg-black/30 text-left">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Longest SIT Delay</span>
                  <span className="text-xl font-black text-amber-400 mt-1 block">{deadlineAnalytics?.longestSitDelay ?? 0} Days</span>
                </div>
                <div className="p-3.5 rounded-xl border border-white/[0.04] bg-black/30 text-left">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Longest UAT Delay</span>
                  <span className="text-xl font-black text-amber-400 mt-1 block">{deadlineAnalytics?.longestUatDelay ?? 0} Days</span>
                </div>
              </div>

              {/* Rankings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Project Delay Ranking */}
                <div className="space-y-3 text-left">
                  <h4 className="text-xs font-bold uppercase text-slate-300 tracking-wider">Project Delay Ranking</h4>
                  <div className="border border-white/[0.04] rounded-xl overflow-hidden bg-black/20 text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.04] bg-white/[0.02] text-[10px] text-muted-foreground uppercase font-bold">
                          <th className="p-2.5">Project</th>
                          <th className="p-2.5 text-right">Avg Delay (Days)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02]">
                        {(deadlineAnalytics?.projectDelayRanking || []).length === 0 ? (
                          <tr><td colSpan={2} className="p-4 text-center text-muted-foreground italic">No data available.</td></tr>
                        ) : (
                          (deadlineAnalytics?.projectDelayRanking || []).slice(0, 5).map((p: any) => (
                            <tr key={p.project} className="hover:bg-white/[0.02]">
                              <td className="p-2.5 font-semibold text-slate-200">{p.project}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-rose-400">{p.avgDelay}d</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Developer Delay Ranking */}
                <div className="space-y-3 text-left">
                  <h4 className="text-xs font-bold uppercase text-slate-300 tracking-wider">Developer Delay Ranking</h4>
                  <div className="border border-white/[0.04] rounded-xl overflow-hidden bg-black/20 text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.04] bg-white/[0.02] text-[10px] text-muted-foreground uppercase font-bold">
                          <th className="p-2.5">Developer</th>
                          <th className="p-2.5 text-right">Avg Delay (Days)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02]">
                        {(deadlineAnalytics?.developerDelayRanking || []).length === 0 ? (
                          <tr><td colSpan={2} className="p-4 text-center text-muted-foreground italic">No data available.</td></tr>
                        ) : (
                          (deadlineAnalytics?.developerDelayRanking || []).slice(0, 5).map((d: any) => (
                            <tr key={d.developer} className="hover:bg-white/[0.02]">
                              <td className="p-2.5 font-semibold text-slate-200">{d.developer}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-rose-400">{d.avgDelay}d</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
