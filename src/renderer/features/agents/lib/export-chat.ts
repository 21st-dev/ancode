import { trpcClient } from "../../../lib/trpc"
import { remoteApi } from "../../../lib/remote-api"
import { toast } from "sonner"

export type ExportFormat = "markdown" | "json" | "text"

interface ExportOptions {
  chatId: string
  subChatId?: string
  format: ExportFormat
  isRemote?: boolean
}

interface Message {
  role: string
  content: string | Array<{ type: string; text?: string }>
}

/**
 * Format messages for export
 */
function formatMessages(messages: Message[], format: ExportFormat, chatName: string): { content: string; filename: string } {
  const timestamp = new Date().toISOString().split('T')[0]
  const safeName = chatName.replace(/[^a-z0-9]/gi, '-').toLowerCase()

  if (format === "json") {
    return {
      content: JSON.stringify(messages, null, 2),
      filename: `${safeName}-${timestamp}.json`,
    }
  }

  const formattedMessages = messages.map((msg) => {
    const role = msg.role === "user" ? "User" : msg.role === "assistant" ? "Assistant" : msg.role
    let content = ""

    if (typeof msg.content === "string") {
      content = msg.content
    } else if (Array.isArray(msg.content)) {
      content = msg.content
        .filter((part) => part.type === "text" && part.text)
        .map((part) => part.text)
        .join("\n")
    }

    if (format === "markdown") {
      return `## ${role}\n\n${content}`
    } else {
      return `${role}:\n${content}`
    }
  })

  const ext = format === "markdown" ? "md" : "txt"
  const separator = format === "markdown" ? "\n\n---\n\n" : "\n\n"

  return {
    content: formattedMessages.join(separator),
    filename: `${safeName}-${timestamp}.${ext}`,
  }
}

/**
 * Export a chat or sub-chat to a file.
 * Shows download dialog to save the exported content.
 */
export async function exportChat({ chatId, subChatId, format, isRemote = false }: ExportOptions): Promise<void> {
  try {
    let exportData: { content: string; filename: string }

    if (isRemote) {
      // Remote chat export - fetch from remote API and format locally
      const chat = await remoteApi.getAgentChat(chatId)
      const subChat = subChatId
        ? chat.subChats.find(sc => sc.id === subChatId)
        : chat.subChats[0]

      if (!subChat) {
        throw new Error("No chat data found")
      }

      const messages = (subChat.messages || []) as Message[]
      const chatName = subChat.name || chat.name || "remote-chat"
      exportData = formatMessages(messages, format, chatName)
    } else {
      // Local chat export - use existing tRPC endpoint
      exportData = await trpcClient.chats.exportChat.query({
        chatId,
        subChatId,
        format,
      })
    }

    const blob = new Blob([exportData.content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = exportData.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success("Export complete", {
      description: `Saved as ${exportData.filename}`,
    })
  } catch (error) {
    console.error("[exportChat] Error:", error)
    toast.error("Export failed", {
      description: error instanceof Error ? error.message : "Unable to export chat",
    })
  }
}

/**
 * Copy chat or sub-chat content to clipboard.
 */
export async function copyChat({ chatId, subChatId, format, isRemote = false }: ExportOptions): Promise<void> {
  try {
    let exportData: { content: string; filename: string }

    if (isRemote) {
      // Remote chat export - fetch from remote API and format locally
      const chat = await remoteApi.getAgentChat(chatId)
      const subChat = subChatId
        ? chat.subChats.find(sc => sc.id === subChatId)
        : chat.subChats[0]

      if (!subChat) {
        throw new Error("No chat data found")
      }

      const messages = (subChat.messages || []) as Message[]
      const chatName = subChat.name || chat.name || "remote-chat"
      exportData = formatMessages(messages, format, chatName)
    } else {
      // Local chat export - use existing tRPC endpoint
      exportData = await trpcClient.chats.exportChat.query({
        chatId,
        subChatId,
        format,
      })
    }

    try {
      await navigator.clipboard.writeText(exportData.content)
    } catch {
      // Fallback using Electron clipboard API
      if (window.desktopApi?.clipboardWrite) {
        await window.desktopApi.clipboardWrite(exportData.content)
      } else {
        throw new Error("Clipboard not available")
      }
    }

    toast.success("Copied to clipboard")
  } catch (error) {
    console.error("[copyChat] Error:", error)
    toast.error("Copy failed", {
      description: error instanceof Error ? error.message : "Unable to copy chat",
    })
  }
}
