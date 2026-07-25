import React from "react"
import { useNavigate } from "react-router-dom"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts"
import { ChartCard } from "@/components/charts/ChartCard"
import { PremiumTooltip } from "@/components/charts/PremiumTooltip"
import { TOOLTIP_CURSORS } from "@/components/charts/chartPalette"
import { Clock, AlertTriangle } from "lucide-react"

interface TimeInStageChartProps {
  loading?: boolean
}

export const TimeInStageChart: React.FC<TimeInStageChartProps> = ({ loading = false }) => {
  const navigate = useNavigate()

  const data = [
    { stage: "Development", days: 2.1, isBottleneck: false },
    { stage: "Code Review", days: 0.8, isBottleneck: false },
    { stage: "Testing SLA", days: 3.4, isBottleneck: true },
    { stage: "SIT Deployment", days: 1.2, isBottleneck: false },
    { stage: "UAT Approval", days: 1.5, isBottleneck: false },
  ]

  const maxStage = data.reduce((prev, current) => (prev.days > current.days ? prev : current), data[0])

  return (
    <ChartCard
      title="Average Time in Stage (Days)"
      subtitle="Identify workflow bottlenecks across SDLC phases. Longest stage highlighted."
      icon={Clock}
      iconColor="text-pending"
      loading={loading}
      height="h-[280px]"
      actionSlot={
        <div className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
          <AlertTriangle className="h-3 w-3" />
          <span>Bottleneck: {maxStage.stage} ({maxStage.days}d)</span>
        </div>
      }
    >
      <div className="h-full w-full cursor-pointer" onClick={() => navigate("/dashboard/crs")} title="Click to view CR list">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <XAxis type="number" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} unit="d" />
            <YAxis dataKey="stage" type="category" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={90} />
            <Tooltip cursor={TOOLTIP_CURSORS.bar} content={<PremiumTooltip unit="days" />} />
            <Bar dataKey="days" name="Avg Days" radius={[0, 6, 6, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.stage === maxStage.stage ? "#f43f5e" : "#6366f1"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
