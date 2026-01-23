"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { Button } from "../../../components/ui/button"
import { ExpandIcon, CollapseIcon, PlanIcon } from "../../../components/ui/icons"
import { Kbd } from "../../../components/ui/kbd"
import { ChatMarkdownRenderer } from "../../../components/chat-markdown-renderer"
import { cn } from "../../../lib/utils"
import {
  planSidebarOpenAtomFamily,
  currentPlanPathAtomFamily,
  isPlanModeAtom,
  pendingBuildPlanSubChatIdAtom,
} from "../atoms"
import { useAgentSubChatStore } from "../stores/sub-chat-store"

interface AgentPlanCompactCardProps {
  part: {
    type: string // "tool-Write" | "tool-Edit"
    input?: {
      file_path?: string
      content?: string
      new_string?: string
    }
  }
  chatId: string
}

export const AgentPlanCompactCard = memo(function AgentPlanCompactCard({
  part,
  chatId,
}: AgentPlanCompactCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isPlanMode = useAtomValue(isPlanModeAtom)
  const setPendingBuildPlanSubChatId = useSetAtom(pendingBuildPlanSubChatIdAtom)

  // Refs for scroll gradients (avoid re-renders)
  const contentRef = useRef<HTMLDivElement>(null)
  const topGradientRef = useRef<HTMLDivElement>(null)
  const bottomGradientRef = useRef<HTMLDivElement>(null)

  // Plan sidebar atoms
  const planSidebarOpenAtom = useMemo(
    () => planSidebarOpenAtomFamily(chatId),
    [chatId],
  )
  const currentPlanPathAtom = useMemo(
    () => currentPlanPathAtomFamily(chatId),
    [chatId],
  )
  const [, setIsPlanSidebarOpen] = useAtom(planSidebarOpenAtom)
  const [, setCurrentPlanPath] = useAtom(currentPlanPathAtom)

  // Get plan content - for Write it's input.content, for Edit it's new_string
  const isWrite = part.type === "tool-Write"
  const planContent = isWrite
    ? (part.input?.content || "")
    : (part.input?.new_string || "")
  const filePath = part.input?.file_path || ""

  // Update scroll gradients via DOM (no state, no re-renders)
  const updateScrollGradients = useCallback(() => {
    const content = contentRef.current
    const topGradient = topGradientRef.current
    const bottomGradient = bottomGradientRef.current
    if (!content || !topGradient || !bottomGradient) return

    const { scrollTop, scrollHeight, clientHeight } = content
    const isScrollable = scrollHeight > clientHeight
    const isAtTop = scrollTop <= 1
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1

    // Show top gradient when scrolled down
    topGradient.style.opacity = isScrollable && !isAtTop ? "1" : "0"
    // Show bottom gradient when not at bottom (or when collapsed)
    bottomGradient.style.opacity = isScrollable && !isAtBottom ? "1" : "0"
  }, [])

  // Update gradients on scroll
  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    content.addEventListener("scroll", updateScrollGradients)
    // Initial check
    updateScrollGradients()

    return () => content.removeEventListener("scroll", updateScrollGradients)
  }, [updateScrollGradients, isExpanded])

  // Handle expand/collapse
  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  // Handle opening plan sidebar
  const handleOpenSidebar = useCallback(() => {
    if (filePath) {
      setCurrentPlanPath(filePath)
      setIsPlanSidebarOpen(true)
    }
  }, [filePath, setCurrentPlanPath, setIsPlanSidebarOpen])

  // Handle build plan - triggers via atom, consumed by ChatViewInner
  const handleBuildPlan = useCallback(() => {
    const activeSubChatId = useAgentSubChatStore.getState().activeSubChatId
    if (activeSubChatId) {
      setPendingBuildPlanSubChatId(activeSubChatId)
    }
  }, [setPendingBuildPlanSubChatId])

  if (!planContent) return null

  return (
    <div className="rounded-lg border border-border bg-muted/30 overflow-hidden mx-2">
      {/* Header - title + expand/collapse button */}
      <div
        onClick={handleToggleExpand}
        className="flex items-center justify-between pl-2.5 pr-0.5 h-7 cursor-pointer hover:bg-muted/50 transition-colors duration-150"
      >
        <div className="flex items-center gap-1.5 text-xs">
          <PlanIcon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
          <span className="text-foreground font-medium">Plan</span>
        </div>

        {/* Expand/Collapse button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleToggleExpand()
          }}
          className="p-1 rounded-md hover:bg-accent transition-[background-color,transform] duration-150 ease-out active:scale-95"
        >
          <div className="relative w-4 h-4">
            <ExpandIcon
              className={cn(
                "absolute inset-0 w-4 h-4 text-muted-foreground transition-[opacity,transform] duration-200 ease-out",
                isExpanded ? "opacity-0 scale-75" : "opacity-100 scale-100",
              )}
            />
            <CollapseIcon
              className={cn(
                "absolute inset-0 w-4 h-4 text-muted-foreground transition-[opacity,transform] duration-200 ease-out",
                isExpanded ? "opacity-100 scale-100" : "opacity-0 scale-75",
              )}
            />
          </div>
        </button>
      </div>

      {/* Content - markdown preview with scroll gradients */}
      <div className="relative">
        {/* Top scroll gradient - matches card background (muted/30) */}
        <div
          ref={topGradientRef}
          className="absolute top-0 left-0 right-0 h-6 pointer-events-none z-10 transition-opacity duration-150"
          style={{ opacity: 0, background: "linear-gradient(to bottom, color-mix(in srgb, hsl(var(--muted)) 30%, hsl(var(--background))) 0%, transparent 100%)" }}
        />

        <div
          ref={contentRef}
          onClick={() => !isExpanded && setIsExpanded(true)}
          className={cn(
            "text-xs overflow-hidden transition-all duration-200",
            isExpanded
              ? "max-h-[300px] overflow-y-auto"
              : "h-[72px] cursor-pointer hover:bg-muted/50",
          )}
        >
          <div className="px-3 py-2">
            <ChatMarkdownRenderer content={planContent} size="sm" />
          </div>
        </div>

        {/* Bottom scroll gradient - matches card background (muted/30) */}
        <div
          ref={bottomGradientRef}
          className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none z-10 transition-opacity duration-150"
          style={{ opacity: 1, background: "linear-gradient(to top, color-mix(in srgb, hsl(var(--muted)) 30%, hsl(var(--background))) 0%, transparent 100%)" }}
        />
      </div>

      {/* Footer - action buttons */}
      <div className="flex items-center justify-between p-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenSidebar}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          View plan
        </Button>

        {isPlanMode && (
          <Button
            size="sm"
            onClick={handleBuildPlan}
            className="h-6 px-3 text-xs font-medium rounded-md transition-transform duration-150 active:scale-[0.97]"
          >
            Build
            <Kbd className="ml-1.5 text-primary-foreground/70">⌘↵</Kbd>
          </Button>
        )}
      </div>
    </div>
  )
})
