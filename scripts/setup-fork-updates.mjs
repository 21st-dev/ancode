#!/usr/bin/env node

/**
 * Setup script to configure your fork for auto-updates
 *
 * This script configures the app to check your fork's GitHub Releases
 * instead of the official CDN.
 *
 * Usage:
 *   bun run setup:fork <github-username>
 *   node scripts/setup-fork-updates.mjs <github-username>
 *
 * Example:
 *   bun run setup:fork johndoe
 *   # This sets up updates from github.com/johndoe/1code
 */

import * as fs from "fs"
import * as path from "path"
import * as os from "os"

const args = process.argv.slice(2)

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log(`
Setup Fork Auto-Updates
=======================

Configure the app to receive updates from your fork's GitHub Releases.

Usage:
  bun run setup:fork <github-username> [repo-name]

Arguments:
  github-username   Your GitHub username
  repo-name         Repository name (default: "1code")

Examples:
  bun run setup:fork johndoe
  bun run setup:fork johndoe my-1code-fork

This creates a config file at:
  ~/Library/Application Support/1Code/update-config.json (macOS)
  %APPDATA%/1Code/update-config.json (Windows)
  ~/.config/1Code/update-config.json (Linux)

To revert to official updates:
  bun run setup:fork --cdn
`)
  process.exit(0)
}

// Determine user data path based on platform
// Note: Electron uses the "name" field from package.json for userData path
function getUserDataPath() {
  const appName = "21st-desktop"  // Must match package.json "name" field

  switch (process.platform) {
    case "darwin":
      return path.join(os.homedir(), "Library", "Application Support", appName)
    case "win32":
      return path.join(process.env.APPDATA || "", appName)
    default:
      return path.join(os.homedir(), ".config", appName)
  }
}

const userDataPath = getUserDataPath()
const configPath = path.join(userDataPath, "update-config.json")

// Revert to CDN
if (args[0] === "--cdn") {
  const config = { source: "cdn" }
  fs.mkdirSync(userDataPath, { recursive: true })
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  console.log("✓ Configured to use official CDN updates")
  console.log(`  Config saved to: ${configPath}`)
  process.exit(0)
}

// Set up GitHub fork
const username = args[0]
const repoName = args[1] || "1code"
const githubRepo = `${username}/${repoName}`

const config = {
  source: "github",
  githubRepo,
}

// Ensure directory exists
fs.mkdirSync(userDataPath, { recursive: true })

// Write config
fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

console.log(`
✓ Configured to use GitHub Releases from: ${githubRepo}

Config saved to: ${configPath}

Next steps:
1. Fork the repo: https://github.com/21st-dev/1code
2. Enable GitHub Actions in your fork
3. Push or manually trigger the build workflow
4. Restart the app to apply the new update source

The app will now check for updates at:
https://github.com/${githubRepo}/releases
`)
