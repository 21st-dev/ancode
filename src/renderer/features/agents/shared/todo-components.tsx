/**
 * Shared React components for todo display
 * Used by both AgentTodoTool and TodoWidget to avoid duplication
 */

import { Circle } from "lucide-react"
import { CheckIcon, IconSpinner } from "../../../components/ui/icons"
import { cn } from "../../../lib/utils"
import type { TodoItem, TodoStatus } from "./todo-types"

/**
 * Get icon component for todo status
 */
export function getTodoStatusIcon(status: TodoStatus) {
  switch (status) {
    case "completed":
      return CheckIcon
    case "in_progress":
      return IconSpinner
    default:
      return Circle
  }
}

/**
 * Pie-style progress circle component - fills sectors like pizza slices
 * Shared between AgentTodoTool and TodoWidget
 */
export const TodoProgressCircle = ({
  completed,
  total,
  size = 16,
  className,
}: {
  completed: number
  total: number
  size?: number
  className?: string
}) => {
  const cx = size / 2
  const cy = size / 2
  const outerRadius = (size - 1) / 2
  const innerRadius = outerRadius - 1.5 // Leave space for outer border

  // Create pie segments (no borders on segments, just fill)
  const segments = []
  for (let i = 0; i < total; i++) {
    const startAngle = (i / total) * 360 - 90 // Start from top
    const endAngle = ((i + 1) / total) * 360 - 90
    const gap = total > 1 ? 4 : 0 // Gap between segments
    const adjustedStartAngle = startAngle + gap / 2
    const adjustedEndAngle = endAngle - gap / 2

    // Convert to radians
    const startRad = (adjustedStartAngle * Math.PI) / 180
    const endRad = (adjustedEndAngle * Math.PI) / 180

    // Calculate arc points
    const x1 = cx + innerRadius * Math.cos(startRad)
    const y1 = cy + innerRadius * Math.sin(startRad)
    const x2 = cx + innerRadius * Math.cos(endRad)
    const y2 = cy + innerRadius * Math.sin(endRad)

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0
    const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`

    segments.push(
      <path
        key={i}
        d={pathData}
        fill={i < completed ? "currentColor" : "transparent"}
        opacity={i < completed ? 0.7 : 0.15}
      />,
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("text-muted-foreground", className)}
    >
      {/* Outer border circle */}
      <circle
        cx={cx}
        cy={cy}
        r={outerRadius}
        fill="none"
        stroke="currentColor"
        strokeWidth={0.5}
        opacity={0.3}
      />
      {segments}
    </svg>
  )
}

/**
 * Todo status icon component
 * Shared between AgentTodoTool and TodoWidget
 */
export const TodoStatusIcon = ({
  status,
  isPending = false,
}: {
  status: TodoStatus
  isPending?: boolean
}) => {
  const IconComponent = getTodoStatusIcon(status)

  switch (status) {
    case "completed":
      return (
        <div
          className={cn(
            "w-3.5 h-3.5 rounded-full bg-muted flex items-center justify-center flex-shrink-0",
            isPending && "opacity-50",
          )}
        >
          <IconComponent className="w-2.5 h-2.5 text-foreground" />
        </div>
      )
    case "in_progress":
      return (
        <div
          className={cn(
            "w-3.5 h-3.5 rounded-full bg-muted flex items-center justify-center flex-shrink-0",
            isPending && "opacity-50",
          )}
        >
          <IconComponent className="w-2.5 h-2.5 text-foreground animate-spin" />
        </div>
      )
    default:
      return (
        <div
          className={cn(
            "w-3.5 h-3.5 rounded-full border border-muted-foreground/30 flex items-center justify-center flex-shrink-0",
            isPending && "opacity-50",
          )}
        >
          <IconComponent className="w-2 h-2 text-muted-foreground" />
        </div>
      )
  }
}
