// ============ PROVIDER TYPES ============

export interface ProviderModelInfo {
  id: string
  modelId: string
  displayName: string
  apiFormat: "openai" | "anthropic"
  capabilities?: {
    vision?: boolean
    tools?: boolean
    thinking?: boolean
  }
  contextLength?: number
  isDefault: boolean
  isAvailable: boolean
}

export interface FetchableModel {
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

export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface ToolCall {
  name: string
  arguments: Record<string, unknown>
}

export interface ChatChunk {
  type: "text" | "tool_use" | "thinking" | "error" | "end"
  content?: string
  toolCall?: ToolCall
  error?: string
}

export interface ChatOptions {
  model: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  stream?: boolean
  tools?: ToolDefinition[]
  systemPrompt?: string
}

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

export interface ProviderInfo {
  id: string
  name: string
  type: "anthropic_oauth" | "api_key"
  role: "primary" | "secondary"
  isBuiltin: boolean
  baseUrl?: string | null
  apiFormat?: "openai" | "anthropic"
  hasApiKey: boolean
}

export interface ModelSelection {
  providerId: string
  modelId: string
}
