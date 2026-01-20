/**
 * SoundManager - Synthesized sound effects using Tone.js
 *
 * Based on Vibecraft's SoundManager (https://github.com/Nearcyan/vibecraft)
 * Uses Web Audio synthesis - no audio files needed.
 *
 * Architecture:
 * - Synth pooling to reduce GC pressure
 * - Automatic disposal after sounds complete
 * - Normalized volume levels for consistency
 * - Debounce support per sound type
 */

import * as Tone from "tone"

// Volume Levels (dB)
const VOL = {
  QUIET: -20, // Background/ambient sounds
  SOFT: -16, // Subtle feedback
  NORMAL: -12, // Standard UI feedback
  PROMINENT: -10, // Important events
  LOUD: -8, // Major events
} as const

export type SoundName =
  // Tools
  | "read"
  | "write"
  | "edit"
  | "bash"
  | "grep"
  | "task"
  // Tool states
  | "success"
  | "error"
  // Session events
  | "stop"
  | "notification"
  | "thinking"

// Map tool names to sound names
const TOOL_SOUND_MAP: Record<string, SoundName> = {
  Read: "read",
  Write: "write",
  Edit: "edit",
  Bash: "bash",
  Grep: "grep",
  Glob: "grep",
  WebFetch: "read",
  WebSearch: "grep",
  Task: "task",
  TodoWrite: "write",
  NotebookEdit: "write",
}

type OscType = "sine" | "square" | "triangle" | "sawtooth"

interface SynthConfig {
  type: OscType
  attack: number
  decay: number
  sustain: number
  release: number
}

class SoundManager {
  private initialized = false
  private enabled = true
  private volume = 0.7

  // Synth pools by oscillator type
  private synthPools: Map<OscType, Tone.Synth[]> = new Map([
    ["sine", []],
    ["square", []],
    ["triangle", []],
    ["sawtooth", []],
  ])

  // Track active synths for cleanup
  private activeSynths: Set<Tone.Synth | Tone.PolySynth> = new Set()

  // Debounce tracking
  private lastPlayed: Map<string, number> = new Map()

  private readonly MAX_POOL_SIZE = 5

  /**
   * Initialize audio context. Must be called from a user gesture.
   */
  async init(): Promise<void> {
    if (this.initialized) return

    await Tone.start()
    Tone.getDestination().volume.value = Tone.gainToDb(this.volume)

    this.initialized = true
    console.log("[SoundManager] Audio initialized")
  }

  isReady(): boolean {
    return this.initialized
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  isEnabled(): boolean {
    return this.enabled
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume))
    if (this.initialized) {
      Tone.getDestination().volume.value = Tone.gainToDb(this.volume)
    }
  }

  /**
   * Play a sound by name with optional debounce
   */
  play(name: SoundName, debounceMs: number = 0): void {
    if (!this.initialized || !this.enabled) return

    // Check debounce
    if (debounceMs > 0) {
      const lastTime = this.lastPlayed.get(name) || 0
      const now = Date.now()
      if (now - lastTime < debounceMs) {
        return
      }
      this.lastPlayed.set(name, now)
    }

    const soundFn = this.sounds[name]
    if (!soundFn) {
      console.warn(`[SoundManager] Unknown sound: ${name}`)
      return
    }

    soundFn()
  }

  /**
   * Play sound for a tool by tool name
   */
  playTool(toolName: string, debounceMs: number = 0): void {
    const soundName = TOOL_SOUND_MAP[toolName]
    if (soundName) {
      this.play(soundName, debounceMs)
    }
  }

  /**
   * Play success or error based on result
   */
  playResult(success: boolean): void {
    this.play(success ? "success" : "error")
  }

  private getSynth(config: SynthConfig): Tone.Synth {
    const pool = this.synthPools.get(config.type)!
    let synth = pool.pop()

    if (!synth) {
      synth = new Tone.Synth({
        oscillator: { type: config.type },
        envelope: {
          attack: config.attack,
          decay: config.decay,
          sustain: config.sustain,
          release: config.release,
        },
      })
      synth.toDestination()
    } else {
      synth.oscillator.type = config.type
      synth.envelope.attack = config.attack
      synth.envelope.decay = config.decay
      synth.envelope.sustain = config.sustain
      synth.envelope.release = config.release
    }

    this.activeSynths.add(synth)
    return synth
  }

  private releaseSynth(synth: Tone.Synth, delayMs: number = 500): void {
    setTimeout(() => {
      this.activeSynths.delete(synth)
      const type = synth.oscillator.type as OscType
      const pool = this.synthPools.get(type)
      if (pool && pool.length < this.MAX_POOL_SIZE) {
        pool.push(synth)
      } else {
        synth.dispose()
      }
    }, delayMs)
  }

  private createDisposableSynth(
    config: SynthConfig,
    volume: number,
  ): Tone.Synth {
    const synth = new Tone.Synth({
      oscillator: { type: config.type },
      envelope: {
        attack: config.attack,
        decay: config.decay,
        sustain: config.sustain,
        release: config.release,
      },
    })
    synth.toDestination()
    synth.volume.value = volume
    this.activeSynths.add(synth)

    const totalTime =
      (config.attack + config.decay + config.release) * 1000 + 200
    setTimeout(() => {
      this.activeSynths.delete(synth)
      synth.dispose()
    }, totalTime)

    return synth
  }

  private createDisposablePolySynth(
    config: SynthConfig,
    volume: number,
    disposeAfterMs: number,
  ): Tone.PolySynth {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: config.type },
      envelope: {
        attack: config.attack,
        decay: config.decay,
        sustain: config.sustain,
        release: config.release,
      },
    })
    synth.toDestination()
    synth.volume.value = volume
    this.activeSynths.add(synth)

    setTimeout(() => {
      this.activeSynths.delete(synth)
      synth.dispose()
    }, disposeAfterMs)

    return synth
  }

  dispose(): void {
    for (const synth of this.activeSynths) {
      synth.dispose()
    }
    this.activeSynths.clear()

    for (const pool of this.synthPools.values()) {
      for (const synth of pool) {
        synth.dispose()
      }
      pool.length = 0
    }
  }

  // ============================================
  // Sound Definitions (from Vibecraft)
  // ============================================

  private sounds: Record<SoundName, () => void> = {
    // === TOOLS ===

    read: () => {
      // Page turn - two soft tones
      const synth = this.getSynth({
        type: "sine",
        attack: 0.005,
        decay: 0.1,
        sustain: 0,
        release: 0.1,
      })
      synth.volume.value = VOL.NORMAL
      synth.triggerAttackRelease("A4", "32n")
      setTimeout(() => synth.triggerAttackRelease("C5", "32n"), 50)
      this.releaseSynth(synth, 300)
    },

    write: () => {
      // Keyboard typing - quick triple blip
      const synth = this.getSynth({
        type: "square",
        attack: 0.001,
        decay: 0.05,
        sustain: 0,
        release: 0.05,
      })
      synth.volume.value = VOL.QUIET
      synth.triggerAttackRelease("E5", "64n")
      setTimeout(() => synth.triggerAttackRelease("E5", "64n"), 40)
      setTimeout(() => synth.triggerAttackRelease("G5", "64n"), 80)
      this.releaseSynth(synth, 300)
    },

    edit: () => {
      // Pencil scratch - two quick taps
      const synth = this.getSynth({
        type: "triangle",
        attack: 0.001,
        decay: 0.06,
        sustain: 0,
        release: 0.04,
      })
      synth.volume.value = VOL.PROMINENT
      synth.triggerAttackRelease("E4", "32n")
      setTimeout(() => synth.triggerAttackRelease("G4", "32n"), 60)
      this.releaseSynth(synth, 250)
    },

    bash: () => {
      // Soft terminal click - single gentle tap
      const synth = this.getSynth({
        type: "sine",
        attack: 0.005,
        decay: 0.08,
        sustain: 0,
        release: 0.06,
      })
      synth.volume.value = VOL.QUIET
      synth.triggerAttackRelease("G4", "32n")
      this.releaseSynth(synth, 200)
    },

    grep: () => {
      // Scanning/searching - sweep with "found it" blip
      const synth = this.createDisposableSynth(
        { type: "sine", attack: 0.01, decay: 0.15, sustain: 0, release: 0.1 },
        VOL.NORMAL,
      )
      synth.triggerAttackRelease("E4", "16n")
      synth.frequency.rampTo("A4", 0.12)

      const blip = this.createDisposableSynth(
        {
          type: "triangle",
          attack: 0.005,
          decay: 0.06,
          sustain: 0,
          release: 0.05,
        },
        VOL.SOFT,
      )
      setTimeout(() => blip.triggerAttackRelease("C5", "32n"), 130)
    },

    task: () => {
      // Subagent launch - ascending sweep
      const synth = this.createDisposableSynth(
        { type: "sine", attack: 0.02, decay: 0.2, sustain: 0, release: 0.2 },
        VOL.PROMINENT,
      )
      synth.triggerAttackRelease("C4", "16n")
      synth.frequency.exponentialRampTo("G5", 0.15)
    },

    // === TOOL STATES ===

    success: () => {
      // Positive resolution - rising fifth
      const synth = this.createDisposableSynth(
        { type: "sine", attack: 0.01, decay: 0.15, sustain: 0, release: 0.2 },
        VOL.LOUD,
      )
      synth.triggerAttackRelease("C5", "16n")
      setTimeout(() => synth.triggerAttackRelease("G5", "8n"), 100)
    },

    error: () => {
      // Negative/warning - descending buzz
      const synth = this.createDisposableSynth(
        {
          type: "sawtooth",
          attack: 0.01,
          decay: 0.15,
          sustain: 0,
          release: 0.15,
        },
        VOL.PROMINENT,
      )
      synth.triggerAttackRelease("A2", "8n")
      synth.frequency.rampTo("F2", 0.1)
    },

    // === SESSION EVENTS ===

    stop: () => {
      // Claude finished - satisfying completion chord
      const synth = this.getSynth({
        type: "sine",
        attack: 0.01,
        decay: 0.2,
        sustain: 0,
        release: 0.25,
      })
      synth.volume.value = VOL.PROMINENT
      synth.triggerAttackRelease("E4", "16n")
      setTimeout(() => synth.triggerAttackRelease("G4", "16n"), 80)
      setTimeout(() => synth.triggerAttackRelease("C5", "8n"), 160)
      this.releaseSynth(synth, 600)
    },

    notification: () => {
      // Gentle attention chime - ascending arpeggio
      const synth = this.createDisposablePolySynth(
        {
          type: "sine",
          attack: 0.02,
          decay: 0.3,
          sustain: 0.1,
          release: 0.4,
        },
        VOL.NORMAL,
        1200,
      )
      // Pleasant ascending major chord arpeggio
      synth.triggerAttackRelease("C5", "8n")
      setTimeout(() => synth.triggerAttackRelease("E5", "8n"), 80)
      setTimeout(() => synth.triggerAttackRelease("G5", "8n"), 160)
    },

    thinking: () => {
      // Claude processing - subtle ambient
      const synth = this.createDisposableSynth(
        { type: "sine", attack: 0.05, decay: 0.15, sustain: 0.1, release: 0.2 },
        VOL.QUIET,
      )
      synth.triggerAttackRelease("D4", "8n")

      const synth2 = this.createDisposableSynth(
        { type: "sine", attack: 0.08, decay: 0.2, sustain: 0, release: 0.15 },
        VOL.QUIET - 2,
      )
      setTimeout(() => synth2.triggerAttackRelease("F4", "8n"), 100)
    },
  }
}

// Export singleton instance
export const soundManager = new SoundManager()
