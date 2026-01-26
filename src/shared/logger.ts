/**
 * Centralized logging utility for 1Code
 * Provides consistent logging with levels and environment-aware output
 */

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogEntry {
  level: LogLevel
  message: string
  data?: unknown
  timestamp: number
}

class Logger {
  private isDev: boolean
  private logHistory: LogEntry[] = []
  private maxHistorySize = 100

  constructor() {
    this.isDev = import.meta.env.DEV || process.env.NODE_ENV === "development"
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: Date.now(),
    }

    // Store in history (for debugging)
    this.logHistory.push(entry)
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift()
    }

    // Only log in dev mode or for errors/warnings
    if (!this.isDev && (level === "debug" || level === "info")) {
      return
    }

    const prefix = `[${level.toUpperCase()}]`
    const timestamp = new Date(entry.timestamp).toISOString()

    switch (level) {
      case "debug":
        console.debug(`${prefix} ${message}`, data || "")
        break
      case "info":
        console.info(`${prefix} ${message}`, data || "")
        break
      case "warn":
        console.warn(`${prefix} ${message}`, data || "")
        break
      case "error":
        console.error(`${prefix} ${message}`, data || "")
        if (data instanceof Error) {
          console.error("Stack:", data.stack)
        }
        break
    }
  }

  debug(message: string, data?: unknown): void {
    this.log("debug", message, data)
  }

  info(message: string, data?: unknown): void {
    this.log("info", message, data)
  }

  warn(message: string, data?: unknown): void {
    this.log("warn", message, data)
  }

  error(message: string, error?: unknown): void {
    this.log("error", message, error)
  }

  /**
   * Get recent log history (for debugging)
   */
  getHistory(): LogEntry[] {
    return [...this.logHistory]
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.logHistory = []
  }
}

// Export singleton instance
export const logger = new Logger()

// Export type for use in other modules
export type { LogLevel, LogEntry }
