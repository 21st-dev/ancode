"use client"

// #NP - CCS (Claude Code Switch) Profiles Management Tab

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  Plus,
  Trash2,
  Pencil,
  Server,
  Check,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Power,
  PowerOff,
  ExternalLink,
} from "lucide-react"
import { trpc } from "../../../lib/trpc"
import { cn } from "../../../lib/utils"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import { Badge } from "../../ui/badge"
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

// CCS Profile interface
interface CCSProfile {
  name: string
  baseUrl?: string
  model?: string
  opusModel?: string
  sonnetModel?: string
  haikuModel?: string
  configured?: boolean
}

// Server status component
function ServerStatus({ onRefresh }: { onRefresh: () => void }) {
  const { data: status, isLoading, refetch } = trpc.ccs.status.useQuery()
  const startMutation = trpc.ccs.start.useMutation({ onSuccess: () => refetch() })
  const stopMutation = trpc.ccs.stop.useMutation({ onSuccess: () => refetch() })

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
              ? "CCS server is running"
              : "CCS server is available but stopped"
            : "CCS external tool not found"}
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

// Create profile dialog
interface CreateProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function CreateProfileDialog({ open, onOpenChange, onSuccess }: CreateProfileDialogProps) {
  const [name, setName] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState("")
  const [opusModel, setOpusModel] = useState("")
  const [sonnetModel, setSonnetModel] = useState("")
  const [haikuModel, setHaikuModel] = useState("")
  const [error, setError] = useState<string | null>(null)

  const createMutation = trpc.ccs.profiles.create.useMutation({
    onSuccess: () => {
      onSuccess()
      onOpenChange(false)
      // Reset form
      setName("")
      setBaseUrl("")
      setApiKey("")
      setModel("")
      setOpusModel("")
      setSonnetModel("")
      setHaikuModel("")
      setError(null)
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Profile name is required")
      return
    }
    if (!baseUrl.trim()) {
      setError("Base URL is required")
      return
    }
    if (!apiKey.trim()) {
      setError("API key is required")
      return
    }

    createMutation.mutate({
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim() || undefined,
      opusModel: opusModel.trim() || undefined,
      sonnetModel: sonnetModel.trim() || undefined,
      haikuModel: haikuModel.trim() || undefined,
    })
  }

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName("")
      setBaseUrl("")
      setApiKey("")
      setModel("")
      setOpusModel("")
      setSonnetModel("")
      setHaikuModel("")
      setError(null)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create CCS Profile</DialogTitle>
          <DialogDescription>
            Add a new API profile for CCS multi-provider management.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Profile Name</Label>
            <Input
              id="name"
              placeholder="my-api"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use lowercase letters, numbers, and hyphens
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              placeholder="https://api.openrouter.ai/api/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="pt-3 border-t border-border">
            <p className="text-sm font-medium mb-3">Model Mapping (Optional)</p>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="model" className="text-xs">
                  Default Model
                </Label>
                <Input
                  id="model"
                  placeholder="claude-sonnet-4"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="opusModel" className="text-xs">
                    Opus
                  </Label>
                  <Input
                    id="opusModel"
                    placeholder="claude-opus-4.5"
                    value={opusModel}
                    onChange={(e) => setOpusModel(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="sonnetModel" className="text-xs">
                    Sonnet
                  </Label>
                  <Input
                    id="sonnetModel"
                    placeholder="claude-sonnet-4"
                    value={sonnetModel}
                    onChange={(e) => setSonnetModel(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="haikuModel" className="text-xs">
                    Haiku
                  </Label>
                  <Input
                    id="haikuModel"
                    placeholder="claude-3.5-haiku"
                    value={haikuModel}
                    onChange={(e) => setHaikuModel(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Edit profile dialog
interface EditProfileDialogProps {
  profile: CCSProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function EditProfileDialog({ profile, open, onOpenChange, onSuccess }: EditProfileDialogProps) {
  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState("")
  const [opusModel, setOpusModel] = useState("")
  const [sonnetModel, setSonnetModel] = useState("")
  const [haikuModel, setHaikuModel] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setBaseUrl(profile.baseUrl || "")
      setModel(profile.model || "")
      setOpusModel(profile.opusModel || "")
      setSonnetModel(profile.sonnetModel || "")
      setHaikuModel(profile.haikuModel || "")
      setApiKey("")
    }
  }, [profile])

  const updateMutation = trpc.ccs.profiles.update.useMutation({
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
    if (!profile) return

    updateMutation.mutate({
      name: profile.name,
      ...(baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}),
      ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      ...(model.trim() ? { model: model.trim() } : {}),
      ...(opusModel.trim() ? { opusModel: opusModel.trim() } : {}),
      ...(sonnetModel.trim() ? { sonnetModel: sonnetModel.trim() } : {}),
      ...(haikuModel.trim() ? { haikuModel: haikuModel.trim() } : {}),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile: {profile?.name}</DialogTitle>
          <DialogDescription>
            Update the profile configuration. Leave API key empty to keep existing.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-baseUrl">Base URL</Label>
            <Input
              id="edit-baseUrl"
              placeholder="https://api.openrouter.ai/api/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-apiKey">API Key (leave empty to keep existing)</Label>
            <Input
              id="edit-apiKey"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="pt-3 border-t border-border">
            <p className="text-sm font-medium mb-3">Model Mapping</p>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-model" className="text-xs">
                  Default Model
                </Label>
                <Input
                  id="edit-model"
                  placeholder="claude-sonnet-4"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-opusModel" className="text-xs">
                    Opus
                  </Label>
                  <Input
                    id="edit-opusModel"
                    placeholder="claude-opus-4.5"
                    value={opusModel}
                    onChange={(e) => setOpusModel(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-sonnetModel" className="text-xs">
                    Sonnet
                  </Label>
                  <Input
                    id="edit-sonnetModel"
                    placeholder="claude-sonnet-4"
                    value={sonnetModel}
                    onChange={(e) => setSonnetModel(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-haikuModel" className="text-xs">
                    Haiku
                  </Label>
                  <Input
                    id="edit-haikuModel"
                    placeholder="claude-3.5-haiku"
                    value={haikuModel}
                    onChange={(e) => setHaikuModel(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
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

// Profile row component
interface ProfileRowProps {
  profile: CCSProfile
  onEdit: (profile: CCSProfile) => void
  onDelete: (name: string) => void
  isExpanded: boolean
  onToggleExpand: () => void
}

function ProfileRow({
  profile,
  onEdit,
  onDelete,
  isExpanded,
  onToggleExpand,
}: ProfileRowProps) {
  const hasModelConfig =
    profile.model || profile.opusModel || profile.sonnetModel || profile.haikuModel

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
        {/* Status indicator */}
        {profile.configured ? (
          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
        )}

        {/* Profile info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {profile.name}
            </span>
            {hasModelConfig && (
              <Badge variant="secondary" className="text-[10px]">
                Model Mapping
              </Badge>
            )}
          </div>
          {profile.baseUrl && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {profile.baseUrl}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {hasModelConfig && (
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
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(profile)}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(profile.name)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Expanded model info */}
      <AnimatePresence>
        {isExpanded && hasModelConfig && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-muted/30 border-t border-border"
          >
            <div className="p-3 grid grid-cols-4 gap-3 text-xs">
              {profile.model && (
                <div>
                  <span className="text-muted-foreground block">Default</span>
                  <span className="font-mono">{profile.model}</span>
                </div>
              )}
              {profile.opusModel && (
                <div>
                  <span className="text-muted-foreground block">Opus</span>
                  <span className="font-mono">{profile.opusModel}</span>
                </div>
              )}
              {profile.sonnetModel && (
                <div>
                  <span className="text-muted-foreground block">Sonnet</span>
                  <span className="font-mono">{profile.sonnetModel}</span>
                </div>
              )}
              {profile.haikuModel && (
                <div>
                  <span className="text-muted-foreground block">Haiku</span>
                  <span className="font-mono">{profile.haikuModel}</span>
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
export function AgentsCCSTab() {
  const isNarrowScreen = useIsNarrowScreen()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<CCSProfile | null>(null)
  const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set())

  const utils = trpc.useUtils()
  const { data: status } = trpc.ccs.status.useQuery()
  const { data: profiles = [], isLoading, refetch } = trpc.ccs.profiles.list.useQuery(undefined, {
    enabled: status?.running ?? false,
  })

  const deleteMutation = trpc.ccs.profiles.delete.useMutation({
    onSuccess: () => {
      utils.ccs.profiles.list.invalidate()
    },
  })

  const handleEdit = (profile: CCSProfile) => {
    setEditingProfile(profile)
    setEditDialogOpen(true)
  }

  const handleDelete = (name: string) => {
    if (confirm(`Are you sure you want to delete profile "${name}"?`)) {
      deleteMutation.mutate({ name })
    }
  }

  const handleToggleExpand = (name: string) => {
    setExpandedProfiles((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  const handleSuccess = () => {
    utils.ccs.profiles.list.invalidate()
  }

  const isServerRunning = status?.running ?? false

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
      {/* Header */}
      {!isNarrowScreen && (
        <div className="flex items-center justify-between">
          <div className="flex flex-col space-y-1.5">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">CCS Profiles</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Manage API profiles for Claude Code Switch multi-provider system
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
                CCS Not Available
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                The CCS external tool is not installed. Run{" "}
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
          <p className="text-sm font-medium text-foreground">CCS Server Stopped</p>
          <p className="text-xs text-muted-foreground mt-1">
            Start the CCS server to manage API profiles
          </p>
        </div>
      )}

      {/* Profiles List */}
      {isServerRunning && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-background rounded-lg border border-border p-6 text-center">
              <RefreshCw className="w-6 h-6 mx-auto text-muted-foreground animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Loading profiles...</p>
            </div>
          ) : profiles.length === 0 ? (
            <div className="bg-background rounded-lg border border-border p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">No profiles configured</p>
              <p className="text-xs text-muted-foreground">
                Create a profile to connect to OpenRouter, GLM, or other providers
              </p>
            </div>
          ) : (
            <div className="bg-background rounded-lg border border-border overflow-hidden">
              <div className="divide-y divide-border">
                <AnimatePresence>
                  {profiles.map((profile) => (
                    <motion.div
                      key={profile.name}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <ProfileRow
                        profile={profile}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        isExpanded={expandedProfiles.has(profile.name)}
                        onToggleExpand={() => handleToggleExpand(profile.name)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Add Profile Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setCreateDialogOpen(true)}
            disabled={!isServerRunning}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Profile
          </Button>
        </div>
      )}

      {/* Info Section */}
      <div className="pt-4 border-t border-border space-y-3">
        <div className="flex items-start gap-2">
          <ExternalLink className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div>
            <h4 className="text-xs font-medium text-foreground">About CCS</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              CCS (Claude Code Switch) allows instant switching between multiple Claude
              accounts and alternative model providers like OpenRouter, GLM, and Kimi.
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Profiles created here can be used with the <code className="px-1 py-0.5 bg-muted rounded">ccs</code> CLI
          command for quick provider switching.
        </p>
      </div>

      {/* Create Dialog */}
      <CreateProfileDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleSuccess}
      />

      {/* Edit Dialog */}
      <EditProfileDialog
        profile={editingProfile}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
