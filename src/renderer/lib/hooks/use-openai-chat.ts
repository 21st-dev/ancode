// ============ OPENAI CHAT HOOK ============
// Hook for streaming chat with OpenAI-compatible providers (GLM, etc.)

import { useState, useCallback, useRef, useEffect } from "react"
import { trpc } from "../trpc"

// Type for subscription data matching the server's observable output
interface ChatStreamData {
  type: string
  content?: string
  error?: string
}

export interface OpenAIChatMessage {
  type: "text" | "error" | "end"
  content?: string
  error?: string
}

export interface UseOpenAIChatOptions {
  providerId: string
  modelId: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

export interface UseOpenAIChatReturn {
  messages: OpenAIChatMessage[]
  isStreaming: boolean
  error: string | null
  startChat: (prompt: string) => void
  reset: () => void
}

export function useOpenAIChat(
  options: UseOpenAIChatOptions,
): UseOpenAIChatReturn {
  const [messages, setMessages] = useState<OpenAIChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null)

  // Track if we should be subscribed
  const subscriptionActiveRef = useRef(false)

  // Use tRPC subscription hook - only active when currentPrompt is set
  trpc.providers.chatStream.useSubscription(
    {
      providerId: options.providerId,
      modelId: options.modelId,
      prompt: currentPrompt ?? "",
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      systemPrompt: options.systemPrompt,
    },
    {
      enabled: currentPrompt !== null && subscriptionActiveRef.current,
      onData: (data: ChatStreamData) => {
        if (data.type === "text" && data.content) {
          setMessages((prev) => [...prev, { type: "text", content: data.content }])
        } else if (data.type === "error" && data.error) {
          setError(data.error)
          setIsStreaming(false)
          subscriptionActiveRef.current = false
        } else if (data.type === "end") {
          setIsStreaming(false)
          setMessages((prev) => [...prev, { type: "end" }])
          subscriptionActiveRef.current = false
        }
      },
      onError: (err) => {
        // err is TRPCClientErrorLike, which has message property
        setError(err.message)
        setIsStreaming(false)
        subscriptionActiveRef.current = false
      },
    },
  )

  const startChat = useCallback(
    (prompt: string) => {
      setIsStreaming(true)
      setError(null)
      setMessages([])
      subscriptionActiveRef.current = true
      setCurrentPrompt(prompt)
    },
    [],
  )

  const reset = useCallback(() => {
    setMessages([])
    setError(null)
    setIsStreaming(false)
    setCurrentPrompt(null)
    subscriptionActiveRef.current = false
  }, [])

  return {
    messages,
    isStreaming,
    error,
    startChat,
    reset,
  }
}
