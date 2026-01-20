/**
 * CCR API Client
 *
 * HTTP client for communicating with the CCR (Claude Code Router) server.
 * Used by the main process to proxy requests from renderer.
 */

// #NP - CCR API Client

import { getApiBaseUrl, getApiKey } from "./server"

// ============ TYPES ============

export interface CCRProvider {
  name: string
  api_base_url: string
  api_key: string
  models: string[]
  transformer?: {
    use: (string | [string, Record<string, unknown>])[]
    [modelName: string]: { use: (string | [string, Record<string, unknown>])[] } | (string | [string, Record<string, unknown>])[]
  }
}

export interface CCRRouterConfig {
  default: string // "provider,model"
  background: string
  think: string
  longContext: string
  longContextThreshold: number
  webSearch: string
  image: string
}

export interface CCRTransformer {
  name: string
  description?: string
  path?: string
}

export interface CCRConfig {
  Providers: CCRProvider[]
  Router: CCRRouterConfig
  transformers?: CCRTransformer[]
  StatusLine?: Record<string, unknown>
  LOG?: boolean
  LOG_LEVEL?: string
  HOST?: string
  PORT?: number
  APIKEY?: string
  PROXY_URL?: string
  CUSTOM_ROUTER_PATH?: string
}

export interface CCRHealthStatus {
  status: "online" | "offline"
  version?: string
  uptime?: number
}

export interface CCRLogFile {
  name: string
  path: string
  size: number
  lastModified: string
}

export interface CCRPreset {
  name: string
  version: string
  description?: string
  author?: string
  keywords?: string[]
}

// ============ API CLIENT ============

export class CCRApiClient {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  private createHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    }

    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey
    }

    return headers
  }

  private async apiFetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.createHeaders(),
        ...(options.headers as Record<string, string>),
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      let errorMessage = `CCR API error: ${response.status} ${response.statusText}`
      try {
        const errorData = await response.json()
        if (errorData.error || errorData.message) {
          errorMessage = errorData.message || errorData.error
        }
      } catch {
        // Use default error message
      }
      throw new Error(errorMessage)
    }

    if (response.status === 204) {
      return {} as T
    }

    const text = await response.text()
    return text ? JSON.parse(text) : ({} as T)
  }

  // ============ HEALTH ============

  async checkHealth(): Promise<CCRHealthStatus> {
    try {
      await this.apiFetch<unknown>("/health")
      return { status: "online" }
    } catch {
      return { status: "offline" }
    }
  }

  // ============ CONFIG ============

  async getConfig(): Promise<CCRConfig> {
    return this.apiFetch<CCRConfig>("/config")
  }

  async saveConfig(config: CCRConfig): Promise<CCRConfig> {
    return this.apiFetch<CCRConfig>("/config", {
      method: "POST",
      body: JSON.stringify(config),
    })
  }

  async restartService(): Promise<void> {
    await this.apiFetch<void>("/restart", {
      method: "POST",
      body: JSON.stringify({}),
    })
  }

  // ============ PROVIDERS ============

  async getProviders(): Promise<CCRProvider[]> {
    const config = await this.getConfig()
    return config.Providers || []
  }

  async addProvider(provider: CCRProvider): Promise<CCRConfig> {
    const config = await this.getConfig()
    config.Providers = [...(config.Providers || []), provider]
    return this.saveConfig(config)
  }

  async updateProvider(index: number, provider: CCRProvider): Promise<CCRConfig> {
    const config = await this.getConfig()
    if (index >= 0 && index < (config.Providers?.length || 0)) {
      config.Providers[index] = provider
    }
    return this.saveConfig(config)
  }

  async deleteProvider(index: number): Promise<CCRConfig> {
    const config = await this.getConfig()
    if (index >= 0 && index < (config.Providers?.length || 0)) {
      config.Providers.splice(index, 1)
    }
    return this.saveConfig(config)
  }

  // ============ ROUTER ============

  async getRouter(): Promise<CCRRouterConfig> {
    const config = await this.getConfig()
    return config.Router || {
      default: "",
      background: "",
      think: "",
      longContext: "",
      longContextThreshold: 60000,
      webSearch: "",
      image: "",
    }
  }

  async updateRouter(router: CCRRouterConfig): Promise<CCRConfig> {
    const config = await this.getConfig()
    config.Router = router
    return this.saveConfig(config)
  }

  // ============ TRANSFORMERS ============

  async getTransformers(): Promise<CCRTransformer[]> {
    return this.apiFetch<CCRTransformer[]>("/api/transformers")
  }

  // ============ LOGS ============

  async getLogFiles(): Promise<CCRLogFile[]> {
    return this.apiFetch<CCRLogFile[]>("/logs/files")
  }

  async getLogs(filePath: string): Promise<string[]> {
    return this.apiFetch<string[]>(`/logs?file=${encodeURIComponent(filePath)}`)
  }

  async clearLogs(filePath: string): Promise<void> {
    await this.apiFetch<void>(`/logs?file=${encodeURIComponent(filePath)}`, {
      method: "DELETE",
    })
  }

  // ============ PRESETS ============

  async getPresets(): Promise<{ presets: CCRPreset[] }> {
    return this.apiFetch<{ presets: CCRPreset[] }>("/presets")
  }

  async getPreset(name: string): Promise<CCRPreset> {
    return this.apiFetch<CCRPreset>(`/presets/${encodeURIComponent(name)}`)
  }

  async installPreset(url: string, name?: string): Promise<CCRPreset> {
    return this.apiFetch<CCRPreset>("/presets/install", {
      method: "POST",
      body: JSON.stringify({ url, name }),
    })
  }

  async applyPreset(name: string, secrets: Record<string, string>): Promise<void> {
    await this.apiFetch<void>(`/presets/${encodeURIComponent(name)}/apply`, {
      method: "POST",
      body: JSON.stringify({ secrets }),
    })
  }

  async deletePreset(name: string): Promise<void> {
    await this.apiFetch<void>(`/presets/${encodeURIComponent(name)}`, {
      method: "DELETE",
    })
  }

  // ============ UPDATES ============

  async checkForUpdates(): Promise<{ hasUpdate: boolean; latestVersion?: string; changelog?: string }> {
    return this.apiFetch<{ hasUpdate: boolean; latestVersion?: string; changelog?: string }>("/update/check")
  }
}

// ============ FACTORY ============

/**
 * Create a CCR API client instance if server is running
 */
export function createCCRApiClient(): CCRApiClient | null {
  const baseUrl = getApiBaseUrl()
  const apiKey = getApiKey()

  if (!baseUrl) {
    return null
  }

  return new CCRApiClient(baseUrl, apiKey || "")
}
