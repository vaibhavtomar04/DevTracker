import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChartCard } from "@/components/charts/ChartCard"
import { Shield, ChevronLeft, ChevronRight, FileCode, ChevronDown, ChevronUp } from "lucide-react"
import { apiClient } from "@/utils/apiClient"

export interface AuditEntry {
  id: number
  actor: string
  action: string
  field: string
  from: string
  to: string
  when: string
}

export interface CrAuditGroup {
  crId: number
  crKey: string
  crTitle: string
  latestActivity: string
  entries: AuditEntry[]
}

interface AuditFeedWidgetProps {
  range?: string
  scope?: string
  sprintId?: string
  userId?: number
}

export const AuditFeedWidget: React.FC<AuditFeedWidgetProps> = ({
  range = "30d",
  scope = "all",
  sprintId = "all",
  userId,
}) => {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<CrAuditGroup[]>([])
  const [expandedCrIds, setExpandedCrIds] = useState<Set<number>>(new Set())
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const fetchAuditData = async (pageNum: number) => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      query.set("page", pageNum.toString())
      query.set("size", "5")
      if (range) query.set("range", range)
      if (scope) query.set("scope", scope)
      if (sprintId) query.set("sprintId", sprintId)
      if (userId) query.set("userId", userId.toString())

      const res = await apiClient(`/api/analytics/audit?${query.toString()}`)
      if (res && res.groups) {
        setGroups(res.groups)
        setTotalPages(res.totalPages || 1)
        // Automatically expand first CR group
        if (res.groups.length > 0) {
          setExpandedCrIds(new Set([res.groups[0].crId]))
        }
      } else {
        setGroups([])
      }
    } catch {
      setGroups([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditData(page)
  }, [page, range, scope, sprintId, userId])

  const toggleExpand = (crId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedCrIds((prev) => {
      const next = new Set(prev)
      if (next.has(crId)) {
        next.delete(crId)
      } else {
        next.add(crId)
      }
      return next
    })
  }

  return (
    <ChartCard
      title="Audit Activity Trail"
      subtitle="Change-request activity — all events linked to each CR"
      icon={Shield}
      iconColor="text-info"
      loading={loading}
      empty={groups.length === 0}
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
        {groups.map((group) => {
          const isExpanded = expandedCrIds.has(group.crId)

          return (
            <div
              key={group.crId}
              className="rounded-xl border border-border/30 dark:border-white/[0.04] bg-background/40 dark:bg-white/[0.01] overflow-hidden"
            >
              <div
                className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors text-[11px]"
                onClick={() => navigate("/dashboard/crs")}
                title="Click to view CR details"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode className="h-3.5 w-3.5 text-brand shrink-0" />
                  <span className="font-mono font-bold text-brand">{group.crKey}</span>
                  <span className="truncate text-foreground font-semibold max-w-[180px] sm:max-w-[260px]">
                    {group.crTitle}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand/10 text-brand border border-brand/20 font-mono">
                    {group.entries.length} events
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
                    {group.latestActivity ? new Date(group.latestActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                  </span>
                  <button
                    onClick={(e) => toggleExpand(group.crId, e)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-2.5 pt-1 space-y-1.5 border-t border-border/20 bg-black/10 dark:bg-white/[0.01]">
                  {group.entries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-foreground">{entry.actor}:</span>
                        <span className="truncate">{entry.action}</span>
                      </div>
                      <span className="font-mono shrink-0 text-[9px] opacity-75">
                        {entry.when ? new Date(entry.when).toLocaleDateString() : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}
