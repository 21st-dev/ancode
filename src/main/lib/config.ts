/**
 * Shared configuration for the desktop app
 */
import { app } from "electron"

const IS_DEV = !!process.env.ELECTRON_RENDERER_URL

/**
 * Get the API base URL
 * In packaged app, ALWAYS use production URL to prevent localhost leaking into releases
 * In dev mode, allow override via MAIN_VITE_API_URL env variable
 */
export function getApiUrl(): string {
  if (app.isPackaged) {
    return "https://getcrunch.dev"
  }
  return import.meta.env.MAIN_VITE_API_URL || "https://getcrunch.dev"
}

/**
 * Check if running in development mode
 */
export function isDev(): boolean {
  return IS_DEV
}
