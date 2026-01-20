"use client"

// #NP - CCR (Claude Code Router) Routing Configuration Tab

import { useState, useEffect } from "react"
import { ArrowRight, Router, AlertCircle, RefreshCw, Power, PowerOff, Save, Info } from "lucide-react"
import { trpc } from "../../../lib/trpc"
import { cn } from "../../../lib/utils"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../ui/tooltip"

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

// Router config interface
interface RouterConfig {
  default: string
  background: string
  think: string
  longContext: string
  longContextThreshold: number
  webSearch: string
  image: string
}

// Task type descriptions
const TASK_DESCRIPTIONS: Record<string, string> = {
  default: "Standard requests without special requirements",
  background: "Background processing and batch operations",
  think: "Complex reasoning and thinking tasks",
  longContext: "Requests exceeding the context threshold",
  webSearch: "Tasks requiring web search capabilities",
  image: "Image processing and vision tasks",
}

// Server status component
function ServerStatus({ onRefresh }: { onRefresh: () => void }) {
  const { data: status, isLoading, refetch } = trpc.ccr.status.useQuery()
  const startMutation = trpc.ccr.start.useMutation({ onSuccess: () => refetch() })
  const stopMutation = trpc.ccr.stop.useMutation({ onSuccess: () => refetch() })

  const isRunning = status?.running ?? false
  const isAvailable = status?.available ?? false

  const handleToggle = () => {
    if (isRunning) {
      stopMutation.mutate()
    } else {
      startMutation.mutate({})
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                isRunning ? "bg-green-500" : "bg-muted-foreground/50"
              )}
            />
            <span className="text-xs text-muted-foreground">
              {isRunning ? `Running on :${status?.port}` : "Stopped"}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {isAvailable
            ? isRunning
              ? "CCR server is running"
              : "CCR server is available but stopped"
            : "CCR external tool not found"}
        </TooltipContent>
      </Tooltip>

      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2"
        onClick={handleToggle}
        disabled={!isAvailable || startMutation.isPending || stopMutation.isPending}
      >
        {isRunning ? (
          <>
            <PowerOff className="w-3 h-3 mr-1" />
            Stop
          </>
        ) : (
          <>
            <Power className="w-3 h-3 mr-1" />
            Start
          </>
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => {
          refetch()
          onRefresh()
        }}
        disabled={isLoading}
      >
        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
      </Button>
    </div>
  )
}

// Routing row component
interface RoutingRowProps {
  taskType: string
  description: string
  currentModel: string
  availableModels: string[]
  onChange: (model: string) => void
}

function RoutingRow({
  taskType,
  description,
  currentModel,
  availableModels,
  onChange,
}: RoutingRowProps) {
  return (
    <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
      {/* Task type info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground capitalize">
            {taskType}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {description}
        </p>
      </div>

      {/* Arrow indicator */}
      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />

      {/* Model selector */}
      <Select value={currentModel} onValueChange={onChange}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent>
          {availableModels.map((model) => (
            <SelectItem key={model} value={model}>
              <span className="font-mono text-xs">{model}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// Main component
export function AgentsCCRRoutingTab() {
  const isNarrowScreen = useIsNarrowScreen()
  const [localConfig, setLocalConfig] = useState<RouterConfig | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const utils = trpc.useUtils()
  const { data: status } = trpc.ccr.status.useQuery()
  const { data: routerConfig, isLoading, refetch } = trpc.ccr.router.get.useQuery(undefined, {
    enabled: status?.running ?? false,
  })
  const { data: providers = [] } = trpc.ccr.providers.list.useQuery(undefined, {
    enabled: status?.running ?? false,
  })

  // Extract all available models from providers
  const availableModels = providers.flatMap((p) => p.models)

  // Initialize local config from server
  useEffect(() => {
    if (routerConfig && !localConfig) {
      setLocalConfig(routerConfig)
    }
  }, [routerConfig, localConfig])

  // Reset local config when modal opens/server changes
  useEffect(() => {
    if (routerConfig) {
      setLocalConfig(routerConfig)
      setHasChanges(false)
    }
  }, [routerConfig])

  const updateMutation = trpc.ccr.router.update.useMutation({
    onSuccess: () => {
      utils.ccr.router.get.invalidate()
      setHasChanges(false)
    },
  })

  const handleModelChange = (taskType: keyof RouterConfig, model: string) => {
    if (!localConfig) return

    setLocalConfig({
      ...localConfig,
      [taskType]: model,
    })
    setHasChanges(true)
  }

  const handleThresholdChange = (value: string) => {
    if (!localConfig) return
    const threshold = parseInt(value, 10)
    if (!isNaN(threshold) && threshold > 0) {
      setLocalConfig({
        ...localConfig,
        longContextThreshold: threshold,
      })
      setHasChanges(true)
    }
  }

  const handleSave = () => {
    if (!localConfig) return
    updateMutation.mutate(localConfig)
  }

  const handleReset = () => {
    if (routerConfig) {
      setLocalConfig(routerConfig)
      setHasChanges(false)
    }
  }

  const isServerRunning = status?.running ?? false
  const taskTypes = ["default", "background", "think", "longContext", "webSearch", "image"] as const

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
      {/* Header */}
      {!isNarrowScreen && (
        <div className="flex items-center justify-between">
          <div className="flex flex-col space-y-1.5">
            <div className="flex items-center gap-2">
              <Router className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">CCR Task Routing</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure which models handle different task types
            </p>
          </div>
          <ServerStatus onRefresh={() => refetch()} />
        </div>
      )}

      {/* Not Available Warning */}
      {!status?.available && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-900/30 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                CCR Not Available
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                The Claude Code Router external tool is not installed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Server Not Running */}
      {status?.available && !isServerRunning && (
        <div className="bg-muted/50 rounded-lg border border-border p-4 text-center">
          <PowerOff className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-foreground">CCR Server Stopped</p>
          <p className="text-xs text-muted-foreground mt-1">
            Start the CCR server to configure task routing
          </p>
        </div>
      )}

      {/* No Providers Warning */}
      {isServerRunning && providers.length === 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900/30 p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                No Providers Configured
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Add providers in the CCR Providers tab to configure routing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Routing Configuration */}
      {isServerRunning && localConfig && availableModels.length > 0 && (
        <div className="space-y-4">
          {/* Context Threshold */}
          <div className="bg-background rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Long Context Threshold</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Requests exceeding this token count route to longContext model
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={localConfig.longContextThreshold}
                  onChange={(e) => handleThresholdChange(e.target.value)}
                  className="w-28 h-8 text-right font-mono"
                  min={1000}
                  step={1000}
                />
                <span className="text-xs text-muted-foreground">tokens</span>
              </div>
            </div>
          </div>

          {/* Task Routing List */}
          {isLoading ? (
            <div className="bg-background rounded-lg border border-border p-6 text-center">
              <RefreshCw className="w-6 h-6 mx-auto text-muted-foreground animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Loading configuration...</p>
            </div>
          ) : (
            <div className="bg-background rounded-lg border border-border overflow-hidden">
              <div className="divide-y divide-border">
                {taskTypes.map((taskType) => (
                  <RoutingRow
                    key={taskType}
                    taskType={taskType}
                    description={TASK_DESCRIPTIONS[taskType]}
                    currentModel={localConfig[taskType]}
                    availableModels={availableModels}
                    onChange={(model) => handleModelChange(taskType, model)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Save/Reset Actions */}
          {hasChanges && (
            <div className="flex items-center justify-between bg-primary/5 rounded-lg border border-primary/20 p-3">
              <p className="text-sm text-foreground">
                You have unsaved changes
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3 mr-1" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Section */}
      <div className="pt-4 border-t border-border space-y-3">
        <h4 className="text-xs font-medium text-foreground">Task Type Reference</h4>
        <div className="text-xs text-muted-foreground space-y-2">
          <p>
            <strong>default:</strong> Standard requests that don't match other categories
          </p>
          <p>
            <strong>background:</strong> Subagent tasks that run in parallel
          </p>
          <p>
            <strong>think:</strong> Tasks requiring extended reasoning (claude-opus-4.5)
          </p>
          <p>
            <strong>longContext:</strong> Requests exceeding the token threshold
          </p>
          <p>
            <strong>webSearch:</strong> Tasks that need web search capabilities
          </p>
          <p>
            <strong>image:</strong> Vision tasks processing images
          </p>
        </div>
      </div>
    </div>
  )
}
