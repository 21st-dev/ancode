// Command detection and smart summary generation

export type CommandType =
  | "git"
  | "npm"
  | "yarn"
  | "bun"
  | "pnpm"
  | "node"
  | "python"
  | "docker"
  | "cargo"
  | "make"
  | "unknown"

export interface DetectedCommand {
  type: CommandType
  action?: string // "install", "add", "push", "build", etc.
  target?: string // package name, branch, file, etc.
  summary: string // Human-readable summary
}

export function detectCommand(command: string): DetectedCommand {
  // Normalize and get first actual command (skip cd, env vars, etc.)
  const normalized = command.replace(/\\\s*\n\s*/g, " ").trim()
  const parts = normalized.split(/\s*(?:&&|\|\||;)\s*/)

  for (const part of parts) {
    const tokens = part.trim().split(/\s+/)
    const cmd = tokens[0]

    // Skip navigation/setup commands
    if (["cd", "export", "source", "eval"].includes(cmd)) continue

    return parseCommand(cmd, tokens.slice(1))
  }

  return { type: "unknown", summary: truncate(command, 40) }
}

function parseCommand(cmd: string, args: string[]): DetectedCommand {
  switch (cmd) {
    case "git":
      return parseGit(args)
    case "npm":
    case "yarn":
    case "bun":
    case "pnpm":
      return parsePackageManager(cmd, args)
    case "node":
      return { type: "node", summary: `Running ${args[0] || "script"}` }
    case "python":
    case "python3":
      return { type: "python", summary: `Running ${args[0] || "script"}` }
    case "docker":
      return parseDocker(args)
    case "cargo":
      return parseCargo(args)
    case "make":
      return {
        type: "make",
        summary: args[0] ? `make ${args[0]}` : "Running make",
      }
    default:
      return {
        type: "unknown",
        summary: truncate(`${cmd} ${args.join(" ")}`, 40),
      }
  }
}

function parseGit(args: string[]): DetectedCommand {
  const action = args[0]
  switch (action) {
    case "add":
      return { type: "git", action, summary: "Staging changes" }
    case "commit":
      return { type: "git", action, summary: "Committing changes" }
    case "push":
      return {
        type: "git",
        action,
        target: args[1],
        summary: `Pushing to ${args[1] || "remote"}`,
      }
    case "pull":
      return { type: "git", action, summary: "Pulling changes" }
    case "checkout":
      return {
        type: "git",
        action,
        target: args[1],
        summary: `Checking out ${args[1] || "branch"}`,
      }
    case "branch":
      return { type: "git", action, summary: "Managing branches" }
    case "merge":
      return {
        type: "git",
        action,
        target: args[1],
        summary: `Merging ${args[1] || "branch"}`,
      }
    case "status":
      return { type: "git", action, summary: "Checking status" }
    case "diff":
      return { type: "git", action, summary: "Viewing diff" }
    case "log":
      return { type: "git", action, summary: "Viewing history" }
    case "clone":
      return { type: "git", action, summary: "Cloning repository" }
    case "fetch":
      return { type: "git", action, summary: "Fetching changes" }
    case "stash":
      return { type: "git", action, summary: "Stashing changes" }
    default:
      return { type: "git", action, summary: `git ${action || ""}`.trim() }
  }
}

function parsePackageManager(cmd: string, args: string[]): DetectedCommand {
  const action = args[0]
  const type = cmd as CommandType

  // Handle npm/yarn/bun/pnpm install/add
  if (["install", "i", "add"].includes(action)) {
    const pkg = args[1]
    if (pkg && !pkg.startsWith("-")) {
      return {
        type,
        action: "install",
        target: pkg,
        summary: `Installing ${pkg}`,
      }
    }
    return { type, action: "install", summary: "Installing dependencies" }
  }

  // Handle run scripts
  if (action === "run" || (cmd === "npm" && args[0] === "run")) {
    const script = action === "run" ? args[1] : args[0]
    return {
      type,
      action: "run",
      target: script,
      summary: `Running ${script || "script"}`,
    }
  }

  // Direct script shortcuts (npm test, npm start, bun dev)
  if (["test", "start", "dev", "build", "lint"].includes(action)) {
    return {
      type,
      action: "run",
      target: action,
      summary: `Running ${action}`,
    }
  }

  // Remove/uninstall
  if (["remove", "rm", "uninstall", "un"].includes(action)) {
    const pkg = args[1]
    return {
      type,
      action: "remove",
      target: pkg,
      summary: `Removing ${pkg || "package"}`,
    }
  }

  return { type, summary: `${cmd} ${action || ""}`.trim() }
}

function parseDocker(args: string[]): DetectedCommand {
  const action = args[0]
  switch (action) {
    case "build":
      return { type: "docker", action, summary: "Building image" }
    case "run":
      return { type: "docker", action, summary: "Starting container" }
    case "push":
      return { type: "docker", action, summary: "Pushing image" }
    case "pull":
      return { type: "docker", action, summary: "Pulling image" }
    case "compose":
      return {
        type: "docker",
        action,
        summary: `docker compose ${args[1] || ""}`.trim(),
      }
    default:
      return { type: "docker", summary: `docker ${action || ""}`.trim() }
  }
}

function parseCargo(args: string[]): DetectedCommand {
  const action = args[0]
  switch (action) {
    case "build":
      return { type: "cargo", action, summary: "Building project" }
    case "run":
      return { type: "cargo", action, summary: "Running project" }
    case "test":
      return { type: "cargo", action, summary: "Running tests" }
    case "add":
      return {
        type: "cargo",
        action,
        target: args[1],
        summary: `Adding ${args[1] || "crate"}`,
      }
    default:
      return { type: "cargo", summary: `cargo ${action || ""}`.trim() }
  }
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len - 3) + "..." : str
}
