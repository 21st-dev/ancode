/**
 * Fallback Router
 *
 * Built-in router implementation that uses the aiProviders table
 * for model resolution when external router is unavailable.
 */

import { getDatabase } from "../../db"
import { aiProviders, providerModels } from "../../db/schema"
import { eq } from "drizzle-orm"
import type { RouterInterface, RouterInput, RouterOutput, ModelInfo } from "./wrapper"

// Token thresholds for model switching
const TOKEN_THRESHOLDS = {
  standard: 0, // Default model
  thinking: 60000, // Switch to thinking model when tokens > 60k
  large: 120000, // Switch to large context model when tokens > 120k
}

// Default model preferences by task type
const TASK_TYPE_MODELS: Record<string, string> = {
  code: "claude-sonnet-4-20250514", // Fast, good for code
  chat: "claude-sonnet-4-20250514", // Conversational
  analysis: "claude-opus-4-20250514", // Deep analysis
  plan: "claude-opus-4-20250514", // Planning/architecture
}

export class FallbackRouter implements RouterInterface {
  getName(): string {
    return "built-in-fallback"
  }

  async healthCheck(): Promise<boolean> {
    try {
      const db = getDatabase()
      // Check if we can query the database
      const providers = db.select().from(aiProviders).limit(1).all()
      return true
    } catch {
      return false
    }
  }

  async resolveModel(input: RouterInput): Promise<RouterOutput> {
    const db = getDatabase()

    // Get all providers (no isActive column, use role to filter)
    const providers = db
      .select()
      .from(aiProviders)
      .all()

    if (providers.length === 0) {
      // Return default Anthropic if no providers configured
      return {
        providerId: "anthropic",
        modelId: "claude-sonnet-4-20250514",
        reason: "No active providers, using default",
      }
    }

    // If user specified a preference, try to use it
    if (input.preferredProvider && input.preferredModel) {
      const preferredProvider = providers.find((p) => p.id === input.preferredProvider)
      if (preferredProvider) {
        return {
          providerId: input.preferredProvider,
          modelId: input.preferredModel,
          reason: "User preference",
        }
      }
    }

    // Get primary provider (first active one or Anthropic)
    const primaryProvider =
      providers.find((p) => p.providerType === "anthropic") || providers[0]

    // Determine model based on token count
    let selectedModel = TASK_TYPE_MODELS[input.taskType || "code"]

    if (input.tokenCount) {
      if (input.tokenCount > TOKEN_THRESHOLDS.large) {
        // Need large context - use Claude with extended context
        selectedModel = "claude-sonnet-4-20250514" // Has 200k context
      } else if (input.tokenCount > TOKEN_THRESHOLDS.thinking) {
        // Complex task - use thinking model
        selectedModel = "claude-opus-4-20250514"
      }
    }

    return {
      providerId: primaryProvider.id,
      modelId: selectedModel,
      reason: this.buildReason(input, selectedModel),
    }
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    const db = getDatabase()

    // Get models from providerModels table with provider info
    const results = db
      .select({
        modelId: providerModels.modelId,
        modelDisplayName: providerModels.displayName,
        providerId: aiProviders.id,
        providerName: aiProviders.name,
        contextLength: providerModels.contextLength,
      })
      .from(providerModels)
      .innerJoin(aiProviders, eq(providerModels.providerId, aiProviders.id))
      .where(eq(providerModels.isAvailable, 1))
      .all()

    return results.map((r) => ({
      id: r.modelId,
      name: r.modelDisplayName,
      providerId: r.providerId,
      providerName: r.providerName,
      contextWindow: r.contextLength ?? undefined,
      maxOutputTokens: undefined,
    }))
  }

  private buildReason(input: RouterInput, model: string): string {
    const reasons: string[] = []

    if (input.taskType) {
      reasons.push(`task type: ${input.taskType}`)
    }

    if (input.tokenCount) {
      reasons.push(`token count: ${input.tokenCount}`)
      if (input.tokenCount > TOKEN_THRESHOLDS.thinking) {
        reasons.push("using thinking model for complex task")
      }
    }

    return reasons.length > 0 ? reasons.join(", ") : "default selection"
  }
}
