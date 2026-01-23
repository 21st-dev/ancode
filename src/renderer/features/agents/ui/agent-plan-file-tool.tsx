"use client"

import { memo, useCallback, useEffect, useRef } from "react"
import { useAtomValue } from "jotai"
import { Button } from "../../../components/ui/button"
import { IconSpinner, PlanIcon } from "../../../components/ui/icons"
import { Kbd } from "../../../components/ui/kbd"
import { TextShimmer } from "../../../components/ui/text-shimmer"
import { getToolStatus } from "./agent-tool-registry"
import { areToolPropsEqual } from "./agent-tool-utils"
import { ChatMarkdownRenderer } from "../../../components/chat-markdown-renderer"
import { isPlanModeAtom } from "../atoms"

interface AgentPlanFileToolProps {
  part: {
    type: string // "tool-Write" | "tool-Edit"
    state?: string
    input?: {
      file_path?: string
      content?: string
      new_string?: string
    }
  }
  chatStatus?: string
  chatId: string
}

/**
 * AgentPlanFileTool - Inline streaming view for plan files.
 * Used during streaming to show plan content being written.
 * After completion, AgentPlanCompactCard is shown instead.
 */
export const AgentPlanFileTool = memo(function AgentPlanFileTool({
  part,
  chatStatus,
}: AgentPlanFileToolProps) {
  const { isPending } = getToolStatus(part, chatStatus)
  const isWrite = part.type === "tool-Write"
  const isPlanMode = useAtomValue(isPlanModeAtom)

  // Refs for scroll gradients (avoid re-renders)
  const contentRef = useRef<HTMLDivElement>(null)
  const bottomGradientRef = useRef<HTMLDivElement>(null)

  // Only consider streaming if chat is actively streaming
  const isActivelyStreaming = chatStatus === "streaming" || chatStatus === "submitted"
  const isInputStreaming = part.state === "input-streaming" && isActivelyStreaming

  // Get plan content - for Write mode it's in input.content, for Edit it's in new_string
  const planContent = isWrite ? (part.input?.content || "") : (part.input?.new_string || "")

  // Determine action text based on tool type
  const actionText = isWrite ? "Creating plan..." : "Updating plan..."

  // Show shimmer during streaming/pending
  const shouldShowShimmer = isPending || isInputStreaming

  // Buttons are disabled during streaming
  const buttonsDisabled = shouldShowShimmer

  // Check if we have content to show
  const hasVisibleContent = planContent.length > 0

  // Update scroll gradients via DOM (no state, no re-renders)
  const updateScrollGradients = useCallback(() => {
    const content = contentRef.current
    const bottomGradient = bottomGradientRef.current
    if (!content || !bottomGradient) return

    const { scrollHeight, clientHeight } = content
    const isScrollable = scrollHeight > clientHeight

    // Show bottom gradient when content is scrollable (overflow)
    bottomGradient.style.opacity = isScrollable ? "1" : "0"
  }, [])

  // Update gradients when content changes
  useEffect(() => {
    updateScrollGradients()
  }, [planContent, updateScrollGradients])

  // If no content yet, show minimal view with shimmer
  if (!hasVisibleContent) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-0.5">
        <PlanIcon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {shouldShowShimmer ? (
            <TextShimmer as="span" duration={1.2}>
              {actionText}
            </TextShimmer>
          ) : (
            "Plan"
          )}
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 overflow-hidden mx-2">
      {/* Header - shows streaming status */}
      <div className="flex items-center justify-between pl-2.5 pr-0.5 h-7 cursor-pointer hover:bg-muted/50 transition-colors duration-150">
        <div className="flex items-center gap-1.5 text-xs truncate flex-1 min-w-0">
          <PlanIcon className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
          {shouldShowShimmer ? (
            <TextShimmer as="span" duration={1.2} className="truncate">
              {actionText}
            </TextShimmer>
          ) : (
            <span className="truncate text-foreground font-medium">Plan</span>
          )}
        </div>

        {/* Spinner during streaming */}
        {shouldShowShimmer && (
          <IconSpinner className="w-3 h-3 flex-shrink-0" />
        )}
      </div>

      {/* Content - fixed height preview during streaming with gradient */}
      <div className="relative">
        <div
          ref={contentRef}
          className="text-xs overflow-hidden h-[100px]"
        >
          <div className="px-3 py-2 h-full overflow-hidden">
            <ChatMarkdownRenderer content={planContent} size="sm" />
          </div>
        </div>

        {/* Bottom gradient overlay - matches card background (muted/30) */}
        <div
          ref={bottomGradientRef}
          className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none transition-opacity duration-150"
          style={{ opacity: 1, background: "linear-gradient(to top, color-mix(in srgb, hsl(var(--muted)) 30%, hsl(var(--background))) 0%, transparent 100%)" }}
        />
      </div>

      {/* Footer - action buttons (disabled during streaming) */}
      <div className="flex items-center justify-between p-1.5">
        <Button
          variant="ghost"
          size="sm"
          disabled={buttonsDisabled}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          View plan
        </Button>

        {isPlanMode && (
          <Button
            size="sm"
            disabled={buttonsDisabled}
            className="h-6 px-3 text-xs font-medium rounded-md transition-transform duration-150 active:scale-[0.97] disabled:opacity-50"
          >
            Build
            <Kbd className="ml-1.5 text-primary-foreground/70">⌘↵</Kbd>
          </Button>
        )}
      </div>
    </div>
  )
}, areToolPropsEqual)
