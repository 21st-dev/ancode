"use client"

import { useState, useEffect, useCallback, ChangeEvent } from "react"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { IconSpinner } from "../../../components/ui/icons"
import { Check, X, ExternalLink, Copy, LogOut, RefreshCw, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog"

interface AwsSsoSectionProps {
  bedrockRegion: string
  onBedrockRegionChange: (region: string) => void
  onSave: () => void
  isSaving: boolean
}

type ConnectionMethod = "sso" | "profile"

interface SsoAccount {
  accountId: string
  accountName: string
  emailAddress: string
}

interface SsoRole {
  roleName: string
  accountId: string
}

interface SsoStatus {
  configured: boolean
  authenticated: boolean
  hasCredentials: boolean
  ssoStartUrl?: string
  ssoRegion?: string
  accountId?: string
  accountName?: string
  roleName?: string
  tokenExpiresAt?: string
  credentialsExpiresAt?: string
}

// AWS Regions with Bedrock availability
const BEDROCK_REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "eu-central-1", label: "Europe (Frankfurt)" },
  { value: "eu-west-1", label: "Europe (Ireland)" },
  { value: "eu-west-2", label: "Europe (London)" },
  { value: "eu-west-3", label: "Europe (Paris)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai)" },
]

// SSO Regions (common regions for IAM Identity Center)
const SSO_REGIONS = [
  { value: "us-east-1", label: "us-east-1" },
  { value: "us-east-2", label: "us-east-2" },
  { value: "us-west-2", label: "us-west-2" },
  { value: "eu-west-1", label: "eu-west-1" },
  { value: "eu-central-1", label: "eu-central-1" },
  { value: "ap-northeast-1", label: "ap-northeast-1" },
  { value: "ap-southeast-1", label: "ap-southeast-1" },
  { value: "ap-southeast-2", label: "ap-southeast-2" },
]

export function AwsSsoSection({
  bedrockRegion,
  onBedrockRegionChange,
  onSave,
  isSaving,
}: AwsSsoSectionProps) {
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>("profile")
  const [ssoStartUrl, setSsoStartUrl] = useState("")
  const [ssoRegion, setSsoRegion] = useState("us-east-1")
  const [awsProfileName, setAwsProfileName] = useState("")

  // SSO login state
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [deviceCode, setDeviceCode] = useState("")
  const [userCode, setUserCode] = useState("")
  const [verificationUrl, setVerificationUrl] = useState("")
  const [isPolling, setIsPolling] = useState(false)
  const [pollError, setPollError] = useState<string | null>(null)
  const [isStartingAuth, setIsStartingAuth] = useState(false)
  const [isSelectingProfile, setIsSelectingProfile] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Account/role selection
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const [selectedRoleName, setSelectedRoleName] = useState("")

  // SSO status state
  const [ssoStatus, setSsoStatus] = useState<SsoStatus>({
    configured: false,
    authenticated: false,
    hasCredentials: false,
  })
  const [accounts, setAccounts] = useState<SsoAccount[]>([])
  const [roles, setRoles] = useState<SsoRole[]>([])

  // Backend availability - will be true once backend is implemented
  const [backendAvailable, setBackendAvailable] = useState(false)

  // Try to use tRPC hooks dynamically to avoid TypeScript errors
  // when the awsSso router doesn't exist yet
  useEffect(() => {
    // Check if awsSso router exists by attempting to import trpc
    const checkBackend = async () => {
      try {
        const { trpc } = await import("../../../lib/trpc")
        // Check if awsSso exists on the trpc object
        if (trpc && "awsSso" in trpc) {
          setBackendAvailable(true)
        }
      } catch (error) {
        console.log("[aws-sso] Backend not available:", error)
        setBackendAvailable(false)
      }
    }
    checkBackend()
  }, [])

  // Sync from status
  useEffect(() => {
    if (ssoStatus.configured) {
      setSsoStartUrl(ssoStatus.ssoStartUrl || "")
      setSsoRegion(ssoStatus.ssoRegion || "us-east-1")
      if (ssoStatus.accountId) setSelectedAccountId(ssoStatus.accountId)
      if (ssoStatus.roleName) setSelectedRoleName(ssoStatus.roleName)
      if (ssoStatus.authenticated) {
        setConnectionMethod("sso")
      }
    }
  }, [ssoStatus])

  const handleStartSsoLogin = async () => {
    if (!ssoStartUrl || !ssoRegion) {
      toast.error("Please enter SSO Start URL and Region")
      return
    }

    // Validate URL format
    if (!ssoStartUrl.startsWith("https://")) {
      toast.error("SSO Start URL must start with https://")
      return
    }

    if (!backendAvailable) {
      toast.error("AWS SSO backend not available. Please wait for backend implementation.")
      return
    }

    setIsStartingAuth(true)
    setPollError(null)

    try {
      const { trpcClient } = await import("../../../lib/trpc")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (trpcClient as any).awsSso.startDeviceAuth.mutate({
        ssoStartUrl,
        ssoRegion,
      })

      setDeviceCode(result.deviceCode)
      setUserCode(result.userCode)
      setVerificationUrl(result.verificationUriComplete || result.verificationUri)
      setShowLoginModal(true)

      // Open browser
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (trpcClient as any).awsSso.openVerificationUrl.mutate({
          url: result.verificationUriComplete || result.verificationUri,
        })
      } catch (e) {
        console.error("Failed to open browser:", e)
      }

      // Start polling
      setIsPolling(true)
      startPolling(result.deviceCode)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to start SSO login"
      toast.error(errorMessage)
      setBackendAvailable(false)
    } finally {
      setIsStartingAuth(false)
    }
  }

  const startPolling = async (code: string) => {
    if (!code) return

    const poll = async () => {
      try {
        const { trpcClient } = await import("../../../lib/trpc")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (trpcClient as any).awsSso.pollDeviceAuth.mutate({ deviceCode: code })

        if (result.status === "success") {
          setIsPolling(false)
          setShowLoginModal(false)
          setPollError(null)
          toast.success("SSO login successful!")
          setSsoStatus((prev) => ({
            ...prev,
            authenticated: true,
          }))
          // Refresh accounts
          fetchAccounts()
        } else if (result.status === "expired") {
          setIsPolling(false)
          setPollError("Authorization request expired. Please try again.")
          toast.error("SSO login expired")
        } else if (result.status === "denied") {
          setIsPolling(false)
          setPollError("Authorization was denied. Please try again.")
          toast.error("SSO login denied")
        } else {
          // Continue polling
          setTimeout(poll, 5000)
        }
      } catch (error: unknown) {
        console.error("Polling error:", error)
        // Continue polling on transient errors
        setTimeout(poll, 5000)
      }
    }

    poll()
  }

  const fetchAccounts = async () => {
    try {
      const { trpcClient } = await import("../../../lib/trpc")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (trpcClient as any).awsSso.listAccounts.query()
      if (result.accounts) {
        setAccounts(result.accounts)
      }
    } catch (error: unknown) {
      console.error("Failed to fetch accounts:", error)
    }
  }

  const fetchRoles = async (accountId: string) => {
    try {
      const { trpcClient } = await import("../../../lib/trpc")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (trpcClient as any).awsSso.listRoles.query({ accountId })
      if (result.roles) {
        setRoles(result.roles)
      }
    } catch (error: unknown) {
      console.error("Failed to fetch roles:", error)
    }
  }

  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId)
    setSelectedRoleName("")
    setRoles([])
    if (accountId) {
      fetchRoles(accountId)
    }
  }

  const handleSelectProfile = async () => {
    if (!selectedAccountId || !selectedRoleName) {
      toast.error("Please select an account and role")
      return
    }

    if (!backendAvailable) {
      toast.error("AWS SSO backend not available")
      return
    }

    const account = accounts.find((a) => a.accountId === selectedAccountId)
    setIsSelectingProfile(true)

    try {
      const { trpcClient } = await import("../../../lib/trpc")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (trpcClient as any).awsSso.selectProfile.mutate({
        accountId: selectedAccountId,
        accountName: account?.accountName || selectedAccountId,
        roleName: selectedRoleName,
      })
      toast.success("AWS profile selected")
      setSsoStatus((prev) => ({
        ...prev,
        hasCredentials: true,
        accountId: selectedAccountId,
        accountName: account?.accountName || selectedAccountId,
        roleName: selectedRoleName,
      }))
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to select profile"
      toast.error(errorMessage)
    } finally {
      setIsSelectingProfile(false)
    }
  }

  const handleRefreshCredentials = async () => {
    if (!backendAvailable) {
      toast.error("AWS SSO backend not available")
      return
    }

    setIsRefreshing(true)
    try {
      const { trpcClient } = await import("../../../lib/trpc")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (trpcClient as any).awsSso.refreshCredentials.mutate()
      toast.success("Credentials refreshed")
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to refresh credentials"
      toast.error(errorMessage)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleLogout = async () => {
    if (!backendAvailable) {
      toast.error("AWS SSO backend not available")
      return
    }

    setIsLoggingOut(true)
    try {
      const { trpcClient } = await import("../../../lib/trpc")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (trpcClient as any).awsSso.logout.mutate()
      toast.success("Logged out from AWS SSO")
      setSelectedAccountId("")
      setSelectedRoleName("")
      setSsoStatus({
        configured: false,
        authenticated: false,
        hasCredentials: false,
      })
      setAccounts([])
      setRoles([])
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to logout"
      toast.error(errorMessage)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(userCode)
    toast.success("Code copied to clipboard")
  }, [userCode])

  const handleOpenBrowser = useCallback(async () => {
    if (verificationUrl && backendAvailable) {
      try {
        const { trpcClient } = await import("../../../lib/trpc")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (trpcClient as any).awsSso.openVerificationUrl.mutate({ url: verificationUrl })
      } catch (error: unknown) {
        console.error("Failed to open browser:", error)
      }
    }
  }, [backendAvailable, verificationUrl])

  const formatExpirationTime = (isoString?: string) => {
    if (!isoString) return "Unknown"
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()

    if (diffMs < 0) return "Expired"

    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 60) return `${diffMins} min`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`

    return date.toLocaleString()
  }

  const handleSsoStartUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSsoStartUrl(e.target.value)
  }

  const handleAwsProfileNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAwsProfileName(e.target.value)
  }

  const handleModalOpenChange = (open: boolean) => {
    setShowLoginModal(open)
    if (!open) {
      setIsPolling(false)
      setPollError(null)
    }
  }

  const handleCancelModal = () => {
    setShowLoginModal(false)
    setIsPolling(false)
    setPollError(null)
  }

  return (
    <div className="space-y-4">
      {/* Backend Missing Warning */}
      {!backendAvailable && (
        <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-yellow-600 dark:text-yellow-400">
              AWS SSO Backend Not Available
            </p>
            <p className="text-muted-foreground mt-1">
              The AWS SSO tRPC router is not yet implemented. SSO functionality will be available once the backend is complete.
              You can still configure AWS Profile mode.
            </p>
          </div>
        </div>
      )}

      {/* Connection Method Toggle */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Connection Method</Label>
        <div className="flex gap-2">
          <Button
            variant={connectionMethod === "sso" ? "default" : "outline"}
            size="sm"
            onClick={() => setConnectionMethod("sso")}
            className="flex-1"
          >
            SSO (IAM Identity Center)
          </Button>
          <Button
            variant={connectionMethod === "profile" ? "default" : "outline"}
            size="sm"
            onClick={() => setConnectionMethod("profile")}
            className="flex-1"
          >
            AWS Profile
          </Button>
        </div>
      </div>

      {/* SSO Configuration */}
      {connectionMethod === "sso" && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          {!ssoStatus.authenticated ? (
            <>
              {/* SSO URL Input */}
              <div className="space-y-2">
                <Label className="text-sm">SSO Start URL</Label>
                <Input
                  value={ssoStartUrl}
                  onChange={handleSsoStartUrlChange}
                  placeholder="https://d-abc123.awsapps.com/start"
                  className="font-mono text-sm"
                  disabled={!backendAvailable}
                />
                <p className="text-xs text-muted-foreground">
                  Your organization&apos;s AWS IAM Identity Center start URL
                </p>
              </div>

              {/* SSO Region */}
              <div className="space-y-2">
                <Label className="text-sm">SSO Region</Label>
                <Select
                  value={ssoRegion}
                  onValueChange={setSsoRegion}
                  disabled={!backendAvailable}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SSO_REGIONS.map((region) => (
                      <SelectItem key={region.value} value={region.value}>
                        {region.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  AWS region where your IAM Identity Center is configured
                </p>
              </div>

              {/* Login Button */}
              <Button
                onClick={handleStartSsoLogin}
                disabled={!backendAvailable || isStartingAuth || !ssoStartUrl}
              >
                {isStartingAuth && <IconSpinner className="h-4 w-4 mr-2" />}
                Start SSO Login
              </Button>
            </>
          ) : (
            <>
              {/* Authenticated Status */}
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />
                Connected to AWS SSO
              </div>

              {/* Account Selector */}
              <div className="space-y-2">
                <Label className="text-sm">AWS Account</Label>
                <Select
                  value={selectedAccountId}
                  onValueChange={handleAccountChange}
                  disabled={accounts.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={accounts.length === 0 ? "Loading accounts..." : "Select account"} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.accountId} value={account.accountId}>
                        {account.accountName} ({account.accountId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Role Selector */}
              {selectedAccountId && (
                <div className="space-y-2">
                  <Label className="text-sm">Role</Label>
                  <Select
                    value={selectedRoleName}
                    onValueChange={setSelectedRoleName}
                    disabled={roles.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={roles.length === 0 ? "Loading roles..." : "Select role"} />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.roleName} value={role.roleName}>
                          {role.roleName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Save Profile Button */}
              {selectedAccountId && selectedRoleName && (
                <Button
                  onClick={handleSelectProfile}
                  disabled={isSelectingProfile}
                >
                  {isSelectingProfile && <IconSpinner className="h-4 w-4 mr-2" />}
                  Use Selected Profile
                </Button>
              )}

              {/* Current Selection Status */}
              {ssoStatus.hasCredentials && (
                <div className="p-3 bg-background rounded-lg space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account:</span>
                    <span className="font-mono">
                      {ssoStatus.accountName} ({ssoStatus.accountId})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role:</span>
                    <span className="font-mono">{ssoStatus.roleName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Credentials Expire:</span>
                    <span className={
                      ssoStatus.credentialsExpiresAt &&
                      new Date(ssoStatus.credentialsExpiresAt).getTime() - Date.now() < 3600000
                        ? "text-yellow-500"
                        : ""
                    }>
                      {formatExpirationTime(ssoStatus.credentialsExpiresAt)}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshCredentials}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <IconSpinner className="h-4 w-4 mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="text-destructive hover:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Profile Configuration */}
      {connectionMethod === "profile" && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label className="text-sm">AWS Profile Name</Label>
            <Input
              value={awsProfileName}
              onChange={handleAwsProfileNameChange}
              placeholder="default"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Profile from ~/.aws/credentials (leave empty for default profile)
            </p>
          </div>

          <div className="p-3 bg-background rounded-lg text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Profile mode uses:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-1">
              <li>~/.aws/credentials for access keys</li>
              <li>~/.aws/config for region and profile settings</li>
              <li>Environment variables (AWS_PROFILE, AWS_ACCESS_KEY_ID, etc.)</li>
            </ul>
          </div>
        </div>
      )}

      {/* Bedrock Region (both methods) */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Bedrock Region</Label>
        <Select value={bedrockRegion} onValueChange={onBedrockRegionChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BEDROCK_REGIONS.map((region) => (
              <SelectItem key={region.value} value={region.value}>
                {region.value} ({region.label})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          AWS region to use for Bedrock API calls (must have Claude models enabled)
        </p>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving && <IconSpinner className="h-4 w-4 mr-2" />}
          Save Settings
        </Button>
      </div>

      {/* SSO Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={handleModalOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>AWS SSO Login</DialogTitle>
            <DialogDescription>
              A browser window will open for authentication.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Enter this code when prompted:
              </p>
              <div className="text-2xl font-mono font-bold tracking-widest bg-muted p-4 rounded-lg select-all">
                {userCode}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleCopyCode}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Code
              </Button>
            </div>

            {pollError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <X className="h-4 w-4 text-destructive" />
                <span className="text-sm text-destructive">{pollError}</span>
              </div>
            )}

            {isPolling && !pollError && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <IconSpinner className="h-4 w-4" />
                Waiting for authentication...
              </div>
            )}

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleOpenBrowser}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Browser
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelModal}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
