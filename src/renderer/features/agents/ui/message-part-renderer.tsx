import { memo } from "react"
import { cn } from "../../../lib/utils"
import { ChatMarkdownRenderer } from "../../../components/chat-markdown-renderer"
import { AgentAskUserQuestionTool } from "./agent-ask-user-question-tool"
import { AgentBashTool } from "./agent-bash-tool"
import { AgentEditTool } from "./agent-edit-tool"
import { AgentExitPlanModeTool } from "./agent-exit-plan-mode-tool"
import { AgentExploringGroup } from "./agent-exploring-group"
import { AgentPlanTool } from "./agent-plan-tool"
import { AgentTaskTool } from "./agent-task-tool"
import { AgentThinkingTool } from "./agent-thinking-tool"
import { AgentTodoTool } from "./agent-todo-tool"
import { AgentToolCall } from "./agent-tool-call"
import { AgentToolRegistry, getToolStatus } from "./agent-tool-registry"
import { AgentWebFetchTool } from "./agent-web-fetch-tool"
import { AgentWebSearchCollapsible } from "./agent-web-search-collapsible"

// ============================================================================
// Types
// ============================================================================

export interface MessagePartRendererProps {
  part: any
  idx: number
  isFinal?: boolean
  // Nested tools data
  nestedToolsMap: Map<string, any[]>
  nestedToolIds: Set<string>
  orphanToolCallIds: Set<string>
  orphanFirstToolCallIds: Set<string>
  orphanTaskGroups: Map<string, { parts: any[]; firstToolCallId: string }>
  // Message context
  status: string
  finalTextIndex: number
  visibleStepsCount: number
  isStreaming: boolean
  isLastMessage: boolean
  subChatId: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * Memoized component for rendering individual message parts.
 * Extracted from active-chat.tsx to prevent re-creation on every render.
 */
export const MessagePartRenderer = memo(function MessagePartRenderer({
  part,
  idx,
  isFinal = false,
  nestedToolsMap,
  nestedToolIds,
  orphanToolCallIds,
  orphanFirstToolCallIds,
  orphanTaskGroups,
  status,
  finalTextIndex,
  visibleStepsCount,
  isStreaming,
  isLastMessage,
  subChatId,
}: MessagePartRendererProps) {
  // Skip step-start parts
  if (part.type === "step-start") {
    return null
  }

  // Skip TaskOutput - internal tool with meta info not useful for UI
  if (part.type === "tool-TaskOutput") {
    return null
  }

  // Handle orphan tool calls (nested tools without parent Task)
  if (part.toolCallId && orphanToolCallIds.has(part.toolCallId)) {
    if (!orphanFirstToolCallIds.has(part.toolCallId)) {
      return null
    }
    const parentId = part.toolCallId.split(":")[0]
    const group = orphanTaskGroups.get(parentId)
    if (group) {
      return (
        <AgentTaskTool
          key={idx}
          part={{
            type: "tool-Task",
            toolCallId: parentId,
            input: {
              subagent_type: "unknown-agent",
              description: "Incomplete task",
            },
          }}
          nestedTools={group.parts}
          chatStatus={status}
        />
      )
    }
  }

  // Skip nested tools - they're rendered within their parent Task
  if (part.toolCallId && nestedToolIds.has(part.toolCallId)) {
    return null
  }

  // Exploring group - handled separately in the parent with isLast info
  if (part.type === "exploring-group") {
    return null
  }

  // Text parts - with px-2 like Canvas
  if (part.type === "text") {
    if (!part.text?.trim()) return null
    const isFinalText = isFinal && idx === finalTextIndex

    return (
      <div
        key={idx}
        className={cn(
          "text-foreground px-2",
          // Only show Summary styling if there are steps to collapse
          isFinalText && visibleStepsCount > 0 && "pt-3 border-t border-border/50",
        )}
      >
        {/* Only show Summary label if there are steps to collapse */}
        {isFinalText && visibleStepsCount > 0 && (
          <div className="text-[12px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-1">
            Response
          </div>
        )}
        <ChatMarkdownRenderer content={part.text} size="sm" />
      </div>
    )
  }

  // Special handling for tool-Task - render with nested tools
  if (part.type === "tool-Task") {
    const nestedTools = nestedToolsMap.get(part.toolCallId) || []
    return (
      <AgentTaskTool
        key={idx}
        part={part}
        nestedTools={nestedTools}
        chatStatus={status}
      />
    )
  }

  // Special handling for tool-Bash - render with full command and output
  if (part.type === "tool-Bash") {
    return <AgentBashTool key={idx} part={part} chatStatus={status} />
  }

  // Special handling for tool-Thinking - Extended Thinking
  if (part.type === "tool-Thinking") {
    return <AgentThinkingTool key={idx} part={part} chatStatus={status} />
  }

  // Special handling for tool-Edit - render with file icon and diff stats
  if (part.type === "tool-Edit") {
    return <AgentEditTool key={idx} part={part} chatStatus={status} />
  }

  // Special handling for tool-Write - render with file preview (reuses AgentEditTool)
  if (part.type === "tool-Write") {
    return <AgentEditTool key={idx} part={part} chatStatus={status} />
  }

  // Special handling for tool-WebSearch - collapsible results list
  if (part.type === "tool-WebSearch") {
    return <AgentWebSearchCollapsible key={idx} part={part} chatStatus={status} />
  }

  // Special handling for tool-WebFetch - expandable content preview
  if (part.type === "tool-WebFetch") {
    return <AgentWebFetchTool key={idx} part={part} chatStatus={status} />
  }

  // Special handling for tool-PlanWrite - plan with steps
  if (part.type === "tool-PlanWrite") {
    return <AgentPlanTool key={idx} part={part} chatStatus={status} />
  }

  // Special handling for tool-ExitPlanMode - show simple indicator inline
  // Full plan card is rendered at end of message
  if (part.type === "tool-ExitPlanMode") {
    const { isPending, isError } = getToolStatus(part, status)
    return (
      <AgentToolCall
        key={idx}
        icon={AgentToolRegistry["tool-ExitPlanMode"].icon}
        title={AgentToolRegistry["tool-ExitPlanMode"].title(part)}
        isPending={isPending}
        isError={isError}
      />
    )
  }

  // Special handling for tool-TodoWrite - todo list with progress
  if (part.type === "tool-TodoWrite") {
    return (
      <AgentTodoTool
        key={idx}
        part={part}
        chatStatus={status}
        subChatId={subChatId}
      />
    )
  }

  // Special handling for tool-AskUserQuestion
  if (part.type === "tool-AskUserQuestion") {
    const { isPending, isError } = getToolStatus(part, status)
    return (
      <AgentAskUserQuestionTool
        key={idx}
        input={part.input}
        result={part.result}
        errorText={(part as any).errorText || (part as any).error}
        state={isPending ? "call" : "result"}
        isError={isError}
        isStreaming={isStreaming && isLastMessage}
        toolCallId={part.toolCallId}
      />
    )
  }

  // Tool parts - check registry
  if (part.type in AgentToolRegistry) {
    const meta = AgentToolRegistry[part.type]
    const { isPending, isError } = getToolStatus(part, status)
    return (
      <AgentToolCall
        key={idx}
        icon={meta.icon}
        title={meta.title(part)}
        subtitle={meta.subtitle?.(part)}
        isPending={isPending}
        isError={isError}
      />
    )
  }

  // Fallback for unknown tool types
  if (part.type?.startsWith("tool-")) {
    return (
      <div key={idx} className="text-xs text-muted-foreground py-0.5 px-2">
        {part.type.replace("tool-", "")}
      </div>
    )
  }

  return null
})
