import React from "react"

export interface PremiumTooltipProps {
  active?: boolean
  payload?: any[]
  label?: any
  valueFormatter?: (value: any, name?: string) => string
  unit?: string
}

export const PremiumTooltip: React.FC<PremiumTooltipProps> = ({
  active,
  payload,
  label,
  valueFormatter,
  unit,
}) => {
  if (!active || !payload || !payload.length) {
    return null
  }

  return (
    <div className="rounded-xl border border-white/10 dark:border-white/10 border-slate-200 bg-background/90 dark:bg-[#0b0e19]/95 p-3 shadow-2xl backdrop-blur-xl transition-all select-none min-w-[140px]">
      {label && (
        <div className="mb-2 border-b border-border/50 pb-1.5 font-mono text-[11px] font-bold text-foreground tracking-wide">
          {label}
        </div>
      )}
      <div className="space-y-1.5">
        {payload.map((entry: any, index: number) => {
          const color = entry.color || entry.fill || "#63a659"
          const rawVal = entry.value
          const formattedVal = valueFormatter
            ? valueFormatter(rawVal, entry.name)
            : typeof rawVal === "number"
            ? rawVal.toLocaleString()
            : rawVal

          return (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 text-[11px]">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="font-semibold text-muted-foreground">
                  {entry.name || entry.dataKey}
                </span>
              </div>
              <span className="font-mono font-bold text-foreground">
                {formattedVal}
                {unit ? ` ${unit}` : ""}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
