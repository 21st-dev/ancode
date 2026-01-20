import { useEffect, useRef } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { chatWaitingForUserAtom, nagMutedAtom, pendingUserQuestionsAtom } from "../atoms"
import { soundManager } from "@/lib/sound-manager"

const NAGGING_INTERVAL_MS = 30000 // 30 seconds
const MAX_NAG_DURATION_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Hook that plays a nagging sound when Claude needs user attention:
 * 1. Pending user questions (AskUserQuestion tool)
 * 2. Chat finished and waiting for user input
 *
 * Plays immediately when state changes, then every 30 seconds until:
 * - User responds
 * - User mutes via bell icon
 * - 10 minutes have passed (auto-stops)
 */
export function useNaggingSound(): void {
  const pendingQuestions = useAtomValue(pendingUserQuestionsAtom)
  const chatWaiting = useAtomValue(chatWaitingForUserAtom)
  const isMuted = useAtomValue(nagMutedAtom)
  const setMuted = useSetAtom(nagMutedAtom)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevShouldNagRef = useRef(false)

  // Nag if either: pending questions exist OR chat is waiting for user
  const shouldNag = !!pendingQuestions || !!chatWaiting

  // Reset mute when a NEW nag starts (transition from false to true)
  useEffect(() => {
    if (shouldNag && !prevShouldNagRef.current) {
      setMuted(false)
    }
    prevShouldNagRef.current = shouldNag
  }, [shouldNag, setMuted])

  useEffect(() => {
    // Clear any existing timers first
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (shouldNag && !isMuted) {
      // Play immediately when needing attention
      soundManager.play("notification")

      // Start interval for nagging every 30 seconds
      intervalRef.current = setInterval(() => {
        soundManager.play("notification")
      }, NAGGING_INTERVAL_MS)

      // Auto-stop after 10 minutes
      timeoutRef.current = setTimeout(() => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }, MAX_NAG_DURATION_MS)
    }

    // Cleanup on unmount or when no longer needs attention
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [shouldNag, isMuted])
}
