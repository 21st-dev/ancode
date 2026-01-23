import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Hook options for hotkey recording
 */
export interface UseHotkeyRecorderOptions {
  /** Called when a valid hotkey combination is recorded */
  onRecord: (hotkey: string) => void
  /** Called when recording is cancelled (e.g., Escape pressed) */
  onCancel: () => void
  /** Whether recording is currently active */
  isRecording: boolean
}

/**
 * Result of the hotkey recorder hook
 */
export interface UseHotkeyRecorderResult {
  /** Currently pressed keys during recording */
  currentKeys: string[]
  /** Current combination as a display string (e.g., "⌘⇧") */
  currentDisplay: string
  /** Ref to attach to the recording element */
  recorderRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Map of KeyboardEvent.key values to our internal key names
 */
const KEY_MAP: Record<string, string> = {
  Meta: "cmd",
  Control: "ctrl",
  Alt: "opt",
  Shift: "shift",
  Escape: "Esc",
  Enter: "Enter",
  Backspace: "Backspace",
  Delete: "Delete",
  Tab: "Tab",
  " ": "Space",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
}

/**
 * Display mapping for keys
 */
const DISPLAY_MAP: Record<string, string> = {
  cmd: "⌘",
  ctrl: "⌃",
  opt: "⌥",
  shift: "⇧",
  Esc: "Esc",
  Enter: "↵",
  Backspace: "⌫",
  Delete: "⌦",
  Tab: "Tab",
  Space: "Space",
}

/**
 * Modifiers in display order
 */
const MODIFIER_ORDER = ["cmd", "ctrl", "opt", "shift"]

/**
 * Check if a key is a modifier
 */
function isModifier(key: string): boolean {
  return MODIFIER_ORDER.includes(key)
}

/**
 * Convert KeyboardEvent to our internal key representation
 */
function eventKeyToInternal(e: KeyboardEvent): string {
  const mapped = KEY_MAP[e.key]
  if (mapped) return mapped

  // For single characters, use uppercase
  if (e.key.length === 1) {
    return e.key.toUpperCase()
  }

  // For special keys like F1, F2, etc.
  return e.key
}

/**
 * Convert internal key to display format
 */
function keyToDisplay(key: string): string {
  return DISPLAY_MAP[key] || key
}

/**
 * Build hotkey string from modifiers and key
 */
function buildHotkeyString(modifiers: Set<string>, key: string | null): string {
  const parts: string[] = []

  // Add modifiers in order
  for (const mod of MODIFIER_ORDER) {
    if (modifiers.has(mod)) {
      parts.push(mod)
    }
  }

  // Add the main key
  if (key) {
    parts.push(key.toLowerCase())
  }

  return parts.join("+")
}

/**
 * Build display string from modifiers and key
 */
function buildDisplayString(modifiers: Set<string>, key: string | null): string {
  const parts: string[] = []

  // Add modifiers in order
  for (const mod of MODIFIER_ORDER) {
    if (modifiers.has(mod)) {
      parts.push(keyToDisplay(mod))
    }
  }

  // Add the main key
  if (key) {
    parts.push(keyToDisplay(key))
  }

  return parts.join("")
}

/**
 * Hook for recording keyboard shortcuts
 *
 * Usage:
 * ```tsx
 * const { currentKeys, currentDisplay, recorderRef } = useHotkeyRecorder({
 *   onRecord: (hotkey) => console.log("Recorded:", hotkey),
 *   onCancel: () => console.log("Cancelled"),
 *   isRecording: true,
 * })
 * ```
 */
export function useHotkeyRecorder({
  onRecord,
  onCancel,
  isRecording,
}: UseHotkeyRecorderOptions): UseHotkeyRecorderResult {
  const [modifiers, setModifiers] = useState<Set<string>>(new Set())
  const [mainKey, setMainKey] = useState<string | null>(null)
  const recorderRef = useRef<HTMLDivElement>(null)

  // Track if we've recorded a complete combination
  const hasRecordedRef = useRef(false)

  // Reset state when recording starts (not when it stops, to avoid flicker)
  useEffect(() => {
    if (isRecording) {
      setModifiers(new Set())
      setMainKey(null)
      hasRecordedRef.current = false
    }
  }, [isRecording])

  // Handle keydown
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isRecording) return

      e.preventDefault()
      e.stopPropagation()

      const key = eventKeyToInternal(e)

      // Handle Escape to cancel (always cancels, even with modifiers held)
      if (key === "Esc") {
        onCancel()
        return
      }

      if (isModifier(key)) {
        // Add modifier
        setModifiers((prev) => new Set([...prev, key]))
      } else {
        // Set main key
        setMainKey(key)
      }
    },
    [isRecording, modifiers, onCancel]
  )

  // Handle keyup
  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (!isRecording) return
      // Don't process keyup after recording - keep state frozen
      if (hasRecordedRef.current) return

      const key = eventKeyToInternal(e)

      if (isModifier(key)) {
        // If we have a main key, record the combination before removing modifier
        if (mainKey) {
          hasRecordedRef.current = true
          const hotkey = buildHotkeyString(modifiers, mainKey)
          onRecord(hotkey)
          // Don't remove modifier - keep display frozen
          return
        }
        // No main key yet, remove modifier
        setModifiers((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      } else {
        // Main key released - record if we have modifiers or it's a valid single key
        const validSingleKeys = ["?", "/", "Esc", "Enter", "Tab"]
        if (modifiers.size > 0 || validSingleKeys.includes(key)) {
          hasRecordedRef.current = true
          const hotkey = buildHotkeyString(modifiers, key)
          onRecord(hotkey)
        }
      }
    },
    [isRecording, mainKey, modifiers, onRecord]
  )

  // Attach event listeners
  useEffect(() => {
    if (!isRecording) return

    // Use capture phase to intercept before other handlers
    window.addEventListener("keydown", handleKeyDown, true)
    window.addEventListener("keyup", handleKeyUp, true)

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true)
      window.removeEventListener("keyup", handleKeyUp, true)
    }
  }, [isRecording, handleKeyDown, handleKeyUp])

  // Build current keys array for display
  const currentKeys: string[] = [
    ...MODIFIER_ORDER.filter((mod) => modifiers.has(mod)),
    ...(mainKey ? [mainKey] : []),
  ]

  const currentDisplay = buildDisplayString(modifiers, mainKey)

  return {
    currentKeys,
    currentDisplay,
    recorderRef,
  }
}
