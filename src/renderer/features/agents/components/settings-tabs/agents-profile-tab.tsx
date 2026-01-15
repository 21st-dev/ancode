"use client"

import { useState, useEffect } from "react"
import { Button } from "../../../../components/ui/button"
import { Input } from "../../../../components/ui/input"
import { Label } from "../../../../components/ui/label"
// Desktop: stub for user profile hooks
const useUserProfile = () => ({
  clerkUser: {
    fullName: "Demo User",
    imageUrl: null as string | null,
    externalAccounts: [{ provider: "github", username: "demo-user" }],
  },
  user: {
    display_name: "Demo User",
    display_image_url: null as string | null,
    fullName: "Demo User",
    imageUrl: null as string | null,
    externalAccounts: [{ provider: "github", username: "demo-user" }],
  },
  isLoading: false,
})
import { ClaudeCodeLogoIcon } from "../../../../components/ui/icons"
import { toast } from "sonner"
// Desktop: stub for image upload
const useImageUpload = () => ({
  previewUrl: null as string | null,
  fileInputRef: { current: null as HTMLInputElement | null },
  handleThumbnailClick: () => {},
  handleFileChange: async (_event?: unknown) => null as string | null
})
import { IconSpinner } from "../../../../components/ui/icons"
import { Upload, Edit } from "lucide-react"
import { motion } from "motion/react"
import { cn } from "../../../../lib/utils"
// Use real tRPC client for Claude Code integration
import { trpc } from "../../../../lib/trpc"

export function AgentsProfileTab() {
  const {
    clerkUser: user,
    user: dbUser,
    isLoading: isUserLoading,
  } = useUserProfile()
  const [fullName, setFullName] = useState("")
  const [profileImage, setProfileImage] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const { previewUrl, fileInputRef, handleThumbnailClick, handleFileChange } =
    useImageUpload()

  // Initialize state when user data is loaded
  useEffect(() => {
    if (!isUserLoading && (dbUser || user)) {
      setFullName(dbUser?.display_name || user?.fullName || "")
      setProfileImage(dbUser?.display_image_url || user?.imageUrl || "")
    }
  }, [isUserLoading, dbUser, user])

  // Update profileImage when previewUrl changes
  useEffect(() => {
    if (previewUrl) {
      setProfileImage(previewUrl)
    }
  }, [previewUrl])

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          display_name: fullName || null,
          display_image_url: profileImage || null,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Failed to update profile")
      }

      toast.success("Profile updated successfully")
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile",
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const base64String = await handleFileChange(event)
    if (base64String) {
      setProfileImage(base64String)
    }
  }

  // Claude Code integration - uses CLI-based authentication
  const {
    data: claudeCodeStatus,
    isLoading: isLoadingClaudeCode,
    refetch: refetchClaudeCode,
  } = trpc.claudeCode.getLoginStatus.useQuery()

  const isClaudeCodeConnected = claudeCodeStatus?.isLoggedIn ?? false
  const claudeCodeEmail = claudeCodeStatus?.email

  // Login mutation - spawns Claude CLI login process
  const loginMutation = trpc.claudeCode.login.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Claude Code login initiated. Complete the authentication in your browser.")
        // Refetch status after a delay to check if login completed
        setTimeout(() => refetchClaudeCode(), 2000)
      } else {
        toast.error(result.error || "Failed to start login")
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start login")
    },
  })

  // Logout mutation - spawns Claude CLI logout process
  const logoutMutation = trpc.claudeCode.logout.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Claude Code disconnected")
        refetchClaudeCode()
      } else {
        toast.error(result.error || "Failed to disconnect")
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to disconnect")
    },
  })

  const handleClaudeLogin = () => {
    loginMutation.mutate()
  }

  const handleClaudeLogout = () => {
    logoutMutation.mutate()
  }

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <IconSpinner className="h-6 w-6" />
      </div>
    )
  }

  const currentImageUrl =
    previewUrl || profileImage || dbUser?.display_image_url || user?.imageUrl

  return (
    <div className="p-6 space-y-6">
      {/* Profile Settings Card */}
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-3 mb-4">
          <h3 className="text-sm font-medium text-foreground">Account</h3>
        </div>
        <div className="bg-background rounded-lg border border-border overflow-hidden">
          <div className="p-4 space-y-6">
            {/* Profile Picture Field */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Label className="text-sm font-medium">Profile Picture</Label>
                <p className="text-sm text-muted-foreground">
                  How you're shown around the app
                </p>
              </div>
              <div className="flex-shrink-0 relative group">
                {/* Glow effect - blurred image behind */}
                {currentImageUrl && (
                  <div
                    className="absolute inset-0 scale-[1.02] blur-sm opacity-40 transition-opacity duration-200 group-hover:opacity-0 rounded-full"
                    style={{
                      backgroundImage: `url(${currentImageUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                )}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.1 }}
                  className={cn(
                    "w-12 h-12 bg-muted rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity aspect-square relative overflow-hidden",
                    !currentImageUrl && "border-2 border-dashed border-border",
                  )}
                  onClick={handleThumbnailClick}
                >
                  {currentImageUrl ? (
                    <>
                      <img
                        src={currentImageUrl}
                        alt={fullName || "User"}
                        className="w-full h-full rounded-full object-cover aspect-square"
                      />
                      {/* Edit overlay */}
                      <div className="absolute inset-0 bg-background/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Edit className="w-4 h-4 text-foreground" />
                      </div>
                    </>
                  ) : (
                    <Upload className="w-4 h-4 text-muted-foreground" />
                  )}
                </motion.div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Full Name Field */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-sm font-medium">Full Name</Label>
                <p className="text-sm text-muted-foreground">
                  This is your display name
                </p>
              </div>
              <div className="flex-shrink-0 w-80">
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full"
                  placeholder="Enter your name"
                />
              </div>
            </div>
          </div>

          {/* Save Button Footer */}
          <div className="bg-muted p-3 rounded-b-lg flex justify-end gap-3 border-t">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="text-xs"
            >
              <div className="flex items-center justify-center gap-2">
                {isSaving && (
                  <IconSpinner className="h-3.5 w-3.5 text-current" />
                )}
                Save
              </div>
            </Button>
          </div>
        </div>
      </div>

      {/* Connected accounts */}
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-3 mb-4">
          <h3 className="text-sm font-medium text-foreground">
            Connected accounts
          </h3>
        </div>
        <div className="bg-background rounded-lg border border-border overflow-hidden">
          <div className="p-4 space-y-4">
            {/* Claude Code Connection */}
            <div>
              {isLoadingClaudeCode ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <ClaudeCodeLogoIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Claude Code
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Checking status...
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    disabled
                    size="sm"
                    className="text-xs"
                  >
                    <IconSpinner className="h-3 w-3" />
                  </Button>
                </div>
              ) : isClaudeCodeConnected ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <ClaudeCodeLogoIcon className="h-5 w-5 text-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Claude Code
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {claudeCodeEmail ? `Logged in as ${claudeCodeEmail}` : "Logged in"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleClaudeLogout}
                    disabled={logoutMutation.isPending}
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive"
                  >
                    {logoutMutation.isPending && (
                      <IconSpinner className="h-3 w-3 mr-1.5" />
                    )}
                    Log out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <ClaudeCodeLogoIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Claude Code
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Log in to enable AI-powered coding assistance
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleClaudeLogin}
                    disabled={loginMutation.isPending}
                    size="sm"
                    className="text-xs min-w-[72px]"
                  >
                    {loginMutation.isPending ? (
                      <IconSpinner className="h-3 w-3" />
                    ) : (
                      "Log in"
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
