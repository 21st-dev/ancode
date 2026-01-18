"use client"

import { useCallback, useEffect, useRef } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { toast } from "sonner"
import {
  notificationModeAtom,
  toastNotificationsEnabledAtom,
  addToolActivityAtom,
  updateToolActivityAtom,
  type ToolActivity,
} from "../../../lib/atoms"

// Tool icons for toast notifications
const TOOL_ICONS: Record<string, string> = {
  Read: "📖",
  Write: "📝",
  Edit: "✏️",
  Bash: "🖥️",
  Glob: "🔍",
  Grep: "🔎",
  WebFetch: "🌐",
  Task: "🤖",
  TodoWrite: "📋",
  WebSearch: "🔎",
  AskUserQuestion: "❓",
  NotebookEdit: "📓",
}

/**
 * Extract a human-readable summary from tool input
 */
function getToolSummary(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case "Read":
    case "Write":
    case "Edit": {
      const filePath = input?.file_path as string
      return filePath?.split("/").pop() || "file"
    }
    case "Bash": {
      const cmd = (input?.command as string) || ""
      return cmd.length > 40 ? cmd.substring(0, 40) + "..." : cmd
    }
    case "Glob":
    case "Grep": {
      return (input?.pattern as string) || "pattern"
    }
    case "WebFetch": {
      try {
        const url = input?.url as string
        return url ? new URL(url).hostname : "url"
      } catch {
        return "url"
      }
    }
    case "WebSearch": {
      return (input?.query as string)?.substring(0, 40) || "search"
    }
    case "Task": {
      return (input?.description as string)?.substring(0, 40) || "task"
    }
    case "TodoWrite": {
      const todos = input?.todos as unknown[]
      return todos ? `${todos.length} items` : "todos"
    }
    default:
      return toolName
  }
}

/**
 * Get icon for a tool
 */
function getToolIcon(toolName: string): string {
  return TOOL_ICONS[toolName] || "🔧"
}

// Track window focus state
let isWindowFocused = typeof document !== "undefined" ? document.hasFocus() : true

// Setup focus tracking (runs once)
if (typeof window !== "undefined") {
  window.addEventListener("focus", () => {
    isWindowFocused = true
  })
  window.addEventListener("blur", () => {
    isWindowFocused = false
  })
}

// Custom event types for tool notifications
declare global {
  interface WindowEventMap {
    "tool-start": CustomEvent<{
      toolCallId: string
      toolName: string
      input: Record<string, unknown>
      subChatId: string
      chatName: string
    }>
    "tool-complete": CustomEvent<{
      toolCallId: string
      isError: boolean
    }>
  }
}

/**
 * Hook for tool execution notifications
 * - Shows toast notifications when tools start (if enabled)
 * - Adds activities to the activity feed
 * - Respects notification mode settings
 */
export function useToolNotifications(subChatId: string, chatName: string) {
  const notificationMode = useAtomValue(notificationModeAtom)
  const toastsEnabled = useAtomValue(toastNotificationsEnabledAtom)
  const addActivity = useSetAtom(addToolActivityAtom)
  const updateActivity = useSetAtom(updateToolActivityAtom)

  // Track tool call IDs to activity IDs mapping
  const toolCallToActivityId = useRef<Map<string, string>>(new Map())

  /**
   * Check if we should show notifications based on current mode
   */
  const shouldNotify = useCallback((): boolean => {
    if (notificationMode === "always") return true
    if (notificationMode === "never") return false
    return !isWindowFocused // "unfocused" mode
  }, [notificationMode])

  /**
   * Notify when a tool starts executing
   */
  const notifyToolStart = useCallback(
    (toolCallId: string, toolName: string, input: Record<string, unknown>) => {
      const summary = getToolSummary(toolName, input)

      // Add to activity feed (always, regardless of notification mode)
      const activityId = addActivity({
        subChatId,
        chatName,
        toolName,
        summary,
        state: "running",
      })

      // Track mapping for later updates
      if (activityId) {
        toolCallToActivityId.current.set(toolCallId, activityId)
      }

      // Show toast if enabled and should notify
      if (toastsEnabled && shouldNotify()) {
        toast(`${getToolIcon(toolName)} ${toolName}`, {
          description: summary,
          duration: 3000,
        })
      }
    },
    [subChatId, chatName, toastsEnabled, shouldNotify, addActivity],
  )

  /**
   * Notify when a tool completes
   */
  const notifyToolComplete = useCallback(
    (toolCallId: string, isError: boolean) => {
      const activityId = toolCallToActivityId.current.get(toolCallId)
      if (activityId) {
        updateActivity({
          id: activityId,
          state: isError ? "error" : "complete",
        })
        toolCallToActivityId.current.delete(toolCallId)
      }
    },
    [updateActivity],
  )

  // Listen for global tool events
  useEffect(() => {
    const handleToolStart = (e: WindowEventMap["tool-start"]) => {
      // Only handle events for this sub-chat
      if (e.detail.subChatId === subChatId) {
        notifyToolStart(e.detail.toolCallId, e.detail.toolName, e.detail.input)
      }
    }

    const handleToolComplete = (e: WindowEventMap["tool-complete"]) => {
      notifyToolComplete(e.detail.toolCallId, e.detail.isError)
    }

    window.addEventListener("tool-start", handleToolStart)
    window.addEventListener("tool-complete", handleToolComplete)

    return () => {
      window.removeEventListener("tool-start", handleToolStart)
      window.removeEventListener("tool-complete", handleToolComplete)
    }
  }, [subChatId, notifyToolStart, notifyToolComplete])

  return {
    notifyToolStart,
    notifyToolComplete,
    shouldNotify,
  }
}

/**
 * Dispatch a tool start event (called from ipc-chat-transport)
 */
export function dispatchToolStart(
  toolCallId: string,
  toolName: string,
  input: Record<string, unknown>,
  subChatId: string,
  chatName: string,
) {
  if (typeof window === "undefined") return

  window.dispatchEvent(
    new CustomEvent("tool-start", {
      detail: { toolCallId, toolName, input, subChatId, chatName },
    }),
  )
}

/**
 * Dispatch a tool complete event (called from ipc-chat-transport)
 */
export function dispatchToolComplete(toolCallId: string, isError: boolean) {
  if (typeof window === "undefined") return

  window.dispatchEvent(
    new CustomEvent("tool-complete", {
      detail: { toolCallId, isError },
    }),
  )
}
