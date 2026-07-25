/**
 * Semantic Color Palette for Recharts and Reports
 * Routes all chart colors through the DevTrack 2.0 design system tokens:
 * - brand:   Green (#63a659)
 * - dev:     Indigo (#6366f1)
 * - tester:  Cyan (#06b6d4)
 * - info:    Sky (#0ea5e9)
 * - success: Green (#22c55e)
 * - danger:  Rose (#f43f5e)
 * - pending: Amber (#f59e0b)
 */

export interface ChartRoleColor {
  fill: string
  stroke: string
  gradientStart: string
  gradientEnd: string
  rgb: string
}

export const CHART_PALETTE: Record<string, ChartRoleColor> = {
  brand: {
    fill: "#10b981",
    stroke: "#10b981",
    gradientStart: "rgba(16, 185, 129, 0.85)",
    gradientEnd: "rgba(16, 185, 129, 0.15)",
    rgb: "16, 185, 129",
  },
  dev: {
    fill: "#6366f1",
    stroke: "#6366f1",
    gradientStart: "rgba(99, 102, 241, 0.85)",
    gradientEnd: "rgba(99, 102, 241, 0.15)",
    rgb: "99, 102, 241",
  },
  tester: {
    fill: "#06b6d4",
    stroke: "#06b6d4",
    gradientStart: "rgba(6, 182, 212, 0.85)",
    gradientEnd: "rgba(6, 182, 212, 0.15)",
    rgb: "6, 182, 212",
  },
  info: {
    fill: "#0ea5e9",
    stroke: "#0ea5e9",
    gradientStart: "rgba(14, 165, 233, 0.85)",
    gradientEnd: "rgba(14, 165, 233, 0.15)",
    rgb: "14, 165, 233",
  },
  success: {
    fill: "#22c55e",
    stroke: "#22c55e",
    gradientStart: "rgba(34, 197, 94, 0.85)",
    gradientEnd: "rgba(34, 197, 94, 0.15)",
    rgb: "34, 197, 94",
  },
  danger: {
    fill: "#f43f5e",
    stroke: "#f43f5e",
    gradientStart: "rgba(244, 63, 94, 0.85)",
    gradientEnd: "rgba(244, 63, 94, 0.15)",
    rgb: "244, 63, 94",
  },
  pending: {
    fill: "#f59e0b",
    stroke: "#f59e0b",
    gradientStart: "rgba(245, 158, 11, 0.85)",
    gradientEnd: "rgba(245, 158, 11, 0.15)",
    rgb: "245, 158, 11",
  },
  slate: {
    fill: "#64748b",
    stroke: "#64748b",
    gradientStart: "rgba(100, 116, 139, 0.85)",
    gradientEnd: "rgba(100, 116, 139, 0.15)",
    rgb: "100, 116, 139",
  },
}

export const CATEGORY_COLORS = [
  CHART_PALETTE.brand.fill,
  CHART_PALETTE.dev.fill,
  CHART_PALETTE.tester.fill,
  CHART_PALETTE.info.fill,
  CHART_PALETTE.pending.fill,
  CHART_PALETTE.danger.fill,
]

export const TOOLTIP_CURSORS = {
  bar: { fill: "rgba(255, 255, 255, 0.04)" },
  line: { stroke: "rgba(255, 255, 255, 0.15)", strokeWidth: 1 },
  area: { stroke: "rgba(255, 255, 255, 0.15)", strokeWidth: 1 },
}
