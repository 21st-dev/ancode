import { useEffect, useRef, useMemo } from "react"
import type { Terminal as XTerm } from "xterm"
import type { FitAddon } from "@xterm/addon-fit"
import { useAtomValue } from "jotai"
import { useTheme } from "next-themes"
import { createTerminalInstance, getDefaultTerminalBg } from "../terminal/helpers"
import { getTerminalThemeFromVSCode } from "../terminal/config"
import { fullThemeDataAtom } from "@/lib/atoms"
import "xterm/css/xterm.css"

interface TerminalOutputProps {
  /** New data chunks to append (will be written to terminal) */
  data: string[]
  /** Called when URL is clicked in terminal output */
  onUrlClick?: (url: string) => void
}

/**
 * Lightweight read-only terminal output viewer using xterm.js.
 * Displays ANSI-colored output without input handling.
 */
export function TerminalOutput({ data, onUrlClick }: TerminalOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const lastDataLengthRef = useRef(0)

  // Use ref for callback to avoid recreating xterm on every render
  const onUrlClickRef = useRef(onUrlClick)
  onUrlClickRef.current = onUrlClick

  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const fullThemeData = useAtomValue(fullThemeDataAtom)

  // Initialize xterm once
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const { xterm, fitAddon, cleanup } = createTerminalInstance(container, {
      isDark,
      onUrlClick: (url) => onUrlClickRef.current?.(url),
    })

    xtermRef.current = xterm
    fitAddonRef.current = fitAddon

    // Resize observer for auto-fit
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        try {
          fitAddon.fit()
        } catch {
          // Ignore fit errors during rapid resize
        }
      })
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      cleanup()
      xtermRef.current = null
      fitAddonRef.current = null
    }
  }, [isDark])

  // Write new data incrementally
  useEffect(() => {
    const xterm = xtermRef.current
    if (!xterm || data.length === 0) return

    // Only write new data since last update
    const newData = data.slice(lastDataLengthRef.current)
    if (newData.length > 0) {
      for (const chunk of newData) {
        xterm.write(chunk)
      }
      lastDataLengthRef.current = data.length
    }
  }, [data])

  // Reset when data is cleared
  useEffect(() => {
    if (data.length === 0 && lastDataLengthRef.current > 0) {
      xtermRef.current?.clear()
      lastDataLengthRef.current = 0
    }
  }, [data.length])

  // Update theme dynamically
  useEffect(() => {
    if (xtermRef.current) {
      const newTheme = getTerminalThemeFromVSCode(fullThemeData?.colors, isDark)
      xtermRef.current.options.theme = newTheme
    }
  }, [isDark, fullThemeData])

  const terminalBg = useMemo(() => {
    if (fullThemeData?.colors?.["terminal.background"]) {
      return fullThemeData.colors["terminal.background"]
    }
    if (fullThemeData?.colors?.["editor.background"]) {
      return fullThemeData.colors["editor.background"]
    }
    return getDefaultTerminalBg(isDark)
  }, [isDark, fullThemeData])

  return (
    <div
      className="h-full w-full overflow-hidden"
      style={{ backgroundColor: terminalBg }}
    >
      <div ref={containerRef} className="h-full w-full p-2" />
    </div>
  )
}
