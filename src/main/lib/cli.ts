/**
 * CLI command support for 1code
 * Allows users to open 1code from terminal with: 1code . or 1code /path/to/project
 *
 * Based on PR #16 by @caffeinum (Aleksey Bykhun)
 * https://github.com/21st-dev/1code/pull/16
 */

import { app } from "electron"
import { join } from "path"
import { existsSync, lstatSync, readlinkSync } from "fs"

// Launch directory from CLI (e.g., `1code /path/to/project`)
let launchDirectory: string | null = null

/**
 * Get the launch directory passed via CLI args (consumed once)
 */
export function getLaunchDirectory(): string | null {
  const dir = launchDirectory
  launchDirectory = null // consume once
  return dir
}

/**
 * Parse CLI arguments to find a directory argument
 * Called on app startup to handle `1code .` or `1code /path/to/project`
 */
export function parseLaunchDirectory(): void {
  // Look for a directory argument in argv
  // Skip electron executable and script path
  const args = process.argv.slice(process.defaultApp ? 2 : 1)

  for (const arg of args) {
    // Skip flags and protocol URLs
    if (arg.startsWith("-") || arg.includes("://")) continue

    // Check if it's a valid directory
    if (existsSync(arg)) {
      try {
        const stat = lstatSync(arg)
        if (stat.isDirectory()) {
          console.log("[CLI] Launch directory:", arg)
          launchDirectory = arg
          return
        }
      } catch {
        // ignore
      }
    }
  }
}

// CLI command installation paths
const CLI_INSTALL_PATH = "/usr/local/bin/1code"

function getCliSourcePath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, "cli", "1code")
  }
  return join(__dirname, "..", "..", "resources", "cli", "1code")
}

/**
 * Check if the CLI command is installed
 */
export function isCliInstalled(): boolean {
  try {
    if (!existsSync(CLI_INSTALL_PATH)) return false
    const stat = lstatSync(CLI_INSTALL_PATH)
    if (!stat.isSymbolicLink()) return false
    const target = readlinkSync(CLI_INSTALL_PATH)
    return target === getCliSourcePath()
  } catch {
    return false
  }
}

/**
 * Install the CLI command to /usr/local/bin/1code
 * Requires admin privileges on macOS
 */
export async function installCli(): Promise<{ success: boolean; error?: string }> {
  const { exec } = await import("child_process")
  const { promisify } = await import("util")
  const execAsync = promisify(exec)

  const sourcePath = getCliSourcePath()

  if (!existsSync(sourcePath)) {
    return { success: false, error: "CLI script not found in app bundle" }
  }

  try {
    // Remove existing if present
    if (existsSync(CLI_INSTALL_PATH)) {
      await execAsync(
        `osascript -e 'do shell script "rm -f ${CLI_INSTALL_PATH}" with administrator privileges'`,
      )
    }

    // Create symlink with admin privileges
    await execAsync(
      `osascript -e 'do shell script "ln -s \\"${sourcePath}\\" ${CLI_INSTALL_PATH}" with administrator privileges'`,
    )

    console.log("[CLI] Installed 1code command to", CLI_INSTALL_PATH)
    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Installation failed"
    console.error("[CLI] Failed to install:", error)
    return { success: false, error: errorMessage }
  }
}

/**
 * Uninstall the CLI command from /usr/local/bin/1code
 * Requires admin privileges on macOS
 */
export async function uninstallCli(): Promise<{ success: boolean; error?: string }> {
  const { exec } = await import("child_process")
  const { promisify } = await import("util")
  const execAsync = promisify(exec)

  try {
    if (existsSync(CLI_INSTALL_PATH)) {
      await execAsync(
        `osascript -e 'do shell script "rm -f ${CLI_INSTALL_PATH}" with administrator privileges'`,
      )
    }
    console.log("[CLI] Uninstalled 1code command")
    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Uninstallation failed"
    console.error("[CLI] Failed to uninstall:", error)
    return { success: false, error: errorMessage }
  }
}
