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
  {
    id: "builtin:ask",
    name: "ask",
    command: "/ask",
    description: "Switch to Ask mode (answer questions without code changes)",
    category: "builtin",
  },
  {
    id: "builtin:compact",
    name: "compact",
    command: "/compact",
    description: "Compact conversation context to reduce token usage",
    category: "builtin",
  },
  {
    id: "builtin:context",
    name: "context",
    command: "/context",
    description: "Show context window usage breakdown",
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
