import { useState, useEffect } from "react"

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

export function AgentsBetaTab() {
  const isNarrowScreen = useIsNarrowScreen()

  return (
    <div className="p-6 space-y-6">
      {/* Header - hidden on narrow screens since it's in the navigation bar */}
      {!isNarrowScreen && (
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <h3 className="text-sm font-semibold text-foreground">Beta Features</h3>
          <p className="text-xs text-muted-foreground">
            Enable experimental features. These may be unstable or change without notice.
          </p>
        </div>
      )}

      {/* Beta Features Section */}
      <div className="bg-background rounded-lg border border-border overflow-hidden">
        <div className="p-4 space-y-6">
          {/* No beta features currently - placeholder for future features */}
          <div className="text-sm text-muted-foreground">
            No beta features available at the moment.
          </div>
        </div>
      </div>
    </div>
  )
}
