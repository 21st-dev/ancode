import { useCallback, useEffect, useMemo } from "react"
import Editor from "@monaco-editor/react"
import { useAtom } from "jotai"
import { useTheme } from "next-themes"
import {
  X,
  Loader2,
  FileCode,
  WrapText,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { fileViewerWordWrapAtom } from "../../agents/atoms"
import { useFileContent, getErrorMessage } from "../hooks/use-file-content"
import { getMonacoLanguage } from "../utils/language-map"
import { defaultEditorOptions, getMonacoTheme } from "./monaco-config"

interface FileViewerSidebarProps {
  chatId: string
  filePath: string
  projectPath: string
  onClose: () => void
}

/**
 * Get file name from path
 */
function getFileName(filePath: string): string {
  const parts = filePath.split("/")
  return parts[parts.length - 1] || filePath
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * File icon based on language
 */
function FileIcon({ language }: { language: string }) {
  // For now, use a generic file code icon
  // Could be expanded to show language-specific icons
  return <FileCode className="h-4 w-4 text-muted-foreground" />
}

/**
 * Loading spinner component
 */
function LoadingSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm">Loading file...</span>
      </div>
    </div>
  )
}

/**
 * Error display component
 */
function ErrorDisplay({
  error,
  onRetry,
}: {
  error: string
  onRetry: () => void
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3 text-center max-w-[300px]">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-medium text-foreground">{error}</p>
          <p className="text-sm text-muted-foreground mt-1">
            The file cannot be displayed in the viewer.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-2 gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    </div>
  )
}

/**
 * Header component for the sidebar
 */
function Header({
  fileName,
  filePath,
  byteLength,
  wordWrap,
  onToggleWordWrap,
  onClose,
}: {
  fileName: string
  filePath: string
  byteLength: number | null
  wordWrap: boolean
  onToggleWordWrap: () => void
  onClose: () => void
}) {
  const language = getMonacoLanguage(filePath)

  return (
    <div className="flex items-center justify-between px-3 h-10 border-b bg-background flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <FileIcon language={language} />
        <span className="text-sm font-medium truncate" title={filePath}>
          {fileName}
        </span>
        {byteLength !== null && (
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatFileSize(byteLength)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Word wrap toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7",
                wordWrap && "bg-muted"
              )}
              onClick={onToggleWordWrap}
            >
              <WrapText className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {wordWrap ? "Disable word wrap" : "Enable word wrap"}
          </TooltipContent>
        </Tooltip>
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

/**
 * FileViewerSidebar - Monaco Editor-based file viewer
 */
export function FileViewerSidebar({
  chatId,
  filePath,
  projectPath,
  onClose,
}: FileViewerSidebarProps) {
  const fileName = getFileName(filePath)
  const language = getMonacoLanguage(filePath)
  const { resolvedTheme } = useTheme()
  const monacoTheme = getMonacoTheme(resolvedTheme || "dark")

  // Word wrap preference
  const [wordWrap, setWordWrap] = useAtom(fileViewerWordWrapAtom)

  // Load file content
  const { content, isLoading, error, byteLength, refetch } = useFileContent(
    projectPath,
    filePath
  )

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  // Toggle word wrap
  const handleToggleWordWrap = useCallback(() => {
    setWordWrap(!wordWrap)
  }, [wordWrap, setWordWrap])

  // Editor options with word wrap setting
  const editorOptions = useMemo(
    () => ({
      ...defaultEditorOptions,
      wordWrap: wordWrap ? ("on" as const) : ("off" as const),
    }),
    [wordWrap]
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <Header
          fileName={fileName}
          filePath={filePath}
          byteLength={null}
          wordWrap={wordWrap}
          onToggleWordWrap={handleToggleWordWrap}
          onClose={onClose}
        />
        <LoadingSpinner />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full bg-background">
        <Header
          fileName={fileName}
          filePath={filePath}
          byteLength={null}
          wordWrap={wordWrap}
          onToggleWordWrap={handleToggleWordWrap}
          onClose={onClose}
        />
        <ErrorDisplay error={getErrorMessage(error)} onRetry={refetch} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <Header
        fileName={fileName}
        filePath={filePath}
        byteLength={byteLength}
        wordWrap={wordWrap}
        onToggleWordWrap={handleToggleWordWrap}
        onClose={onClose}
      />
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language}
          value={content || ""}
          theme={monacoTheme}
          options={editorOptions}
          loading={<LoadingSpinner />}
        />
      </div>
    </div>
  )
}
