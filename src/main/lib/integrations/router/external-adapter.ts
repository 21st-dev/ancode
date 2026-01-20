/**
 * External Router Adapter
 *
 * Adapter for claude-code-router external tool.
 * Wraps the external router's API to match our RouterInterface.
 */

import * as path from "path"
import * as fs from "fs"
import { app } from "electron"
import type { RouterInterface, RouterInput, RouterOutput, ModelInfo } from "./wrapper"
import { externalToolPaths } from "../index"

// Config structure expected from claude-code-router
interface ExternalRouterConfig {
  default_model?: string
  token_thresholds?: {
    thinking?: number
    large_context?: number
  }
  providers?: Array<{
    name: string
    api_key_env?: string
    base_url?: string
    models?: Array<{
      name: string
      context_window?: number
      max_tokens?: number
    }>
  }>
}

export class ExternalRouterAdapter implements RouterInterface {
  private config: ExternalRouterConfig | null = null
  private configPath: string

  constructor() {
    const isDev = !app.isPackaged
    const basePath = isDev
      ? path.join(__dirname, "../../../../..")
      : path.join(process.resourcesPath, "..")

    const toolPath = path.join(basePath, externalToolPaths.router)
    this.configPath = path.join(toolPath, "config.yaml")

    // Check if the external tool exists
    if (!fs.existsSync(toolPath)) {
      throw new Error(`External router not found at ${toolPath}`)
    }

    // Load configuration
    this.loadConfig()
  }

  getName(): string {
    return "claude-code-router"
  }

  async healthCheck(): Promise<boolean> {
    try {
      return this.config !== null
    } catch {
      return false
    }
  }

  async resolveModel(input: RouterInput): Promise<RouterOutput> {
    // If config not loaded, fall back to defaults
    if (!this.config) {
      return {
        providerId: "anthropic",
        modelId: "claude-sonnet-4-20250514",
        reason: "Config not loaded, using default",
      }
    }

    // Use token thresholds from config if available
    const thresholds = this.config.token_thresholds || {
      thinking: 60000,
      large_context: 120000,
    }

    let selectedModel = this.config.default_model || "claude-sonnet-4-20250514"
    let reason = "default model"

    // Apply token-based routing
    if (input.tokenCount) {
      if (input.tokenCount > (thresholds.large_context || 120000)) {
        // Need large context model
        selectedModel = "claude-sonnet-4-20250514" // 200k context
        reason = `token count (${input.tokenCount}) exceeds large context threshold`
      } else if (input.tokenCount > (thresholds.thinking || 60000)) {
        // Complex task, use thinking model
        selectedModel = "claude-opus-4-20250514"
        reason = `token count (${input.tokenCount}) exceeds thinking threshold`
      }
    }

    // Apply task-type routing if available
    if (input.taskType) {
      // claude-code-router may have task-specific model mappings
      // For now, use simple heuristics
      if (input.taskType === "analysis" || input.taskType === "plan") {
        selectedModel = "claude-opus-4-20250514"
        reason = `task type: ${input.taskType}`
      }
    }

    // User preference takes priority
    if (input.preferredModel) {
      selectedModel = input.preferredModel
      reason = "user preference"
    }

    return {
      providerId: input.preferredProvider || "anthropic",
      modelId: selectedModel,
      reason,
    }
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    const models: ModelInfo[] = []

    if (!this.config?.providers) {
      // Return default Claude models if no config
      return [
        {
          id: "claude-sonnet-4-20250514",
          name: "Claude Sonnet 4",
          providerId: "anthropic",
          providerName: "Anthropic",
          contextWindow: 200000,
          maxOutputTokens: 64000,
        },
        {
          id: "claude-opus-4-20250514",
          name: "Claude Opus 4",
          providerId: "anthropic",
          providerName: "Anthropic",
          contextWindow: 200000,
          maxOutputTokens: 32000,
        },
      ]
    }

    // Parse models from config
    for (const provider of this.config.providers) {
      if (provider.models) {
        for (const model of provider.models) {
          models.push({
            id: model.name,
            name: model.name,
            providerId: provider.name.toLowerCase(),
            providerName: provider.name,
            contextWindow: model.context_window,
            maxOutputTokens: model.max_tokens,
          })
        }
      }
    }

    return models
  }

  private loadConfig(): void {
    try {
      // Try to load YAML config
      if (fs.existsSync(this.configPath)) {
        const yaml = require("js-yaml")
        const content = fs.readFileSync(this.configPath, "utf-8")
        this.config = yaml.load(content) as ExternalRouterConfig
        console.log("[external-router] Loaded config from", this.configPath)
      } else {
        // Try JSON config
        const jsonPath = this.configPath.replace(".yaml", ".json")
        if (fs.existsSync(jsonPath)) {
          const content = fs.readFileSync(jsonPath, "utf-8")
          this.config = JSON.parse(content) as ExternalRouterConfig
          console.log("[external-router] Loaded config from", jsonPath)
        } else {
          console.warn("[external-router] No config file found, using defaults")
          this.config = {}
        }
      }
    } catch (error) {
      console.error("[external-router] Failed to load config:", error)
      this.config = {}
    }
  }
}
