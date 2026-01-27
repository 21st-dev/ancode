import { useState, useEffect } from "react"
import { ChevronRight, Trash2 } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { trpc } from "../../../lib/trpc"
import { cn } from "../../../lib/utils"
import { AgentIcon } from "../../ui/icons"

// Hook to detect narrow screen
function useIsNarrowScreen(): boolean {
  const [isNarrow, setIsNarrow] = useState(false)

  useEffect(() => {
    const checkWidth = () => {
      setIsNarrow(window.innerWidth <= 768)
    }

    checkWidth()
    window.addEventListener("resize", checkWidth)
    return () => window.removeEventListener("resize", checkWidth)
  }, [])

  return isNarrow
}

interface FileAgent {
  name: string
  description: string
  prompt: string
  tools?: string[]
  disallowedTools?: string[]
  model?: "sonnet" | "opus" | "haiku" | "inherit"
  source: "user" | "project"
  path: string
}

export function AgentsCustomAgentsTab() {
  const isNarrowScreen = useIsNarrowScreen()
  const [expandedAgentName, setExpandedAgentName] = useState<string | null>(null)

  const utils = trpc.useUtils()
  const { data: agents = [], isLoading } = trpc.agents.listEnabled.useQuery(
    undefined,
    { staleTime: 0 } // Always refetch when settings opens
  )

  const openInFinderMutation = trpc.external.openInFinder.useMutation()

  const deleteAgentMutation = trpc.agents.delete.useMutation({
    onSuccess: () => {
      utils.agents.listEnabled.invalidate()
    },
    onError: (error) => {
      console.error("Failed to delete agent:", error.message)
    },
  })

  const userAgents = agents.filter((a) => a.source === "user")

  const handleExpandAgent = (agentName: string) => {
    setExpandedAgentName(expandedAgentName === agentName ? null : agentName)
  }

  const handleOpenInFinder = (path: string) => {
    openInFinderMutation.mutate(path)
  }

  const handleDeleteAgent = (agent: FileAgent) => {
    deleteAgentMutation.mutate({
      name: agent.name,
      source: agent.source,
    })
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
      {/* Header - hidden on narrow screens */}
      {!isNarrowScreen && (
        <div className="flex items-center justify-between">
          <div className="flex flex-col space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Custom Agents</h3>
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground">
                Beta
              </span>
            </div>
            <a
              href="https://code.claude.com/docs/en/sub-agents"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
            >
              Documentation
            </a>
          </div>
        </div>
      )}

      {/* Agents List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-background rounded-lg border border-border p-4 text-sm text-muted-foreground text-center">
            Loading agents...
          </div>
        ) : agents.length === 0 ? (
          <div className="bg-background rounded-lg border border-border p-6 text-center">
            <AgentIcon className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              No custom agents yet
            </p>
            <p className="text-xs text-muted-foreground">
              Use <code className="px-1 py-0.5 rounded bg-muted text-foreground">/create-agent</code> in chat to create one, or manually add <code className="px-1 py-0.5 rounded bg-muted text-foreground">.md</code> files to <code className="px-1 py-0.5 rounded bg-muted text-foreground">~/.claude/agents/</code> or <code className="px-1 py-0.5 rounded bg-muted text-foreground">.claude/agents/</code>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              ~/.claude/agents/
            </div>
            <div className="bg-background rounded-lg border border-border overflow-hidden">
              <div className="divide-y divide-border">
                {userAgents.map((agent) => (
                  <AgentRow
                    key={agent.name}
                    agent={agent}
                    isExpanded={expandedAgentName === agent.name}
                    onToggle={() => handleExpandAgent(agent.name)}
                    onOpenInFinder={() => handleOpenInFinder(agent.path)}
                    onDelete={() => handleDeleteAgent(agent)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="pt-4 border-t border-border space-y-3">
        <div>
          <h4 className="text-xs font-medium text-foreground mb-1.5">
            How Custom Agents Work
          </h4>
          <p className="text-xs text-muted-foreground">
            Agents are specialized sub-agents that Claude can invoke via the Task tool. They have their own system prompt, tools, and model settings.
          </p>
        </div>
        <div>
          <h4 className="text-xs font-medium text-foreground mb-1.5">
            Creating Agents
          </h4>
          <p className="text-xs text-muted-foreground">
            Type <code className="px-1 py-0.5 rounded bg-muted text-foreground">/create-agent</code> in chat to create an agent interactively, or manually create <code className="px-1 py-0.5 rounded bg-muted text-foreground">.md</code> files in <code className="px-1 py-0.5 rounded bg-muted text-foreground">~/.claude/agents/</code> (global) or <code className="px-1 py-0.5 rounded bg-muted text-foreground">.claude/agents/</code> (project).
          </p>
        </div>
        <div>
          <h4 className="text-xs font-medium text-foreground mb-1.5">
            Using Agents
          </h4>
          <p className="text-xs text-muted-foreground">
            Ask Claude to use an agent directly (e.g., "use the code-reviewer agent"), mention them with <code className="px-1 py-0.5 rounded bg-muted text-foreground">@</code> in chat, or Claude will automatically invoke them when appropriate.
          </p>
        </div>
      </div>

    </div>
  )
}

function AgentRow({
  agent,
  isExpanded,
  onToggle,
  onOpenInFinder,
  onDelete,
}: {
  agent: FileAgent
  isExpanded: boolean
  onToggle: () => void
  onOpenInFinder: () => void
  onDelete: () => void
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0",
            isExpanded && "rotate-90",
          )}
        />
        <div className="flex flex-col space-y-0.5 min-w-0 flex-1">
          <span className="text-sm font-medium text-foreground truncate">
            {agent.name}
          </span>
          {agent.description && (
            <span className="text-xs text-muted-foreground truncate">
              {agent.description}
            </span>
          )}
        </div>
        {agent.model && agent.model !== "inherit" && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground flex-shrink-0">
            {agent.model}
          </span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-border bg-muted/20">
              <div className="pt-3 space-y-3">
                {/* Path - clickable to open in Finder */}
                <div>
                  <span className="text-xs font-medium text-foreground">Path</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenInFinder()
                    }}
                    className="block text-xs text-muted-foreground font-mono mt-0.5 break-all text-left hover:text-foreground hover:underline transition-colors cursor-pointer"
                  >
                    {agent.path}
                  </button>
                </div>

                {/* Tools */}
                {agent.tools && agent.tools.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-foreground">Allowed Tools</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {agent.tools.map((tool) => (
                        <span
                          key={tool}
                          className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disallowed Tools */}
                {agent.disallowedTools && agent.disallowedTools.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-foreground">Disallowed Tools</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {agent.disallowedTools.map((tool) => (
                        <span
                          key={tool}
                          className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delete */}
                <div className="pt-2 border-t border-border">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete()
                    }}
                    className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete agent
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
