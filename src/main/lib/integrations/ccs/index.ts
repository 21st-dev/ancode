/**
 * CCS Integration Module
 *
 * Provides integration with CCS (Claude Code Switch) for multi-provider
 * AI model management.
 */

// #NP - CCS Integration exports

export {
  startServer,
  stopServer,
  restartServer,
  getServerStatus,
  checkHealth,
  getApiBaseUrl,
  isCCSAvailable,
  cleanup,
  type CCSServerStatus,
  type CCSServerConfig,
} from "./server"

export { CCSApiClient, createCCSApiClient } from "./api-client"
