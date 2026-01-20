"use client"

import { useState, useEffect } from "react"
import { ArrowRight, Zap } from "lucide-react"
import { motion } from "motion/react"
import { trpc } from "../../../lib/trpc"
import { cn } from "../../../lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select"

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

// Agent type descriptions for better UX
const AGENT_DESCRIPTIONS: Record<string, string> = {
  Explore: "Fast codebase exploration and file search",
  Plan: "Complex planning and architecture decisions",
  Bash: "Command execution and shell operations",
  "general-purpose": "Varied multi-step tasks",
  "code-reviewer": "Code quality and review",
  "code-archaeologist": "Legacy codebase analysis",
  "documentation-specialist": "Documentation generation",
  "performance-optimizer": "Performance optimization",
}

interface RoutingRowProps {
  agentType: string
  currentProviderId: string | null
  providers: Array<{ id: string; name: string; role: string }>
  onProviderChange: (agentType: string, providerId: string | null) => void
  isUpdating: boolean
}

function RoutingRow({
  agentType,
  currentProviderId,
  providers,
  onProviderChange,
  isUpdating,
}: RoutingRowProps) {
  const description = AGENT_DESCRIPTIONS[agentType] || "Subagent task"
  const primaryProvider = providers.find((p) => p.role === "primary")
  const displayValue = currentProviderId || "primary"

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
      {/* Agent type info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {agentType}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {description}
        </p>
      </div>

      {/* Arrow indicator */}
      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />

      {/* Provider selector */}
      <Select
        value={displayValue}
        onValueChange={(value) =>
          onProviderChange(agentType, value === "primary" ? null : value)
        }
        disabled={isUpdating}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select provider" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="primary">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>Primary ({primaryProvider?.name || "None"})</span>
            </div>
          </SelectItem>
          {providers
            .filter((p) => p.role !== "primary")
            .map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                  <span>{provider.name}</span>
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function AgentsRoutingTab() {
  const isNarrowScreen = useIsNarrowScreen()

  const utils = trpc.useUtils()
  const { data: providers = [] } = trpc.providers.list.useQuery()
  const { data: routings = [] } = trpc.routing.list.useQuery()
  const { data: agentTypes = [] } = trpc.routing.getAgentTypes.useQuery()

  const setRoutingMutation = trpc.routing.set.useMutation({
    onSuccess: () => {
      utils.routing.list.invalidate()
    },
  })

  const handleProviderChange = (agentType: string, providerId: string | null) => {
    setRoutingMutation.mutate({ agentType, providerId })
  }

  // Get current provider ID for an agent type
  const getProviderIdForAgent = (agentType: string): string | null => {
    const routing = routings.find((r) => r.agentType === agentType)
    return routing?.providerId ?? null
  }

  const hasSecondaryProviders = providers.some((p) => p.role !== "primary")

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
      {/* Header */}
      {!isNarrowScreen && (
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <h3 className="text-sm font-semibold text-foreground">Task Routing</h3>
          <p className="text-xs text-muted-foreground">
            Route subagent tasks to different AI providers for cost optimization
          </p>
        </div>
      )}

      {/* Info Banner */}
      {!hasSecondaryProviders && (
        <div className="bg-muted/50 rounded-lg border border-border p-4">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Add a secondary provider
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Go to the Providers tab to add GLM or another API provider.
                Then you can route specific tasks to save costs while keeping
                complex reasoning on your primary provider.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Routing List */}
      <div className="space-y-4">
        {providers.length === 0 ? (
          <div className="bg-background rounded-lg border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              No providers configured
            </p>
            <p className="text-xs text-muted-foreground">
              Add providers in the Providers tab first
            </p>
          </div>
        ) : (
          <div className="bg-background rounded-lg border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {agentTypes.map((agentType) => (
                <motion.div
                  key={agentType}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <RoutingRow
                    agentType={agentType}
                    currentProviderId={getProviderIdForAgent(agentType)}
                    providers={providers}
                    onProviderChange={handleProviderChange}
                    isUpdating={setRoutingMutation.isPending}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {hasSecondaryProviders && (
        <div className="pt-4 border-t border-border space-y-3">
          <h4 className="text-xs font-medium text-foreground">
            Recommended Routing
          </h4>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Primary (Opus):</strong> Plan, code-reviewer, general-purpose
            </p>
            <p>
              <strong>Secondary (GLM):</strong> Explore, Bash, documentation tasks
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Route simple, repetitive tasks to secondary providers to reduce costs
            while keeping complex reasoning on your primary model.
          </p>
        </div>
      )}
    </div>
  )
}
