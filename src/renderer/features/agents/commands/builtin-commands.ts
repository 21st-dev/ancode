import type { BuiltinCommandAction, SlashCommandOption } from "./types"

/**
 * Prompt texts for prompt-based slash commands
 */
export const COMMAND_PROMPTS: Partial<
  Record<BuiltinCommandAction["type"], string>
> = {
  review:
    "Please review the code in the current context and provide feedback on code quality, potential bugs, and improvements.",
  "pr-comments":
    "Generate detailed PR review comments for the changes in the current context.",
  "release-notes":
    "Generate release notes summarizing the changes in this codebase.",
  "security-review":
    "Perform a security audit of the code in the current context. Identify vulnerabilities, security risks, and suggest fixes.",
}

/**
 * Check if a command is a prompt-based command
 */
export function isPromptCommand(
  type: BuiltinCommandAction["type"],
): type is "review" | "pr-comments" | "release-notes" | "security-review" {
  return type in COMMAND_PROMPTS
}

/**
 * Built-in slash commands that are handled client-side
 */
export const BUILTIN_SLASH_COMMANDS: SlashCommandOption[] = [
  // Core commands
  {
    id: "builtin:clear",
    name: "clear",
    command: "/clear",
    description: "Start a new conversation (creates new sub-chat)",
    category: "builtin",
  },
  {
    id: "builtin:plan",
    name: "plan",
    command: "/plan",
    description: "Switch to Plan mode (creates plan before making changes)",
    category: "builtin",
  },
  {
    id: "builtin:agent",
    name: "agent",
    command: "/agent",
    description: "Switch to Agent mode (applies changes directly)",
    category: "builtin",
  },
  // Prompt-based commands
  {
    id: "builtin:review",
    name: "review",
    command: "/review",
    description: "Ask agent to review your code",
    category: "builtin",
  },
  {
    id: "builtin:pr-comments",
    name: "pr-comments",
    command: "/pr-comments",
    description: "Ask agent to generate PR review comments",
    category: "builtin",
  },
  {
    id: "builtin:release-notes",
    name: "release-notes",
    command: "/release-notes",
    description: "Ask agent to generate release notes",
    category: "builtin",
  },
  {
    id: "builtin:security-review",
    name: "security-review",
    command: "/security-review",
    description: "Ask agent to perform a security audit",
    category: "builtin",
  },
]

/**
 * MCP tool commands
 */
export const MCP_SLASH_COMMANDS: SlashCommandOption[] = [
  {
    id: "mcp:list",
    name: "mcp",
    command: "/mcp",
    description: "List available MCP tools and servers",
    category: "mcp",
  },
  {
    id: "mcp:sosumi",
    name: "sosumi",
    command: "/sosumi",
    description: "Search Apple documentation via Sosumi",
    category: "mcp",
  },
  {
    id: "mcp:memory",
    name: "memory",
    command: "/memory",
    description: "Access persistent memory via Omi",
    category: "mcp",
  },
  {
    id: "mcp:browser",
    name: "browser",
    command: "/browser",
    description: "Control Chrome via Claude-in-Chrome",
    category: "mcp",
  },
]

/**
 * CLI tool commands
 */
export const CLI_SLASH_COMMANDS: SlashCommandOption[] = [
  {
    id: "cli:bash",
    name: "bash",
    command: "/bash",
    description: "Execute a bash command",
    category: "cli",
  },
  {
    id: "cli:git",
    name: "git",
    command: "/git",
    description: "Run git commands",
    category: "cli",
  },
  {
    id: "cli:npm",
    name: "npm",
    command: "/npm",
    description: "Run npm/bun commands",
    category: "cli",
  },
  {
    id: "cli:xcode",
    name: "xcode",
    command: "/xcode",
    description: "Run xcodebuild commands",
    category: "cli",
  },
]

/**
 * SSH commands for BRAIN network
 */
export const SSH_SLASH_COMMANDS: SlashCommandOption[] = [
  {
    id: "ssh:tower",
    name: "tower",
    command: "/tower",
    description: "Connect to tower (Unraid server)",
    category: "ssh",
  },
  {
    id: "ssh:office",
    name: "office",
    command: "/office",
    description: "Connect to office-pc",
    category: "ssh",
  },
  {
    id: "ssh:deck",
    name: "deck",
    command: "/deck",
    description: "Connect to Steam Deck",
    category: "ssh",
  },
]

/**
 * Repository commands
 */
export const REPOS_SLASH_COMMANDS: SlashCommandOption[] = [
  {
    id: "repos:status",
    name: "status",
    command: "/status",
    description: "Show git status for current project",
    category: "repos",
  },
  {
    id: "repos:diff",
    name: "diff",
    command: "/diff",
    description: "Show uncommitted changes",
    category: "repos",
  },
  {
    id: "repos:commit",
    name: "commit",
    command: "/commit",
    description: "Create a commit with generated message",
    category: "repos",
  },
  {
    id: "repos:pr",
    name: "pr",
    command: "/pr",
    description: "Create a pull request",
    category: "repos",
  },
]

/**
 * All slash commands combined
 */
export const ALL_SLASH_COMMANDS: SlashCommandOption[] = [
  ...BUILTIN_SLASH_COMMANDS,
  ...MCP_SLASH_COMMANDS,
  ...CLI_SLASH_COMMANDS,
  ...SSH_SLASH_COMMANDS,
  ...REPOS_SLASH_COMMANDS,
]

/**
 * Filter builtin commands by search text
 */
export function filterBuiltinCommands(
  searchText: string,
): SlashCommandOption[] {
  if (!searchText) return BUILTIN_SLASH_COMMANDS

  const query = searchText.toLowerCase()
  return BUILTIN_SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(query) ||
      cmd.description.toLowerCase().includes(query),
  )
}

/**
 * Filter all commands by search text
 */
export function filterAllCommands(
  searchText: string,
): SlashCommandOption[] {
  if (!searchText) return ALL_SLASH_COMMANDS

  const query = searchText.toLowerCase()
  return ALL_SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(query) ||
      cmd.description.toLowerCase().includes(query),
  )
}

/**
 * Get commands by category
 */
export function getCommandsByCategory(
  commands: SlashCommandOption[],
  category: SlashCommandOption["category"],
): SlashCommandOption[] {
  return commands.filter((cmd) => cmd.category === category)
}

/**
 * Category display names and order
 */
export const CATEGORY_CONFIG: Record<
  SlashCommandOption["category"],
  { label: string; order: number }
> = {
  builtin: { label: "Commands", order: 0 },
  mcp: { label: "MCP Tools", order: 1 },
  cli: { label: "CLI Tools", order: 2 },
  ssh: { label: "SSH", order: 3 },
  repos: { label: "Repository", order: 4 },
  repository: { label: "From repository", order: 5 },
}
