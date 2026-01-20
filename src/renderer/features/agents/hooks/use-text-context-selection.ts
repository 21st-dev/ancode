import { useState, useCallback, useRef } from "react"
import {
  type SelectedTextContext,
  createTextPreview,
} from "../lib/queue-utils"

export interface UseTextContextSelectionReturn {
  textContexts: SelectedTextContext[]
  addTextContext: (text: string, sourceMessageId: string) => void
  removeTextContext: (id: string) => void
  clearTextContexts: () => void
  // Ref for accessing current value in callbacks without re-renders
  textContextsRef: React.RefObject<SelectedTextContext[]>
  // Direct state setter for restoring from draft
  setTextContextsFromDraft: (contexts: SelectedTextContext[]) => void
}

export function useTextContextSelection(): UseTextContextSelectionReturn {
  const [textContexts, setTextContexts] = useState<SelectedTextContext[]>([])
  const textContextsRef = useRef<SelectedTextContext[]>([])

  // Keep ref in sync with state
  textContextsRef.current = textContexts

  const addTextContext = useCallback(
    (text: string, sourceMessageId: string) => {
      const trimmedText = text.trim()
      if (!trimmedText) return

      // Prevent duplicates - check if same text from same message already exists
      const isDuplicate = textContextsRef.current.some(
        (ctx) =>
          ctx.text === trimmedText && ctx.sourceMessageId === sourceMessageId
      )
      if (isDuplicate) return

      const newContext: SelectedTextContext = {
        id: `tc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        text: trimmedText,
        sourceMessageId,
        preview: createTextPreview(trimmedText),
        createdAt: new Date(),
      }

      setTextContexts((prev) => [...prev, newContext])
    },
    []
  )

  const removeTextContext = useCallback((id: string) => {
    setTextContexts((prev) => prev.filter((ctx) => ctx.id !== id))
  }, [])

  const clearTextContexts = useCallback(() => {
    setTextContexts([])
  }, [])

  // Direct state setter for restoring from draft
  const setTextContextsFromDraft = useCallback(
    (contexts: SelectedTextContext[]) => {
      setTextContexts(contexts)
      textContextsRef.current = contexts
    },
    []
  )

  return {
    textContexts,
    addTextContext,
    removeTextContext,
    clearTextContexts,
    textContextsRef,
    setTextContextsFromDraft,
  }
}
