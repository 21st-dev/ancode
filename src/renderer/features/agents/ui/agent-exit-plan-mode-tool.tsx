"use client"

import { memo } from "react"
import { ChatMarkdownRenderer } from "../../../components/chat-markdown-renderer"
import { areToolPropsEqual } from "./agent-tool-utils"

interface ExitPlanModeToolPart {
  type: string
  state: string
  input?: Record<string, unknown>
  output?: {
    plan?: string
  }
}

interface AgentExitPlanModeToolProps {
  part: ExitPlanModeToolPart
  chatStatus?: string
}

export const AgentExitPlanModeTool = memo(function AgentExitPlanModeTool({
  part,
}: AgentExitPlanModeToolProps) {
  // Plan is now shown in sidebar instead of inline
  // This component remains for potential future use
  return null
}, areToolPropsEqual)
