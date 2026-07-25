import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts"
import { ChartCard } from "@/components/charts/ChartCard"
import { PremiumTooltip } from "@/components/charts/PremiumTooltip"
import { TOOLTIP_CURSORS, CHART_PALETTE } from "@/components/charts/chartPalette"
import { Layers } from "lucide-react"
import { apiClient } from "@/utils/apiClient"

interface CfdPoint {
  day: string
  backlog: number
  dev: number
  testing: number
  prod: number
}

interface CumulativeFlowDiagramProps {
  range?: string
  scope?: string
  sprintId?: string
  userId?: number
  loading?: boolean
}

export const CumulativeFlowDiagram: React.FC<CumulativeFlowDiagramProps> = ({
  range = "30d",
  scope = "all",
  sprintId = "all",
  userId,
  loading: initialLoading = false,
}) => {
  const navigate = useNavigate()
  const [data, setData] = useState<CfdPoint[]>([])
  const [loading, setLoading] = useState(initialLoading)

  useEffect(() => {
    setLoading(true)
    const query = new URLSearchParams()
    if (range) query.set("range", range)
    if (scope) query.set("scope", scope)
    if (sprintId) query.set("sprintId", sprintId)
    if (userId) query.set("userId", userId.toString())

    apiClient(`/api/analytics/flow/cfd?${query.toString()}`)
      .then((res) => {
        if (Array.isArray(res)) {
          setData(res)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [range, scope, sprintId, userId])

  const handleBarClick = () => {
    navigate("/dashboard/crs")
  }

  return (
    <ChartCard
      title="Cumulative Flow Diagram (CFD)"
      subtitle="Track work-in-progress delivery stability across workflow stages over time."
      icon={Layers}
      iconColor="text-brand"
      loading={loading}
      empty={data.length === 0}
      height="h-[280px]"
    >
      <div className="h-full w-full cursor-pointer" onClick={handleBarClick} title="Click to view CR list">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="backlogGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_PALETTE.slate.fill} stopOpacity={0.8} />
                <stop offset="95%" stopColor={CHART_PALETTE.slate.fill} stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="devGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_PALETTE.dev.fill} stopOpacity={0.8} />
                <stop offset="95%" stopColor={CHART_PALETTE.dev.fill} stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="testingGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_PALETTE.tester.fill} stopOpacity={0.8} />
                <stop offset="95%" stopColor={CHART_PALETTE.tester.fill} stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_PALETTE.brand.fill} stopOpacity={0.8} />
                <stop offset="95%" stopColor={CHART_PALETTE.brand.fill} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
            <Tooltip cursor={TOOLTIP_CURSORS.area} content={<PremiumTooltip />} />
            <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "6px" }} />
            <Area type="monotone" dataKey="backlog" name="Backlog" stackId="1" stroke={CHART_PALETTE.slate.fill} fill="url(#backlogGrad)" />
            <Area type="monotone" dataKey="dev" name="In Dev" stackId="1" stroke={CHART_PALETTE.dev.fill} fill="url(#devGrad)" />
            <Area type="monotone" dataKey="testing" name="In Testing" stackId="1" stroke={CHART_PALETTE.tester.fill} fill="url(#testingGrad)" />
            <Area type="monotone" dataKey="prod" name="Prod Deployed" stackId="1" stroke={CHART_PALETTE.brand.fill} fill="url(#prodGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
