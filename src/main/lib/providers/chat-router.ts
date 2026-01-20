// ============ CHAT ROUTER ============
// Routes chat requests to appropriate provider client (Claude SDK or OpenAI-compatible)

import { getDatabase, aiProviders } from "../db"
import { eq } from "drizzle-orm"
import { safeStorage } from "electron"
import type { ChatChunk, ChatOptions, ProviderInfo } from "./types"
import { streamChat as openaiStreamChat } from "./openai-client"

// ============ PROVIDER INFO RETRIEVAL ============

/**
 * Get provider info including decrypted credentials
 */
export function getProviderInfo(providerId: string): {
  provider: ProviderInfo | null
  token?: string
  baseUrl?: string
  apiFormat: "openai" | "anthropic"
} {
  const db = getDatabase()

  const provider = db
    .select()
    .from(aiProviders)
    .where(eq(aiProviders.id, providerId))
    .get()

  if (!provider) {
    return { provider: null, apiFormat: "openai" }
  }

  let token: string | undefined
  let baseUrl = provider.baseUrl ?? undefined

  // Decrypt credentials
  if (provider.type === "anthropic_oauth") {
    // Get OAuth token from credentials table
    const { claudeCodeCredentials } = require("../db")
    const cred = db
      .select()
      .from(claudeCodeCredentials)
      .where(eq(claudeCodeCredentials.id, "default"))
      .get()

    if (cred?.oauthToken) {
      try {
        const buffer = Buffer.from(cred.oauthToken, "base64")
        token = safeStorage.isEncryptionAvailable()
          ? safeStorage.decryptString(buffer)
          : Buffer.from(cred.oauthToken, "base64").toString("utf-8")
      } catch {
        console.error("[ChatRouter] Failed to decrypt OAuth token")
      }
    }
  } else if (provider.apiKey) {
    // Decrypt API key
    try {
      const buffer = Buffer.from(provider.apiKey, "base64")
      token = safeStorage.isEncryptionAvailable()
        ? safeStorage.decryptString(buffer)
        : Buffer.from(provider.apiKey, "base64").toString("utf-8")
    } catch {
      console.error("[ChatRouter] Failed to decrypt API key")
    }
  }

  // Determine API format
  const apiFormat: "openai" | "anthropic" =
    (provider.apiFormat as "openai" | "anthropic") ||
    (provider.type === "anthropic_oauth" ? "anthropic" : "openai")

  return {
    provider: {
      id: provider.id,
      name: provider.name,
      type: provider.type as "anthropic_oauth" | "api_key",
      role: provider.role as "primary" | "secondary",
      isBuiltin: provider.isBuiltin === 1,
      baseUrl: provider.baseUrl,
      apiFormat,
      hasApiKey: !!provider.apiKey,
    },
    token,
    baseUrl,
    apiFormat,
  }
}

/**
 * Get primary provider info
 */
export function getPrimaryProviderInfo(): {
  provider: ProviderInfo | null
  token?: string
  baseUrl?: string
  apiFormat: "openai" | "anthropic"
} {
  const db = getDatabase()

  const provider = db
    .select()
    .from(aiProviders)
    .where(eq(aiProviders.role, "primary"))
    .get()

  if (!provider) {
    return { provider: null, apiFormat: "openai" }
  }

  return getProviderInfo(provider.id)
}

// ============ MODEL LOOKUP ============

/**
 * Get model info for a specific provider
 */
export function getModelInfo(providerId: string, modelId: string): {
  id: string
  modelId: string
  displayName: string
  apiFormat: "openai" | "anthropic"
} | null {
  const db = getDatabase()

  const { providerModels } = require("../db")
  const model = db
    .select()
    .from(providerModels)
    .where(
      eq(providerModels.providerId, providerId) &&
      eq(providerModels.modelId, modelId)
    )
    .get()

  if (!model) {
    // Fallback: return model info without database record
    return {
      id: `${providerId}-${modelId}`,
      modelId,
      displayName: modelId,
      apiFormat: "openai",
    }
  }

  return {
    id: model.id,
    modelId: model.modelId,
    displayName: model.displayName,
    apiFormat: model.apiFormat as "openai" | "anthropic",
  }
}

// ============ CHAT ROUTING ============

/**
 * Route chat to appropriate client based on provider configuration
 * For Anthropic providers: returns null (caller should use Claude SDK)
 * For OpenAI-compatible providers: returns async generator
 */
export async function* routeChat(
  providerId: string,
  modelId: string,
  prompt: string,
  options?: {
    temperature?: number
    maxTokens?: number
    systemPrompt?: string
  },
): AsyncGenerator<ChatChunk> {
  const { provider, token, baseUrl, apiFormat } = getProviderInfo(providerId)

  if (!provider) {
    yield { type: "error", error: "Provider not found" }
    return
  }

  if (!token) {
    yield { type: "error", error: "No authentication token available" }
    return
  }

  // For Anthropic format, signal to use Claude SDK
  if (apiFormat === "anthropic" || provider.type === "anthropic_oauth") {
    yield {
      type: "error",
      error: "USE_CLAUDE_SDK", // Special signal to use Claude SDK instead
    }
    return
  }

  // For OpenAI-compatible providers
  if (!baseUrl) {
    yield { type: "error", error: "No base URL configured for provider" }
    return
  }

  const messages = [
    ...(options?.systemPrompt
      ? [{ role: "system" as const, content: options.systemPrompt }]
      : []),
    { role: "user" as const, content: prompt },
  ]

  try {
    yield* openaiStreamChat(baseUrl, token, {
      model: modelId,
      messages,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      stream: true,
    })
  } catch (error) {
    yield {
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Check if a provider uses Claude SDK or OpenAI-compatible API
 */
export function getProviderExecutionType(providerId: string): "claude" | "openai" | null {
  const { provider, apiFormat } = getProviderInfo(providerId)

  if (!provider) return null

  if (apiFormat === "anthropic" || provider.type === "anthropic_oauth") {
    return "claude"
  }

  return "openai"
}

/**
 * Get environment variables for Claude SDK execution
 * (Used when provider needs Claude SDK)
 */
export function getClaudeSDKEnv(providerId: string): Record<string, string> {
  const { token, baseUrl, apiFormat } = getProviderInfo(providerId)

  const env: Record<string, string> = {}

  if (apiFormat === "anthropic" || !baseUrl) {
    // Standard Anthropic OAuth - use token
    if (token) {
      env.ANTHROPIC_AUTH_TOKEN = token
    }
  } else {
    // Custom endpoint with API key
    if (token) {
      env.ANTHROPIC_AUTH_TOKEN = token
    }
    if (baseUrl) {
      env.ANTHROPIC_BASE_URL = baseUrl
    }
  }

  return env
}
