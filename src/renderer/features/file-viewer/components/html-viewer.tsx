import { useState, useMemo, useEffect, useRef } from "react"
import Editor from "@monaco-editor/react"
import { useTheme } from "next-themes"
import { useAtom } from "jotai"
import {
  X,
  Loader2,
  AlertCircle,
  FileCode,
  Eye,
  Code,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc"
import { fileViewerWordWrapAtom } from "../../agents/atoms"
import { defaultEditorOptions, getMonacoTheme } from "./monaco-config"

interface HtmlViewerProps {
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
 * HtmlViewer - Renders HTML with preview/source toggle
 */
export function HtmlViewer({
  filePath,
  projectPath,
  onClose,
}: HtmlViewerProps) {
  const fileName = getFileName(filePath)
  const { resolvedTheme } = useTheme()
  const monacoTheme = getMonacoTheme(resolvedTheme || "dark")

  // View mode: preview or source
  const [showPreview, setShowPreview] = useState(true)

  // Word wrap preference for source view
  const [wordWrap] = useAtom(fileViewerWordWrapAtom)

  // Blob URL ref for cleanup
  const blobUrlRef = useRef<string | null>(null)

  // Build absolute path
  const absolutePath = useMemo(() => {
    return filePath.startsWith("/") ? filePath : `${projectPath}/${filePath}`
  }, [filePath, projectPath])

  // Fetch file content
  const { data, isLoading, error } = trpc.files.readTextFile.useQuery(
    { filePath: absolutePath },
    { staleTime: 30000 }
  )

  // Create blob URL for iframe
  const iframeSrc = useMemo(() => {
    if (!data?.ok) return null

    // Clean up previous blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
    }

    const blob = new Blob([data.content], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    blobUrlRef.current = url
    return url
  }, [data])

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
      }
    }
  }, [])

  // Editor options
  const editorOptions = useMemo(
    () => ({
      ...defaultEditorOptions,
      wordWrap: wordWrap ? ("on" as const) : ("off" as const),
    }),
    [wordWrap]
  )

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <Header
          fileName={fileName}
          byteLength={null}
          showPreview={showPreview}
          onToggleView={setShowPreview}
          onClose={onClose}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm">Loading file...</span>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || (data && !data.ok)) {
    const errorMessage =
      data && !data.ok
        ? data.reason === "too-large"
          ? "File too large"
          : data.reason === "binary"
          ? "Binary file"
          : "File not found"
        : "Failed to load file"

    return (
      <div className="flex flex-col h-full bg-background">
        <Header
          fileName={fileName}
          byteLength={null}
          showPreview={showPreview}
          onToggleView={setShowPreview}
          onClose={onClose}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3 text-center max-w-[300px]">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">{errorMessage}</p>
              <p className="text-sm text-muted-foreground mt-1">
                The file cannot be displayed.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const content = data?.ok ? data.content : ""
  const byteLength = data?.ok ? data.byteLength : null

  return (
    <div className="flex flex-col h-full bg-background">
      <Header
        fileName={fileName}
        byteLength={byteLength}
        showPreview={showPreview}
        onToggleView={setShowPreview}
        onClose={onClose}
      />

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {showPreview ? (
          <iframe
            src={iframeSrc || "about:blank"}
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full border-0 bg-white"
            title="HTML Preview"
          />
        ) : (
          <Editor
            height="100%"
            language="html"
            value={content}
            theme={monacoTheme}
            options={editorOptions}
            loading={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            }
          />
        )}
      </div>
    </div>
  )
}

/**
 * Header component with preview/source toggle
 */
function Header({
  fileName,
  byteLength,
  showPreview,
  onToggleView,
  onClose,
}: {
  fileName: string
  byteLength: number | null
  showPreview: boolean
  onToggleView: (show: boolean) => void
  onClose: () => void
}) {
  return (
    <div className="flex items-center justify-between px-3 h-10 border-b bg-background flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <FileCode className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm font-medium truncate">{fileName}</span>
        {byteLength !== null && (
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatFileSize(byteLength)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* View toggle */}
        <div className="flex items-center rounded-md border bg-muted/50 p-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6 rounded-sm",
                  showPreview && "bg-background shadow-sm"
                )}
                onClick={() => onToggleView(true)}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Preview</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6 rounded-sm",
                  !showPreview && "bg-background shadow-sm"
                )}
                onClick={() => onToggleView(false)}
              >
                <Code className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Source</TooltipContent>
          </Tooltip>
        </div>
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 ml-1"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
