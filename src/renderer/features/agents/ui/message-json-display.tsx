"use client"

import { memo, useState, useCallback, useEffect } from "react"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "../../../components/ui/collapsible"
import { ChevronRight, Copy, Check } from "lucide-react"
import { cn } from "../../../lib/utils"
import { highlightCode } from "../../../lib/themes/shiki-theme-loader"
import { useCodeTheme } from "../../../lib/hooks/use-code-theme"

interface MessageJsonDisplayProps {
  message: any
  label?: string
}

export const MessageJsonDisplay = memo(function MessageJsonDisplay({
  message,
  label = "Message",
}: MessageJsonDisplayProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null)
  const themeId = useCodeTheme()

  const jsonString = JSON.stringify(message, null, 2)

  // Highlight JSON when expanded
  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    highlightCode(jsonString, "json", themeId)
      .then((html) => {
        if (!cancelled) setHighlightedHtml(html)
      })
      .catch(console.error)

    return () => {
      cancelled = true
    }
  }, [jsonString, themeId, isOpen])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(jsonString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [jsonString])

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-1">
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors">
            <ChevronRight
              className={cn(
                "h-3 w-3 transition-transform",
                isOpen && "rotate-90",
              )}
            />
            <span>{label} JSON</span>
          </button>
        </CollapsibleTrigger>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleCopy()
          }}
          className="p-1 rounded hover:bg-muted/50 transition-colors"
          title={copied ? "Copied!" : "Copy JSON"}
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      </div>
      <CollapsibleContent>
        <div className="mt-1 mx-2 rounded-md border bg-muted/30 overflow-hidden">
          {/* JSON content */}
          <div className="p-3 max-h-[300px] overflow-auto">
            {highlightedHtml ? (
              <pre
                className="text-xs font-mono"
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />
            ) : (
              <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                {jsonString}
              </pre>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
})
