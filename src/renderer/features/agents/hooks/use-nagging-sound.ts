import { useEffect, useRef } from "react"
import { useAtomValue } from "jotai"
import { pendingUserQuestionsAtom } from "../atoms"
import { soundManager } from "@/lib/sound-manager"

const NAGGING_INTERVAL_MS = 30000 // 30 seconds

/**
 * Hook that plays a nagging sound when there are pending user questions
 * Plays immediately when question appears, then every 30 seconds until answered
 */
export function useNaggingSound(): void {
  const pendingQuestions = useAtomValue(pendingUserQuestionsAtom)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (pendingQuestions) {
      // Play immediately when question appears
      soundManager.play("notification")

      // Start interval for nagging every 30 seconds
      intervalRef.current = setInterval(() => {
        soundManager.play("notification")
      }, NAGGING_INTERVAL_MS)
    }

    // Cleanup on unmount or when pendingQuestions becomes null
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [pendingQuestions])
}
