import { Component, type ReactNode } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "./button"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
  /** Optional context for error logging */
  context?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary component that catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the entire app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const context = this.props.context || "Unknown"
    console.error(`[ErrorBoundary:${context}] Caught error:`, error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium text-foreground mb-1">Something went wrong</p>
          <p className="text-sm text-muted-foreground mb-4 max-w-[300px]">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Specialized error boundary for file viewers with appropriate styling
 */
export function ViewerErrorBoundary({
  children,
  onReset,
  viewerType = "file",
}: {
  children: ReactNode
  onReset?: () => void
  viewerType?: "file" | "data" | "image" | "markdown"
}) {
  return (
    <ErrorBoundary
      context={`${viewerType}-viewer`}
      onReset={onReset}
      fallback={
        <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-background">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium text-foreground mb-1">Failed to render {viewerType}</p>
          <p className="text-sm text-muted-foreground mb-4">
            The {viewerType} viewer encountered an error
          </p>
          {onReset && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </Button>
          )}
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
