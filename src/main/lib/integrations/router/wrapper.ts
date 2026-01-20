/**
 * Router Integration Wrapper
 *
 * Facade for model routing that automatically switches between
 * external claude-code-router and built-in fallback.
 */

import { getIntegrationConfig, externalToolExists } from "../index"
import { FallbackRouter } from "./fallback"
import { ExternalRouterAdapter } from "./external-adapter"

// Router input for model resolution
export interface RouterInput {
  prompt: string
  tokenCount?: number
  taskType?: string // 'code' | 'chat' | 'analysis' | 'plan'
  preferredModel?: string
  preferredProvider?: string
}

// Router output with resolved model
export interface RouterOutput {
  providerId: string
  modelId: string
  reason?: string // Why this model was selected
}

// Model information
export interface ModelInfo {
  id: string
  name: string
  providerId: string
  providerName: string
  contextWindow?: number
  maxOutputTokens?: number
  capabilities?: string[]
}

// Common interface for all router implementations
export interface RouterInterface {
  /**
   * Resolve which model to use based on input
   */
  resolveModel(input: RouterInput): Promise<RouterOutput>

  /**
   * Get list of available models
   */
  getAvailableModels(): Promise<ModelInfo[]>

  /**
   * Check if router is healthy
   */
  healthCheck(): Promise<boolean>

  /**
   * Get router name for logging
   */
  getName(): string
}

// Singleton instance
let routerInstance: RouterInterface | null = null

/**
 * Get the router instance (singleton)
 *
 * Automatically selects between external and fallback based on:
 * 1. User preference (integration settings)
 * 2. External tool availability
 * 3. Runtime health checks
 */
export function getRouter(): RouterInterface {
  if (routerInstance) {
    return routerInstance
  }

  const config = getIntegrationConfig("router")

  // If disabled, return a minimal fallback
  if (!config.enabled) {
    console.log("[router] Integration disabled, using minimal fallback")
    routerInstance = new FallbackRouter()
    return routerInstance
  }

  // If external preferred and available, try to use it
  if (config.useExternal) {
    const externalExists = externalToolExists("router")

    if (externalExists) {
      try {
        const externalRouter = new ExternalRouterAdapter()
        console.log("[router] Using external claude-code-router")
        routerInstance = externalRouter
        return routerInstance
      } catch (error) {
        console.warn("[router] Failed to initialize external router:", error)
        console.log("[router] Falling back to built-in router")
      }
    } else {
      console.log("[router] External router not found, using built-in fallback")
    }
  } else {
    console.log("[router] Built-in router selected by user preference")
  }

  // Use fallback
  routerInstance = new FallbackRouter()
  return routerInstance
}

/**
 * Reset router instance (useful for testing or when config changes)
 */
export function resetRouter(): void {
  routerInstance = null
}

/**
 * Force use of a specific router implementation
 */
export function setRouter(router: RouterInterface): void {
  routerInstance = router
}
