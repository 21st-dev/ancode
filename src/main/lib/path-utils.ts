import * as os from "os"

/**
 * Expand environment variables in a path string
 * Supports: $VAR, ${VAR}, and ~ for home directory
 *
 * Examples:
 *   "$HOME/.worktrees" → "/Users/jdeland/.worktrees"
 *   "${VIDYARD_PATH}/worktrees" → "/Users/jdeland/dev/vidyard/worktrees"
 *   "~/my-worktrees" → "/Users/jdeland/my-worktrees"
 *   "/absolute/path" → "/absolute/path" (unchanged)
 *
 * @param path - Path string that may contain environment variables
 * @returns Expanded path with environment variables replaced
 */
export function expandEnvVars(path: string): string {
  if (!path) return path

  let expanded = path

  // Replace $VAR and ${VAR} patterns
  const env = process.env
  for (const [key, value] of Object.entries(env)) {
    if (value) {
      // Match ${VAR} (braced syntax)
      const regex1 = new RegExp(`\\$\\{${key}\\}`, "g")
      expanded = expanded.replace(regex1, value)

      // Match $VAR (unbraced, but not followed by alphanumeric or _)
      const regex2 = new RegExp(`\\$${key}(?![a-zA-Z0-9_])`, "g")
      expanded = expanded.replace(regex2, value)
    }
  }

  // Handle ~ for HOME directory
  if (expanded.startsWith("~/")) {
    const home = env.HOME || os.homedir()
    expanded = expanded.replace(/^~/, home)
  } else if (expanded === "~") {
    expanded = env.HOME || os.homedir()
  }

  return expanded
}
