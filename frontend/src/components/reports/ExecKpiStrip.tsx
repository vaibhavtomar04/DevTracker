import React, { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { TrendingUp, Clock, Bug, ShieldCheck, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { apiClient } from "@/utils/apiClient"
import { CHART_PALETTE } from "@/components/charts/chartPalette"

export interface KpiItem {
  id: string
  title: string
  value: string
  deltaLabel: string
  deltaType: "increase" | "decrease" | "neutral"
  isPositive: boolean
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  badgeColor: string
  sparklineData: number[]
}

interface ExecKpiStripProps {
  range?: string
  scope?: string
  sprintId?: string
  userId?: number
  loading?: boolean
}

export const ExecKpiStrip: React.FC<ExecKpiStripProps> = ({
  range = "30d",
  scope = "all",
  sprintId = "all",
  userId,
  loading: initialLoading = false
}) => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(initialLoading)

  useEffect(() => {
    setLoading(true)
    const query = new URLSearchParams()
    if (range) query.set("range", range)
    if (scope) query.set("scope", scope)
    if (sprintId) query.set("sprintId", sprintId)
    if (userId) query.set("userId", userId.toString())

    apiClient(`/api/analytics/kpi?${query.toString()}`)
      .then((res) => {
        if (res) setData(res)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [range, scope, sprintId, userId])

  const formatDelta = (current: number, previous: number, unit: string = "") => {
    const diff = current - previous
    const sign = diff > 0 ? "+" : ""
    const formatted = Math.abs(diff) < 1 ? diff.toFixed(1) : Math.round(diff).toString()
    return `${sign}${formatted}${unit} vs prev period`
  }

  // Extract metrics from real endpoint payload
  const tp = data?.throughput || { current: 0, total: 0, previous: 0, series: [0, 0, 0, 0, 0, 0, 0] }
  const ct = data?.cycleTimeDays || { current: 0, previous: 0, series: [0, 0, 0, 0, 0, 0, 0] }
  const ed = data?.escapedDefects || { current: 0, previous: 0, pct: "0%", series: [0, 0, 0, 0, 0, 0, 0] }
  const sla = data?.slaCompliance || { current: 0, previous: 0, series: [0, 0, 0, 0, 0, 0, 0] }
  const wip = data?.activeWip || { current: 0, previous: 0, series: [0, 0, 0, 0, 0, 0, 0] }

  const tpDiff = tp.current - tp.previous
  const ctDiff = ct.current - ct.previous
  const edDiff = ed.current - ed.previous
  const slaDiff = sla.current - sla.previous
  const wipDiff = wip.current - wip.previous

  const items: KpiItem[] = [
    {
      id: "throughput",
      title: "Throughput",
      value: `${tp.current}/${tp.total}`,
      deltaLabel: formatDelta(tp.current, tp.previous),
      deltaType: tpDiff > 0 ? "increase" : tpDiff < 0 ? "decrease" : "neutral",
      isPositive: tpDiff >= 0,
      icon: TrendingUp,
      iconColor: "text-brand",
      badgeColor: "bg-brand/10 text-brand border-brand/20",
      sparklineData: tp.series || [0, 0, 0, 0, 0, 0, 0],
    },
    {
      id: "cycle_time",
      title: "Avg Cycle Time",
      value: `${ct.current}d`,
      deltaLabel: formatDelta(ct.current, ct.previous, "d"),
      deltaType: ctDiff > 0 ? "increase" : ctDiff < 0 ? "decrease" : "neutral",
      isPositive: ctDiff <= 0, // Down is good
      icon: Clock,
      iconColor: "text-dev",
      badgeColor: "bg-dev/10 text-dev-400 border-dev/20",
      sparklineData: ct.series || [0, 0, 0, 0, 0, 0, 0],
    },
    {
      id: "escaped_defects",
      title: "Escaped Defects",
      value: `${ed.current} (${ed.pct || "0%"})`,
      deltaLabel: formatDelta(ed.current, ed.previous),
      deltaType: edDiff > 0 ? "increase" : edDiff < 0 ? "decrease" : "neutral",
      isPositive: edDiff <= 0, // Down is good
      icon: Bug,
      iconColor: "text-danger",
      badgeColor: "bg-danger/10 text-danger border-danger/20",
      sparklineData: ed.series || [0, 0, 0, 0, 0, 0, 0],
    },
    {
      id: "sla_compliance",
      title: "SLA Compliance",
      value: `${sla.current}%`,
      deltaLabel: formatDelta(sla.current, sla.previous, "%"),
      deltaType: slaDiff > 0 ? "increase" : slaDiff < 0 ? "decrease" : "neutral",
      isPositive: slaDiff >= 0,
      icon: ShieldCheck,
      iconColor: "text-tester",
      badgeColor: "bg-tester/10 text-tester border-tester/20",
      sparklineData: sla.series || [0, 0, 0, 0, 0, 0, 0],
    },
    {
      id: "active_wip",
      title: "Active WIP",
      value: `${wip.current}`,
      deltaLabel: formatDelta(wip.current, wip.previous),
      deltaType: wipDiff > 0 ? "increase" : wipDiff < 0 ? "decrease" : "neutral",
      isPositive: wipDiff <= 0,
      icon: Zap,
      iconColor: "text-pending",
      badgeColor: "bg-pending/10 text-pending border-pending/20",
      sparklineData: wip.series || [0, 0, 0, 0, 0, 0, 0],
    },
  ]

  const renderSparkline = (sparklineData: number[], role: string) => {
    const color = CHART_PALETTE[role]?.fill || CHART_PALETTE.brand.fill
    const min = Math.min(...sparklineData)
    const max = Math.max(...sparklineData)
    const rangeVal = max - min || 1
    const width = 80
    const height = 24
    const points = sparklineData
      .map((val, i) => {
        const x = (i / (sparklineData.length - 1)) * width
        const y = height - ((val - min) / rangeVal) * (height - 4) - 2
        return `${x},${y}`
      })
      .join(" ")

    return (
      <svg className="w-20 h-6 overflow-visible opacity-80" viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {items.map((item) => {
        const IconComp = item.icon
        const role = item.id === "throughput" ? "brand" : item.id === "cycle_time" ? "dev" : item.id === "escaped_defects" ? "danger" : item.id === "sla_compliance" ? "tester" : "pending"

        return (
          <Card
            key={item.id}
            variant="glass"
            className="border-border/50 dark:border-white/[0.06] bg-card/40 dark:bg-white/[0.02] backdrop-blur-md p-4 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between"
          >
            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 w-24 bg-white/10 rounded" />
                <div className="h-7 w-16 bg-white/10 rounded" />
                <div className="h-3 w-28 bg-white/5 rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <span className="text-xs font-semibold text-muted-foreground tracking-wide">
                    {item.title}
                  </span>
                  <div className={`p-1.5 rounded-lg border ${item.badgeColor}`}>
                    <IconComp className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                    {item.value}
                  </span>
                  {renderSparkline(item.sparklineData, role)}
                </div>

                <div className="mt-2.5 flex items-center gap-1 text-[11px] font-medium">
                  {item.deltaType === "increase" ? (
                    <ArrowUpRight className={`h-3.5 w-3.5 ${item.isPositive ? "text-emerald-500" : "text-rose-500"}`} />
                  ) : item.deltaType === "decrease" ? (
                    <ArrowDownRight className={`h-3.5 w-3.5 ${item.isPositive ? "text-emerald-500" : "text-rose-500"}`} />
                  ) : null}
                  <span className={item.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                    {item.deltaLabel}
                  </span>
                </div>
              </>
            )}
          </Card>
        )
      })}
    </div>
  )
}
