/**
 * CCS Server Manager
 *
 * Manages the CCS (Claude Code Switch) web server as a child process.
 * Handles spawning, health checks, and graceful shutdown.
 */

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

// #NP - CCS Server Manager

export interface CCSServerStatus {
  running: boolean
  port: number | null
  pid: number | null
  startedAt: Date | null
  error: string | null
}

export interface CCSServerConfig {
  port?: number
  autoStart: boolean
}

// Server state
let serverProcess: ChildProcess | null = null
let serverPort: number | null = null
let serverStartedAt: Date | null = null
let serverError: string | null = null

/**
 * Get path to CCS entry point
 */
function getCCSPath(): string {
  const isDev = !app.isPackaged
  if (isDev) {
    // Development: use submodule directly
    return join(__dirname, "../../../../../external-tools/ccs/dist/ccs.js")
  } else {
    // Production: bundled in resources
    return join(process.resourcesPath, "external-tools/ccs/dist/ccs.js")
  }
}

/**
 * Check if CCS is available (built and ready)
 */
export function isCCSAvailable(): boolean {
  try {
    const fs = require("fs")
    return fs.existsSync(getCCSPath())
  } catch {
    return false
  }
}

/**
 * Get current server status
 */
export function getServerStatus(): CCSServerStatus {
  return {
    running: serverProcess !== null && !serverProcess.killed,
    port: serverPort,
    pid: serverProcess?.pid ?? null,
    startedAt: serverStartedAt,
    error: serverError,
  }
}

/**
 * Start CCS server
 */
export async function startServer(config?: CCSServerConfig): Promise<CCSServerStatus> {
  // Already running?
  if (serverProcess && !serverProcess.killed) {
    return getServerStatus()
  }

  // Check if CCS is available
  if (!isCCSAvailable()) {
    serverError = "CCS not found. Run 'bun run tools:init' to initialize submodules."
    return getServerStatus()
  }

  // Find available port
  const port =
    config?.port ?? (await findAvailablePort([3100, 3101, 3102, 3103, 3104]))

  const ccsPath = getCCSPath()

  try {
    console.log(`[CCS] Starting server on port ${port}...`)

    // Spawn CCS config server
    // Using node to run the compiled JS directly
    serverProcess = spawn(
      process.execPath, // Use same Node that runs Electron
      [ccsPath, "config", "--port", String(port)],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          // Don't open browser automatically
          CCS_NO_BROWSER: "1",
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
        console.log(`[CCS] ${output}`)
      }
    })

    // Handle stderr
    serverProcess.stderr?.on("data", (data) => {
      const output = data.toString().trim()
      if (output) {
        console.error(`[CCS Error] ${output}`)
      }
    })

    // Handle process exit
    serverProcess.on("exit", (code, signal) => {
      console.log(`[CCS] Server exited with code ${code}, signal ${signal}`)
      serverProcess = null
      serverPort = null
      serverStartedAt = null
      if (code !== 0 && code !== null) {
        serverError = `Server exited with code ${code}`
      }
    })

    // Handle errors
    serverProcess.on("error", (err) => {
      console.error(`[CCS] Failed to start server:`, err)
      serverError = err.message
      serverProcess = null
      serverPort = null
      serverStartedAt = null
    })

    // Wait a bit for server to start
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Check if server is still running
    if (serverProcess && !serverProcess.killed) {
      console.log(`[CCS] Server started successfully on port ${port}`)
      return getServerStatus()
    } else {
      serverError = "Server failed to start"
      return getServerStatus()
    }
  } catch (error) {
    serverError = (error as Error).message
    console.error(`[CCS] Failed to start server:`, error)
    return getServerStatus()
  }
}

/**
 * Stop CCS server
 */
export async function stopServer(): Promise<CCSServerStatus> {
  if (!serverProcess || serverProcess.killed) {
    return getServerStatus()
  }

  console.log(`[CCS] Stopping server (pid: ${serverProcess.pid})...`)

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      // Force kill if graceful shutdown takes too long
      if (serverProcess && !serverProcess.killed) {
        console.log(`[CCS] Force killing server...`)
        serverProcess.kill("SIGKILL")
      }
    }, 5000)

    serverProcess!.on("exit", () => {
      clearTimeout(timeout)
      serverProcess = null
      serverPort = null
      serverStartedAt = null
      serverError = null
      console.log(`[CCS] Server stopped`)
      resolve(getServerStatus())
    })

    // Send SIGTERM for graceful shutdown
    serverProcess!.kill("SIGTERM")
  })
}

/**
 * Restart CCS server
 */
export async function restartServer(config?: CCSServerConfig): Promise<CCSServerStatus> {
  await stopServer()
  return startServer(config)
}

/**
 * Check server health by pinging the API
 */
export async function checkHealth(): Promise<boolean> {
  if (!serverPort) return false

  try {
    const response = await fetch(`http://localhost:${serverPort}/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Get the base URL for CCS API
 */
export function getApiBaseUrl(): string | null {
  if (!serverPort) return null
  return `http://localhost:${serverPort}/api`
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
