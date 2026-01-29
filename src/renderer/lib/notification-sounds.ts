/**
 * Notification sounds utility
 *
 * Provides different sounds for different notification types:
 * - Completion: Uses the existing sound.mp3 file (longer chime for task completion)
 * - Prompt: Uses Web Audio API to generate a distinct shorter alert sound
 */

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

/**
 * Play the completion notification sound
 * Uses the existing sound.mp3 file
 */
export function playCompletionSound(): void {
  try {
    const audio = new Audio("./sound.mp3")
    audio.volume = 1.0
    audio.play().catch(() => {})
  } catch {
    // Ignore audio errors
  }
}

/**
 * Play the prompt notification sound
 * Uses Web Audio API to generate a distinct two-tone alert
 * Pattern: Two ascending notes (like a question "doo-dee?")
 */
export function playPromptSound(): void {
  try {
    const ctx = getAudioContext()

    // Resume audio context if suspended (browser autoplay policy)
    if (ctx.state === "suspended") {
      ctx.resume()
    }

    const now = ctx.currentTime

    // Create two oscillators for two-tone effect
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gainNode = ctx.createGain()

    // Connect nodes
    osc1.connect(gainNode)
    osc2.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Configure oscillators - ascending tones (question-like)
    osc1.type = "sine"
    osc1.frequency.setValueAtTime(523.25, now) // C5
    osc1.frequency.setValueAtTime(0, now + 0.12) // Stop first tone

    osc2.type = "sine"
    osc2.frequency.setValueAtTime(0, now) // Start silent
    osc2.frequency.setValueAtTime(659.25, now + 0.12) // E5 - higher note

    // Configure gain envelope for smooth sound
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02) // Quick attack
    gainNode.gain.setValueAtTime(0.3, now + 0.1) // Hold first note
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.12) // Slight dip between notes
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.14) // Second note
    gainNode.gain.setValueAtTime(0.3, now + 0.22) // Hold second note
    gainNode.gain.linearRampToValueAtTime(0, now + 0.35) // Fade out

    // Start and stop oscillators
    osc1.start(now)
    osc1.stop(now + 0.12)
    osc2.start(now + 0.12)
    osc2.stop(now + 0.35)
  } catch {
    // Ignore audio errors - may happen if AudioContext not available
  }
}
