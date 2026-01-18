import { promises as fs } from "fs"
import path from "path"

/**
 * CLI session message format (from .jsonl file)
 */
interface CliMessage {
  type: "user" | "assistant" | "progress" | "file-history-snapshot"
  message?: {
    role: "user" | "assistant"
    content: string | ContentBlock[]
  }
  uuid: string
  timestamp: string
  sessionId?: string
  isMeta?: boolean
}

/**
 * Content block from CLI assistant messages
 */
interface ContentBlock {
  type: "text" | "tool_use" | "tool_result"
  text?: string
  id?: string
  name?: string
  input?: unknown
  content?: string | unknown[]
  tool_use_id?: string
  is_error?: boolean
}

/**
 * GUI message format (stored in database)
 */
interface GuiMessage {
  id: string
  role: "user" | "assistant"
  parts: GuiPart[]
  metadata?: {
    sessionId?: string
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    totalCostUsd?: number
    durationMs?: number
    resultSubtype?: string
    finalTextId?: string
  }
}

/**
 * GUI message part
 */
interface GuiPart {
  type: string
  text?: string
  toolCallId?: string
  toolName?: string
  input?: unknown
  state?: "call" | "result"
  result?: unknown
}

/**
 * Parse a session JSONL file and return CLI messages
 */
export async function parseSessionFile(
  filePath: string,
): Promise<CliMessage[]> {
  try {
    const content = await fs.readFile(filePath, "utf-8")
    const lines = content.trim().split("\n").filter(Boolean)

    const messages: CliMessage[] = []
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line)
        messages.push(parsed)
      } catch (parseErr) {
        console.error("[CLI-SYNC] Failed to parse line:", parseErr)
        // Skip malformed lines
      }
    }

    return messages
  } catch (err) {
    console.error("[CLI-SYNC] Failed to read session file:", err)
    return []
  }
}

/**
 * Convert CLI messages to GUI format and merge with existing messages
 */
export function convertCliToGuiMessages(
  cliMessages: CliMessage[],
  existingGuiMessages: GuiMessage[],
): GuiMessage[] {
  // 1. Find existing message UUIDs to avoid duplicates
  const existingUuids = new Set(existingGuiMessages.map((m) => m.id))

  // 2. Filter to only user/assistant messages that are new
  const newCliMessages = cliMessages.filter(
    (m) =>
      !existingUuids.has(m.uuid) &&
      (m.type === "user" || m.type === "assistant") &&
      m.message &&
      !m.isMeta, // Skip meta messages (local command caveat, etc.)
  )

  // 3. Convert each new message
  const convertedMessages = newCliMessages
    .map((cliMsg) => {
      if (!cliMsg.message) return null

      if (cliMsg.message.role === "user") {
        return convertUserMessage(cliMsg)
      } else {
        return convertAssistantMessage(cliMsg)
      }
    })
    .filter((m): m is GuiMessage => m !== null)

  // 4. Merge with existing (preserving order)
  return [...existingGuiMessages, ...convertedMessages]
}

/**
 * Convert CLI user message to GUI format
 */
function convertUserMessage(cliMsg: CliMessage): GuiMessage | null {
  if (!cliMsg.message) return null

  const content = cliMsg.message.content
  let text = ""

  if (typeof content === "string") {
    text = content
  } else if (Array.isArray(content)) {
    // Extract text from content blocks
    text = content
      .filter((block) => block.type === "text")
      .map((block) => block.text || "")
      .join("\n")
  }

  return {
    id: cliMsg.uuid,
    role: "user",
    parts: [{ type: "text", text }],
  }
}

/**
 * Convert CLI assistant message to GUI format
 */
function convertAssistantMessage(cliMsg: CliMessage): GuiMessage | null {
  if (!cliMsg.message) return null

  const content = cliMsg.message.content
  const parts: GuiPart[] = []

  if (typeof content === "string") {
    parts.push({ type: "text", text: content })
  } else if (Array.isArray(content)) {
    // Track tool_use blocks to match with tool_result blocks
    const toolUseMap = new Map<string, GuiPart>()

    for (const block of content) {
      if (block.type === "text") {
        parts.push({ type: "text", text: block.text || "" })
      } else if (block.type === "tool_use") {
        const toolPart: GuiPart = {
          type: `tool-${block.name}`,
          toolCallId: block.id,
          toolName: block.name,
          input: block.input,
          state: "call",
        }
        parts.push(toolPart)
        if (block.id) {
          toolUseMap.set(block.id, toolPart)
        }
      } else if (block.type === "tool_result") {
        // Find matching tool_use and update its state
        const toolUseId = block.tool_use_id
        if (toolUseId && toolUseMap.has(toolUseId)) {
          const toolPart = toolUseMap.get(toolUseId)!
          toolPart.state = "result"

          // Handle result content
          if (typeof block.content === "string") {
            toolPart.result = block.content
          } else {
            toolPart.result = block.content
          }

          // Handle errors
          if (block.is_error) {
            toolPart.state = "result"
            // Mark as error in result
            toolPart.result = {
              error: true,
              content: block.content,
            }
          }
        }
        // Note: We don't add tool_result as a separate part, it updates the tool_use part
      }
    }
  }

  return {
    id: cliMsg.uuid,
    role: "assistant",
    parts,
    metadata: {
      sessionId: cliMsg.sessionId,
    },
  }
}

/**
 * Find the session file path for a given subChatId and sessionId
 */
export async function findSessionFile(
  configDir: string,
  cwd: string,
  sessionId: string,
): Promise<string | null> {
  // Encode CWD path (slashes become dashes)
  const cwdEncoded = cwd.replace(/\//g, "-")

  const sessionFilePath = path.join(
    configDir,
    "projects",
    cwdEncoded,
    `${sessionId}.jsonl`,
  )

  try {
    await fs.access(sessionFilePath)
    return sessionFilePath
  } catch {
    console.error(
      `[CLI-SYNC] Session file not found at: ${sessionFilePath}`,
    )
    return null
  }
}
