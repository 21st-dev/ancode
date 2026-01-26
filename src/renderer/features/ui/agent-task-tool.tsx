import { memo, useState, useMemo } from "react"
import { TextShimmer } from "../../components/ui/text-shimmer"
import {
  IconSpinner,
  ExpandIcon,
  CollapseIcon,
} from "../../icons"
import { AgentToolRegistry, getToolStatus } from "./agent-tool-registry"
import { AgentToolCall } from "./agent-tool-call"
import { cn } from "../../lib/utils"

interface AgentTaskToolProps {
  part: any
  nestedTools: any[]
  chatStatus?: string
}

export const AgentTaskTool = memo(function AgentTaskTool({
  part,
  nestedTools,
  chatStatus,
}: AgentTaskToolProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { isPending } = getToolStatus(part, chatStatus)

  const description = part.input?.description || ""

  // Output data
  const result = part.output?.result
  const durationMs = part.output?.duration_ms
  const hasOutput = !isPending && result

  const hasNestedTools = nestedTools.length > 0
  const stepsCount = nestedTools.length

  // Get last nested tool info for collapsed streaming view (memoized)
  const lastToolTitle = useMemo(() => {
    if (!hasNestedTools) return null
    const lastNestedTool = nestedTools[nestedTools.length - 1]
    const lastToolMeta = lastNestedTool ? AgentToolRegistry[lastNestedTool.type] : null
    return lastToolMeta?.title(lastNestedTool) ?? null
  }, [hasNestedTools, nestedTools])

  // When more than 3 nested tools during streaming AND expanded, align to bottom (show latest)
  const shouldAlignBottom = isPending && isExpanded && stepsCount > 3

  // Format duration for display
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  // Truncate description for header
  const truncatedDescription = description.length > 50
    ? description.slice(0, 47) + "..."
    : description

  return (
    <div className="rounded-lg border border-border bg-muted/30 overflow-hidden mx-2">
      {/* Header - always clickable to toggle expand */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-2.5 h-7 cursor-pointer hover:bg-muted/50 transition-colors duration-150"
      >
        <div className="flex items-center gap-1.5 text-xs truncate flex-1 min-w-0">
          {/* Title */}
          {isPending ? (
            <TextShimmer
              as="span"
              duration={1.2}
              className="text-xs font-medium flex-shrink-0"
            >
              Running Task
            </TextShimmer>
          ) : (
            <span className="text-xs font-medium text-foreground flex-shrink-0">
              Task
            </span>
          )}

          {/* Description */}
          {truncatedDescription && (
            <span className="text-muted-foreground/60 truncate">
              {truncatedDescription}
            </span>
          )}
        </div>

        {/* Right side: status and expand button */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <div className="flex items-center gap-1.5 text-xs">
            {/* Show last tool name when collapsed and streaming */}
            {isPending && !isExpanded && lastToolTitle && (
              <span className="text-muted-foreground/60 truncate max-w-[120px]">
                {lastToolTitle}
              </span>
            )}
            {isPending && <IconSpinner className="w-3 h-3" />}
            {/* Show steps count only when expanded and not streaming */}
            {hasNestedTools && isExpanded && !isPending && (
              <span className="text-muted-foreground">
                {stepsCount} {stepsCount === 1 ? "step" : "steps"}
              </span>
            )}
            {!isPending && durationMs && (
              <span className="text-muted-foreground/60">
                {formatDuration(durationMs)}
              </span>
            )}
          </div>

          {/* Expand/Collapse icon indicator - always visible to prevent layout shift */}
          <div className="relative w-4 h-4">
            <ExpandIcon
              className={cn(
                "absolute inset-0 w-4 h-4 text-muted-foreground transition-[opacity,transform] duration-200 ease-out",
                isExpanded
                  ? "opacity-0 scale-75"
                  : "opacity-100 scale-100",
              )}
            />
            <CollapseIcon
              className={cn(
                "absolute inset-0 w-4 h-4 text-muted-foreground transition-[opacity,transform] duration-200 ease-out",
                isExpanded
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-75",
              )}
            />
          </div>
        </div>
      </div>

      {/* Nested tools - only show when expanded (collapsed by default) */}
      {hasNestedTools && isExpanded && (
        <div
          className={cn(
            "border-t border-border transition-colors duration-150",
            // When streaming: fixed height with autoscroll effect
            // When completed: scrollable like Edit/Write tool
            isPending
              ? "min-h-[72px] max-h-[72px] overflow-hidden"
              : "max-h-[200px] overflow-y-auto scrollbar-hide",
            // When streaming with > 3 tools, use flex to push content to bottom
            shouldAlignBottom && "flex flex-col justify-end",
          )}
        >
          <div className={cn("py-1", shouldAlignBottom && "flex-shrink-0")}>
            {nestedTools.map((nestedPart, idx) => {
              const nestedMeta = AgentToolRegistry[nestedPart.type]
              if (!nestedMeta) {
                // Fallback for unknown tools
                return (
                  <div
                    key={idx}
                    className="text-xs text-muted-foreground py-0.5 px-2.5"
                  >
                    {nestedPart.type?.replace("tool-", "")}
                  </div>
                )
              }
              const { isPending: nestedIsPending, isError: nestedIsError } =
                getToolStatus(nestedPart, chatStatus)
              return (
                <AgentToolCall
                  key={idx}
                  icon={nestedMeta.icon}
                  title={nestedMeta.title(nestedPart)}
                  subtitle={nestedMeta.subtitle?.(nestedPart)}
                  isPending={nestedIsPending}
                  isError={nestedIsError}
                  isNested={true}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Result output - always visible when available */}
      {hasOutput && (
        <div className="border-t border-border px-2.5 py-2 text-xs text-muted-foreground">
          <div className="whitespace-pre-wrap break-words">{result}</div>
        </div>
      )}
    </div>
  )
})
