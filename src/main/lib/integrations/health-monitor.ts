/**
 * Health Monitor Service
 *
 * Monitors the health status of external tools (CCS, CCR) and provides
 * real-time updates to the renderer via tRPC subscriptions.
 */

// #NP - Health Monitor Service

import { getServerStatus as getCCSStatus, checkHealth as checkCCSHealth } from "./ccs"
import { getServerStatus as getCCRStatus, checkHealth as checkCCRHealth } from "./ccr"

// ============ TYPES ============

export interface ToolHealthStatus {
  running: boolean
  healthy: boolean
  port: number | null
  lastCheck: Date | null
  error: string | null
}

export interface AllToolsHealth {
  ccs: ToolHealthStatus
  ccr: ToolHealthStatus
  lastUpdated: Date
}

// ============ STATE ============

let lastHealth: AllToolsHealth | null = null
let healthCheckInterval: NodeJS.Timeout | null = null
let subscribers: Set<(health: AllToolsHealth) => void> = new Set()

// ============ HEALTH CHECK ============

/**
 * Check health of a single tool
 */
async function checkToolHealth(
  tool: "ccs" | "ccr"
): Promise<ToolHealthStatus> {
  try {
    const status = tool === "ccs" ? getCCSStatus() : getCCRStatus()
    const healthy = status.running
      ? await (tool === "ccs" ? checkCCSHealth() : checkCCRHealth())
      : false

    return {
      running: status.running,
      healthy,
      port: status.port,
      lastCheck: new Date(),
      error: status.error,
    }
  } catch (error) {
    return {
      running: false,
      healthy: false,
      port: null,
      lastCheck: new Date(),
      error: (error as Error).message,
    }
  }
}

/**
 * Check health of all tools
 */
export async function checkAllToolsHealth(): Promise<AllToolsHealth> {
  const [ccs, ccr] = await Promise.all([
    checkToolHealth("ccs"),
    checkToolHealth("ccr"),
  ])

  const health: AllToolsHealth = {
    ccs,
    ccr,
    lastUpdated: new Date(),
  }

  lastHealth = health
  return health
}

/**
 * Get cached health status (or check if none cached)
 */
export async function getToolsHealth(): Promise<AllToolsHealth> {
  if (!lastHealth) {
    return checkAllToolsHealth()
  }
  return lastHealth
}

/**
 * Get cached health status synchronously (may be stale or null)
 */
export function getToolsHealthSync(): AllToolsHealth | null {
  return lastHealth
}

// ============ SUBSCRIPTION ============

/**
 * Subscribe to health updates
 * Returns unsubscribe function
 */
export function subscribeToHealth(
  callback: (health: AllToolsHealth) => void
): () => void {
  subscribers.add(callback)

  // Start monitoring if this is the first subscriber
  if (subscribers.size === 1) {
    startHealthMonitoring()
  }

  // Send current health immediately if available
  if (lastHealth) {
    callback(lastHealth)
  }

  // Return unsubscribe function
  return () => {
    subscribers.delete(callback)

    // Stop monitoring if no more subscribers
    if (subscribers.size === 0) {
      stopHealthMonitoring()
    }
  }
}

/**
 * Notify all subscribers of health update
 */
function notifySubscribers(health: AllToolsHealth): void {
  for (const callback of subscribers) {
    try {
      callback(health)
    } catch (error) {
      console.error("[health-monitor] Subscriber callback error:", error)
    }
  }
}

// ============ MONITORING ============

/**
 * Start periodic health monitoring
 */
export function startHealthMonitoring(intervalMs: number = 5000): void {
  if (healthCheckInterval) {
    return // Already monitoring
  }

  console.log("[health-monitor] Starting health monitoring...")

  // Initial check
  checkAllToolsHealth().then(notifySubscribers).catch(console.error)

  // Periodic checks
  healthCheckInterval = setInterval(async () => {
    try {
      const health = await checkAllToolsHealth()
      notifySubscribers(health)
    } catch (error) {
      console.error("[health-monitor] Health check error:", error)
    }
  }, intervalMs)
}

/**
 * Stop health monitoring
 */
export function stopHealthMonitoring(): void {
  if (healthCheckInterval) {
    console.log("[health-monitor] Stopping health monitoring...")
    clearInterval(healthCheckInterval)
    healthCheckInterval = null
  }
}

/**
 * Force an immediate health check and notification
 */
export async function forceHealthCheck(): Promise<AllToolsHealth> {
  const health = await checkAllToolsHealth()
  notifySubscribers(health)
  return health
}

// ============ CONVENIENCE ============

/**
 * Check if a specific tool is running and healthy
 */
export async function isToolHealthy(tool: "ccs" | "ccr"): Promise<boolean> {
  const health = await getToolsHealth()
  return health[tool].running && health[tool].healthy
}

/**
 * Get just CCS health
 */
export async function getCCSHealth(): Promise<ToolHealthStatus> {
  const health = await getToolsHealth()
  return health.ccs
}

/**
 * Get just CCR health
 */
export async function getCCRHealth(): Promise<ToolHealthStatus> {
  const health = await getToolsHealth()
  return health.ccr
}
