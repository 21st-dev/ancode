"use client"

// #NP - Integrations settings tab connected to real tRPC router
import { Switch } from "../../../components/ui/switch"
import { Label } from "../../../components/ui/label"
import { Badge } from "../../../components/ui/badge"
import { Button } from "../../../components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../components/ui/tooltip"
import { RefreshCw, ExternalLink, CheckCircle, AlertCircle } from "lucide-react"
import { trpc } from "../../../lib/trpc"

// Integration types
type IntegrationType = "router" | "auth" | "memory" | "proxy"

interface IntegrationInfo {
  type: IntegrationType
  name: string
  description: string
  externalName: string
  fallbackName: string
  repoUrl: string
}

// Integration metadata
const integrationMeta: Record<IntegrationType, Omit<IntegrationInfo, "type">> = {
  router: {
    name: "Model Router",
    description: "Smart routing to different models based on task type and token count",
    externalName: "claude-code-router",
    fallbackName: "Built-in router",
    repoUrl: "https://github.com/musistudio/claude-code-router",
  },
  auth: {
    name: "Authentication",
    description: "Multi-profile provider management with OAuth support",
    externalName: "CCS",
    fallbackName: "Built-in OAuth",
    repoUrl: "https://github.com/kaitranntt/ccs",
  },
  memory: {
    name: "Persistent Memory",
    description: "Cross-session context retention with semantic search",
    externalName: "claude-mem",
    fallbackName: "Session-only memory",
    repoUrl: "https://github.com/thedotmack/claude-mem",
  },
  proxy: {
    name: "OAuth Proxy",
    description: "Bridge subscription accounts to API for extended usage",
    externalName: "CLIProxyAPI",
    fallbackName: "Direct API (no proxy)",
    repoUrl: "https://github.com/router-for-me/CLIProxyAPIplus",
  },
}

interface IntegrationToggleProps {
  type: IntegrationType
  enabled: boolean
  useExternal: boolean
  externalToolExists: boolean
  onToggleEnabled: () => void
  onToggleExternal: () => void
}

function IntegrationToggle({
  type,
  enabled,
  useExternal,
  externalToolExists,
  onToggleEnabled,
  onToggleExternal,
}: IntegrationToggleProps) {
  const meta = integrationMeta[type]

  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">{meta.name}</h4>
          {enabled && (
            <Badge variant={useExternal ? "default" : "secondary"} className="text-xs">
              {useExternal ? meta.externalName : meta.fallbackName}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={meta.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </TooltipTrigger>
            <TooltipContent>View on GitHub</TooltipContent>
          </Tooltip>
          <Switch checked={enabled} onCheckedChange={onToggleEnabled} />
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground">{meta.description}</p>

      {/* External vs Fallback Toggle */}
      {enabled && (
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Label htmlFor={`${type}-external`} className="text-xs">
              Use external tool
            </Label>
            {useExternal && (
              <Tooltip>
                <TooltipTrigger>
                  {externalToolExists ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
                  )}
                </TooltipTrigger>
                <TooltipContent>
                  {externalToolExists
                    ? "External tool is available"
                    : "External tool not found, using fallback"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <Switch
            id={`${type}-external`}
            checked={useExternal}
            onCheckedChange={onToggleExternal}
            disabled={!externalToolExists && !useExternal}
          />
        </div>
      )}
    </div>
  )
}

export function AgentsIntegrationsTab() {
  // Fetch all integrations from backend
  const { data: integrations, isLoading, refetch } = trpc.integrations.list.useQuery()

  // Mutations for toggling
  const toggleEnabled = trpc.integrations.toggleEnabled.useMutation({
    onSuccess: () => refetch(),
  })
  const toggleExternal = trpc.integrations.toggleExternal.useMutation({
    onSuccess: () => refetch(),
  })

  const handleRefresh = () => {
    refetch()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">External Tool Integrations</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Toggle between external tools and built-in fallbacks
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Integration Toggles */}
      <div className="space-y-3">
        {integrations?.map((integration) => (
          <IntegrationToggle
            key={integration.type}
            type={integration.type as IntegrationType}
            enabled={integration.enabled}
            useExternal={integration.useExternal}
            externalToolExists={integration.externalToolExists}
            onToggleEnabled={() => toggleEnabled.mutate({ type: integration.type as IntegrationType })}
            onToggleExternal={() => toggleExternal.mutate({ type: integration.type as IntegrationType })}
          />
        ))}
      </div>

      {/* Info */}
      <div className="text-xs text-muted-foreground mt-4 p-3 rounded-lg bg-muted/30">
        <p>
          External tools are loaded from <code className="text-xs">external-tools/</code> directory.
          Run <code className="text-xs">bun run tools:update</code> to update to latest versions.
        </p>
      </div>
    </div>
  )
}
