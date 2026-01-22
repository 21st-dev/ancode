"use client"

import { trpc } from "../../../../lib/trpc"
import { useState, useEffect } from "react"
import { Button } from "../../../../components/ui/button"
import { Input } from "../../../../components/ui/input"
import { Label } from "../../../../components/ui/label"
import { IconSpinner } from "../../../../components/ui/icons"
import { ExternalLink, Check, X, Copy } from "lucide-react"
import { toast } from "sonner"
import { useHaptic } from "../../hooks/use-haptic"
import { cn } from "../../../../lib/utils"
import { AwsSsoSection } from "../aws-sso-section"

type AuthFlowState =
  | { step: "idle" }
  | { step: "starting" }
  | {
      step: "waiting_url"
      sandboxId: string
      sandboxUrl: string
      sessionId: string
    }
  | {
      step: "has_url"
      sandboxId: string
      oauthUrl: string
      sandboxUrl: string
      sessionId: string
    }
  | { step: "submitting" }
  | { step: "error"; message: string }

export function AgentsClaudeCodeTab() {
  const [flowState, setFlowState] = useState<AuthFlowState>({ step: "idle" })
  const [authCode, setAuthCode] = useState("")
  const [copied, setCopied] = useState(false)
  // Auth mode state
  const [authMode, setAuthMode] = useState<"oauth" | "aws" | "apiKey" | "devyard">("oauth")
  const [apiKey, setApiKey] = useState("")
  const [bedrockRegion, setBedrockRegion] = useState("us-east-1")
  const [anthropicBaseUrl, setAnthropicBaseUrl] = useState("")
  const { trigger: triggerHaptic } = useHaptic()

  const utils = trpc.useUtils()

  // Query integration status (local SQLite)
  const {
    data: integration,
    isLoading,
    error,
    refetch,
  } = trpc.claudeCode.getIntegration.useQuery()

  // Query Claude Code settings
  const {
    data: claudeSettings,
    isLoading: settingsLoading,
    refetch: refetchSettings,
  } = trpc.claudeSettings.getSettings.useQuery()

  // Query MCP servers
  // Query Devyard availability
  const { data: devyardStatus } = trpc.claudeSettings.checkDevyard.useQuery()

  // Update settings mutation
  const updateSettings = trpc.claudeSettings.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Settings saved")
      refetchSettings()
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save settings")
    },
  })

  // Start auth mutation
  const startAuth = trpc.claudeCode.startAuth.useMutation({
    onSuccess: (data) => {
      setFlowState({
        step: "waiting_url",
        sandboxId: data.sandboxId,
        sandboxUrl: data.sandboxUrl,
        sessionId: data.sessionId,
      })
    },
    onError: (error) => {
      setFlowState({ step: "error", message: error.message })
      toast.error(error.message || "Failed to start authentication")
    },
  })

  // Poll for auth status (directly from sandbox)
  const { data: authStatus } = trpc.claudeCode.pollStatus.useQuery(
    {
      sandboxUrl: flowState.step === "waiting_url" ? flowState.sandboxUrl : "",
      sessionId: flowState.step === "waiting_url" ? flowState.sessionId : "",
    },
    {
      enabled: flowState.step === "waiting_url",
      refetchInterval: 1500,
      refetchIntervalInBackground: true,
    }
  )

  // Submit code mutation
  const submitCode = trpc.claudeCode.submitCode.useMutation({
    onSuccess: () => {
      toast.success("Claude Code connected successfully!")
      setFlowState({ step: "idle" })
      setAuthCode("")
      refetch()
      utils.claudeCode.getIntegration.invalidate()
    },
    onError: (error) => {
      setFlowState({ step: "error", message: error.message })
      toast.error(error.message || "Failed to complete authentication")
    },
  })

  // Disconnect mutation
  const disconnect = trpc.claudeCode.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Claude Code disconnected")
      refetch()
      utils.claudeCode.getIntegration.invalidate()
    },
    onError: (error) => {
      toast.error(error.message || "Failed to disconnect")
    },
  })

  // Open URL mutation (uses Electron shell.openExternal)
  const openOAuthUrl = trpc.claudeCode.openOAuthUrl.useMutation()

  // Update flow state when OAuth URL is ready
  useEffect(() => {
    if (
      flowState.step === "waiting_url" &&
      authStatus?.oauthUrl
    ) {
      setFlowState({
        step: "has_url",
        sandboxId: flowState.sandboxId,
        oauthUrl: authStatus.oauthUrl,
        sandboxUrl: flowState.sandboxUrl,
        sessionId: flowState.sessionId,
      })
    }
  }, [authStatus, flowState])

  // Sync auth settings from fetched settings
  useEffect(() => {
    if (claudeSettings) {
      setAuthMode(claudeSettings.authMode || "oauth")
      setBedrockRegion(claudeSettings.bedrockRegion || "us-east-1")
      setAnthropicBaseUrl(claudeSettings.anthropicBaseUrl || "")
      // Don't set API key from masked value - user needs to enter it
    }
  }, [claudeSettings])

  const handleStartAuth = () => {
    setFlowState({ step: "starting" })
    startAuth.mutate()
  }

  const handleSubmitCode = () => {
    if (!authCode.trim() || flowState.step !== "has_url") return

    setFlowState({ step: "submitting" })
    submitCode.mutate({
      sandboxUrl: flowState.sandboxUrl,
      sessionId: flowState.sessionId,
      code: authCode.trim(),
    })
  }

  const handleCancel = () => {
    setFlowState({ step: "idle" })
    setAuthCode("")
  }

  const handleCopyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url)
    triggerHaptic("medium")
    setCopied(true)
    toast.success("URL copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenUrl = (url: string) => {
    openOAuthUrl.mutate(url)
  }

  const handleDisconnect = () => {
    disconnect.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <IconSpinner className="h-6 w-6" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    )
  }

  const isConnected = integration?.isConnected

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-3 mb-4">
            <h3 className="text-sm font-medium text-foreground">Claude Code</h3>
          </div>

          <p className="text-sm text-muted-foreground">
            Connect your Claude Code account to enable AI-powered coding
            assistance.
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-background rounded-lg border border-border overflow-hidden">
          <div className="p-4 space-y-6">
            {/* Auth Mode Selector */}
            <div className="space-y-3 pb-4 border-b border-border">
              <Label className="text-sm font-medium">Authentication Mode</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={authMode === "oauth" ? "default" : "outline"}
                  onClick={() => setAuthMode("oauth")}
                  size="sm"
                >
                  OAuth
                </Button>
                <Button
                  variant={authMode === "aws" ? "default" : "outline"}
                  onClick={() => setAuthMode("aws")}
                  size="sm"
                >
                  AWS Bedrock
                </Button>
                <Button
                  variant={authMode === "apiKey" ? "default" : "outline"}
                  onClick={() => setAuthMode("apiKey")}
                  size="sm"
                >
                  API Key
                </Button>
                <Button
                  variant={authMode === "devyard" ? "default" : "outline"}
                  onClick={() => setAuthMode("devyard")}
                  size="sm"
                >
                  Devyard
                </Button>
              </div>

              {/* API Key Input - only show in apiKey mode */}
              {authMode === "apiKey" && (
                <div className="space-y-2 pt-2">
                  <Label className="text-sm">Anthropic API Key</Label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your API key is encrypted and stored locally. Only used when API Key mode is selected.
                  </p>
                  <Label className="text-sm">Base URL (optional)</Label>
                  <Input
                    type="text"
                    value={anthropicBaseUrl}
                    onChange={(e) => setAnthropicBaseUrl(e.target.value)}
                    placeholder="https://api.anthropic.com"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Custom API base URL. Leave empty to use the default.
                  </p>
                </div>
              )}

              {/* Note: Bedrock Region is now configured in the AwsSsoSection below */}

              {/* Save Auth Settings Button - not shown for AWS mode (has its own save in AwsSsoSection) */}
              {authMode !== "aws" && (
                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      updateSettings.mutate({
                        authMode,
                        ...(authMode === "apiKey" && apiKey && { apiKey }),
                        bedrockRegion,
                        anthropicBaseUrl: anthropicBaseUrl || null,
                      })
                    }}
                    disabled={updateSettings.isPending}
                  >
                    {updateSettings.isPending && (
                      <IconSpinner className="h-4 w-4 mr-2" />
                    )}
                    Save Auth Settings
                  </Button>
                </div>
              )}
            </div>

            {/* Connected State - OAuth mode only */}
            {isConnected && authMode === "oauth" && flowState.step === "idle" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Connected (OAuth)
                    </p>
                    {integration?.connectedAt && (
                      <p className="text-xs text-muted-foreground">
                        Connected on{" "}
                        {new Date(integration.connectedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={disconnect.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  {disconnect.isPending && (
                    <IconSpinner className="h-4 w-4 mr-2" />
                  )}
                  Disconnect
                </Button>
              </div>
            )}

            {/* AWS Mode - Full SSO/Profile Configuration */}
            {authMode === "aws" && flowState.step === "idle" && (
              <AwsSsoSection
                bedrockRegion={bedrockRegion}
                onBedrockRegionChange={setBedrockRegion}
                onSave={() => {
                  updateSettings.mutate({
                    authMode,
                    bedrockRegion,
                  })
                }}
                isSaving={updateSettings.isPending}
              />
            )}

            {/* API Key Mode Status */}
            {authMode === "apiKey" && flowState.step === "idle" && (
              <div className="space-y-4">
                {claudeSettings?.apiKey ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        API Key Configured
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Using encrypted API key storage
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enter an API key above to continue
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Devyard Mode Status */}
            {authMode === "devyard" && flowState.step === "idle" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Devyard Mode
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Using Devyard AWS/Kubernetes configuration
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-lg space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VIDYARD_PATH:</span>
                    <span className="truncate ml-2">{devyardStatus?.path || "Not set"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span>{devyardStatus?.available ? "✓ Available" : "✗ Not available"}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-border/50">
                    <span className="text-muted-foreground">Config Dir:</span>
                    <span className="truncate ml-2">{devyardStatus?.claudeConfigDir || "~/devyard/claude"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plugin Dir:</span>
                    <span className="truncate ml-2">{devyardStatus?.claudePluginDir || "~/devyard/claude/plugin"}</span>
                  </div>
                </div>
                {!devyardStatus?.available && (
                  <p className="text-xs text-destructive">
                    Devyard not detected. Set VIDYARD_PATH environment variable.
                  </p>
                )}
              </div>
            )}

            {/* Not Connected - OAuth Mode Only */}
            {!isConnected && authMode === "oauth" && flowState.step === "idle" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Not connected (OAuth)</p>
                </div>

                <Button onClick={handleStartAuth}>Connect Claude Code</Button>
              </div>
            )}

            {/* Starting State */}
            {flowState.step === "starting" && (
              <div className="flex items-center gap-3">
                <IconSpinner className="h-5 w-5" />
                <p className="text-sm text-muted-foreground">
                  Setting up authentication...
                </p>
              </div>
            )}

            {/* Waiting for URL State */}
            {flowState.step === "waiting_url" && (
              <div className="flex items-center gap-3">
                <IconSpinner className="h-5 w-5" />
                <p className="text-sm text-muted-foreground">
                  Preparing authentication URL...
                </p>
              </div>
            )}

            {/* Has URL State - Auth Flow */}
            {flowState.step === "has_url" && (
              <div className="space-y-6">
                {/* Step 1: Open URL */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    1. Open this URL to authenticate with Claude
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-2 bg-muted rounded-md text-xs font-mono truncate">
                      {flowState.oauthUrl}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyUrl(flowState.oauthUrl)}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleOpenUrl(flowState.oauthUrl)}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open
                    </Button>
                  </div>
                </div>

                {/* Step 2: Enter Code */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    2. After logging in, paste the code you received
                  </Label>
                  <Input
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    placeholder="Paste your authentication code here..."
                    className="font-mono"
                  />
                </div>
              </div>
            )}

            {/* Submitting State */}
            {flowState.step === "submitting" && (
              <div className="flex items-center gap-3">
                <IconSpinner className="h-5 w-5" />
                <p className="text-sm text-muted-foreground">
                  Verifying authentication...
                </p>
              </div>
            )}

            {/* Error State */}
            {flowState.step === "error" && (
              <div className="space-y-4">
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{flowState.message}</p>
                </div>
                <Button onClick={handleStartAuth}>Try Again</Button>
              </div>
            )}
          </div>

          {/* Footer with Action Buttons */}
          {flowState.step === "has_url" && (
            <div className="bg-muted p-3 rounded-b-lg flex justify-end gap-3 border-t">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitCode}
                disabled={!authCode.trim()}
              >
                Submit Code
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
