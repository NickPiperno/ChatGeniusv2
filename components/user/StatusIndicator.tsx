import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatusIndicatorProps {
  status: "online" | "away" | "busy" | "offline"
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

const statusConfig = {
  online: { label: "Active", color: "bg-green-500" },
  away: { label: "Away", color: "bg-yellow-500" },
  busy: { label: "Do not disturb", color: "bg-red-500" },
  offline: { label: "Offline", color: "bg-gray-500" }
}

export function StatusIndicator({
  status,
  showLabel = false,
  size = "md",
  className
}: StatusIndicatorProps) {
  const sizes = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3"
  }

  const labelSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "rounded-full",
        statusConfig[status].color,
        sizes[size]
      )} />
      {showLabel && (
        <span className={cn(
          "text-gray-400",
          labelSizes[size]
        )}>
          {statusConfig[status].label}
        </span>
      )}
    </div>
  )
} 