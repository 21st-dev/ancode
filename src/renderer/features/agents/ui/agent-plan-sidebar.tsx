"use client"

import { useMemo } from "react"
import { useAtomValue } from "jotai"
import { Button } from "../../../components/ui/button"
import { IconCloseSidebarRight, IconSpinner, PlanIcon } from "../../../components/ui/icons"
import { Kbd } from "../../../components/ui/kbd"
import { ChatMarkdownRenderer } from "../../../components/chat-markdown-renderer"
import { trpc } from "../../../lib/trpc"
import { isPlanModeAtom } from "../atoms"

interface AgentPlanSidebarProps {
  chatId: string
  planPath: string | null
  onClose: () => void
  onBuildPlan?: () => void
}

export function AgentPlanSidebar({
  chatId,
  planPath,
  onClose,
  onBuildPlan,
}: AgentPlanSidebarProps) {
  const isPlanMode = useAtomValue(isPlanModeAtom)

  // Fetch plan file content using tRPC
  const { data: planContent, isLoading, error } = trpc.files.readFile.useQuery(
    { filePath: planPath! },
    { enabled: !!planPath }
  )

  // Extract plan title from markdown (first H1)
  const planTitle = useMemo(() => {
    if (!planContent) return "Plan"
    const match = planContent.match(/^#\s+(.+)$/m)
    return match ? match[1] : "Plan"
  }, [planContent])

  return (
    <div className="flex flex-col h-full bg-tl-background">
      {/* Header */}
      <div className="flex items-center justify-between pl-3 pr-1.5 h-10 bg-tl-background flex-shrink-0 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <PlanIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium truncate">{planTitle}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Build Plan button - only show in plan mode */}
          {isPlanMode && onBuildPlan && (
            <Button
              variant="secondary"
              size="sm"
              className="h-6 px-3 text-xs font-medium rounded-md transition-transform duration-150 active:scale-[0.97]"
              onClick={onBuildPlan}
            >
              Build plan
              <Kbd className="ml-1">⌘↵</Kbd>
            </Button>
          )}
          <Button
            variant="ghost"
            className="h-7 w-7 p-0 hover:bg-muted transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] rounded-md"
            onClick={onClose}
          >
            <IconCloseSidebarRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <IconSpinner className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Loading plan...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="text-muted-foreground mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-50"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Failed to load plan
            </p>
            <p className="text-xs text-muted-foreground/70 max-w-[300px]">
              {error.message || "The plan file could not be read"}
            </p>
          </div>
        ) : !planPath ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="text-muted-foreground mb-4">
              <PlanIcon className="h-12 w-12 opacity-50" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              No plan selected
            </p>
            <p className="text-xs text-muted-foreground/70 max-w-[250px]">
              Click "View plan" on a plan file to preview it here
            </p>
          </div>
        ) : (
          <div
            className="px-4 py-3 allow-text-selection"
            data-plan-path={planPath}
          >
            <ChatMarkdownRenderer
              content={planContent || ""}
              size="sm"
            />
          </div>
        )}
      </div>
    </div>
  )
}
