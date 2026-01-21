"use client"

import { trpc } from "../../../lib/trpc"
import { useState, useEffect } from "react"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import { IconSpinner } from "../../ui/icons"
import { toast } from "sonner"
import { cn } from "../../../lib/utils"

export function AgentsAdvancedSettingsTab() {
  // Advanced settings state
  const [customBinaryPath, setCustomBinaryPath] = useState("")
  const [envVarsText, setEnvVarsText] = useState("")
  const [customConfigDir, setCustomConfigDir] = useState("")
  const [customWorktreeLocation, setCustomWorktreeLocation] = useState("")
  const [worktreeLocationError, setWorktreeLocationError] = useState<string | null>(null)
  const [mcpServers, setMcpServers] = useState<Array<{
    id: string
    name: string
    description: string
    enabled: boolean
  }>>([])

  // Fetch Claude Code settings
  const { data: claudeSettings } = trpc.claudeSettings.getSettings.useQuery()

  // Fetch MCP servers (same endpoint as MCP view)
  const { data: mcpData, refetch: refetchMcp } = trpc.mcp.listServers.useQuery()

  // Update settings mutation
  const updateSettings = trpc.claudeSettings.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Settings saved successfully")
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`)
    },
  })

  // Toggle MCP server enabled status mutation
  const toggleMcpEnabled = trpc.mcp.toggleServer.useMutation({
    onSuccess: () => {
      refetchMcp()
    },
  })

  // Validation function for worktree path
  const validateWorktreePath = (path: string): string | null => {
    if (!path.trim()) return null // Empty is valid (uses default)

    // Check if path is absolute or starts with ~ or $
    if (path.startsWith('/') || path.startsWith('~') || path.startsWith('$')) {
      return null // Valid
    }

    return "Path must be absolute or start with ~ or $ (e.g., ~/worktrees, $HOME/.worktrees)"
  }

  // Sync form with settings
  useEffect(() => {
    if (claudeSettings) {
      setCustomBinaryPath(claudeSettings.customBinaryPath || "")
      setCustomConfigDir(claudeSettings.customConfigDir || "")
      setCustomWorktreeLocation(claudeSettings.customWorktreeLocation || "")
      setEnvVarsText(
        Object.entries(claudeSettings.customEnvVars)
          .map(([k, v]) => `${k}=${v}`)
          .join("\n") || ""
      )
    }
  }, [claudeSettings])

  // Sync MCP servers from query
  useEffect(() => {
    if (mcpData?.servers) {
      setMcpServers(mcpData.servers.map(server => ({
        id: server.id,
        name: server.name,
        description: "", // MCP servers don't have descriptions in config
        enabled: server.enabled,
      })))
    }
  }, [mcpData])

  // Parse env vars from text format (KEY=VALUE, one per line)
  const parseEnvVars = (text: string): Record<string, string> => {
    const result: Record<string, string> = {}
    for (const line of text.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eqIndex = trimmed.indexOf("=")
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim()
        const value = trimmed.slice(eqIndex + 1).trim()
        if (key) result[key] = value
      }
    }
    return result
  }

  const toggleMcpServer = (serverId: string, currentEnabled: boolean) => {
    toggleMcpEnabled.mutate({ serverId, enabled: !currentEnabled })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Custom Binary Path */}
      <div className="space-y-2">
        <Label className="text-sm">Custom Claude Binary Path</Label>
        <Input
          value={customBinaryPath}
          onChange={(e) => setCustomBinaryPath(e.target.value)}
          placeholder="/usr/local/bin/claude or leave empty for bundled"
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Leave empty to use the bundled Claude binary. Specify an absolute path to use your own build.
        </p>
      </div>

      {/* Custom Environment Variables */}
      <div className="space-y-2">
        <Label className="text-sm">Custom Environment Variables</Label>
        <textarea
          value={envVarsText}
          onChange={(e) => setEnvVarsText(e.target.value)}
          placeholder="ANTHROPIC_MODEL=claude-sonnet-4-5-20250514&#10;CLAUDE_DEFAULT_MODEL=claude-sonnet-4-5-20250514"
          className="w-full min-h-[100px] p-2 text-sm font-mono bg-muted rounded-md border border-border resize-y focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          One variable per line in KEY=VALUE format. These affect Claude's settings.json behavior.
        </p>
      </div>

      {/* Custom Config Directory */}
      <div className="space-y-2">
        <Label className="text-sm">Claude Config Directory</Label>
        <Input
          value={customConfigDir}
          onChange={(e) => setCustomConfigDir(e.target.value)}
          placeholder="Leave empty for per-chat isolation (default)"
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Controls where Claude stores skills, agents, and settings.
          Leave empty for isolated per-chat storage (default).
          Use ~/.claude to share with your terminal Claude.
        </p>
      </div>

      {/* Custom Worktree Location */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Worktree Location</Label>
        <Input
          value={customWorktreeLocation}
          onChange={(e) => {
            const newValue = e.target.value
            setCustomWorktreeLocation(newValue)
            // Validate on change
            setWorktreeLocationError(validateWorktreePath(newValue))
          }}
          placeholder="~/.claw/worktrees (default)"
          className={cn(
            "font-mono text-xs",
            worktreeLocationError && "border-red-500"
          )}
        />
        {worktreeLocationError && (
          <p className="text-xs text-red-500">{worktreeLocationError}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Custom location for git worktrees. Supports environment variables like $HOME, $VIDYARD_PATH, or ~.
          Leave empty to use default location (~/.claw/worktrees).
        </p>
        <p className="text-xs text-muted-foreground">
          Examples: <code className="text-xs">~/my-worktrees</code>, <code className="text-xs">$VIDYARD_PATH/.worktrees</code>
        </p>
      </div>

      {/* MCP Servers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm">MCP Servers</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchMcp()}
            className="h-6 px-2"
          >
            Refresh
          </Button>
        </div>
        {mcpServers.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No MCP servers found in ~/.claude/
          </p>
        ) : (
          <div className="space-y-2">
            {mcpServers.map((server) => (
              <div
                key={server.id}
                className="flex items-start justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{server.name}</div>
                  {server.description && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {server.description}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => toggleMcpServer(server.id, server.enabled)}
                  className={`ml-3 px-3 py-1 text-xs font-medium rounded-md transition-colors shrink-0 ${
                    server.enabled
                      ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300"
                  }`}
                >
                  {server.enabled ? "Enabled" : "Disabled"}
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          MCP servers extend Claude's capabilities. Toggle to enable/disable for this app.
        </p>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => {
            // Check if there are any validation errors
            if (worktreeLocationError) {
              toast.error("Please fix validation errors before saving")
              return
            }

            updateSettings.mutate({
              customBinaryPath: customBinaryPath || null,
              customEnvVars: parseEnvVars(envVarsText),
              customConfigDir: customConfigDir || null,
              customWorktreeLocation: customWorktreeLocation || null,
            })
          }}
          disabled={updateSettings.isPending || !!worktreeLocationError}
        >
          {updateSettings.isPending && (
            <IconSpinner className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  )
}
