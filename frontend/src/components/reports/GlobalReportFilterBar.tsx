import React from "react"
import { useSearchParams } from "react-router-dom"
import { Calendar, Filter, Users, Layers, AlertCircle } from "lucide-react"
import { useSprintStore } from "@/store/sprintStore"

interface GlobalReportFilterBarProps {
  hasActiveSprint: boolean
  activeSprintName?: string
  className?: string
}

export const GlobalReportFilterBar: React.FC<GlobalReportFilterBarProps> = ({
  hasActiveSprint,
  activeSprintName,
  className = "",
}) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { sprints } = useSprintStore()

  const range = searchParams.get("range") || "30d"
  const scope = searchParams.get("scope") || "all"
  const sprintId = searchParams.get("sprintId") || (hasActiveSprint ? "active" : "all")

  // Each filter's own default. A param is cleared from the URL only when it
  // equals THIS key's default — not whenever the value happens to be "all".
  const DEFAULTS: Record<string, string> = { range: "30d", scope: "all", sprintId: "all" }

  const updateFilter = (key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams)
    if (value === DEFAULTS[key]) {
      nextParams.delete(key)
    } else {
      nextParams.set(key, value)
    }
    setSearchParams(nextParams)
  }

  return (
    <div className={`p-3 rounded-2xl border border-border/50 dark:border-white/[0.06] bg-card/40 dark:bg-white/[0.02] backdrop-blur-md shadow-md flex flex-wrap items-center justify-between gap-3 text-xs ${className}`}>
      <div className="flex items-center gap-2 text-muted-foreground font-bold tracking-wider uppercase text-[10px]">
        <Filter className="h-3.5 w-3.5 text-brand" />
        <span>Global Filters:</span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Date Range Selector */}
        <div className="flex items-center gap-1.5 bg-background/60 dark:bg-black/30 border border-border/40 dark:border-white/[0.08] rounded-xl px-2.5 py-1">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Range:</span>
          <select
            value={range}
            onChange={(e) => updateFilter("range", e.target.value)}
            className="bg-transparent text-foreground font-semibold text-xs outline-none cursor-pointer"
          >
            <option value="7d" className="bg-background text-foreground">Last 7 Days</option>
            <option value="30d" className="bg-background text-foreground">Last 30 Days</option>
            <option value="90d" className="bg-background text-foreground">Last 90 Days</option>
            <option value="all" className="bg-background text-foreground">All Time</option>
          </select>
        </div>

        {/* Scope Selector */}
        <div className="flex items-center gap-1.5 bg-background/60 dark:bg-black/30 border border-border/40 dark:border-white/[0.08] rounded-xl px-2.5 py-1">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Scope:</span>
          <select
            value={scope}
            onChange={(e) => updateFilter("scope", e.target.value)}
            className="bg-transparent text-foreground font-semibold text-xs outline-none cursor-pointer"
          >
            <option value="all" className="bg-background text-foreground">All Teams</option>
            <option value="my" className="bg-background text-foreground">My Assigned Work</option>
          </select>
        </div>

        {/* Sprint Selector */}
        <div className="flex items-center gap-1.5 bg-background/60 dark:bg-black/30 border border-border/40 dark:border-white/[0.08] rounded-xl px-2.5 py-1">
          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Sprint:</span>
          <select
            disabled={!hasActiveSprint && sprints.length === 0}
            value={sprintId}
            onChange={(e) => updateFilter("sprintId", e.target.value)}
            className="bg-transparent text-foreground font-semibold text-xs outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {hasActiveSprint && (
              <option value="active" className="bg-background text-foreground font-bold">
                Active ({activeSprintName || "Current"})
              </option>
            )}
            <option value="all" className="bg-background text-foreground">All Sprints</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id.toString()} className="bg-background text-foreground">
                {s.name} ({s.status})
              </option>
            ))}
          </select>
          {!hasActiveSprint && (
            <span className="text-[10px] text-amber-500 font-medium flex items-center gap-1 ml-1" title="No active sprint running currently">
              <AlertCircle className="h-3 w-3" />
              <span>No active sprint</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
