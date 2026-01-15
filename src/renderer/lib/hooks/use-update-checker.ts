import { useEffect, useCallback, useRef } from "react"
import { useAtom } from "jotai"
import { updateStateAtom, type UpdateState } from "../atoms"

// Note: Update checks are now triggered by window focus in main process (auto-updater.ts)
// This hook only handles events and provides actions
const DISMISSED_KEY = "update-dismissed"
const DISMISS_DURATION = 12 * 60 * 60 * 1000 // 12 hours

/**
 * Hook to manage auto-updates via electron-updater
 * Listens to update events from main process and provides actions
 */
export function useUpdateChecker() {
  const [state, setState] = useAtom(updateStateAtom)
  const versionRef = useRef<string | undefined>(state.version)

  // Keep ref in sync with state
  useEffect(() => {
    versionRef.current = state.version
  }, [state.version])

  // Check if a version was dismissed recently
  const isDismissed = useCallback((version: string): boolean => {
    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY)
      if (!dismissed) return false

      const { version: dismissedVersion, timestamp } = JSON.parse(dismissed)
      const elapsed = Date.now() - timestamp

      return dismissedVersion === version && elapsed < DISMISS_DURATION
    } catch {
      return false
    }
  }, [])

  // Subscribe to update events from main process
  useEffect(() => {
    const api = window.desktopApi
    if (!api) return

    const unsubs: Array<(() => void) | undefined> = []

    // Checking for updates
    unsubs.push(
      api.onUpdateChecking?.(() => {
        console.log("[Update] Checking for updates...")
        setState({ status: "checking" })
      }),
    )

    // Update available
    unsubs.push(
      api.onUpdateAvailable?.((info) => {
        console.log(`[Update] Update available: v${info.version}`)

        // Check if user dismissed this version
        if (isDismissed(info.version)) {
          console.log(`[Update] Version ${info.version} was dismissed, ignoring`)
          setState({ status: "idle" })
          return
        }

        setState({
          status: "available",
          version: info.version,
        })
      }),
    )

    // No update available
    unsubs.push(
      api.onUpdateNotAvailable?.(() => {
        console.log("[Update] App is up to date")
        setState({ status: "idle" })
      }),
    )

    // Download progress
    unsubs.push(
      api.onUpdateProgress?.((progress) => {
        console.log(`[Update] Download progress: ${progress.percent.toFixed(1)}%`)
        setState({
          status: "downloading",
          version: versionRef.current,
          progress: progress.percent,
          bytesPerSecond: progress.bytesPerSecond,
          transferred: progress.transferred,
          total: progress.total,
        })
      }),
    )

    // Update downloaded and ready
    unsubs.push(
      api.onUpdateDownloaded?.((info) => {
        console.log(`[Update] Update downloaded: v${info.version}`)
        setState({
          status: "ready",
          version: info.version,
        })
      }),
    )

    // Error during update
    unsubs.push(
      api.onUpdateError?.((error) => {
        console.error("[Update] Error:", error)
        setState({
          status: "error",
          error,
        })
      }),
    )

    // Cleanup
    return () => {
      unsubs.forEach((unsub) => unsub?.())
    }
  }, [setState, isDismissed])

  // Note: Periodic checks removed - main process now checks on window focus
  // This is more natural UX and avoids unnecessary network requests

  // Actions
  const checkForUpdates = useCallback(() => {
    window.desktopApi?.checkForUpdates?.()
  }, [])

  const downloadUpdate = useCallback(() => {
    window.desktopApi?.downloadUpdate?.()
  }, [])

  const installUpdate = useCallback(() => {
    window.desktopApi?.installUpdate?.()
  }, [])

  const dismissUpdate = useCallback(() => {
    if (state.version) {
      localStorage.setItem(
        DISMISSED_KEY,
        JSON.stringify({
          version: state.version,
          timestamp: Date.now(),
        }),
      )
      setState({ status: "idle" })
    }
  }, [state.version, setState])

  return {
    state,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    dismissUpdate,
  }
}

/**
 * Clear dismissed version from storage
 * Call this after a successful update to reset dismissal state
 */
export function clearDismissedUpdate() {
  localStorage.removeItem(DISMISSED_KEY)
}
