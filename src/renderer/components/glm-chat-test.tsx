// ============ GLM CHAT TEST COMPONENT ============
// Simple component to test GLM (or any OpenAI-compatible) chat

import { useState } from "react"
import { Send } from "lucide-react"
import { trpc } from "../lib/trpc"
import { useOpenAIChat } from "../lib/hooks/use-openai-chat"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

export function GLMChatTest() {
  const [prompt, setPrompt] = useState("")
  const [selectedProvider, setSelectedProvider] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("")

  // Fetch providers and models
  const { data: providers = [] } = trpc.providers.list.useQuery()
  const { data: allModels } = trpc.providers.getAllModels.useQuery()

  // Get models for selected provider
  const selectedProviderModels = allModels?.find((p) => p.provider.id === selectedProvider)?.models || []

  // Chat hook
  const { messages, isStreaming, error, startChat, reset } = useOpenAIChat({
    providerId: selectedProvider,
    modelId: selectedModel,
    temperature: 0.7,
    maxTokens: 4096,
  })

  // Auto-select first provider/model if available
  useState(() => {
    if (!selectedProvider && providers.length > 0) {
      const apiProviders = providers.filter((p) => p.type === "api_key")
      if (apiProviders.length > 0) {
        setSelectedProvider(apiProviders[0].id)
      }
    }
  })

  const handleSend = () => {
    if (!prompt.trim() || !selectedProvider || !selectedModel || isStreaming) return
    reset()
    startChat(prompt.trim())
  }

  // Combine messages into full text for display
  const fullResponse = messages
    .filter((m) => m.type === "text")
    .map((m) => m.content)
    .join("")

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-lg font-semibold">GLM Chat Test</h2>
        <div className="flex gap-2">
          {/* Provider Selection */}
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {providers
                .filter((p) => p.type === "api_key")
                .map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {/* Model Selection */}
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {selectedProviderModels.map((model) => (
                <SelectItem key={model.modelId} value={model.modelId}>
                  {model.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chat Output */}
      <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-muted/30">
        {fullResponse ? (
          <div className="whitespace-pre-wrap text-sm">{fullResponse}</div>
        ) : error ? (
          <div className="text-sm text-destructive">Error: {error}</div>
        ) : isStreaming ? (
          <div className="text-sm text-muted-foreground">Thinking...</div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Select a provider and model, then enter a prompt to test GLM chat.
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your message..."
          className="flex-1 min-h-[80px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          disabled={isStreaming || !selectedProvider || !selectedModel}
        />
        <Button
          onClick={handleSend}
          disabled={!prompt.trim() || isStreaming || !selectedProvider || !selectedModel}
          className="self-end"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* Status */}
      {selectedProvider && selectedModel && (
        <div className="text-xs text-muted-foreground">
          Using: {providers.find((p) => p.id === selectedProvider)?.name} →{" "}
          {selectedProviderModels.find((m) => m.modelId === selectedModel)?.displayName}
        </div>
      )}
    </div>
  )
}
