/**
 * Integration Framework
 *
 * Smart wrappers for external tools with automatic fallbacks.
 * Each integration can toggle between external tool and built-in fallback.
 */

import { getDatabase } from "../db"
import { integrationSettings } from "../db/schema"
import { eq } from "drizzle-orm"

// Available integration types
export type IntegrationType = "router" | "auth" | "memory" | "proxy"

// Integration configuration stored in database
export interface IntegrationConfig {
  enabled: boolean
  useExternal: boolean // true = external tool, false = fallback
  config?: Record<string, unknown> // JSON config for the integration
}

// Default configuration for each integration
export const defaultConfigs: Record<IntegrationType, IntegrationConfig> = {
  router: { enabled: true, useExternal: true },
  auth: { enabled: true, useExternal: false }, // Default to built-in OAuth
  memory: { enabled: true, useExternal: true },
  proxy: { enabled: false, useExternal: false }, // Off by default
}

// External tool paths (relative to project root)
export const externalToolPaths: Record<IntegrationType, string> = {
  router: "external-tools/claude-code-router",
  auth: "external-tools/ccs",
  memory: "external-tools/claude-mem",
  proxy: "external-tools/cli-proxy-api-plus",
}

/**
 * Get integration configuration from database
 */
export function getIntegrationConfig(type: IntegrationType): IntegrationConfig {
  try {
    const db = getDatabase()
    const result = db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, type))
      .get()

    if (result) {
      return {
        enabled: result.enabled === 1,
        useExternal: result.useExternal === 1,
        config: result.config ? JSON.parse(result.config) : undefined,
      }
    }
  } catch (error) {
    console.warn(`[integrations] Failed to load config for ${type}:`, error)
  }

  // Return default config if not found or error
  return defaultConfigs[type]
}

/**
 * Update integration configuration in database
 */
export function setIntegrationConfig(
  type: IntegrationType,
  config: Partial<IntegrationConfig>,
): void {
  try {
    const db = getDatabase()
    const existing = db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationType, type))
      .get()

    const now = new Date().toISOString()

    if (existing) {
      db.update(integrationSettings)
        .set({
          enabled: config.enabled !== undefined ? (config.enabled ? 1 : 0) : existing.enabled,
          useExternal:
            config.useExternal !== undefined ? (config.useExternal ? 1 : 0) : existing.useExternal,
          config: config.config !== undefined ? JSON.stringify(config.config) : existing.config,
          updatedAt: now,
        })
        .where(eq(integrationSettings.integrationType, type))
        .run()
    } else {
      const defaults = defaultConfigs[type]
      db.insert(integrationSettings)
        .values({
          id: `int_${type}_${Date.now()}`,
          integrationType: type,
          enabled: config.enabled !== undefined ? (config.enabled ? 1 : 0) : defaults.enabled ? 1 : 0,
          useExternal:
            config.useExternal !== undefined
              ? config.useExternal
                ? 1
                : 0
              : defaults.useExternal
                ? 1
                : 0,
          config: config.config !== undefined ? JSON.stringify(config.config) : null,
          createdAt: now,
          updatedAt: now,
        })
        .run()
    }
  } catch (error) {
    console.error(`[integrations] Failed to save config for ${type}:`, error)
  }
}

/**
 * Get all integration configurations
 */
export function getAllIntegrationConfigs(): Record<IntegrationType, IntegrationConfig> {
  const types: IntegrationType[] = ["router", "auth", "memory", "proxy"]
  const configs: Record<string, IntegrationConfig> = {}

  for (const type of types) {
    configs[type] = getIntegrationConfig(type)
  }

  return configs as Record<IntegrationType, IntegrationConfig>
}

/**
 * Check if external tool exists
 */
export function externalToolExists(type: IntegrationType): boolean {
  const fs = require("fs")
  const path = require("path")
  const { app } = require("electron")

  const isDev = !app.isPackaged
  const basePath = isDev
    ? path.join(__dirname, "../../../../..")
    : path.join(process.resourcesPath, "..")

  const toolPath = path.join(basePath, externalToolPaths[type])
  return fs.existsSync(toolPath)
}

// Re-export router wrapper
export { getRouter, type RouterInterface } from "./router/wrapper"

// Re-export CCS integration as namespace to avoid naming conflicts
export * as ccs from "./ccs"

// Re-export CCR integration as namespace to avoid naming conflicts
export * as ccr from "./ccr"

/**
 * Initialize integrations on app startup
 * Called after database is initialized
 */
export async function initializeIntegrations(): Promise<void> {
  console.log("[integrations] Initializing external tool integrations...")

  // Check auth integration (CCS) - auto-start if enabled
  const authConfig = getIntegrationConfig("auth")
  if (authConfig.enabled && authConfig.useExternal) {
    const { isCCSAvailable, startServer: startCCS } = await import("./ccs")

    if (isCCSAvailable()) {
      console.log("[integrations] Starting CCS server (auth integration enabled)...")
      try {
        const status = await startCCS({ autoStart: true })
        if (status.running) {
          console.log(`[integrations] CCS server started on port ${status.port}`)
        } else if (status.error) {
          console.warn(`[integrations] Failed to start CCS: ${status.error}`)
        }
      } catch (error) {
        console.error("[integrations] Error starting CCS:", error)
      }
    } else {
      console.warn("[integrations] CCS not available. Run 'bun run tools:init' to initialize.")
    }
  }

  // Check router integration (CCR) - auto-start if enabled
  const routerConfig = getIntegrationConfig("router")
  if (routerConfig.enabled && routerConfig.useExternal) {
    const { isCCRAvailable, startServer: startCCR } = await import("./ccr")

    if (isCCRAvailable()) {
      console.log("[integrations] Starting CCR server (router integration enabled)...")
      try {
        const status = await startCCR({ autoStart: true })
        if (status.running) {
          console.log(`[integrations] CCR server started on port ${status.port}`)
        } else if (status.error) {
          console.warn(`[integrations] Failed to start CCR: ${status.error}`)
        }
      } catch (error) {
        console.error("[integrations] Error starting CCR:", error)
      }
    } else {
      console.warn("[integrations] CCR not available. Run 'bun run tools:init' to initialize.")
    }
  }

  console.log("[integrations] Initialization complete")
}

/**
 * Cleanup integrations on app quit
 */
export async function cleanupIntegrations(): Promise<void> {
  console.log("[integrations] Cleaning up integrations...")

  // Stop CCS server if running
  try {
    const { cleanup: cleanupCCS } = await import("./ccs")
    cleanupCCS()
  } catch {
    // Ignore errors during cleanup
  }

  // Stop CCR server if running
  try {
    const { cleanup: cleanupCCR } = await import("./ccr")
    cleanupCCR()
  } catch {
    // Ignore errors during cleanup
  }

  console.log("[integrations] Cleanup complete")
}
