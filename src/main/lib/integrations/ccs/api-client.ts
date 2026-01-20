/**
 * CCS API Client
 *
 * Typed client for communicating with CCS REST API.
 * Based on CCS's api-client.ts but adapted for Node.js/Electron.
 */

import { getApiBaseUrl } from "./server"

// #NP - CCS API Client

// ============ TYPES ============

export interface Profile {
  name: string
  settingsPath: string
  configured: boolean
}

export interface CreateProfile {
  name: string
  baseUrl: string
  apiKey: string
  model?: string
  opusModel?: string
  sonnetModel?: string
  haikuModel?: string
}

export interface UpdateProfile {
  baseUrl?: string
  apiKey?: string
  model?: string
  opusModel?: string
  sonnetModel?: string
  haikuModel?: string
}

export interface ProviderPreset {
  id: string
  name: string
  description: string
  baseUrl: string
  defaultProfileName: string
  defaultModel: string
  apiKeyPlaceholder: string
  apiKeyHint: string
  category: "recommended" | "alternative"
  extraEnv?: Record<string, string>
  alwaysThinkingEnabled?: boolean
}

export interface ModelPreset {
  name: string
  default: string
  opus: string
  sonnet: string
  haiku: string
}

export interface OAuthAccount {
  id: string
  email?: string
  nickname?: string
  provider: string
  isDefault: boolean
  tokenFile: string
  createdAt: string
  lastUsedAt?: string
  paused?: boolean
  pausedAt?: string
  tier?: "free" | "paid" | "unknown"
}

export interface AuthStatus {
  provider: string
  displayName: string
  authenticated: boolean
  lastAuth: string | null
  tokenFiles: number
  accounts: OAuthAccount[]
  defaultAccount?: string
}

export interface Variant {
  name: string
  provider: string
  settings: string
  account?: string
  port?: number
  model?: string
}

export interface HealthStatus {
  status: "ok" | "error"
  version?: string
  uptime?: number
}

// ============ CLIENT ============

export class CCSApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }))
      throw new Error(error.error || response.statusText)
    }

    return response.json()
  }

  // ============ PROFILES ============

  async listProfiles(): Promise<Profile[]> {
    const data = await this.request<{ profiles: Profile[] }>("/profiles")
    return data.profiles
  }

  async createProfile(profile: CreateProfile): Promise<void> {
    await this.request("/profiles", {
      method: "POST",
      body: JSON.stringify(profile),
    })
  }

  async updateProfile(name: string, updates: UpdateProfile): Promise<void> {
    await this.request(`/profiles/${encodeURIComponent(name)}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    })
  }

  async deleteProfile(name: string): Promise<void> {
    await this.request(`/profiles/${encodeURIComponent(name)}`, {
      method: "DELETE",
    })
  }

  // ============ PRESETS ============

  async getProviderPresets(): Promise<ProviderPreset[]> {
    const data = await this.request<{ presets: ProviderPreset[] }>(
      "/cliproxy/openai-compat/templates"
    )
    return data.presets
  }

  async listModelPresets(profile: string): Promise<ModelPreset[]> {
    const data = await this.request<{ presets: ModelPreset[] }>(
      `/settings/${encodeURIComponent(profile)}/presets`
    )
    return data.presets
  }

  async createModelPreset(
    profile: string,
    preset: Omit<ModelPreset, "opus" | "sonnet" | "haiku"> &
      Partial<Pick<ModelPreset, "opus" | "sonnet" | "haiku">>
  ): Promise<ModelPreset> {
    const data = await this.request<{ preset: ModelPreset }>(
      `/settings/${encodeURIComponent(profile)}/presets`,
      {
        method: "POST",
        body: JSON.stringify(preset),
      }
    )
    return data.preset
  }

  async deleteModelPreset(profile: string, presetName: string): Promise<void> {
    await this.request(
      `/settings/${encodeURIComponent(profile)}/presets/${encodeURIComponent(presetName)}`,
      { method: "DELETE" }
    )
  }

  // ============ CLIPROXY (OAUTH) ============

  async listVariants(): Promise<Variant[]> {
    const data = await this.request<{ variants: Variant[] }>("/cliproxy")
    return data.variants
  }

  async getAuthStatus(): Promise<AuthStatus[]> {
    const data = await this.request<{ authStatus: AuthStatus[] }>("/cliproxy/auth")
    return data.authStatus
  }

  async listOAuthAccounts(): Promise<Record<string, OAuthAccount[]>> {
    const data = await this.request<{ accounts: Record<string, OAuthAccount[]> }>(
      "/cliproxy/auth/accounts"
    )
    return data.accounts
  }

  async startOAuthFlow(provider: string, nickname?: string): Promise<OAuthAccount> {
    const data = await this.request<{ account: OAuthAccount }>(
      `/cliproxy/auth/${encodeURIComponent(provider)}/start`,
      {
        method: "POST",
        body: JSON.stringify({ nickname }),
      }
    )
    return data.account
  }

  // ============ HEALTH ============

  async checkHealth(): Promise<HealthStatus> {
    try {
      const data = await this.request<HealthStatus>("/health")
      return data
    } catch {
      return { status: "error" }
    }
  }
}

/**
 * Create CCS API client using current server port
 */
export function createCCSApiClient(): CCSApiClient | null {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) return null
  return new CCSApiClient(baseUrl)
}
