/**
 * Platform detection utilities for Agents Desktop
 *
 * Detects whether the app is running in Electron desktop app
 * and provides platform-specific shortcuts
 */

/**
 * Check if running inside Electron desktop app
 */
export function isDesktopApp(): boolean {
  if (typeof window === "undefined") return false
  return !!window.desktopApi
}

/**
 * Get the current platform
 */
export function getPlatform(): "darwin" | "win32" | "linux" | "unknown" {
  if (typeof window !== "undefined" && window.desktopApi?.platform) {
    return window.desktopApi.platform as "darwin" | "win32" | "linux"
  }
  return "unknown"
}

/**
 * Check if running on macOS
 */
export function isMacOS(): boolean {
  return getPlatform() === "darwin"
}

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  return getPlatform() === "win32"
}

/**
 * Check if running on Linux
 */
export function isLinux(): boolean {
  return getPlatform() === "linux"
}

/**
 * Get the correct shortcut display string based on platform
 * In web browser: uses Option (⌥) modifier for shortcuts that would conflict
 * In Electron: uses simpler shortcuts without Option
 *
 * @param webShortcut - Shortcut string for web browser (e.g., "⌥⌘N")
 * @param desktopShortcut - Shortcut string for desktop app (e.g., "⌘N")
 */
export function getShortcutDisplay(
  webShortcut: string,
  desktopShortcut: string,
): string {
  return isDesktopApp() ? desktopShortcut : webShortcut
}

/**
 * Get the correct hotkey string for registration
 *
 * @param webHotkey - Hotkey for web browser (e.g., "opt+cmd+n")
 * @param desktopHotkey - Hotkey for desktop app (e.g., "cmd+n")
 */
export function getHotkey(webHotkey: string, desktopHotkey: string): string {
  return isDesktopApp() ? desktopHotkey : webHotkey
}

/**
 * Shortcut mappings for common actions
 * Each entry has both web and desktop variants
 */
export const SHORTCUTS = {
  newAgent: {
    web: { hotkey: "opt+cmd+n", display: "⌥⌘N" },
    desktop: { hotkey: "cmd+n", display: "⌘N" },
  },
  newTab: {
    web: { hotkey: "opt+cmd+t", display: "⌥⌘T" },
    desktop: { hotkey: "cmd+t", display: "⌘T" },
  },
  closeTab: {
    web: { hotkey: "opt+cmd+w", display: "⌥⌘W" },
    desktop: { hotkey: "cmd+w", display: "⌘W" },
  },
  prevTab: {
    web: { hotkey: "opt+cmd+[", display: "⌥⌘[" },
    desktop: { hotkey: "cmd+[", display: "⌘[" },
  },
  nextTab: {
    web: { hotkey: "opt+cmd+]", display: "⌥⌘]" },
    desktop: { hotkey: "cmd+]", display: "⌘]" },
  },
  archiveAgent: {
    web: { hotkey: "opt+cmd+e", display: "⌥⌘E" },
    desktop: { hotkey: "cmd+e", display: "⌘E" },
  },
  quickSwitchAgents: {
    web: { hotkey: "opt+ctrl+tab", display: "⌥⌃Tab" },
    desktop: { hotkey: "opt+ctrl+tab", display: "⌥⌃Tab" },
  },
  quickSwitchSubChats: {
    web: { hotkey: "ctrl+tab", display: "⌃Tab" },
    desktop: { hotkey: "ctrl+tab", display: "⌃Tab" },
  },
  preview: {
    web: { hotkey: "opt+cmd+p", display: "⌥⌘P" },
    desktop: { hotkey: "cmd+p", display: "⌘P" },
  },
  toggleSidebar: {
    web: { hotkey: "cmd+b", display: "⌘B" },
    desktop: { hotkey: "cmd+b", display: "⌘B" },
  },
  settings: {
    web: { hotkey: "cmd+comma", display: "⌘," },
    desktop: { hotkey: "cmd+comma", display: "⌘," },
  },
  invite: {
    web: { hotkey: "cmd+shift+i", display: "⌘⇧I" },
    desktop: { hotkey: "cmd+shift+i", display: "⌘⇧I" },
  },
  focusChat: {
    web: { hotkey: "cmd+d", display: "⌘D" },
    desktop: { hotkey: "cmd+d", display: "⌘D" },
  },
  shortcuts: {
    web: { hotkey: "?", display: "?" },
    desktop: { hotkey: "?", display: "?" },
  },
  terminal: {
    web: { hotkey: "cmd+j", display: "⌘J" },
    desktop: { hotkey: "cmd+j", display: "⌘J" },
  },
} as const

export type ShortcutKey = keyof typeof SHORTCUTS

/**
 * Get shortcut info for the current platform
 */
export function getShortcut(key: ShortcutKey): { hotkey: string; display: string } {
  const shortcut = SHORTCUTS[key]
  return isDesktopApp() ? shortcut.desktop : shortcut.web
}

/**
 * Get shortcut display string for the current platform
 */
export function getShortcutKey(key: ShortcutKey): string {
  return getShortcut(key).display
}

/**
 * Get hotkey string for the current platform
 */
export function getShortcutHotkey(key: ShortcutKey): string {
  return getShortcut(key).hotkey
}

/**
 * React hook to get platform-aware shortcut (re-renders on mount)
 */
export function useShortcut(key: ShortcutKey): { hotkey: string; display: string } {
  // This will be correct after hydration
  // SSR will use web variant, then client will update if desktop
  if (typeof window === "undefined") {
    return SHORTCUTS[key].web
  }
  return getShortcut(key)
}
