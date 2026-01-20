"use client"

import { useEffect, useCallback, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { useTextSelection } from "../context/text-selection-context"

interface TextSelectionPopoverProps {
  onAddToContext: (text: string, messageId: string) => void
}

export function TextSelectionPopover({
  onAddToContext,
}: TextSelectionPopoverProps) {
  const { selectedText, selectedMessageId, selectionRect, clearSelection } =
    useTextSelection()
  const [isVisible, setIsVisible] = useState(false)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const handleAddToContext = useCallback(() => {
    if (selectedText && selectedMessageId) {
      onAddToContext(selectedText, selectedMessageId)
      clearSelection()
      setIsVisible(false)
    }
  }, [selectedText, selectedMessageId, onAddToContext, clearSelection])

  // Track mouse down/up to know when selection is complete
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // Ignore clicks on the popover itself
      if (popoverRef.current?.contains(e.target as Node)) {
        return
      }
      setIsMouseDown(true)
      setIsVisible(false) // Hide while selecting
    }

    const handleMouseUp = (e: MouseEvent) => {
      // Ignore clicks on the popover itself
      if (popoverRef.current?.contains(e.target as Node)) {
        return
      }
      setIsMouseDown(false)
    }

    document.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [])

  // Show popover only when mouse is up and we have a valid selection
  useEffect(() => {
    if (!isMouseDown && selectedText && selectedMessageId && selectionRect) {
      setIsVisible(true)
    } else if (!selectedText || !selectedMessageId || !selectionRect) {
      setIsVisible(false)
    }
  }, [isMouseDown, selectedText, selectedMessageId, selectionRect])

  // Don't render if not visible
  if (!isVisible || !selectedText || !selectedMessageId || !selectionRect) {
    return null
  }

  // Calculate position - below the selection, centered
  // But clamp to viewport bounds
  const viewportWidth = window.innerWidth
  const popoverWidth = 120 // approximate width
  let left = selectionRect.left + selectionRect.width / 2

  // Clamp left position to prevent overflow
  left = Math.max(popoverWidth / 2 + 8, Math.min(left, viewportWidth - popoverWidth / 2 - 8))

  const style: React.CSSProperties = {
    position: "fixed",
    top: selectionRect.bottom + 6,
    left,
    transform: "translateX(-50%)",
    zIndex: 100000,
  }

  const popoverContent = (
    <div
      ref={popoverRef}
      style={style}
      className="animate-in fade-in-0 duration-100"
    >
      <button
        onClick={handleAddToContext}
        data-tooltip="true"
        className="rounded-[12px] bg-popover px-2.5 py-1.5 text-xs text-popover-foreground dark shadow-md hover:bg-accent transition-colors duration-100 active:scale-[0.98]"
      >
        Add to context
      </button>
    </div>
  )

  return createPortal(popoverContent, document.body)
}
