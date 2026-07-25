import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type LucideIcon, Inbox } from "lucide-react"

interface ChartCardProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  iconColor?: string
  loading?: boolean
  empty?: boolean
  emptyMessage?: string
  actionSlot?: React.ReactNode
  legendSlot?: React.ReactNode
  children: React.ReactNode
  className?: string
  height?: string | number
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  iconColor = "text-brand",
  loading = false,
  empty = false,
  emptyMessage = "No data available to display.",
  actionSlot,
  legendSlot,
  children,
  className = "",
  height = "h-[320px]",
}) => {
  return (
    <Card
      variant="glass"
      className={`border-border/50 dark:border-white/[0.06] bg-card/40 dark:bg-white/[0.02] backdrop-blur-md shadow-xl overflow-hidden rounded-2xl flex flex-col ${className}`}
    >
      <CardHeader className="p-5 border-b border-border/40 dark:border-white/[0.06] shrink-0 flex flex-row items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <CardTitle className="text-sm font-bold flex items-center space-x-2 text-foreground truncate">
            {Icon && <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />}
            <span>{title}</span>
          </CardTitle>
          {subtitle && (
            <CardDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {subtitle}
            </CardDescription>
          )}
        </div>
        {actionSlot && <div className="shrink-0">{actionSlot}</div>}
      </CardHeader>

      <CardContent className="p-5 flex-1 flex flex-col justify-between relative min-h-[220px]">
        {legendSlot && <div className="mb-3 shrink-0">{legendSlot}</div>}

        {loading ? (
          <div className={`w-full ${typeof height === 'string' ? height : `${height}px`} flex flex-col justify-center items-center space-y-4`}>
            <div className="w-full h-full rounded-xl bg-white/[0.04] dark:bg-white/[0.03] animate-pulse flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-32 bg-white/10 rounded-md animate-pulse" />
                <div className="h-3 w-20 bg-white/5 rounded-md animate-pulse" />
              </div>
            </div>
          </div>
        ) : empty ? (
          <div className={`w-full ${typeof height === 'string' ? height : `${height}px`} flex flex-col items-center justify-center p-6 text-center text-muted-foreground/70`}>
            <div className="h-12 w-12 rounded-2xl bg-muted/40 dark:bg-white/[0.03] border border-border/30 dark:border-white/[0.06] flex items-center justify-center mb-3">
              <Inbox className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground max-w-xs leading-relaxed">
              {emptyMessage}
            </p>
          </div>
        ) : (
          <div className={`w-full ${typeof height === 'string' ? height : `${height}px`}`}>
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
