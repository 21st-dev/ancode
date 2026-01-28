/**
 * Platform Abstraction Layer
 *
 * Provides unified cross-platform APIs for:
 * - Shell detection and configuration
 * - PATH management
 * - Environment variable handling
 * - CLI installation
 * - Locale detection
 *
 * Usage:
 *   import { platform, getPlatformProvider } from './platform'
 *
 *   // Use singleton (recommended)
 *   const shell = platform.getDefaultShell()
 *   const env = platform.buildEnvironment()
 *
 *   // Or get provider for specific platform
 *   const winProvider = getPlatformProvider('win32')
 */

import type { PlatformProvider } from "./types"
import { WindowsPlatformProvider } from "./windows"
import { DarwinPlatformProvider } from "./darwin"
import { LinuxPlatformProvider } from "./linux"

// Export types
export type {
  PlatformProvider,
  ShellConfig,
  PathConfig,
  CliConfig,
  EnvironmentConfig,
} from "./types"

// Provider instances (lazy initialized)
let windowsProvider: WindowsPlatformProvider | null = null
let darwinProvider: DarwinPlatformProvider | null = null
let linuxProvider: LinuxPlatformProvider | null = null

/**
 * Get platform provider for a specific platform
 */
export function getPlatformProvider(
  platformId: "win32" | "darwin" | "linux"
): PlatformProvider {
  switch (platformId) {
    case "win32":
      if (!windowsProvider) {
        windowsProvider = new WindowsPlatformProvider()
      }
      return windowsProvider
    case "darwin":
      if (!darwinProvider) {
        darwinProvider = new DarwinPlatformProvider()
      }
      return darwinProvider
    case "linux":
      if (!linuxProvider) {
        linuxProvider = new LinuxPlatformProvider()
      }
      return linuxProvider
    default:
      throw new Error(`Unsupported platform: ${platformId}`)
  }
}

/**
 * Get platform provider for current platform
 */
export function getCurrentPlatformProvider(): PlatformProvider {
  const platformId = process.platform as "win32" | "darwin" | "linux"
  return getPlatformProvider(platformId)
}

/**
 * Singleton instance for current platform
 * This is the recommended way to use the platform abstraction
 */
export const platform = getCurrentPlatformProvider()

// ============================================================================
// Convenience functions that delegate to current platform provider
// These provide a simpler API for common operations
// ============================================================================

/**
 * Get the default shell for current platform
 */
export function getDefaultShell(): string {
  return platform.getDefaultShell()
}

/**
 * Detect user's preferred shell (async)
 */
export async function detectShell(): Promise<string> {
  return platform.detectShell()
}

/**
 * Detect system locale
 */
export async function detectLocale(): Promise<string> {
  return platform.detectLocale()
}

/**
 * Build extended PATH with common tool locations
 */
export function buildExtendedPath(currentPath?: string): string {
  return platform.buildExtendedPath(currentPath)
}

/**
 * Build environment for shell/process execution
 */
export function buildEnvironment(
  baseEnv?: Record<string, string>
): Record<string, string> {
  return platform.buildEnvironment(baseEnv)
}

/**
 * Get PATH separator for current platform
 */
export function getPathSeparator(): string {
  return platform.getPathConfig().separator
}

/**
 * Check if current platform is Windows
 */
export function isWindows(): boolean {
  return platform.platform === "win32"
}

/**
 * Check if current platform is macOS
 */
export function isMacOS(): boolean {
  return platform.platform === "darwin"
}

/**
 * Check if current platform is Linux
 */
export function isLinux(): boolean {
  return platform.platform === "linux"
}

/**
 * Get CLI installation path for current platform
 */
export function getCliInstallPath(): string {
  return platform.getCliConfig().installPath
}

/**
 * Get CLI script name for current platform
 */
export function getCliScriptName(): string {
  return platform.getCliConfig().scriptName
}
