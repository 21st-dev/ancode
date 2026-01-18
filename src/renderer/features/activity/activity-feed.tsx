"use client"

import { useAtomValue, useSetAtom } from "jotai"
import {
  activityFeedEnabledAtom,
  toolActivityAtom,
  clearToolActivityAtom,
  type ToolActivity,
} from "../../lib/atoms"
import { LoadingDot } from "../../icons"
import { Button } from "../../components/ui/button"
import { cn } from "../../lib/utils"

// Tool icons for display
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

function getToolIcon(toolName: string): string {
  return TOOL_ICONS[toolName] || "🔧"
}

/**
 * Format relative time (e.g., "2s ago", "1m ago")
 */
function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 5) return "now"
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  return `${Math.floor(hours / 24)}d ago`
}

/**
 * Single activity item in the feed
 */
function ActivityItem({ activity }: { activity: ToolActivity }) {
  return (
    <div className="px-3 py-2 border-b border-border/50 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-sm">{getToolIcon(activity.toolName)}</span>
        <span className="font-medium text-sm truncate flex-1">
          {activity.toolName}
        </span>
        {activity.state === "running" && (
          <LoadingDot isLoading={true} className="w-2.5 h-2.5 text-primary" />
        )}
        {activity.state === "error" && (
          <span className="text-destructive text-xs font-medium">Error</span>
        )}
        {activity.state === "complete" && (
          <span className="text-muted-foreground text-xs">✓</span>
        )}
      </div>
      <div className="text-xs text-muted-foreground truncate mt-0.5 pl-6">
        {activity.summary}
      </div>
      <div className="text-[10px] text-muted-foreground/70 mt-0.5 pl-6 flex items-center gap-1">
        <span className="truncate max-w-[100px]">{activity.chatName}</span>
        <span>•</span>
        <span>{formatRelativeTime(activity.timestamp)}</span>
      </div>
    </div>
  )
}

/**
 * Activity Feed Panel
 * Shows real-time tool execution history
 */
export function ActivityFeed({ className }: { className?: string }) {
  const activities = useAtomValue(toolActivityAtom)
  const enabled = useAtomValue(activityFeedEnabledAtom)
  const clearActivities = useSetAtom(clearToolActivityAtom)

  if (!enabled) return null

  // Count running activities
  const runningCount = activities.filter((a) => a.state === "running").length

  return (
    <div
      className={cn(
        "w-56 border-l border-border/50 bg-background h-full overflow-hidden flex flex-col",
        className,
      )}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm">Activity</h3>
          {runningCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {runningCount}
            </span>
          )}
        </div>
        {activities.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => clearActivities()}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Activity list */}
      <div className="flex-1 overflow-y-auto">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))
        ) : (
          <div className="p-4 text-muted-foreground text-sm text-center">
            No recent activity
          </div>
        )}
      </div>
    </div>
  )
}
