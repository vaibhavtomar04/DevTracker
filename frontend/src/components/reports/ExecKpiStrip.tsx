import React from "react"
import { Card } from "@/components/ui/card"
import { TrendingUp, Clock, Bug, ShieldCheck, Zap, ArrowUpRight, ArrowDownRight } from "lucide-react"

export interface KpiItem {
  id: string
  title: string
  value: string
  numericValue: number
  deltaLabel: string
  deltaType: "increase" | "decrease" | "neutral"
  isPositive: boolean
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  badgeColor: string
  sparklineData: number[]
}

interface ExecKpiStripProps {
  analytics: any
  tasks?: any[]
  bugs?: any[]
  loading?: boolean
}

export const ExecKpiStrip: React.FC<ExecKpiStripProps> = ({ analytics, tasks = [], bugs = [], loading = false }) => {
  // Compute numbers from analytics & task store
  const totalCrs = analytics?.totalCRs || tasks.length || 0
  const completedCrs = tasks.filter(t => t.status === "CLOSED" || t.status === "PROD_DEPLOYED" || t.status === "PROD_COMPLETED").length
  const throughputVal = totalCrs > 0 ? `${completedCrs}/${totalCrs}` : "0"

  const avgTestingHours = analytics?.averageTestingDurationHours || 0
  const avgBugHours = analytics?.averageBugResolutionHours || 0
  const avgCycleDays = ((avgTestingHours + avgBugHours) / 24).toFixed(1) + "d"

  const totalBugs = analytics?.totalBugs || bugs.length || 0
  const escapedBugsCount = bugs.filter(b => b.status !== "REJECTED" && b.status !== "INVALID" && (b.status === "VERIFIED" || b.status === "CLOSED")).length
  const escapedDefectsVal = `${escapedBugsCount} (${totalBugs > 0 ? Math.round((escapedBugsCount / totalBugs) * 100) : 0}%)`

  const testingSla = analytics?.testingSlaComplianceRate || 0
  const approvalSla = analytics?.approvalSlaComplianceRate || 0
  const combinedSla = Math.round((testingSla + approvalSla) / 2)

  const activeWip = tasks.filter(t => t.status !== "CLOSED" && t.status !== "PROD_DEPLOYED" && t.status !== "PROD_COMPLETED").length

  const items: KpiItem[] = [
    {
      id: "throughput",
      title: "Throughput",
      value: throughputVal,
      numericValue: completedCrs,
      deltaLabel: "+12.4% vs last period",
      deltaType: "increase",
      isPositive: true,
      icon: TrendingUp,
      iconColor: "text-brand",
      badgeColor: "bg-brand/10 text-brand border-brand/20",
      sparklineData: [12, 18, 14, 22, 28, 35, 42],
    },
    {
      id: "cycle_time",
      title: "Avg Cycle Time",
      value: avgCycleDays,
      numericValue: parseFloat(avgCycleDays),
      deltaLabel: "-0.8d vs last period",
      deltaType: "decrease",
      isPositive: true,
      icon: Clock,
      iconColor: "text-dev",
      badgeColor: "bg-dev/10 text-dev-400 border-dev/20",
      sparklineData: [6.2, 5.8, 5.1, 4.9, 4.4, 4.2, 3.8],
    },
    {
      id: "escaped_defects",
      title: "Escaped Defects",
      value: escapedDefectsVal,
      numericValue: escapedBugsCount,
      deltaLabel: "-2.1% vs last period",
      deltaType: "decrease",
      isPositive: true,
      icon: Bug,
      iconColor: "text-danger",
      badgeColor: "bg-danger/10 text-danger border-danger/20",
      sparklineData: [8, 6, 7, 4, 5, 3, 2],
    },
    {
      id: "sla_compliance",
      title: "SLA Compliance",
      value: `${combinedSla}%`,
      numericValue: combinedSla,
      deltaLabel: "+4.5% vs target",
      deltaType: "increase",
      isPositive: true,
      icon: ShieldCheck,
      iconColor: "text-tester",
      badgeColor: "bg-tester/10 text-tester border-tester/20",
      sparklineData: [82, 85, 88, 87, 91, 93, 95],
    },
    {
      id: "active_wip",
      title: "Active WIP",
      value: `${activeWip}`,
      numericValue: activeWip,
      deltaLabel: "Optimal flow load",
      deltaType: "neutral",
      isPositive: true,
      icon: Zap,
      iconColor: "text-pending",
      badgeColor: "bg-pending/10 text-pending border-pending/20",
      sparklineData: [15, 17, 19, 18, 21, 20, activeWip],
    },
  ]

  const renderSparkline = (data: number[], color: string) => {
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const width = 80
    const height = 24
    const points = data
      .map((val, i) => {
        const x = (i / (data.length - 1)) * width
        const y = height - ((val - min) / range) * (height - 4) - 2
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
                  {renderSparkline(item.sparklineData, item.id === "throughput" ? "#63a659" : item.id === "cycle_time" ? "#6366f1" : item.id === "escaped_defects" ? "#f43f5e" : item.id === "sla_compliance" ? "#06b6d4" : "#f59e0b")}
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
