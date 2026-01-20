"use client"

// #NP - CCR (Claude Code Router) Providers Management Tab

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  Plus,
  Trash2,
  Pencil,
  Router,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Power,
  PowerOff,
  ExternalLink,
  Layers,
} from "lucide-react"
import { trpc } from "../../../lib/trpc"
import { cn } from "../../../lib/utils"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import { Badge } from "../../ui/badge"
import { Textarea } from "../../ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog"
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

// CCR Provider interface
interface CCRProvider {
  name: string
  api_base_url: string
  api_key: string
  models: string[]
  transformer?: {
    use: Array<string | [string, Record<string, unknown>]>
  }
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

// Add provider dialog
interface AddProviderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function AddProviderDialog({ open, onOpenChange, onSuccess }: AddProviderDialogProps) {
  const [name, setName] = useState("")
  const [apiBaseUrl, setApiBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [models, setModels] = useState("")
  const [error, setError] = useState<string | null>(null)

  const addMutation = trpc.ccr.providers.add.useMutation({
    onSuccess: () => {
      onSuccess()
      onOpenChange(false)
      // Reset form
      setName("")
      setApiBaseUrl("")
      setApiKey("")
      setModels("")
      setError(null)
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Provider name is required")
      return
    }
    if (!apiBaseUrl.trim()) {
      setError("API base URL is required")
      return
    }
    if (!models.trim()) {
      setError("At least one model is required")
      return
    }

    const modelList = models
      .split(/[,\n]/)
      .map((m) => m.trim())
      .filter(Boolean)

    addMutation.mutate({
      name: name.trim(),
      api_base_url: apiBaseUrl.trim(),
      api_key: apiKey.trim(),
      models: modelList,
    })
  }

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName("")
      setApiBaseUrl("")
      setApiKey("")
      setModels("")
      setError(null)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add CCR Provider</DialogTitle>
          <DialogDescription>
            Add a new provider to the Claude Code Router configuration.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Provider Name</Label>
            <Input
              id="name"
              placeholder="openrouter"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier for this provider
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="apiBaseUrl">API Base URL</Label>
            <Input
              id="apiBaseUrl"
              placeholder="https://openrouter.ai/api/v1"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-or-v1-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="models">Models (comma or line separated)</Label>
            <Textarea
              id="models"
              placeholder="anthropic/claude-sonnet-4&#10;openai/gpt-4o&#10;google/gemini-2.0-flash"
              value={models}
              onChange={(e) => setModels(e.target.value)}
              rows={4}
              className="font-mono text-xs"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={addMutation.isPending}>
            {addMutation.isPending ? "Adding..." : "Add Provider"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Edit provider dialog
interface EditProviderDialogProps {
  provider: CCRProvider | null
  index: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function EditProviderDialog({
  provider,
  index,
  open,
  onOpenChange,
  onSuccess,
}: EditProviderDialogProps) {
  const [name, setName] = useState("")
  const [apiBaseUrl, setApiBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [models, setModels] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (provider) {
      setName(provider.name)
      setApiBaseUrl(provider.api_base_url)
      setApiKey("") // Don't show existing key
      setModels(provider.models.join("\n"))
    }
  }, [provider])

  const updateMutation = trpc.ccr.providers.update.useMutation({
    onSuccess: () => {
      onSuccess()
      onOpenChange(false)
      setError(null)
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  const handleSubmit = () => {
    if (!provider) return
    if (!name.trim()) {
      setError("Provider name is required")
      return
    }
    if (!apiBaseUrl.trim()) {
      setError("API base URL is required")
      return
    }

    const modelList = models
      .split(/[,\n]/)
      .map((m) => m.trim())
      .filter(Boolean)

    updateMutation.mutate({
      index,
      provider: {
        name: name.trim(),
        api_base_url: apiBaseUrl.trim(),
        api_key: apiKey.trim() || provider.api_key,
        models: modelList.length > 0 ? modelList : provider.models,
        transformer: provider.transformer,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Provider</DialogTitle>
          <DialogDescription>
            Update the provider configuration. Leave API key empty to keep existing.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">Provider Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-apiBaseUrl">API Base URL</Label>
            <Input
              id="edit-apiBaseUrl"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-apiKey">API Key (leave empty to keep existing)</Label>
            <Input
              id="edit-apiKey"
              type="password"
              placeholder="Leave empty to keep existing"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-models">Models</Label>
            <Textarea
              id="edit-models"
              value={models}
              onChange={(e) => setModels(e.target.value)}
              rows={4}
              className="font-mono text-xs"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Provider row component
interface ProviderRowProps {
  provider: CCRProvider
  index: number
  onEdit: (provider: CCRProvider, index: number) => void
  onDelete: (index: number) => void
  isExpanded: boolean
  onToggleExpand: () => void
}

function ProviderRow({
  provider,
  index,
  onEdit,
  onDelete,
  isExpanded,
  onToggleExpand,
}: ProviderRowProps) {
  const hasTransformer = provider.transformer && provider.transformer.use.length > 0

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
        {/* Provider index indicator */}
        <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
          {index + 1}
        </span>

        {/* Provider info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {provider.name}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {provider.models.length} model{provider.models.length !== 1 ? "s" : ""}
            </Badge>
            {hasTransformer && (
              <Badge variant="outline" className="text-[10px]">
                <Layers className="w-3 h-3 mr-1" />
                Transformer
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {provider.api_base_url}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onToggleExpand}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(provider, index)}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(index)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Expanded models info */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-muted/30 border-t border-border"
          >
            <div className="p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Available Models
              </p>
              <div className="flex flex-wrap gap-1.5">
                {provider.models.map((model, i) => (
                  <Badge key={i} variant="secondary" className="text-xs font-mono">
                    {model}
                  </Badge>
                ))}
              </div>
              {hasTransformer && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Transformers
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {provider.transformer?.use.map((t, i) => {
                      const name = Array.isArray(t) ? t[0] : t
                      return (
                        <Badge key={i} variant="outline" className="text-xs font-mono">
                          {name}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Main component
export function AgentsCCRProvidersTab() {
  const isNarrowScreen = useIsNarrowScreen()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<CCRProvider | null>(null)
  const [editingIndex, setEditingIndex] = useState(-1)
  const [expandedProviders, setExpandedProviders] = useState<Set<number>>(new Set())

  const utils = trpc.useUtils()
  const { data: status } = trpc.ccr.status.useQuery()
  const { data: providers = [], isLoading, refetch } = trpc.ccr.providers.list.useQuery(undefined, {
    enabled: status?.running ?? false,
  })

  const deleteMutation = trpc.ccr.providers.delete.useMutation({
    onSuccess: () => {
      utils.ccr.providers.list.invalidate()
    },
  })

  const handleEdit = (provider: CCRProvider, index: number) => {
    setEditingProvider(provider)
    setEditingIndex(index)
    setEditDialogOpen(true)
  }

  const handleDelete = (index: number) => {
    const provider = providers[index]
    if (confirm(`Are you sure you want to delete provider "${provider?.name}"?`)) {
      deleteMutation.mutate({ index })
    }
  }

  const handleToggleExpand = (index: number) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleSuccess = () => {
    utils.ccr.providers.list.invalidate()
  }

  const isServerRunning = status?.running ?? false

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
      {/* Header */}
      {!isNarrowScreen && (
        <div className="flex items-center justify-between">
          <div className="flex flex-col space-y-1.5">
            <div className="flex items-center gap-2">
              <Router className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">CCR Providers</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure AI providers for the Claude Code Router
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
                The Claude Code Router external tool is not installed. Run{" "}
                <code className="px-1 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 rounded">
                  bun run tools:init
                </code>{" "}
                to initialize external tools.
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
            Start the CCR server to manage providers
          </p>
        </div>
      )}

      {/* Providers List */}
      {isServerRunning && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-background rounded-lg border border-border p-6 text-center">
              <RefreshCw className="w-6 h-6 mx-auto text-muted-foreground animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Loading providers...</p>
            </div>
          ) : providers.length === 0 ? (
            <div className="bg-background rounded-lg border border-border p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">No providers configured</p>
              <p className="text-xs text-muted-foreground">
                Add a provider to start routing requests to different AI models
              </p>
            </div>
          ) : (
            <div className="bg-background rounded-lg border border-border overflow-hidden">
              <div className="divide-y divide-border">
                <AnimatePresence>
                  {providers.map((provider, index) => (
                    <motion.div
                      key={`${provider.name}-${index}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <ProviderRow
                        provider={provider}
                        index={index}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        isExpanded={expandedProviders.has(index)}
                        onToggleExpand={() => handleToggleExpand(index)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Add Provider Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setAddDialogOpen(true)}
            disabled={!isServerRunning}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Provider
          </Button>
        </div>
      )}

      {/* Info Section */}
      <div className="pt-4 border-t border-border space-y-3">
        <div className="flex items-start gap-2">
          <ExternalLink className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div>
            <h4 className="text-xs font-medium text-foreground">About CCR</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Claude Code Router intelligently routes requests to different providers
              based on task type, token count, and other criteria. Configure multiple
              providers to optimize for cost and performance.
            </p>
          </div>
        </div>
      </div>

      {/* Add Dialog */}
      <AddProviderDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleSuccess}
      />

      {/* Edit Dialog */}
      <EditProviderDialog
        provider={editingProvider}
        index={editingIndex}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
