import type { ReactNode } from "react"
import { cn } from "cn"

function Stat({
  label,
  value,
  sublabel,
  icon,
  className,
}: {
  label: string
  value: ReactNode
  sublabel?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-lg border bg-card px-4 py-3", className)}>
      <div className="text-muted-foreground flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-medium tracking-wide uppercase">{label}</span>
      </div>
      <div className="mt-1.5 font-mono text-2xl font-medium tabular-nums">{value}</div>
      {sublabel && <div className="text-muted-foreground mt-0.5 text-xs">{sublabel}</div>}
    </div>
  )
}

export { Stat }
