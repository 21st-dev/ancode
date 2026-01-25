export interface TerminalStartedEvent {
  type: "started"
  cwd: string
}

export interface TerminalDataEvent {
  type: "data"
  data: string
}

export interface TerminalExitEvent {
  type: "exit"
  exitCode: number
  signal?: number
}

export type TerminalEvent = TerminalStartedEvent | TerminalDataEvent | TerminalExitEvent

export interface TerminalProps {
  paneId: string
  cwd: string
  workspaceId?: string
  tabId?: string
  initialCommands?: string[]
  initialCwd?: string
}

export interface TerminalStreamEvent {
  type: "started" | "data" | "exit"
  cwd?: string
  data?: string
  exitCode?: number
  signal?: number
}

/**
 * Represents a terminal instance in the multi-terminal system.
 * Each chat can have multiple terminal instances.
 */
export interface TerminalInstance {
  /** Unique terminal id (nanoid) */
  id: string
  /** Full paneId for TerminalManager: `${chatId}:term:${id}` */
  paneId: string
  /** Display name: "Terminal 1", "Terminal 2", etc. */
  name: string
  /** Creation timestamp */
  createdAt: number
}

/**
 * Represents a detected localhost server/port running in a terminal session
 */
export interface DetectedPort {
  port: number
  pid: number
  processName: string
  paneId: string
  workspaceId: string
  detectedAt: number
  address: string
}
