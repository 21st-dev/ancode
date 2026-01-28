"use client"

import { useState } from "react"
import { X, Code2 } from "lucide-react"

interface AgentPreviewElementItemProps {
  html: string
  componentName: string | null
  filePath: string | null
  preview: string
  onRemove?: () => void
}

export function AgentPreviewElementItem({
  html,
  componentName,
  filePath,
  preview,
  onRemove,
}: AgentPreviewElementItemProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Display title: component name if available, otherwise "Element"
  const title = componentName || "Element"

  // Subtitle: file path if available, otherwise try to extract tag name from preview
  const getSubtitle = () => {
    if (filePath) {
      return filePath.split("/").pop() || filePath
    }
    // Try to extract tag name from HTML preview
    const match = preview.match(/<(\w+)/)
    return match ? `<${match[1]}>` : "HTML"
  }

  return (
    <div
      className="relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/50 cursor-default min-w-[120px] max-w-[200px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Icon container */}
      <div className="flex items-center justify-center size-8 rounded-md bg-muted shrink-0">
        <Code2 className="size-4 text-muted-foreground" />
      </div>

      {/* Text content */}
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-foreground truncate">
          {title}
        </span>
        <span className="text-xs text-muted-foreground truncate">
          {getSubtitle()}
        </span>
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className={`absolute -top-1.5 -right-1.5 size-4 rounded-full bg-background border border-border
                     flex items-center justify-center transition-[opacity,transform] duration-150 ease-out active:scale-[0.97] z-10
                     text-muted-foreground hover:text-foreground
                     ${isHovered ? "opacity-100" : "opacity-0"}`}
          type="button"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  )
}
