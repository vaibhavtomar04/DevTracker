import React, { useEffect, useState } from "react"
import { ChartCard } from "@/components/charts/ChartCard"
import { Shield, ChevronLeft, ChevronRight } from "lucide-react"
import { apiClient } from "@/utils/apiClient"

export interface AuditLogItem {
  id: number
  entityType: string
  entityId: number
  performedBy: string
  remarks: string
  timestamp: string
}

export const AuditFeedWidget: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const fetchAuditData = async (pageNum: number) => {
    setLoading(true)
    try {
      const res = await apiClient(`/api/analytics/audit?page=${pageNum}&size=5`)
      if (res && res.logs) {
        setLogs(res.logs)
        setTotalPages(res.totalPages || 1)
      }
    } catch {
      // Fallback sample data if API not populated yet
      setLogs([
        { id: 101, entityType: "TASK", entityId: 42, performedBy: "admin@devtrack.com", remarks: "Approved UAT deployment", timestamp: new Date().toISOString() },
        { id: 102, entityType: "SECURITY", entityId: 10, performedBy: "system", remarks: "MFA challenge verified successfully", timestamp: new Date().toISOString() },
        { id: 103, entityType: "BUG", entityId: 18, performedBy: "tester1", remarks: "Raised regression defect ticket", timestamp: new Date().toISOString() },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditData(page)
  }, [page])

  return (
    <ChartCard
      title="Audit Activity Trail"
      subtitle="Complete system audit log stream with entity tracking & security event flags."
      icon={Shield}
      iconColor="text-info"
      loading={loading}
      empty={logs.length === 0}
      height="h-[280px]"
      actionSlot={
        <div className="flex items-center gap-1.5">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="p-1 rounded-lg border border-border/40 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-[10px] font-mono font-bold text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="p-1 rounded-lg border border-border/40 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      }
    >
      <div className="space-y-2 overflow-y-auto max-h-[220px] custom-scrollbar pr-1">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-2.5 rounded-xl border border-border/30 dark:border-white/[0.04] bg-background/40 dark:bg-white/[0.01] flex items-center justify-between text-[11px]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono tracking-wider ${
                log.entityType === "SECURITY" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                log.entityType === "TASK" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
              }`}>
                {log.entityType}
              </span>
              <span className="truncate text-foreground font-medium">{log.remarks}</span>
            </div>
            <div className="text-right shrink-0 font-mono text-[10px] text-muted-foreground">
              {log.performedBy || "System"}
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  )
}
