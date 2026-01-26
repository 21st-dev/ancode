import * as React from "react"
import { cn } from "../lib/utils"

interface TrafficLightSpacerProps {
  isFullscreen?: boolean
  isDesktop?: boolean
  className?: string
}

/**
 * Spacer component for macOS traffic lights (close/minimize/maximize buttons)
 * Only renders on desktop and when not in fullscreen
 */
export function TrafficLightSpacer({
  isFullscreen = false,
  isDesktop = false,
  className,
}: TrafficLightSpacerProps) {
  // Only show spacer on desktop when not in fullscreen
  if (!isDesktop || isFullscreen) {
    return null
  }

  return <div className={cn("h-[32px] flex-shrink-0", className)} />
}

interface TrafficLightsProps {
  isHovered?: boolean
  isFullscreen?: boolean
  isDesktop?: boolean
  className?: string
}

/**
 * Traffic lights component for macOS window controls
 * Shows colored circles when hovered, gray when not
 */
export function TrafficLights({
  isHovered = false,
  isFullscreen = false,
  isDesktop = false,
  className,
}: TrafficLightsProps) {
  // Only show on desktop when not in fullscreen
  if (!isDesktop || isFullscreen) {
    return null
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "w-3 h-3 rounded-full transition-colors duration-150",
          isHovered ? "bg-[#FF5F57]" : "bg-muted-foreground/30"
        )}
      />
      <div
        className={cn(
          "w-3 h-3 rounded-full transition-colors duration-150",
          isHovered ? "bg-[#FEBC2E]" : "bg-muted-foreground/30"
        )}
      />
      <div
        className={cn(
          "w-3 h-3 rounded-full transition-colors duration-150",
          isHovered ? "bg-[#28C840]" : "bg-muted-foreground/30"
        )}
      />
    </div>
  )
}
