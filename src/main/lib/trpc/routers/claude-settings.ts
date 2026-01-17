import fs from "node:fs/promises"
import path from "node:path"
import os from "node:os"
import { safeStorage } from "electron"
import { z } from "zod"
import { router, publicProcedure } from "../index"
import { getDatabase, claudeCodeSettings } from "../../db"
import { eq } from "drizzle-orm"

/**
 * Parse JSON safely with fallback
 */
function parseJsonSafely<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

/**
 * Encrypt API key using Electron's safeStorage
 */
function encryptApiKey(key: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn("[claude-settings] Encryption not available, storing as base64")
    return Buffer.from(key).toString("base64")
  }
  return safeStorage.encryptString(key).toString("base64")
}

/**
 * Decrypt API key using Electron's safeStorage
 */
function decryptApiKey(encrypted: string): string | null {
  if (!encrypted) return null
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return Buffer.from(encrypted, "base64").toString("utf-8")
    }
    const buffer = Buffer.from(encrypted, "base64")
    return safeStorage.decryptString(buffer)
  } catch (error) {
    console.error("[claude-settings] Failed to decrypt API key:", error)
    return null
  }
}

export const claudeSettingsRouter = router({
  /**
   * Get Claude Code settings (always returns a record, creates default if missing)
   */
  getSettings: publicProcedure.query(() => {
    const db = getDatabase()
    let settings = db
      .select()
      .from(claudeCodeSettings)
      .where(eq(claudeCodeSettings.id, "default"))
      .get()

    // Create default settings if not exist
    if (!settings) {
      db.insert(claudeCodeSettings)
        .values({
          id: "default",
          customBinaryPath: null,
          customEnvVars: "{}",
          customConfigDir: null,
          mcpServerSettings: "{}",
          authMode: "oauth",
          bedrockRegion: "us-east-1",
        })
        .run()
      settings = {
        id: "default",
        customBinaryPath: null,
        customEnvVars: "{}",
        customConfigDir: null,
        mcpServerSettings: "{}",
        authMode: "oauth",
        apiKey: null,
        bedrockRegion: "us-east-1",
        updatedAt: new Date(),
      }
    }

    return {
      customBinaryPath: settings.customBinaryPath,
      customEnvVars: parseJsonSafely<Record<string, string>>(
        settings.customEnvVars,
        {}
      ),
      customConfigDir: settings.customConfigDir,
      mcpServerSettings: parseJsonSafely<Record<string, { enabled: boolean }>>(
        settings.mcpServerSettings ?? "{}",
        {}
      ),
      authMode: (settings.authMode || "oauth") as "oauth" | "aws" | "apiKey",
      apiKey: settings.apiKey ? "••••••••" : null, // Masked for UI
      bedrockRegion: settings.bedrockRegion || "us-east-1",
    }
  }),

  /**
   * Update Claude Code settings
   */
  updateSettings: publicProcedure
    .input(
      z.object({
        customBinaryPath: z.string().nullable().optional(),
        customEnvVars: z.record(z.string(), z.string()).optional(),
        customConfigDir: z.string().nullable().optional(),
        mcpServerSettings: z.record(z.string(), z.object({ enabled: z.boolean() })).optional(),
        authMode: z.enum(["oauth", "aws", "apiKey"]).optional(),
        apiKey: z.string().optional(), // API key for apiKey mode
        bedrockRegion: z.string().optional(), // AWS region for Bedrock
      })
    )
    .mutation(({ input }) => {
      const db = getDatabase()

      // Check if settings exist
      const existing = db
        .select()
        .from(claudeCodeSettings)
        .where(eq(claudeCodeSettings.id, "default"))
        .get()

      if (existing) {
        // Update existing
        db.update(claudeCodeSettings)
          .set({
            ...(input.customBinaryPath !== undefined && {
              customBinaryPath: input.customBinaryPath,
            }),
            ...(input.customEnvVars !== undefined && {
              customEnvVars: JSON.stringify(input.customEnvVars),
            }),
            ...(input.customConfigDir !== undefined && {
              customConfigDir: input.customConfigDir,
            }),
            ...(input.mcpServerSettings !== undefined && {
              mcpServerSettings: JSON.stringify(input.mcpServerSettings),
            }),
            ...(input.authMode !== undefined && {
              authMode: input.authMode,
            }),
            ...(input.apiKey !== undefined && input.authMode === "apiKey" && {
              apiKey: encryptApiKey(input.apiKey),
            }),
            ...(input.bedrockRegion !== undefined && {
              bedrockRegion: input.bedrockRegion,
            }),
            updatedAt: new Date(),
          })
          .where(eq(claudeCodeSettings.id, "default"))
          .run()
      } else {
        // Insert new
        db.insert(claudeCodeSettings)
          .values({
            id: "default",
            customBinaryPath: input.customBinaryPath ?? null,
            customEnvVars: JSON.stringify(input.customEnvVars ?? {}),
            customConfigDir: input.customConfigDir ?? null,
            mcpServerSettings: JSON.stringify(input.mcpServerSettings ?? {}),
            authMode: input.authMode ?? "oauth",
            bedrockRegion: input.bedrockRegion ?? "us-east-1",
            ...(input.authMode === "apiKey" && input.apiKey && {
              apiKey: encryptApiKey(input.apiKey),
            }),
            updatedAt: new Date(),
          })
          .run()
      }

      return { success: true }
    }),

  /**
   * List available MCP servers from ~/.claude/
   * Scans for MCP server directories and reads their package.json for metadata
   */
  listMcpServers: publicProcedure.query(async () => {
    const claudeDir = path.join(os.homedir(), ".claude")
    const servers: Array<{
      id: string
      name: string
      description: string
      enabled: boolean
    }> = []

    try {
      const entries = await fs.readdir(claudeDir, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory() || !entry.name.startsWith("mcp-") && !entry.name.includes("-mcp")) {
          continue
        }

        const pkgPath = path.join(claudeDir, entry.name, "package.json")
        try {
          const pkgContent = await fs.readFile(pkgPath, "utf-8")
          const pkg = JSON.parse(pkgContent)

          servers.push({
            id: entry.name,
            name: pkg.displayName || pkg.name || entry.name,
            description: pkg.description || "",
            enabled: false, // Will be overridden by settings
          })
        } catch {
          // No package.json, add basic entry
          servers.push({
            id: entry.name,
            name: entry.name,
            description: "",
            enabled: false,
          })
        }
      }
    } catch (error) {
      console.error("[claude-settings] Failed to list MCP servers:", error)
    }

    // Get user's enabled servers from settings
    const db = getDatabase()
    const settings = db
      .select()
      .from(claudeCodeSettings)
      .where(eq(claudeCodeSettings.id, "default"))
      .get()

    const enabledServers = parseJsonSafely<Record<string, { enabled: boolean }>>(
      settings?.mcpServerSettings ?? "{}",
      {}
    )

    // Mark enabled servers
    for (const server of servers) {
      if (enabledServers[server.id]?.enabled) {
        server.enabled = true
      }
    }

    return { servers }
  }),
})
