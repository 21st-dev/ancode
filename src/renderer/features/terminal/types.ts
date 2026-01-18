export interface TerminalDataEvent {
  type: "data"
  data: string
}

export interface TerminalExitEvent {
  type: "exit"
  exitCode: number
  signal?: number
}

export type TerminalEvent = TerminalDataEvent | TerminalExitEvent

export interface TerminalProps {
  paneId: string
  cwd: string
  workspaceId?: string
  tabId?: string
  initialCommands?: string[]
  initialCwd?: string
  /** Terminal instance metadata (for Claude Code session sync) */
  terminalInstance?: TerminalInstance
}

export interface TerminalStreamEvent {
  type: "data" | "exit"
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
  /** True if this is a Claude Code CLI terminal (for session sync) */
  isClaudeCode?: boolean
  /** SubChat ID for syncing CLI messages back to database */
  subChatId?: string
  /** Session ID for CLI resume */
  sessionId?: string
}
