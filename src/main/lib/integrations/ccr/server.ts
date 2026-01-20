/**
 * CCR Server Manager
 *
 * Manages the CCR (Claude Code Router) server as a child process.
 * Handles spawning, health checks, and graceful shutdown.
 */

// #NP - CCR Server Manager

import { spawn, ChildProcess } from "child_process"
import { join } from "path"
import { createServer } from "net"
import { app } from "electron"

/**
 * Find an available port from a list of candidates
 */
async function findAvailablePort(ports: number[]): Promise<number> {
  for (const port of ports) {
    const isAvailable = await checkPortAvailable(port)
    if (isAvailable) return port
  }
  // Fallback to a random port
  return findRandomPort()
}

function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
    server.unref()
    server.on("error", () => resolve(false))
    server.listen(port, "127.0.0.1", () => {
      server.close(() => resolve(true))
    })
  })
}

function findRandomPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.on("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address()
      const port = typeof addr === "object" && addr ? addr.port : 0
      server.close(() => resolve(port))
    })
  })
}

export interface CCRServerStatus {
  running: boolean
  port: number | null
  pid: number | null
  startedAt: Date | null
  error: string | null
}

export interface CCRServerConfig {
  port?: number
  autoStart: boolean
  apiKey?: string
}

// Server state
let serverProcess: ChildProcess | null = null
let serverPort: number | null = null
let serverStartedAt: Date | null = null
let serverError: string | null = null
let serverApiKey: string | null = null

/**
 * Get path to CCR entry point
 */
function getCCRPath(): string {
  const isDev = !app.isPackaged
  if (isDev) {
    // Development: use submodule directly
    return join(__dirname, "../../../../../external-tools/claude-code-router/dist/cli.js")
  } else {
    // Production: bundled in resources
    return join(process.resourcesPath, "external-tools/claude-code-router/dist/cli.js")
  }
}

/**
 * Check if CCR is available (built and ready)
 */
export function isCCRAvailable(): boolean {
  try {
    const fs = require("fs")
    return fs.existsSync(getCCRPath())
  } catch {
    return false
  }
}

/**
 * Get current server status
 */
export function getServerStatus(): CCRServerStatus {
  return {
    running: serverProcess !== null && !serverProcess.killed,
    port: serverPort,
    pid: serverProcess?.pid ?? null,
    startedAt: serverStartedAt,
    error: serverError,
  }
}

/**
 * Start CCR server
 */
export async function startServer(config?: CCRServerConfig): Promise<CCRServerStatus> {
  // Already running?
  if (serverProcess && !serverProcess.killed) {
    return getServerStatus()
  }

  // Check if CCR is available
  if (!isCCRAvailable()) {
    serverError = "CCR not found. Run 'bun run tools:init' to initialize submodules."
    return getServerStatus()
  }

  // Find available port (CCR uses 3200-3204 range by default)
  const port =
    config?.port ?? (await findAvailablePort([3200, 3201, 3202, 3203, 3204]))

  const ccrPath = getCCRPath()

  // Generate API key for this session if not provided
  const apiKey = config?.apiKey ?? generateApiKey()
  serverApiKey = apiKey

  try {
    console.log(`[CCR] Starting server on port ${port}...`)

    // Spawn CCR server
    // CCR uses: ccr start --port <port> --apikey <key>
    serverProcess = spawn(
      process.execPath, // Use same Node that runs Electron
      [ccrPath, "start", "--port", String(port), "--apikey", apiKey],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          // Don't open browser automatically
          CCR_NO_BROWSER: "1",
        },
        detached: false,
      }
    )

    serverPort = port
    serverStartedAt = new Date()
    serverError = null

    // Handle stdout
    serverProcess.stdout?.on("data", (data) => {
      const output = data.toString().trim()
      if (output) {
        console.log(`[CCR] ${output}`)
      }
    })

    // Handle stderr
    serverProcess.stderr?.on("data", (data) => {
      const output = data.toString().trim()
      if (output) {
        console.error(`[CCR Error] ${output}`)
      }
    })

    // Handle process exit
    serverProcess.on("exit", (code, signal) => {
      console.log(`[CCR] Server exited with code ${code}, signal ${signal}`)
      serverProcess = null
      serverPort = null
      serverStartedAt = null
      serverApiKey = null
      if (code !== 0 && code !== null) {
        serverError = `Server exited with code ${code}`
      }
    })

    // Handle errors
    serverProcess.on("error", (err) => {
      console.error(`[CCR] Failed to start server:`, err)
      serverError = err.message
      serverProcess = null
      serverPort = null
      serverStartedAt = null
      serverApiKey = null
    })

    // Wait a bit for server to start
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Check if server is still running
    if (serverProcess && !serverProcess.killed) {
      console.log(`[CCR] Server started successfully on port ${port}`)
      return getServerStatus()
    } else {
      serverError = "Server failed to start"
      return getServerStatus()
    }
  } catch (error) {
    serverError = (error as Error).message
    console.error(`[CCR] Failed to start server:`, error)
    return getServerStatus()
  }
}

/**
 * Stop CCR server
 */
export async function stopServer(): Promise<CCRServerStatus> {
  if (!serverProcess || serverProcess.killed) {
    return getServerStatus()
  }

  console.log(`[CCR] Stopping server (pid: ${serverProcess.pid})...`)

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      // Force kill if graceful shutdown takes too long
      if (serverProcess && !serverProcess.killed) {
        console.log(`[CCR] Force killing server...`)
        serverProcess.kill("SIGKILL")
      }
    }, 5000)

    serverProcess!.on("exit", () => {
      clearTimeout(timeout)
      serverProcess = null
      serverPort = null
      serverStartedAt = null
      serverApiKey = null
      serverError = null
      console.log(`[CCR] Server stopped`)
      resolve(getServerStatus())
    })

    // Send SIGTERM for graceful shutdown
    serverProcess!.kill("SIGTERM")
  })
}

/**
 * Restart CCR server
 */
export async function restartServer(config?: CCRServerConfig): Promise<CCRServerStatus> {
  await stopServer()
  return startServer(config)
}

/**
 * Check server health by pinging the API
 */
export async function checkHealth(): Promise<boolean> {
  if (!serverPort) return false

  try {
    const headers: Record<string, string> = {}
    if (serverApiKey) {
      headers["X-API-Key"] = serverApiKey
    }

    const response = await fetch(`http://localhost:${serverPort}/health`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(2000),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Get the base URL for CCR API
 */
export function getApiBaseUrl(): string | null {
  if (!serverPort) return null
  return `http://localhost:${serverPort}`
}

/**
 * Get the API key for CCR server
 */
export function getApiKey(): string | null {
  return serverApiKey
}

/**
 * Cleanup on app quit
 */
export function cleanup(): void {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGTERM")
    serverProcess = null
  }
}

/**
 * Generate a random API key for the CCR session
 */
function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = "ccr_"
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
