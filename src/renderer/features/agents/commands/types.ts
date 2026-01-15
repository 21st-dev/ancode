/**
 * Slash command types for agent chat
 */

export type SlashCommandCategory =
  | "builtin"
  | "mcp"
  | "cli"
  | "ssh"
  | "repos"
  | "repository"

export interface SlashCommand {
  id: string
  name: string // Display name without slash, e.g. "clear", "help"
  description: string
  category: SlashCommandCategory
  // For repository commands - the prompt content from .md file
  prompt?: string
  // For repository commands - path to the .md file
  path?: string
  // For repository commands - the repository name
  repository?: string
}

export interface SlashCommandOption extends SlashCommand {
  // Full command string for display, e.g. "/clear"
  command: string
}

// Trigger payload for slash command dropdown
export interface SlashTriggerPayload {
  searchText: string
  rect: DOMRect
}

// Builtin command action handlers
export type BuiltinCommandAction =
  | { type: "clear" }
  | { type: "plan" }
  | { type: "agent" }
  // Prompt-based commands (send to agent)
  | { type: "review" }
  | { type: "pr-comments" }
  | { type: "release-notes" }
  | { type: "security-review" }
  // MCP tool commands
  | { type: "mcp-list" }
  | { type: "mcp-run"; tool?: string }
  // CLI tool commands
  | { type: "cli-bash" }
  | { type: "cli-git" }
  | { type: "cli-npm" }
  // SSH commands
  | { type: "ssh-connect"; host?: string }
  | { type: "ssh-tower" }
  // Repo commands
  | { type: "repo-status" }
  | { type: "repo-diff" }
  | { type: "repo-commit" }

// Result of selecting a slash command
export type SlashCommandSelection =
  | { category: "builtin"; action: BuiltinCommandAction }
  | { category: "repository"; prompt: string; name: string }
