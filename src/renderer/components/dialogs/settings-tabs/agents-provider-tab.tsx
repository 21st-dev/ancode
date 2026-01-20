"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Check, Pencil, Crown, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { trpc } from "../../../lib/trpc"
import { cn } from "../../../lib/utils"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog"

interface ProviderModel {
  id: string
  modelId: string
  displayName: string
  apiFormat: string // "openai" | "anthropic" typically
  isDefault: number | boolean // DB returns number, but we treat as boolean
  contextLength?: number | null
  isAvailable?: number | null
  providerId?: string
  providerName?: string
  capabilities?: {
    vision?: boolean
    tools?: boolean
    thinking?: boolean
  } | null
}

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

// Status indicator dot
function StatusDot({ isPrimary }: { isPrimary: boolean }) {
  return (
    <span
      className={cn(
        "w-2 h-2 rounded-full flex-shrink-0",
        isPrimary ? "bg-green-500" : "bg-muted-foreground/50"
      )}
    />
  )
}

interface Provider {
  id: string
  name: string
  type: string
  role: string
  isBuiltin: number
  hasApiKey: boolean
  baseUrl: string | null
  userId: string | null
  createdAt: Date | null
}

interface AddProviderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function AddProviderDialog({ open, onOpenChange, onSuccess }: AddProviderDialogProps) {
  const [name, setName] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [userId, setUserId] = useState("")
  const [error, setError] = useState<string | null>(null)

  const createMutation = trpc.providers.create.useMutation({
    onSuccess: () => {
      onSuccess()
      onOpenChange(false)
      // Reset form
      setName("")
      setApiKey("")
      setBaseUrl("")
      setUserId("")
      setError(null)
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Name is required")
      return
    }
    if (!apiKey.trim()) {
      setError("API key is required")
      return
    }
    if (!baseUrl.trim()) {
      setError("Base URL is required")
      return
    }

    createMutation.mutate({
      name: name.trim(),
      type: "api_key",
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim(),
      userId: userId.trim() || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add AI Provider</DialogTitle>
          <DialogDescription>
            Add a custom API provider like GLM or other Claude-compatible endpoints.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="GLM 4.7 Coding"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              placeholder="https://api.z.ai/api/coding/paas/v4"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              For GLM Coding: https://api.z.ai/api/coding/paas/v4
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="userId">User ID (optional, for GLM)</Label>
            <Input
              id="userId"
              placeholder="63451753816499550"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Required for GLM authentication
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Adding..." : "Add Provider"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface EditProviderDialogProps {
  provider: Provider | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function EditProviderDialog({ provider, open, onOpenChange, onSuccess }: EditProviderDialogProps) {
  const [name, setName] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [userId, setUserId] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (provider) {
      setName(provider.name)
      setBaseUrl(provider.baseUrl || "")
      setUserId(provider.userId || "")
      setApiKey("") // Don't show existing key
    }
  }, [provider])

  const updateMutation = trpc.providers.update.useMutation({
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
      setError("Name is required")
      return
    }

    updateMutation.mutate({
      id: provider.id,
      name: name.trim(),
      baseUrl: baseUrl.trim() || null,
      userId: userId.trim() || undefined,
      ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Provider</DialogTitle>
          <DialogDescription>
            Update the provider configuration.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={provider?.isBuiltin === 1}
            />
          </div>
          {provider?.type === "api_key" && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="edit-baseUrl">Base URL</Label>
                <Input
                  id="edit-baseUrl"
                  placeholder="https://api.z.ai/api/coding/paas/v4"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-userId">User ID (for GLM)</Label>
                <Input
                  id="edit-userId"
                  placeholder="63451753816499550"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-apiKey">API Key (leave empty to keep existing)</Label>
                <Input
                  id="edit-apiKey"
                  type="password"
                  placeholder="Enter new API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
            </>
          )}
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
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

interface ProviderRowProps {
  provider: Provider
  onSetPrimary: (id: string) => void
  onEdit: (provider: Provider) => void
  onDelete: (id: string) => void
  isSettingPrimary: boolean
  onFetchModels: (providerId: string) => void
  onSetDefaultModel: (providerId: string, modelId: string) => void
  isFetchingModels: boolean
  expandedProviders: Set<string>
  onToggleExpand: (providerId: string) => void
  providerModels: Record<string, ProviderModel[]>
}

function ProviderRow({
  provider,
  onSetPrimary,
  onEdit,
  onDelete,
  isSettingPrimary,
  onFetchModels,
  onSetDefaultModel,
  isFetchingModels,
  expandedProviders,
  onToggleExpand,
  providerModels,
}: ProviderRowProps) {
  const isPrimary = provider.role === "primary"
  const isExpanded = expandedProviders.has(provider.id)
  const models = providerModels[provider.id] || []

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Provider main row */}
      <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
        {/* Status dot */}
        <StatusDot isPrimary={isPrimary} />

        {/* Provider info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {provider.name}
            </span>
            {isPrimary && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded">
                <Crown className="w-3 h-3" />
                Primary
              </span>
            )}
            {provider.isBuiltin === 1 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground rounded">
                Built-in
              </span>
            )}
            {models.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-500 rounded">
                {models.length} model{models.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {provider.baseUrl && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {provider.baseUrl}
            </p>
          )}
          {provider.type === "anthropic_oauth" && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Anthropic OAuth
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {provider.type === "api_key" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onFetchModels(provider.id)}
              disabled={isFetchingModels}
            >
              <RefreshCw className={cn("w-3 h-3 mr-1", isFetchingModels && "animate-spin")} />
              {models.length > 0 ? "Refresh" : "Fetch Models"}
            </Button>
          )}
          {models.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onToggleExpand(provider.id)}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          )}
          {!isPrimary && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onSetPrimary(provider.id)}
              disabled={isSettingPrimary}
            >
              <Check className="w-3 h-3 mr-1" />
              Use
            </Button>
          )}
          {provider.type === "api_key" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(provider)}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
          {provider.isBuiltin === 0 && !isPrimary && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(provider.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Expanded models section */}
      <AnimatePresence>
        {isExpanded && models.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-muted/30 border-t border-border"
          >
            <div className="p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Available Models
              </p>
              {models.map((model) => (
                <div
                  key={model.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer",
                    model.isDefault && "bg-primary/5 border border-primary/20"
                  )}
                  onClick={() => !model.isDefault && onSetDefaultModel(provider.id, model.modelId)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">
                      {model.displayName}
                    </span>
                    {model.isDefault && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded">
                        Default
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground rounded">
                      {model.apiFormat}
                    </span>
                  </div>
                  {!model.isDefault && (
                    <Check className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function AgentsProviderTab() {
  const isNarrowScreen = useIsNarrowScreen()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set())
  const [providerModels, setProviderModels] = useState<Record<string, ProviderModel[]>>({})

  const utils = trpc.useUtils()
  const { data: providers = [], isLoading } = trpc.providers.list.useQuery()

  // Fetch models for each provider on load
  useEffect(() => {
    providers.forEach((provider) => {
      if (provider.type === "api_key") {
        utils.providers.getModels.fetch({ providerId: provider.id }).then((models) => {
          setProviderModels((prev) => ({
            ...prev,
            [provider.id]: models,
          }))
        })
      }
    })
  }, [providers, utils])

  const setPrimaryMutation = trpc.providers.setPrimary.useMutation({
    onSuccess: () => {
      utils.providers.list.invalidate()
    },
  })

  const deleteMutation = trpc.providers.delete.useMutation({
    onSuccess: () => {
      utils.providers.list.invalidate()
    },
  })

  const fetchModelsMutation = trpc.providers.fetchModels.useMutation({
    onSuccess: (data, variables) => {
      utils.providers.getModels.invalidate({ providerId: variables.id })
      // Update local state
      utils.providers.getModels.fetch({ providerId: variables.id }).then((models) => {
        setProviderModels((prev) => ({
          ...prev,
          [variables.id]: models,
        }))
      })
      // Auto-expand after fetching
      setExpandedProviders((prev) => new Set([...prev, variables.id]))
    },
  })

  const setDefaultModelMutation = trpc.providers.setDefaultModel.useMutation({
    onSuccess: (_, variables) => {
      utils.providers.getModels.invalidate({ providerId: variables.providerId })
      // Update local state
      utils.providers.getModels.fetch({ providerId: variables.providerId }).then((models) => {
        setProviderModels((prev) => ({
          ...prev,
          [variables.providerId]: models,
        }))
      })
    },
  })

  const handleSetPrimary = (id: string) => {
    setPrimaryMutation.mutate({ id })
  }

  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider)
    setEditDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this provider?")) {
      deleteMutation.mutate({ id })
    }
  }

  const handleFetchModels = (providerId: string) => {
    fetchModelsMutation.mutate({ id: providerId })
  }

  const handleSetDefaultModel = (providerId: string, modelId: string) => {
    setDefaultModelMutation.mutate({ providerId, modelId })
  }

  const handleToggleExpand = (providerId: string) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev)
      if (next.has(providerId)) {
        next.delete(providerId)
      } else {
        next.add(providerId)
      }
      return next
    })
  }

  const handleAddSuccess = () => {
    utils.providers.list.invalidate()
  }

  const handleEditSuccess = () => {
    utils.providers.list.invalidate()
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
      {/* Header */}
      {!isNarrowScreen && (
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <h3 className="text-sm font-semibold text-foreground">AI Providers</h3>
          <p className="text-xs text-muted-foreground">
            Configure multiple AI providers and their available models
          </p>
        </div>
      )}

      {/* Providers List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-background rounded-lg border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">Loading providers...</p>
          </div>
        ) : providers.length === 0 ? (
          <div className="bg-background rounded-lg border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              No providers configured
            </p>
            <p className="text-xs text-muted-foreground">
              Connect to Anthropic via OAuth or add a custom API provider
            </p>
          </div>
        ) : (
          <div className="bg-background rounded-lg border border-border overflow-hidden">
            <div className="divide-y divide-border">
              <AnimatePresence>
                {providers.map((provider) => (
                  <motion.div
                    key={provider.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <ProviderRow
                      provider={provider}
                      onSetPrimary={handleSetPrimary}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      isSettingPrimary={setPrimaryMutation.isPending}
                      onFetchModels={handleFetchModels}
                      onSetDefaultModel={handleSetDefaultModel}
                      isFetchingModels={fetchModelsMutation.isPending}
                      expandedProviders={expandedProviders}
                      onToggleExpand={handleToggleExpand}
                      providerModels={providerModels}
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
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Provider
        </Button>
      </div>

      {/* Info Section */}
      <div className="pt-4 border-t border-border space-y-3">
        <div>
          <h4 className="text-xs font-medium text-foreground mb-1.5">
            GLM Configuration
          </h4>
          <p className="text-xs text-muted-foreground mb-1">
            <strong>Base URL:</strong>{" "}
            <code className="px-1 py-0.5 bg-muted rounded">
              https://api.z.ai/api/coding/paas/v4
            </code>
          </p>
          <p className="text-xs text-muted-foreground mb-1">
            <strong>User ID:</strong>{" "}
            <code className="px-1 py-0.5 bg-muted rounded">
              63451753816499550
            </code>
          </p>
          <p className="text-xs text-muted-foreground">
            User ID is required for GLM authentication. The API key and user ID
            are both sent in the request headers.
          </p>
        </div>
        <div>
          <h4 className="text-xs font-medium text-foreground mb-1.5">
            Fetching Models
          </h4>
          <p className="text-xs text-muted-foreground">
            Click "Fetch Models" to load available models from a provider. The default
            model will be used for chat conversations with that provider.
          </p>
        </div>
        <div>
          <h4 className="text-xs font-medium text-foreground mb-1.5">
            Switching Providers
          </h4>
          <p className="text-xs text-muted-foreground">
            Click "Use" to switch to a provider. The primary provider will be used
            for main chat conversations.
          </p>
        </div>
      </div>

      {/* Add Provider Dialog */}
      <AddProviderDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleAddSuccess}
      />

      {/* Edit Provider Dialog */}
      <EditProviderDialog
        provider={editingProvider}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleEditSuccess}
      />
    </div>
  )
}
