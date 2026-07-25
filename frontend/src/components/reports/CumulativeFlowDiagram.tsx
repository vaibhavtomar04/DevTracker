import React from "react"
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
import { TOOLTIP_CURSORS } from "@/components/charts/chartPalette"
import { Layers } from "lucide-react"

interface CumulativeFlowDiagramProps {
  tasks?: any[]
  loading?: boolean
}

export const CumulativeFlowDiagram: React.FC<CumulativeFlowDiagramProps> = ({ tasks = [], loading = false }) => {
  const navigate = useNavigate()

  // Generate 7-step synthetic/aggregated flow timeline from tasks
  const sampleTimeline = [
    { day: "Day 1", backlog: 12, dev: 8, testing: 4, prod: 2 },
    { day: "Day 2", backlog: 10, dev: 10, testing: 6, prod: 4 },
    { day: "Day 3", backlog: 8, dev: 12, testing: 7, prod: 7 },
    { day: "Day 4", backlog: 6, dev: 11, testing: 9, prod: 10 },
    { day: "Day 5", backlog: 5, dev: 9, testing: 10, prod: 14 },
    { day: "Day 6", backlog: 4, dev: 7, testing: 8, prod: 18 },
    { day: "Day 7", backlog: 3, dev: 5, testing: 6, prod: 22 },
  ]

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
      empty={tasks.length === 0}
      height="h-[280px]"
    >
      <div className="h-full w-full cursor-pointer" onClick={handleBarClick} title="Click to view CR list">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sampleTimeline} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="backlogGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#64748b" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#64748b" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="devGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="testingGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#63a659" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#63a659" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
            <Tooltip cursor={TOOLTIP_CURSORS.area} content={<PremiumTooltip />} />
            <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "6px" }} />
            <Area type="monotone" dataKey="backlog" name="Backlog" stackId="1" stroke="#64748b" fill="url(#backlogGrad)" />
            <Area type="monotone" dataKey="dev" name="In Dev" stackId="1" stroke="#6366f1" fill="url(#devGrad)" />
            <Area type="monotone" dataKey="testing" name="In Testing" stackId="1" stroke="#06b6d4" fill="url(#testingGrad)" />
            <Area type="monotone" dataKey="prod" name="Prod Deployed" stackId="1" stroke="#63a659" fill="url(#prodGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
