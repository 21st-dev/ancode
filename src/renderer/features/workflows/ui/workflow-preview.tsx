"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useAtomValue } from "jotai"
import { Check, Copy, FileCode, Loader2 } from "lucide-react"
import { getHighlighter, type Highlighter, type BundledLanguage, type BundledTheme } from "shiki"
import { trpc } from "../../../lib/trpc"
import { cn } from "../../../lib/utils"
import { workflowContentPathAtom } from "../atoms"
import { Button } from "../../../components/ui/button"

// ============================================================================
// Types
// ============================================================================

interface LanguageInfo {
  name: string
  label: string
}

// ============================================================================
// Constants
// ============================================================================

const PREVIEW_MIN_WIDTH = 300
const PREVIEW_MAX_WIDTH = 800

// Map file extensions to Shiki languages
const LANGUAGE_MAP: Record<string, LanguageInfo> = {
  ".ts": { name: "typescript", label: "TypeScript" },
  ".tsx": { name: "tsx", label: "TSX" },
  ".js": { name: "javascript", label: "JavaScript" },
  ".jsx": { name: "jsx", label: "JSX" },
  ".md": { name: "markdown", label: "Markdown" },
  ".yaml": { name: "yaml", label: "YAML" },
  ".yml": { name: "yaml", label: "YAML" },
  ".json": { name: "json", label: "JSON" },
  ".py": { name: "python", label: "Python" },
  ".rs": { name: "rust", label: "Rust" },
  ".go": { name: "go", label: "Go" },
}

// Dark theme matching VS Code style
const SHIKI_THEME: BundledTheme = "dark-plus"

// ============================================================================
// Component
// ============================================================================

export function WorkflowPreview() {
  const contentPath = useAtomValue(workflowContentPathAtom)
  const [copied, setCopied] = useState(false)
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null)
  const [highlighterError, setHighlighterError] = useState(false)

  // Initialize Shiki highlighter
  useEffect(() => {
    let mounted = true

    async function initHighlighter() {
      try {
        const h = await getHighlighter({
          themes: [SHIKI_THEME],
          langs: [
            "typescript",
            "tsx",
            "javascript",
            "jsx",
            "markdown",
            "yaml",
            "json",
            "python",
            "rust",
            "go",
          ],
        })

        if (mounted) {
          setHighlighter(h)
        }
      } catch (err) {
        console.error("[WorkflowPreview] Failed to initialize Shiki:", err)
        if (mounted) {
          setHighlighterError(true)
        }
      }
    }

    initHighlighter()

    return () => {
      mounted = false
    }
  }, [])

  // Fetch file content
  const { data: content, isLoading, error } = trpc.workflows.readFileContent.useQuery(
    { path: contentPath ?? "" },
    {
      enabled: contentPath !== null,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  )

  // Detect language from file extension
  const languageInfo = useMemo(() => {
    if (!contentPath) return null

    const ext = contentPath.substring(contentPath.lastIndexOf("."))
    return LANGUAGE_MAP[ext] || null
  }, [contentPath])

  // Syntax highlighted code
  const highlightedCode = useMemo(() => {
    if (!content || !highlighter || !languageInfo) return null

    try {
      const html = highlighter.codeToHtml(content, {
        lang: languageInfo.name as BundledLanguage,
        theme: SHIKI_THEME,
      })
      return html
    } catch (err) {
      console.error("[WorkflowPreview] Failed to highlight code:", err)
      return null
    }
  }, [content, highlighter, languageInfo])

  // Copy code to clipboard
  const handleCopy = useCallback(async () => {
    if (!content) return

    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("[WorkflowPreview] Failed to copy:", err)
    }
  }, [content])

  // Get relative file path for display (remove home directory prefix)
  const displayPath = useMemo(() => {
    if (!contentPath) return ""

    // Try to make the path more readable
    const homeDir = process.env.HOME || ""
    if (contentPath.startsWith(homeDir)) {
      return contentPath.replace(homeDir, "~")
    }

    // Also try to show relative to .claude directory
    const claudeIndex = contentPath.indexOf(".claude")
    if (claudeIndex !== -1) {
      return contentPath.substring(claudeIndex)
    }

    return contentPath
  }, [contentPath])

  // Empty state
  if (!contentPath) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6">
        <FileCode className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm text-center">Select an agent, command, or skill to view its source code</p>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (error || !content) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-destructive p-6">
        <FileCode className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm text-center">Failed to load file</p>
        {error && (
          <p className="text-xs text-center mt-2 text-muted-foreground">
            {error.message}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileCode className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span
            className="text-sm text-muted-foreground truncate"
            title={displayPath}
          >
            {displayPath}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Language badge */}
          {languageInfo && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {languageInfo.label}
            </span>
          )}

          {/* Copy button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCopy}
            title="Copy code"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      {/* Code content */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {highlightedCode !== null ? (
          <div
            className="shiki-wrapper"
            style={{
              padding: "1rem",
              backgroundColor: "transparent",
            }}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        ) : (
          // Fallback: plain text with monospace font
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words">
            {content}
          </pre>
        )}
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        .shiki-wrapper pre {
          background: transparent !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
      `}</style>
    </div>
  )
}
