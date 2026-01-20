"use client"

import { useState, useMemo } from "react"
import { useAtom, useAtomValue } from "jotai"
import { ChevronDown, Cpu, Check, Sparkles } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import { ClaudeCodeIcon } from "../../../components/ui/icons"
import { trpc } from "../../../lib/trpc"
import {
  selectedProjectAtom,
  currentProjectModelPreferenceAtom,
  type SelectedProject,
} from "../atoms"

// Provider icon based on type
function ProviderIcon({
  type,
  className,
}: {
  type: string // "anthropic_oauth" | "api_key" typically
  className?: string
}) {
  if (type === "anthropic_oauth") {
    return <ClaudeCodeIcon className={className} />
  }
  return <Cpu className={className} />
}

// Model display name formatter
function formatModelName(modelId: string, displayName: string): string {
  // Use display name if available, otherwise format model ID
  if (displayName && displayName !== modelId) {
    return displayName
  }
  // Format model ID: claude-sonnet-4-20250514 -> Sonnet 4
  return modelId
    .replace(/^claude-/, "")
    .replace(/-\d{8}$/, "") // Remove date suffix
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

export interface ModelSelectorProps {
  disabled?: boolean
  onModelChange?: (providerId: string, modelId: string) => void
}

export function ModelSelector({ disabled, onModelChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useAtom(selectedProjectAtom)
  const modelPreference = useAtomValue(currentProjectModelPreferenceAtom)

  // Fetch all providers with their models
  const { data: allModels, isLoading } = trpc.providers.getAllModels.useQuery()

  // Mutation to update project preferences
  const updatePreferences = trpc.projects.setPreferences.useMutation({
    onSuccess: (updatedProject) => {
      // Update local atom with new preferences
      if (selectedProject && updatedProject) {
        setSelectedProject({
          ...selectedProject,
          preferredProviderId: updatedProject.preferredProviderId,
          preferredModelId: updatedProject.preferredModelId,
        } as SelectedProject)
      }
    },
  })

  // Find currently selected model info
  const currentSelection = useMemo(() => {
    if (!allModels || allModels.length === 0) {
      return { providerName: "Claude", modelName: "Sonnet 4.5", providerType: "anthropic_oauth" as const }
    }

    // If project has preference, find it
    if (modelPreference) {
      for (const providerGroup of allModels) {
        if (providerGroup.provider.id === modelPreference.providerId) {
          const model = providerGroup.models.find(
            (m) => m.modelId === modelPreference.modelId
          )
          if (model) {
            return {
              providerName: providerGroup.provider.name,
              modelName: formatModelName(model.modelId, model.displayName),
              providerType: providerGroup.provider.type,
            }
          }
        }
      }
    }

    // Fallback to primary provider's default model
    const primaryProvider = allModels.find((p) => p.provider.role === "primary")
    if (primaryProvider) {
      const defaultModel =
        primaryProvider.models.find((m) => m.isDefault) ||
        primaryProvider.models[0]
      if (defaultModel) {
        return {
          providerName: primaryProvider.provider.name,
          modelName: formatModelName(defaultModel.modelId, defaultModel.displayName),
          providerType: primaryProvider.provider.type,
        }
      }
    }

    return { providerName: "Claude", modelName: "Sonnet 4.5", providerType: "anthropic_oauth" as const }
  }, [allModels, modelPreference])

  const handleSelectModel = (providerId: string, modelId: string) => {
    if (!selectedProject) return

    updatePreferences.mutate({
      id: selectedProject.id,
      preferredProviderId: providerId,
      preferredModelId: modelId,
    })

    onModelChange?.(providerId, modelId)
    setIsOpen(false)
  }

  // Don't show if no project selected
  if (!selectedProject) {
    return null
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild disabled={disabled || isLoading}>
        <button
          className="flex items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50 outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={disabled || isLoading}
        >
          <ProviderIcon
            type={currentSelection.providerType}
            className="h-3.5 w-3.5"
          />
          <span className="max-w-[120px] truncate">
            {currentSelection.modelName}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[220px]">
        {isLoading ? (
          <DropdownMenuItem disabled>Loading models...</DropdownMenuItem>
        ) : !allModels || allModels.length === 0 ? (
          <DropdownMenuItem disabled>No providers configured</DropdownMenuItem>
        ) : (
          allModels.map((providerGroup, index) => (
            <div key={providerGroup.provider.id}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <ProviderIcon
                  type={providerGroup.provider.type}
                  className="h-3 w-3"
                />
                {providerGroup.provider.name}
                {providerGroup.provider.role === "primary" && (
                  <span className="ml-auto text-[10px] px-1 py-0.5 rounded bg-primary/10 text-primary">
                    Primary
                  </span>
                )}
              </DropdownMenuLabel>
              {providerGroup.models.length === 0 ? (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground pl-6">
                  No models available
                </DropdownMenuItem>
              ) : (
                providerGroup.models.map((model) => {
                  const isSelected =
                    modelPreference?.providerId === providerGroup.provider.id &&
                    modelPreference?.modelId === model.modelId
                  const modelName = formatModelName(model.modelId, model.displayName)

                  return (
                    <DropdownMenuItem
                      key={`${providerGroup.provider.id}-${model.modelId}`}
                      onClick={() =>
                        handleSelectModel(providerGroup.provider.id, model.modelId)
                      }
                      className="gap-2 justify-between pl-6"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{modelName}</span>
                        {model.isDefault && (
                          <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                        )}
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </DropdownMenuItem>
                  )
                })
              )}
            </div>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
