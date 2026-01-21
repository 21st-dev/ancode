import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import Editor from "@monaco-editor/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useTheme } from "next-themes"
import { useAtom } from "jotai"
import {
  Loader2,
  AlertCircle,
  Eye,
  Code,
  Copy,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconCloseSidebarRight } from "@/components/ui/icons"
import { getFileIconByExtension } from "../../agents/mentions/agents-file-mention"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc"
import { fileViewerWordWrapAtom } from "../../agents/atoms"
import { defaultEditorOptions, getMonacoTheme } from "./monaco-config"
import { getFileName, formatFileSize } from "../utils/file-utils"

interface MarkdownViewerProps {
  filePath: string
  projectPath: string
  onClose: () => void
}

/**
 * MarkdownViewer - Renders markdown with preview/source toggle
 */
export function MarkdownViewer({
  filePath,
  projectPath,
  onClose,
}: MarkdownViewerProps) {
  const fileName = getFileName(filePath)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const monacoTheme = getMonacoTheme(resolvedTheme || "dark")

  // View mode: preview or source
  const [showPreview, setShowPreview] = useState(true)

  // Word wrap preference for source view
  const [wordWrap] = useAtom(fileViewerWordWrapAtom)

  // Build absolute path
  const absolutePath = useMemo(() => {
    return filePath.startsWith("/") ? filePath : `${projectPath}/${filePath}`
  }, [filePath, projectPath])

  // Fetch file content
  const { data, isLoading, error, refetch } = trpc.files.readTextFile.useQuery(
    { filePath: absolutePath },
    { staleTime: 30000 }
  )

  // Store refetch in a ref so subscription callback always has current refetch
  const refetchRef = useRef(refetch)
  useEffect(() => {
    refetchRef.current = refetch
  }, [refetch])

  // Compute relative path for matching against file change events
  const relativePath = useMemo(() => {
    if (!filePath.startsWith("/")) return filePath
    if (filePath.startsWith(projectPath)) {
      return filePath.slice(projectPath.length + 1)
    }
    return filePath
  }, [projectPath, filePath])

  // Subscribe to file changes and refetch when the viewed file changes
  trpc.files.watchChanges.useSubscription(
    { projectPath },
    {
      enabled: !!projectPath && !!relativePath,
      onData: (change) => {
        if (change.filename === relativePath) {
          refetchRef.current()
        }
      },
    },
  )

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

  // Code block renderer for syntax highlighting
  const codeComponent = useCallback(
    ({ className, children, node, ...props }: { className?: string; children?: React.ReactNode; node?: { position?: unknown; tagName?: string } } & React.HTMLAttributes<HTMLElement>) => {
      const match = /language-(\w+)/.exec(className || "")
      // Check if this is inside a <pre> tag (code block) vs inline
      const isCodeBlock = node?.position && node?.tagName === "code" &&
        (className?.includes("language-") ||
         (typeof children === "string" && children.includes("\n")))

      // Inline code (not in a pre block)
      if (!isCodeBlock && !match) {
        return (
          <code
            className={cn(
              "px-1.5 py-0.5 rounded text-sm font-mono",
              isDark ? "bg-zinc-800" : "bg-zinc-200"
            )}
            {...props}
          >
            {children}
          </code>
        )
      }

      // Code block - use syntax highlighter
      return (
        <SyntaxHighlighter
          style={isDark ? oneDark : oneLight}
          language={match?.[1] || "text"}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: "0.375rem",
            fontSize: "0.875rem",
            padding: "1rem",
          }}
          {...props}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      )
    },
    [isDark]
  )

  // Pre block wrapper for code blocks without language
  const preComponent = useCallback(
    ({ children }: { children?: React.ReactNode }) => {
      // Just pass through - the code component handles styling
      return <>{children}</>
    },
    []
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <Header
          fileName={fileName}
          filePath={filePath}
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
    let errorMessage = "Failed to load file"
    if (data && !data.ok) {
      errorMessage = data.reason === "too-large"
        ? "File too large"
        : data.reason === "binary"
        ? "Binary file"
        : "File not found"
    } else if (error) {
      const errMsg = error.message?.toLowerCase() || ""
      const isNotFound = errMsg.includes("enoent") ||
                         errMsg.includes("not found") ||
                         errMsg.includes("no such file")
      errorMessage = isNotFound ? "File not found" : "Failed to load file"
    }

    return (
      <div className="flex flex-col h-full bg-background">
        <Header
          fileName={fileName}
          filePath={filePath}
          byteLength={null}
          showPreview={showPreview}
          onToggleView={setShowPreview}
          onClose={onClose}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3 text-center max-w-[300px]">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium text-foreground">{errorMessage}</p>
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
        filePath={filePath}
        byteLength={byteLength}
        showPreview={showPreview}
        onToggleView={setShowPreview}
        onClose={onClose}
        content={content}
      />

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {showPreview ? (
          <div
            className={cn(
              "h-full overflow-auto p-6",
              "prose prose-sm max-w-none",
              isDark ? "prose-invert" : "",
              // Custom prose styling
              "prose-headings:font-semibold",
              "prose-h1:text-2xl prose-h1:border-b prose-h1:pb-2 prose-h1:mb-4",
              "prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3",
              "prose-h3:text-lg prose-h3:mt-5 prose-h3:mb-2",
              "prose-p:my-3 prose-p:leading-relaxed",
              "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
              "prose-code:before:content-none prose-code:after:content-none",
              "prose-pre:bg-transparent prose-pre:p-0",
              "prose-ul:my-3 prose-ol:my-3",
              "prose-li:my-1",
              "prose-blockquote:border-l-primary prose-blockquote:bg-muted/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic",
              "prose-table:my-4",
              "prose-th:bg-muted prose-th:px-3 prose-th:py-2",
              "prose-td:px-3 prose-td:py-2 prose-td:border-t"
            )}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code: codeComponent,
                pre: preComponent,
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <Editor
            height="100%"
            language="markdown"
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
  filePath,
  byteLength,
  showPreview,
  onToggleView,
  onClose,
  content,
}: {
  fileName: string
  filePath: string
  byteLength: number | null
  showPreview: boolean
  onToggleView: (show: boolean) => void
  onClose: () => void
  content?: string
}) {
  const Icon = getFileIconByExtension(filePath)
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }, [content])

  return (
    <div className="flex items-center justify-between px-3 h-10 border-b bg-background flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
        <span className="text-sm font-medium truncate">{fileName}</span>
        {byteLength !== null && (
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatFileSize(byteLength)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Copy file content */}
        {content && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {copied ? "Copied!" : "Copy file content"}
            </TooltipContent>
          </Tooltip>
        )}
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
          className="h-6 w-6 p-0 hover:bg-muted transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] rounded-md ml-1"
          onClick={onClose}
        >
          <IconCloseSidebarRight className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
    </div>
  )
}
