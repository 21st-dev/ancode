"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"

export interface TextSelectionState {
  selectedText: string | null
  selectedMessageId: string | null
  selectionRect: DOMRect | null
}

interface TextSelectionContextValue extends TextSelectionState {
  clearSelection: () => void
}

const TextSelectionContext = createContext<TextSelectionContextValue | null>(
  null
)

export function useTextSelection(): TextSelectionContextValue {
  const ctx = useContext(TextSelectionContext)
  if (!ctx) {
    throw new Error(
      "useTextSelection must be used within TextSelectionProvider"
    )
  }
  return ctx
}

interface TextSelectionProviderProps {
  children: ReactNode
}

export function TextSelectionProvider({
  children,
}: TextSelectionProviderProps) {
  const [state, setState] = useState<TextSelectionState>({
    selectedText: null,
    selectedMessageId: null,
    selectionRect: null,
  })

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges()
    setState({
      selectedText: null,
      selectedMessageId: null,
      selectionRect: null,
    })
  }, [])

  useEffect(() => {
    let rafId: number | null = null

    const handleSelectionChange = () => {
      // Cancel any pending frame to debounce rapid selection changes
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }

      rafId = requestAnimationFrame(() => {
        rafId = null

        const selection = window.getSelection()

        // No selection or collapsed (just cursor)
        if (!selection || selection.isCollapsed) {
          setState({
            selectedText: null,
            selectedMessageId: null,
            selectionRect: null,
          })
          return
        }

        const text = selection.toString().trim()
        if (!text) {
          setState({
            selectedText: null,
            selectedMessageId: null,
            selectionRect: null,
          })
          return
        }

        // Get the selection range
        const range = selection.getRangeAt(0)
        const container = range.commonAncestorContainer

        // Find the closest assistant message element
        const element =
          container.nodeType === Node.TEXT_NODE
            ? container.parentElement
            : (container as Element)

        const messageElement = element?.closest?.(
          "[data-assistant-message-id]"
        ) as HTMLElement | null

        // Selection is not within an assistant message
        if (!messageElement) {
          setState({
            selectedText: null,
            selectedMessageId: null,
            selectionRect: null,
          })
          return
        }

        const messageId = messageElement.getAttribute("data-assistant-message-id")
        if (!messageId) {
          setState({
            selectedText: null,
            selectedMessageId: null,
            selectionRect: null,
          })
          return
        }

        // Get the bounding rect of the selection
        const rect = range.getBoundingClientRect()

        setState({
          selectedText: text,
          selectedMessageId: messageId,
          selectionRect: rect,
        })
      })
    }

    document.addEventListener("selectionchange", handleSelectionChange)

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange)
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [])

  return (
    <TextSelectionContext.Provider value={{ ...state, clearSelection }}>
      {children}
    </TextSelectionContext.Provider>
  )
}
