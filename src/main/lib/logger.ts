/**
 * Logging utility for main process
 * Provides consistent logging with levels and environment-aware output
 */

type LogLevel = "debug" | "info" | "warn" | "error"

class MainLogger {
  private isDev: boolean

  constructor() {
    // In Electron main process, check if we're in dev mode
    this.isDev = !!process.env.ELECTRON_RENDERER_URL || process.env.NODE_ENV === "development"
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    // Only log in dev mode or for errors/warnings
    if (!this.isDev && (level === "debug" || level === "info")) {
      return
    }

    const prefix = `[${level.toUpperCase()}]`
    const timestamp = new Date().toISOString()

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
}

// Export singleton instance
export const logger = new MainLogger()
