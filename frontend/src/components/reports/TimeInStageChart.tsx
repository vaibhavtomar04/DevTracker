import React, { useEffect, useState } from "react"
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
import { TOOLTIP_CURSORS, CHART_PALETTE } from "@/components/charts/chartPalette"
import { Clock, AlertTriangle } from "lucide-react"
import { apiClient } from "@/utils/apiClient"

interface StageItem {
  stage: string
  days: number
  isBottleneck: boolean
}

interface TimeInStageChartProps {
  range?: string
  scope?: string
  sprintId?: string
  userId?: number
  loading?: boolean
}

export const TimeInStageChart: React.FC<TimeInStageChartProps> = ({
  range = "30d",
  scope = "all",
  sprintId = "all",
  userId,
  loading: initialLoading = false,
}) => {
  const navigate = useNavigate()
  const [data, setData] = useState<StageItem[]>([])
  const [loading, setLoading] = useState(initialLoading)

  useEffect(() => {
    setLoading(true)
    const query = new URLSearchParams()
    if (range) query.set("range", range)
    if (scope) query.set("scope", scope)
    if (sprintId) query.set("sprintId", sprintId)
    if (userId) query.set("userId", userId.toString())

    apiClient(`/api/analytics/flow/stage-durations?${query.toString()}`)
      .then((res) => {
        if (res && res.stages) {
          setData(res.stages)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [range, scope, sprintId, userId])

  const maxStage = data.find((s) => s.isBottleneck) || (data.length > 0 ? data[0] : null)

  return (
    <ChartCard
      title="Average Time in Stage (Days)"
      subtitle="Identify workflow bottlenecks across SDLC phases. Longest stage highlighted."
      icon={Clock}
      iconColor="text-pending"
      loading={loading}
      empty={data.length === 0}
      height="h-[280px]"
      actionSlot={
        maxStage ? (
          <div className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
            <AlertTriangle className="h-3 w-3" />
            <span>Bottleneck: {maxStage.stage} ({maxStage.days}d)</span>
          </div>
        ) : null
      }
    >
      <div className="h-full w-full cursor-pointer" onClick={() => navigate("/dashboard/crs")} title="Click to view CR list">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <XAxis type="number" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} unit="d" />
            <YAxis dataKey="stage" type="category" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={95} />
            <Tooltip cursor={TOOLTIP_CURSORS.bar} content={<PremiumTooltip unit="days" />} />
            <Bar dataKey="days" name="Avg Days" radius={[0, 6, 6, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isBottleneck ? CHART_PALETTE.danger.fill : CHART_PALETTE.dev.fill}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
