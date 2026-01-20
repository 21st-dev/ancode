// ============ OPENAI-COMPATIBLE CHAT CLIENT ============
// Handles chat completion for OpenAI-compatible providers (GLM, etc.)

import type {
  ChatMessage,
  ChatOptions,
  ChatChunk,
  ToolDefinition,
} from "./types"

// ============ TYPE DEFINITIONS ============

interface OpenAIMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface OpenAIRequest {
  model: string
  messages: OpenAIMessage[]
  temperature?: number
  max_tokens?: number
  stream: boolean
}

interface OpenAIStreamChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: string
      content?: string
      tool_calls?: any[]
    }
    finish_reason: string | null
  }>
}

// ============ CHAT COMPLETION ============

/**
 * Stream chat completion from an OpenAI-compatible API
 * @param baseUrl - API base URL
 * @param apiKey - API key for authentication
 * @param options - Chat options including model, messages, etc.
 * @param userId - Optional user ID (required by GLM)
 */
export async function* streamChat(
  baseUrl: string,
  apiKey: string,
  options: ChatOptions,
  userId?: string,
): AsyncGenerator<ChatChunk> {
  // Ensure base URL doesn't end with slash
  const cleanBaseUrl = baseUrl.replace(/\/$/, "")

  // Build request body
  const requestBody: OpenAIRequest = {
    model: options.model,
    messages: options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options.temperature ?? 1.0,
    max_tokens: options.maxTokens ?? 4096,
    stream: true,
  }

  console.log(`[OpenAIClient] Starting chat with model: ${options.model}`)
  if (userId) {
    console.log(`[OpenAIClient] Using user_id: ${userId}`)
  }

  try {
    // Build headers - include user_id for GLM if provided
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    }

    // GLM requires user_id in headers for authentication
    if (userId) {
      headers["X-User-Id"] = userId
    }

    const response = await fetch(`${cleanBaseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      yield {
        type: "error",
        error: `API error ${response.status}: ${errorText}`,
      }
      return
    }

    if (!response.body) {
      yield { type: "error", error: "No response body" }
      return
    }

    // Parse streaming response
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Process SSE lines
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        const trimmed = line.trim()

        if (!trimmed || trimmed === "data: [DONE]") {
          continue
        }

        if (trimmed.startsWith("data: ")) {
          try {
            const data = JSON.parse(trimmed.slice(6)) as OpenAIStreamChunk

            const choice = data.choices[0]
            if (!choice) continue

            // Extract content
            if (choice.delta.content) {
              yield {
                type: "text",
                content: choice.delta.content,
              }
            }

            // Check for completion
            if (choice.finish_reason) {
              yield { type: "end" }
            }
          } catch (parseError) {
            console.warn("[OpenAIClient] Failed to parse SSE chunk:", parseError)
          }
        }
      }
    }
  } catch (error) {
    console.error("[OpenAIClient] Request failed:", error)
    yield {
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Non-streaming chat completion (for simple requests)
 */
export async function chat(
  baseUrl: string,
  apiKey: string,
  options: ChatOptions,
): Promise<{ content: string; error?: string }> {
  // Ensure base URL doesn't end with slash
  const cleanBaseUrl = baseUrl.replace(/\/$/, "")

  // Build request body
  const requestBody: OpenAIRequest = {
    model: options.model,
    messages: options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options.temperature ?? 1.0,
    max_tokens: options.maxTokens ?? 4096,
    stream: false,
  }

  try {
    const response = await fetch(`${cleanBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { content: "", error: `API error ${response.status}: ${errorText}` }
    }

    const data = await response.json()

    const content = data.choices?.[0]?.message?.content || ""
    return { content }
  } catch (error) {
    return {
      content: "",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// ============ HEALTH CHECK ============

/**
 * Check if an OpenAI-compatible endpoint is accessible
 */
export async function healthCheck(
  baseUrl: string,
  apiKey: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const cleanBaseUrl = baseUrl.replace(/\/$/, "")

    // Try a minimal chat request
    const response = await fetch(`${cleanBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 1,
      }),
    })

    if (response.ok) {
      return { ok: true }
    }

    // Try models endpoint as fallback
    const modelsResponse = await fetch(`${cleanBaseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (modelsResponse.ok) {
      return { ok: true }
    }

    return {
      ok: false,
      error: `Endpoint returned ${response.status}`,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
