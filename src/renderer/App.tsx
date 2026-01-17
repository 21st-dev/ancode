import { useEffect, useMemo } from "react"
import { Provider as JotaiProvider, useAtomValue } from "jotai"
import { ThemeProvider, useTheme } from "next-themes"
import { Toaster } from "sonner"
import { TRPCProvider } from "./contexts/TRPCProvider"
import { AgentsLayout } from "./features/layout/agents-layout"
import {
  AnthropicOnboardingPage,
  SelectRepoPage,
} from "./features/onboarding"
import { TooltipProvider } from "./components/ui/tooltip"
import { appStore } from "./lib/jotai-store"
import { initAnalytics, identify, shutdown } from "./lib/analytics"
import { VSCodeThemeProvider } from "./lib/themes/theme-provider"
import { anthropicOnboardingCompletedAtom } from "./lib/atoms"
import { selectedProjectAtom } from "./features/agents/atoms"
import { trpc } from "./lib/trpc"

/**
 * Custom Toaster that adapts to theme
 */
function ThemedToaster() {
  const { resolvedTheme } = useTheme()

  return (
    <Toaster
      position="bottom-right"
      theme={resolvedTheme as "light" | "dark" | "system"}
      closeButton
    />
  )
}

/**
 * Main content router - decides which page to show based on onboarding state
 */
function AppContent() {
  const anthropicOnboardingCompleted = useAtomValue(
    anthropicOnboardingCompletedAtom
  )
  const selectedProject = useAtomValue(selectedProjectAtom)

  // Fetch projects to validate selectedProject exists
  const { data: projects, isLoading: isLoadingProjects } =
    trpc.projects.list.useQuery()

  // Validated project - only valid if exists in DB
  const validatedProject = useMemo(() => {
    if (!selectedProject) return null
    // While loading, trust localStorage value to prevent flicker
    if (isLoadingProjects) return selectedProject
    // After loading, validate against DB
    if (!projects) return null
    const exists = projects.some((p) => p.id === selectedProject.id)
    return exists ? selectedProject : null
  }, [selectedProject, projects, isLoadingProjects])

  // Determine which page to show:
  // 1. Anthropic onboarding not completed -> AnthropicOnboardingPage
  // 2. No valid project selected -> SelectRepoPage
  // 3. Otherwise -> AgentsLayout
  if (!anthropicOnboardingCompleted) {
    return <AnthropicOnboardingPage />
  }

  if (!validatedProject && !isLoadingProjects) {
    return <SelectRepoPage />
  }

  return <AgentsLayout />
}

export function App() {
  // Initialize analytics on mount
  useEffect(() => {
    initAnalytics()

    // Sync analytics opt-out status to main process
    const syncOptOutStatus = async () => {
      try {
        const optOut =
          localStorage.getItem("preferences:analytics-opt-out") === "true"
        await window.desktopApi?.setAnalyticsOptOut(optOut)
      } catch (error) {
        console.warn("[Analytics] Failed to sync opt-out status:", error)
      }
    }
    syncOptOutStatus()

    // Cleanup on unmount
    return () => {
      shutdown()
    }
  }, [])

  return (
    <JotaiProvider store={appStore}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <VSCodeThemeProvider>
          <TooltipProvider delayDuration={100}>
            <TRPCProvider>
              <div
                data-agents-page
                className="h-screen w-screen bg-background text-foreground overflow-hidden"
              >
                <AppContent />
              </div>
              <ThemedToaster />
            </TRPCProvider>
          </TooltipProvider>
        </VSCodeThemeProvider>
      </ThemeProvider>
    </JotaiProvider>
  )
}
