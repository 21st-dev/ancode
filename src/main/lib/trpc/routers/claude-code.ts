import { z } from "zod"
import { shell, safeStorage } from "electron"
import { spawn, execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { router, publicProcedure } from "../index"
import { getDatabase, claudeCodeCredentials } from "../../db"
import { eq } from "drizzle-orm"
import { getBundledClaudeBinaryPath, buildClaudeEnv } from "../../claude/env"

/**
 * Check if user is logged into Claude Code CLI
 * Looks for credentials in ~/.claude/ directory
 */
function checkClaudeLoginStatus(): { isLoggedIn: boolean; email?: string; error?: string } {
  try {
    const claudeDir = path.join(os.homedir(), ".claude")

    // Check if .claude directory exists
    if (!fs.existsSync(claudeDir)) {
      console.log("[ClaudeCode] ~/.claude directory not found")
      return { isLoggedIn: false }
    }

    // Check for credentials file or settings that indicate login
    // Claude stores auth state in different locations depending on version
    const credentialsPath = path.join(claudeDir, ".credentials.json")
    const settingsPath = path.join(claudeDir, "settings.json")

    // Try to detect login via credentials file
    if (fs.existsSync(credentialsPath)) {
      try {
        const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"))
        if (credentials.claudeAiOauth?.accessToken || credentials.claudeAiOauth?.refreshToken) {
          console.log("[ClaudeCode] Found OAuth credentials - logged in")
          return {
            isLoggedIn: true,
            email: credentials.claudeAiOauth?.email || undefined
          }
        }
      } catch (e) {
        console.log("[ClaudeCode] Error reading credentials file:", e)
      }
    }

    // Alternative: run `claude --version` or similar to verify binary works
    // If it runs without auth error, we're good
    try {
      const binaryPath = getBundledClaudeBinaryPath()
      if (fs.existsSync(binaryPath)) {
        const env = buildClaudeEnv()
        const result = execSync(`"${binaryPath}" --version`, {
          encoding: "utf-8",
          timeout: 5000,
          env,
          stdio: ["ignore", "pipe", "pipe"]
        })
        console.log("[ClaudeCode] CLI version check passed:", result.trim())
        // If version check works, assume CLI is properly set up
        // User may still need to login but the CLI is functioning
        return { isLoggedIn: fs.existsSync(credentialsPath), email: undefined }
      }
    } catch (versionError) {
      console.log("[ClaudeCode] CLI version check error:", versionError)
    }

    return { isLoggedIn: false }
  } catch (error) {
    console.error("[ClaudeCode] Error checking login status:", error)
    return { isLoggedIn: false, error: String(error) }
  }
}

/**
 * Claude Code router - uses bundled CLI for authentication
 */
export const claudeCodeRouter = router({
  /**
   * Check if user is logged into Claude Code CLI
   */
  getLoginStatus: publicProcedure.query(() => {
    const status = checkClaudeLoginStatus()
    console.log("[ClaudeCode] getLoginStatus:", status)
    return status
  }),

  /**
   * Legacy: Check if user has Claude Code connected
   * Kept for API compatibility with old UI code
   */
  getIntegration: publicProcedure.query(() => {
    const status = checkClaudeLoginStatus()
    return {
      isConnected: status.isLoggedIn,
      connectedAt: status.isLoggedIn ? new Date().toISOString() : null,
      email: status.email,
    }
  }),

  /**
   * Start login flow using bundled Claude CLI
   * Opens browser for OAuth authentication
   */
  login: publicProcedure.mutation(async () => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      try {
        const binaryPath = getBundledClaudeBinaryPath()

        if (!fs.existsSync(binaryPath)) {
          console.error("[ClaudeCode] Bundled binary not found at:", binaryPath)
          resolve({ success: false, error: "Claude CLI binary not found" })
          return
        }

        console.log("[ClaudeCode] Starting login with binary:", binaryPath)

        const env = buildClaudeEnv()

        // Spawn claude login process
        const loginProcess = spawn(binaryPath, ["login"], {
          env,
          stdio: ["inherit", "pipe", "pipe"],
          detached: false,
        })

        let stdout = ""
        let stderr = ""

        loginProcess.stdout?.on("data", (data) => {
          const text = data.toString()
          stdout += text
          console.log("[ClaudeCode] login stdout:", text.trim())
        })

        loginProcess.stderr?.on("data", (data) => {
          const text = data.toString()
          stderr += text
          console.log("[ClaudeCode] login stderr:", text.trim())
        })

        loginProcess.on("close", (code) => {
          console.log("[ClaudeCode] login process exited with code:", code)
          if (code === 0) {
            resolve({ success: true })
          } else {
            resolve({
              success: false,
              error: stderr || stdout || `Process exited with code ${code}`
            })
          }
        })

        loginProcess.on("error", (error) => {
          console.error("[ClaudeCode] login process error:", error)
          resolve({ success: false, error: error.message })
        })

        // Set a timeout (login can take a while as user goes through OAuth)
        setTimeout(() => {
          // Don't kill the process - just resolve as pending
          // The user is probably in the middle of OAuth
          resolve({ success: true })
        }, 60000) // 60 second timeout

      } catch (error) {
        console.error("[ClaudeCode] login error:", error)
        resolve({ success: false, error: String(error) })
      }
    })
  }),

  /**
   * Logout from Claude Code CLI
   */
  logout: publicProcedure.mutation(async () => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      try {
        const binaryPath = getBundledClaudeBinaryPath()

        if (!fs.existsSync(binaryPath)) {
          console.error("[ClaudeCode] Bundled binary not found at:", binaryPath)
          resolve({ success: false, error: "Claude CLI binary not found" })
          return
        }

        console.log("[ClaudeCode] Starting logout with binary:", binaryPath)

        const env = buildClaudeEnv()

        // Spawn claude logout process
        const logoutProcess = spawn(binaryPath, ["logout"], {
          env,
          stdio: ["inherit", "pipe", "pipe"],
          detached: false,
        })

        let stdout = ""
        let stderr = ""

        logoutProcess.stdout?.on("data", (data) => {
          const text = data.toString()
          stdout += text
          console.log("[ClaudeCode] logout stdout:", text.trim())
        })

        logoutProcess.stderr?.on("data", (data) => {
          const text = data.toString()
          stderr += text
          console.log("[ClaudeCode] logout stderr:", text.trim())
        })

        logoutProcess.on("close", (code) => {
          console.log("[ClaudeCode] logout process exited with code:", code)
          if (code === 0) {
            resolve({ success: true })
          } else {
            resolve({
              success: false,
              error: stderr || stdout || `Process exited with code ${code}`
            })
          }
        })

        logoutProcess.on("error", (error) => {
          console.error("[ClaudeCode] logout process error:", error)
          resolve({ success: false, error: error.message })
        })

        // Set a timeout
        setTimeout(() => {
          resolve({ success: false, error: "Logout timed out" })
        }, 10000) // 10 second timeout

      } catch (error) {
        console.error("[ClaudeCode] logout error:", error)
        resolve({ success: false, error: String(error) })
      }
    })
  }),

  /**
   * Legacy stubs for API compatibility
   */
  startAuth: publicProcedure.mutation(async () => {
    console.log("[ClaudeCode] startAuth called - use login instead")
    return {
      sandboxId: "bundled-cli",
      sandboxUrl: "",
      sessionId: "bundled",
    }
  }),

  pollStatus: publicProcedure
    .input(
      z.object({
        sandboxUrl: z.string(),
        sessionId: z.string(),
      })
    )
    .query(async () => {
      return {
        state: "success" as const,
        oauthUrl: null,
        error: null,
      }
    }),

  submitCode: publicProcedure
    .input(
      z.object({
        sandboxUrl: z.string(),
        sessionId: z.string(),
        code: z.string().min(1),
      })
    )
    .mutation(async () => {
      return { success: true }
    }),

  getToken: publicProcedure.query(() => {
    return { token: null, error: null }
  }),

  disconnect: publicProcedure.mutation(async () => {
    // Call the actual logout
    const binaryPath = getBundledClaudeBinaryPath()
    if (fs.existsSync(binaryPath)) {
      try {
        const env = buildClaudeEnv()
        execSync(`"${binaryPath}" logout`, { env, timeout: 10000 })
        return { success: true }
      } catch (e) {
        console.error("[ClaudeCode] disconnect error:", e)
      }
    }
    return { success: true }
  }),

  openOAuthUrl: publicProcedure
    .input(z.string())
    .mutation(async ({ input: url }) => {
      await shell.openExternal(url)
      return { success: true }
    }),
})
