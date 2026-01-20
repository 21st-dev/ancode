/**
 * CCR Integration Module
 *
 * Exports CCR (Claude Code Router) server management and API client.
 */

// #NP - CCR Integration Module

// Server management
export {
  isCCRAvailable,
  getServerStatus,
  startServer,
  stopServer,
  restartServer,
  checkHealth,
  getApiBaseUrl,
  getApiKey,
  cleanup,
  type CCRServerStatus,
  type CCRServerConfig,
} from "./server"

// API client
export {
  CCRApiClient,
  createCCRApiClient,
  type CCRProvider,
  type CCRRouterConfig,
  type CCRTransformer,
  type CCRConfig,
  type CCRHealthStatus,
  type CCRLogFile,
  type CCRPreset,
} from "./api-client"
