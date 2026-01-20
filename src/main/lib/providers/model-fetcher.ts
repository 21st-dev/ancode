// ============ MODEL FETCHING SERVICE ============
// Fetches available models from AI provider APIs

import type { FetchableModel, ProviderModelInfo } from "./types"

// ============ TYPE DEFINITIONS ============

export interface FetchedModel {
  id: string
  displayName: string
  apiFormat: "openai" | "anthropic"
  capabilities?: {
    vision?: boolean
    tools?: boolean
    thinking?: boolean
  }
  contextLength?: number
}

// ============ KNOWN MODEL LISTS ============
// Fallback lists when provider doesn't expose a /models endpoint

// GLM Coding API endpoint: https://api.z.ai/api/coding/paas/v4
// User ID is required for authentication with API key
export const KNOWN_GLM_MODELS: FetchedModel[] = [
  {
    id: "glm-4.7",
    displayName: "GLM 4.7 (Coding)",
    apiFormat: "openai",
    capabilities: { vision: true, tools: true },
    contextLength: 128000,
  },
  {
    id: "glm-4.6",
    displayName: "GLM 4.6",
    apiFormat: "openai",
    capabilities: { vision: true, tools: true },
    contextLength: 200000,
  },
  {
    id: "glm-4.5",
    displayName: "GLM 4.5",
    apiFormat: "openai",
    capabilities: { vision: false, tools: true },
    contextLength: 128000,
  },
]

export const KNOWN_CLAUDE_MODELS: FetchedModel[] = [
  {
    id: "claude-3-5-sonnet-20241022",
    displayName: "Claude 3.5 Sonnet",
    apiFormat: "anthropic",
    capabilities: { vision: true, tools: true, thinking: false },
    contextLength: 200000,
  },
  {
    id: "claude-3-5-sonnet-20250114",
    displayName: "Claude 3.5 Sonnet (Latest)",
    apiFormat: "anthropic",
    capabilities: { vision: true, tools: true, thinking: true },
    contextLength: 200000,
  },
  {
    id: "claude-3-opus-20250214",
    displayName: "Claude Opus",
    apiFormat: "anthropic",
    capabilities: { vision: true, tools: true, thinking: true },
    contextLength: 200000,
  },
  {
    id: "claude-3-haiku-20250114",
    displayName: "Claude Haiku",
    apiFormat: "anthropic",
    capabilities: { vision: true, tools: true, thinking: false },
    contextLength: 200000,
  },
]

// ============ API FORMAT DETECTION ============

export function detectApiFormat(baseUrl: string): "openai" | "anthropic" {
  const lowerUrl = baseUrl.toLowerCase()

  // Known Anthropic endpoints
  if (lowerUrl.includes("anthropic.com") || lowerUrl.includes("api.anthropic")) {
    return "anthropic"
  }

  // Known OpenAI-compatible endpoints
  if (
    lowerUrl.includes("openai") ||
    lowerUrl.includes("z.ai") ||
    lowerUrl.includes("glm") ||
    lowerUrl.includes("/v1/") ||
    lowerUrl.includes("/paas/")
  ) {
    return "openai"
  }

  // Default to OpenAI format for custom endpoints
  return "openai"
}

// ============ MODEL FETCHING FUNCTIONS ============

/**
 * Fetch models from an OpenAI-compatible API endpoint
 */
export async function fetchOpenAIModels(
  baseUrl: string,
  apiKey: string,
): Promise<FetchedModel[]> {
  try {
    // Try standard OpenAI /models endpoint first
    const modelsUrl = baseUrl.replace(/\/$/, "") + "/models"

    const response = await fetch(modelsUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    if (!response.ok) {
      console.log(`[ModelFetcher] /models endpoint returned ${response.status}`)
      return []
    }

    const data = await response.json()

    // Parse OpenAI /models response format
    if (data.data && Array.isArray(data.data)) {
      return data.data
        .filter((model: any) => model.id)
        .map((model: any) => ({
          id: model.id,
          displayName: model.name || model.id,
          apiFormat: "openai" as const,
          capabilities: { tools: true }, // Assume tool support
          contextLength: model.max_tokens || 128000,
        }))
    }

    return []
  } catch (error) {
    console.log(`[ModelFetcher] Failed to fetch from /models:`, error)
    return []
  }
}

/**
 * Fetch models from an Anthropic API endpoint
 * Note: Anthropic doesn't expose a public /models endpoint, so we return known models
 */
export async function fetchAnthropicModels(): Promise<FetchedModel[]> {
  return KNOWN_CLAUDE_MODELS
}

/**
 * Fetch models from GLM (Z.AI) endpoint
 * Since GLM doesn't expose /models, return known models
 */
export function fetchGLMModels(): FetchedModel[] {
  return KNOWN_GLM_MODELS
}

/**
 * Main entry point for fetching models from a provider
 */
export async function fetchProviderModels(params: {
  baseUrl?: string | null
  type: "anthropic_oauth" | "api_key"
  apiKey?: string | null
}): Promise<{
  models: FetchedModel[]
  apiFormat: "openai" | "anthropic"
}> {
  const { baseUrl, type, apiKey } = params

  // Determine API format
  let apiFormat: "openai" | "anthropic" = "openai"
  if (type === "anthropic_oauth") {
    apiFormat = "anthropic"
  } else if (baseUrl) {
    apiFormat = detectApiFormat(baseUrl)
  }

  let models: FetchedModel[] = []

  // Fetch based on provider type
  if (apiFormat === "anthropic" || type === "anthropic_oauth") {
    models = await fetchAnthropicModels()
  } else if (baseUrl) {
    // Try to fetch from OpenAI-compatible endpoint
    if (apiKey) {
      models = await fetchOpenAIModels(baseUrl, apiKey)
    }

    // If no models returned, check if it's GLM and use known list
    if (models.length === 0) {
      const lowerUrl = baseUrl.toLowerCase()
      if (
        lowerUrl.includes("z.ai") ||
        lowerUrl.includes("glm") ||
        lowerUrl.includes("zhipu")
      ) {
        models = fetchGLMModels()
      }
    }
  }

  return { models, apiFormat }
}

// ============ MODEL REGISTRY ============
// Cached model info for quick lookups during execution

export interface ModelInfo {
  id: string
  displayName: string
  apiFormat: "openai" | "anthropic"
  contextLength?: number
  capabilities?: {
    vision?: boolean
    tools?: boolean
    thinking?: boolean
  }
}

// Simplified model IDs for UI
export const MODEL_ALIASES: Record<string, string> = {
  // Claude aliases
  opus: "claude-3-opus-20250214",
  sonnet: "claude-3-5-sonnet-20250114",
  haiku: "claude-3-haiku-20250114",

  // GLM aliases
  "glm-latest": "glm-4.7",
  "glm-4": "glm-4.7",
}

// Reverse lookup for display
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "claude-3-opus-20250214": "Opus",
  "claude-3-5-sonnet-20250114": "Sonnet",
  "claude-3-haiku-20250114": "Haiku",
  "glm-4.7": "GLM 4.7",
  "glm-4.6": "GLM 4.6",
  "glm-4.5": "GLM 4.5",
}

/**
 * Get canonical model ID from alias
 */
export function resolveModelAlias(modelId: string): string {
  return MODEL_ALIASES[modelId] || modelId
}

/**
 * Get display name for model
 */
export function getModelDisplayName(modelId: string): string {
  return MODEL_DISPLAY_NAMES[modelId] || modelId
}
