"use client"

import { useState } from "react"
import { X, Quote } from "lucide-react"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../../../components/ui/hover-card"

interface AgentTextContextItemProps {
  text: string
  preview: string
  onRemove?: () => void
}

export function AgentTextContextItem({
  text,
  preview,
  onRemove,
}: AgentTextContextItemProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div
          className="relative flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded border border-border/50 max-w-[200px] cursor-default"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Quote className="size-3.5 text-muted-foreground flex-shrink-0" />

          <span
            className="text-xs text-foreground truncate"
            title="Hover to see full text"
          >
            {preview}
          </span>

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
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        className="w-80 max-h-48 overflow-y-auto"
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Quote className="size-3" />
            <span>Selected text</span>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">{text}</p>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
